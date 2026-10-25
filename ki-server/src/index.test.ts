// Tests für den KI-Server, mit gefälschtem Claude und Zähler. Kostet nichts.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bearbeite, MAX_ZEICHEN, pruefeAntwort, type Antwort, type Env, type FrageClaude } from './index'

const APP = 'https://leonhappel98-coder.github.io'
const ZUSAMMENFASSUNG = 'Ich möchte meine Finanzen verbessern. LEBENSHALTUNG: ca. 1.360 € … FIXKOSTEN: ca. 1.240 € … (anonym, gerundet)'

const GUTE_ANTWORT = JSON.stringify({
  vorschlaege: [
    { titel: 'Taxi durch Bahn ersetzen', begruendung: 'Du gibst 30 € für Taxi aus.', euroProMonat: 20.4, aufwand: 'laufend', art: 'Ausgaben' },
    { titel: 'Sparplan erhöhen', begruendung: 'Deine Sparquote liegt bei 14 %.', euroProMonat: 50, aufwand: '10 Min', art: 'Vermögen' },
  ],
  hinweis: 'Das sind Vorschläge, keine Beratung.',
})

function testUmgebung(): Env {
  const speicher = new Map<string, string>()
  return {
    ANTHROPIC_API_KEY: 'test',
    ERLAUBTE_HERKUNFT: `${APP},http://localhost:5173`,
    LIMIT_PRO_GERAET: '5',
    LIMIT_GESAMT: '200',
    ZAEHLER: {
      get: async (k: string) => speicher.get(k) ?? null,
      put: async (k: string, v: string) => void speicher.set(k, v),
    } as unknown as KVNamespace,
  }
}

function anfrage(body: unknown, { herkunft = APP, methode = 'POST', pfad = '/analyse', ip = '1.2.3.4' } = {}) {
  return new Request(`https://kurs-ki.example.workers.dev${pfad}`, {
    method: methode,
    headers: { 'content-type': 'application/json', ...(herkunft ? { Origin: herkunft } : {}), 'CF-Connecting-IP': ip },
    body: methode === 'POST' ? JSON.stringify(body) : undefined,
  })
}

const claudeMit = (antwort: string): FrageClaude => vi.fn(async () => antwort)

afterEach(() => vi.restoreAllMocks())

describe('Zugang', () => {
  it('lehnt fremde Webseiten und Anfragen ohne Herkunft ab', async () => {
    const claude = claudeMit(GUTE_ANTWORT)
    for (const herkunft of ['https://boese.example', '']) {
      const r = await bearbeite(anfrage({ zusammenfassung: ZUSAMMENFASSUNG }, { herkunft }), testUmgebung(), claude)
      expect(r.status).toBe(403)
      expect(r.headers.get('access-control-allow-origin')).toBeNull()
    }
    expect(claude).not.toHaveBeenCalled()
  })

  it('beantwortet die Vorab-Anfrage des Browsers (CORS) für die App', async () => {
    const r = await bearbeite(anfrage(null, { methode: 'OPTIONS' }), testUmgebung(), claudeMit(GUTE_ANTWORT))
    expect(r.status).toBe(204)
    expect(r.headers.get('access-control-allow-origin')).toBe(APP)
  })

  it('kennt nur POST /analyse', async () => {
    const r = await bearbeite(anfrage({ zusammenfassung: ZUSAMMENFASSUNG }, { pfad: '/anderes' }), testUmgebung(), claudeMit(GUTE_ANTWORT))
    expect(r.status).toBe(404)
  })
})

describe('Eingabe', () => {
  it('lehnt fehlende, zu kurze und zu lange Texte ab, ohne Claude zu fragen', async () => {
    const claude = claudeMit(GUTE_ANTWORT)
    const env = testUmgebung()
    expect((await bearbeite(anfrage({}), env, claude)).status).toBe(400)
    expect((await bearbeite(anfrage({ zusammenfassung: 'kurz' }), env, claude)).status).toBe(400)
    expect((await bearbeite(anfrage({ zusammenfassung: 'x'.repeat(MAX_ZEICHEN + 1) }), env, claude)).status).toBe(413)
    expect(claude).not.toHaveBeenCalled()
  })
})

describe('Analyse', () => {
  it('gibt geprüfte Vorschläge zurück und schickt Claude genau die Zusammenfassung', async () => {
    const claude = claudeMit(GUTE_ANTWORT)
    const r = await bearbeite(anfrage({ zusammenfassung: ZUSAMMENFASSUNG }), testUmgebung(), claude)
    expect(r.status).toBe(200)
    expect(r.headers.get('access-control-allow-origin')).toBe(APP)
    const daten = (await r.json()) as Antwort
    expect(daten.vorschlaege).toHaveLength(2)
    expect(daten.vorschlaege[0].euroProMonat).toBe(20)
    expect(claude).toHaveBeenCalledWith(ZUSAMMENFASSUNG)
  })

  it('protokolliert keine Inhalte, auch nicht bei Fehlern', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ausgabe = vi.spyOn(console, 'log').mockImplementation(() => {})
    const kaputt: FrageClaude = async () => {
      throw new Error('geheim')
    }
    const r = await bearbeite(anfrage({ zusammenfassung: ZUSAMMENFASSUNG }), testUmgebung(), kaputt)
    expect(r.status).toBe(500)
    const alles = [...log.mock.calls, ...ausgabe.mock.calls].flat().join(' ')
    expect(alles).not.toContain('LEBENSHALTUNG')
    expect(alles).not.toContain('geheim')
  })
})

describe('Tageslimit', () => {
  it('erlaubt 5 Analysen pro Gerät und Tag, andere Geräte bleiben frei', async () => {
    const env = testUmgebung()
    const claude = claudeMit(GUTE_ANTWORT)
    for (let i = 0; i < 5; i++) expect((await bearbeite(anfrage({ zusammenfassung: ZUSAMMENFASSUNG }), env, claude)).status).toBe(200)
    const sechste = await bearbeite(anfrage({ zusammenfassung: ZUSAMMENFASSUNG }), env, claude)
    expect(sechste.status).toBe(429)
    expect(((await sechste.json()) as { fehler: string }).fehler).toContain('Morgen')
    expect((await bearbeite(anfrage({ zusammenfassung: ZUSAMMENFASSUNG }, { ip: '5.6.7.8' }), env, claude)).status).toBe(200)
    expect(claude).toHaveBeenCalledTimes(6)
  })

  it('stoppt bei der Gesamtgrenze für alle', async () => {
    const env = { ...testUmgebung(), LIMIT_GESAMT: '2' }
    const claude = claudeMit(GUTE_ANTWORT)
    const status = []
    for (const ip of ['1', '2', '3']) status.push((await bearbeite(anfrage({ zusammenfassung: ZUSAMMENFASSUNG }, { ip }), env, claude)).status)
    expect(status).toEqual([200, 200, 429])
  })

  it('speichert keine IP-Adresse im Klartext', async () => {
    const schluessel: string[] = []
    const env = testUmgebung()
    const original = env.ZAEHLER.put
    env.ZAEHLER.put = (async (k: string, v: string, o?: KVNamespacePutOptions) => {
      schluessel.push(k)
      return original(k, v, o)
    }) as typeof env.ZAEHLER.put
    await bearbeite(anfrage({ zusammenfassung: ZUSAMMENFASSUNG }, { ip: '203.0.113.42' }), env, claudeMit(GUTE_ANTWORT))
    expect(schluessel.join(' ')).not.toContain('203.0.113.42')
  })
})

describe('Antwort prüfen', () => {
  it('filtert kaputte Vorschläge, rundet Beträge und begrenzt auf 5', () => {
    const roh = JSON.stringify({
      vorschlaege: [
        ...Array.from({ length: 7 }, (_, i) => ({ titel: `Schritt ${i}`, begruendung: 'b', euroProMonat: 10.6, aufwand: 'x', art: 'Ausgaben' })),
        { titel: '', begruendung: 'leer', euroProMonat: 5, aufwand: 'x', art: 'Ausgaben' },
        { titel: 'Falsche Art', begruendung: 'b', euroProMonat: 5, aufwand: 'x', art: 'Lotto' },
        { titel: 'Negativ', begruendung: 'b', euroProMonat: -50, aufwand: 'x', art: 'Ausgaben' },
      ],
      hinweis: 'h',
    })
    const a = pruefeAntwort(roh)
    expect(a.vorschlaege).toHaveLength(5)
    expect(a.vorschlaege.every((v) => v.euroProMonat === 11)).toBe(true)
  })

  it('lehnt unlesbare oder leere Antworten ab', () => {
    expect(() => pruefeAntwort('kein json')).toThrow('unlesbar')
    expect(() => pruefeAntwort(JSON.stringify({ vorschlaege: [], hinweis: 'h' }))).toThrow('keine brauchbaren')
    expect(() => pruefeAntwort(JSON.stringify({ hinweis: 'h' }))).toThrow('unvollständig')
  })
})
