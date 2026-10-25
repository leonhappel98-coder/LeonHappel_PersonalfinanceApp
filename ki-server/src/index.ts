// KI-Server für „KI-Analyse starten“ (CLAUDE.md, Datenschutz-Regel 4).
// Bekommt NUR die anonyme Zusammenfassung aus der App, fragt Claude und gibt Vorschläge zurück.
// Inhalte werden nie gespeichert oder protokolliert. Der API-Schlüssel bleibt hier geheim.
import Anthropic from '@anthropic-ai/sdk'

export interface Env {
  ANTHROPIC_API_KEY: string
  ERLAUBTE_HERKUNFT: string
  LIMIT_PRO_GERAET: string
  LIMIT_GESAMT: string
  ZAEHLER: KVNamespace
}

export const MODELL = 'claude-opus-5-5'
/** Längere Texte lehnt der Server ab (die echte Zusammenfassung hat etwa 2.000 Zeichen). */
export const MAX_ZEICHEN = 6_000
const MAX_VORSCHLAEGE = 5

export type Vorschlag = {
  titel: string
  begruendung: string
  euroProMonat: number
  aufwand: string
  art: 'Ausgaben' | 'Einnahmen' | 'Absicherung' | 'Vermögen'
}
export type Antwort = { vorschlaege: Vorschlag[]; hinweis: string }

/** Austauschbar für Tests: fragt Claude und liefert den rohen JSON-Text. */
export type FrageClaude = (zusammenfassung: string) => Promise<string>

const SYSTEM = `Du bist ein umsichtiger, unabhängiger Finanz-Coach für Menschen in Deutschland. Du bekommst eine anonyme, gerundete Zusammenfassung aus einer Finanz-App.

Gib 3 bis 5 konkrete Vorschläge, die zu genau diesen Zahlen passen, sortiert nach Wirkung (größte zuerst). Wiederhole nichts, was unter „SCHON GEPLANT“ steht.

Regeln:
- euroProMonat: realistische, eher vorsichtige Schätzung der monatlichen Ersparnis oder Mehreinnahme in Euro, ganze Zahl. 0 bei reinen Absicherungs-Schritten.
- aufwand: kurz, z. B. „10 Min“, „1 Stunde“, „laufend“, „Gespräch“.
- art: „Ausgaben“, „Einnahmen“, „Absicherung“ oder „Vermögen“.
- titel: höchstens 8 Wörter, als Handlung formuliert. begruendung: höchstens 2 kurze Sätze, Du-Form, mit Bezug auf die Zahlen.
- Nenne keine konkreten Finanzprodukte, Anbieter oder Aktien und gib keine Steuer- oder Rechtsberatung.
- hinweis: ein Satz, der daran erinnert, dass es Vorschläge und keine Beratung sind.
Schreibe auf Deutsch.`

const SCHEMA = {
  type: 'object',
  properties: {
    vorschlaege: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titel: { type: 'string' },
          begruendung: { type: 'string' },
          euroProMonat: { type: 'number' },
          aufwand: { type: 'string' },
          art: { type: 'string', enum: ['Ausgaben', 'Einnahmen', 'Absicherung', 'Vermögen'] },
        },
        required: ['titel', 'begruendung', 'euroProMonat', 'aufwand', 'art'],
        additionalProperties: false,
      },
    },
    hinweis: { type: 'string' },
  },
  required: ['vorschlaege', 'hinweis'],
  additionalProperties: false,
} as const

/** Echter Aufruf: Claude Opus 5.5 mit fester Antwortform. Lehnt Opus ab, springt automatisch ein Ersatzmodell ein. */
export function claudeAufruf(apiKey: string): FrageClaude {
  const client = new Anthropic({ apiKey })
  return async (zusammenfassung) => {
    const antwort = await client.beta.messages.create({
      model: MODELL,
      max_tokens: 16_000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: zusammenfassung }],
    })
    if (antwort.stop_reason === 'refusal') throw new KiFehler(502, 'Die KI hat diese Anfrage abgelehnt.')
    if (antwort.stop_reason === 'max_tokens') throw new KiFehler(502, 'Die Antwort der KI war zu lang.')
    const text = antwort.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') throw new KiFehler(502, 'Die KI hat keine Vorschläge geliefert.')
    return text.text
  }
}

export class KiFehler extends Error {
  readonly status: number
  constructor(status: number, nachricht: string) {
    super(nachricht)
    this.status = status
  }
}

/** Prüft die Antwort der KI Feld für Feld, bevor sie an die App geht. */
export function pruefeAntwort(rohtext: string): Antwort {
  let daten: unknown
  try {
    daten = JSON.parse(rohtext)
  } catch {
    throw new KiFehler(502, 'Die Antwort der KI war unlesbar.')
  }
  const d = daten as Partial<Antwort>
  if (!d || !Array.isArray(d.vorschlaege) || typeof d.hinweis !== 'string') throw new KiFehler(502, 'Die Antwort der KI war unvollständig.')
  const arten = ['Ausgaben', 'Einnahmen', 'Absicherung', 'Vermögen']
  const vorschlaege = d.vorschlaege
    .filter(
      (v): v is Vorschlag =>
        !!v &&
        typeof v.titel === 'string' &&
        v.titel.trim() !== '' &&
        typeof v.begruendung === 'string' &&
        typeof v.aufwand === 'string' &&
        typeof v.euroProMonat === 'number' &&
        Number.isFinite(v.euroProMonat) &&
        arten.includes(v.art),
    )
    .slice(0, MAX_VORSCHLAEGE)
    .map((v) => ({ ...v, euroProMonat: Math.max(0, Math.round(v.euroProMonat)) }))
  if (vorschlaege.length === 0) throw new KiFehler(502, 'Die KI hat keine brauchbaren Vorschläge geliefert.')
  return { vorschlaege, hinweis: d.hinweis }
}

/** Zählt Analysen pro Gerät (nur als Prüfsumme, nicht umkehrbar) und insgesamt, jeweils pro Tag. */
async function pruefeLimit(request: Request, env: Env): Promise<void> {
  const tag = new Date().toISOString().slice(0, 10)
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unbekannt'
  const pruefsumme = await sha256(`${tag}|${ip}`)
  const schluessel = { geraet: `geraet:${tag}:${pruefsumme}`, gesamt: `gesamt:${tag}` }
  const [geraet, gesamt] = await Promise.all([env.ZAEHLER.get(schluessel.geraet), env.ZAEHLER.get(schluessel.gesamt)])
  if (Number(geraet ?? 0) >= Number(env.LIMIT_PRO_GERAET)) throw new KiFehler(429, 'Für heute sind deine KI-Analysen aufgebraucht. Morgen geht es wieder.')
  if (Number(gesamt ?? 0) >= Number(env.LIMIT_GESAMT)) throw new KiFehler(429, 'Die KI-Analyse ist heute ausgelastet. Morgen geht es wieder.')
  const zweiTage = { expirationTtl: 2 * 24 * 60 * 60 }
  await Promise.all([
    env.ZAEHLER.put(schluessel.geraet, String(Number(geraet ?? 0) + 1), zweiTage),
    env.ZAEHLER.put(schluessel.gesamt, String(Number(gesamt ?? 0) + 1), zweiTage),
  ])
}

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function json(daten: unknown, status: number, herkunft: string | null): Response {
  return new Response(JSON.stringify(daten), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors(herkunft) } })
}

function cors(herkunft: string | null): Record<string, string> {
  if (!herkunft) return {}
  return {
    'access-control-allow-origin': herkunft,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

/** Die eigentliche Logik, getrennt vom echten Claude-Aufruf, damit sie testbar ist. */
export async function bearbeite(request: Request, env: Env, frageClaude: FrageClaude): Promise<Response> {
  const erlaubt = env.ERLAUBTE_HERKUNFT.split(',').map((h) => h.trim())
  const herkunft = request.headers.get('Origin')
  const zugelassen = herkunft !== null && erlaubt.includes(herkunft) ? herkunft : null

  if (!zugelassen) return json({ fehler: 'Nicht erlaubt.' }, 403, null)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(zugelassen) })
  if (request.method !== 'POST' || new URL(request.url).pathname !== '/analyse') return json({ fehler: 'Nicht gefunden.' }, 404, zugelassen)

  try {
    const eingabe = (await request.json().catch(() => null)) as { zusammenfassung?: unknown } | null
    const zusammenfassung = eingabe?.zusammenfassung
    if (typeof zusammenfassung !== 'string' || zusammenfassung.trim().length < 50) throw new KiFehler(400, 'Keine Zusammenfassung erhalten.')
    if (zusammenfassung.length > MAX_ZEICHEN) throw new KiFehler(413, 'Die Zusammenfassung ist zu lang.')
    await pruefeLimit(request, env)
    return json(pruefeAntwort(await frageClaude(zusammenfassung)), 200, zugelassen)
  } catch (fehler) {
    if (fehler instanceof KiFehler) return json({ fehler: fehler.message }, fehler.status, zugelassen)
    if (fehler instanceof Anthropic.RateLimitError) return json({ fehler: 'Die KI ist gerade ausgelastet. Versuch es gleich noch mal.' }, 503, zugelassen)
    if (fehler instanceof Anthropic.APIError) {
      // Nur den Statuscode protokollieren, nie Inhalte
      console.error('Claude-Fehler', fehler.status)
      return json({ fehler: 'Die KI ist gerade nicht erreichbar.' }, 502, zugelassen)
    }
    console.error('Unerwarteter Fehler')
    return json({ fehler: 'Etwas ist schiefgelaufen.' }, 500, zugelassen)
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return bearbeite(request, env, claudeAufruf(env.ANTHROPIC_API_KEY))
  },
} satisfies ExportedHandler<Env>
