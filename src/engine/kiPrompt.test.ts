// Datenschutz-Abnahme des KI-Prompts (RECHENKERN.md, Abschnitt 11) mit beiden Dateien von Alex.
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { analysiereDatei, type Analyse } from './index'
import { erstelleKiPrompt } from './kiPrompt'
import type { Ziel } from './prognose'
import { erstelleSchrittplan } from './schritte'

const alex: Ziel = { depot: 31_800, tagesgeld: 2_400, sparrateProMonat: 420, zielBetrag: 100_000, zielMonat: '2030-07', personenImHaushalt: 1 }
const START = '2026-10'

function lade(datei: string): Analyse {
  const inhalt = readFileSync(new URL(`../../testdata/${datei}`, import.meta.url))
  return analysiereDatei(inhalt.buffer.slice(inhalt.byteOffset, inhalt.byteOffset + inhalt.byteLength) as ArrayBuffer)
}

describe.each(['kontoexport_alex_finanzguru.xlsx', 'kontoexport_alex_sparkasse.csv'])('KI-Prompt aus %s', (datei) => {
  let analyse: Analyse
  let prompt: string
  beforeAll(() => {
    analyse = lade(datei)
    prompt = erstelleKiPrompt(analyse, alex, erstelleSchrittplan(analyse, alex, ['handytarif'], START), START).replace(/ /g, ' ')
  })

  it('enthält keine IBAN', () => {
    expect(prompt).not.toMatch(/\bDE\d{2}\s?\d{4}/)
  })

  it('enthält keine Namen von Händlern, Personen oder Firmen', () => {
    const namen = new Set(analyse.buchungen.map((b) => b.gegenpartei).filter((n) => n.length >= 3))
    for (const name of namen) expect(prompt, name).not.toContain(name)
    // auch keine Teile davon, z. B. „Netflix“ aus „Netflix International B.V.“
    for (const wort of ['Netflix', 'Disney', 'Jonas', 'Keller', 'Musterfirma', 'Hausverwaltung', 'FunkNetz', 'Trade Republic']) {
      expect(prompt, wort).not.toContain(wort)
    }
  })

  it('enthält keinen Verwendungszweck und kein Datum einzelner Buchungen', () => {
    expect(prompt).not.toMatch(/\d{1,2}\.\d{1,2}\.\d{2,4}/)
    expect(prompt).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    for (const zweck of ['Waschmaschine', 'Mallorca', 'Palma', 'Lohn/Gehalt', 'Konzertkarte', 'Bestellung']) expect(prompt, zweck).not.toContain(zweck)
  })

  it('fasst Gesundheit unter „Sonstiges“ zusammen', () => {
    expect(prompt).not.toMatch(/gesundheit|dental|zahn|arzt/i)
  })

  it('alle Euro-Beträge sind auf 10 € gerundet', () => {
    const betraege = [...prompt.matchAll(/([\d.]+) €/g)].map((m) => Number(m[1].replace(/\./g, '')))
    expect(betraege.length).toBeGreaterThan(10)
    for (const b of betraege) expect(b % 10, String(b)).toBe(0)
  })

  it('enthält die wichtigen Zahlen', () => {
    expect(prompt).toContain('LEBENSHALTUNG: ca. 1.360 €')
    expect(prompt).toContain('FIXKOSTEN: ca. 1.240 €')
    expect(prompt).toContain('Nettoeinkommen: ca. 3.020 €')
    expect(prompt).toContain('Vermögen heute: ca. 34.000 €')
    expect(prompt).toContain('Ziel: ca. 100.000 € bis Juli 2030')
    expect(prompt).toContain('Handytarif wechseln: ca. 20 € im Monat (erledigt)')
  })

  it('nennt die nötige Sparrate und den Haushalt', () => {
    expect(prompt).toMatch(/Für das Ziel nötig bei 5 % Rendite: ca\. [\d.]+ € im Monat/)
    expect(prompt).toContain('Haushalt: 1 Person')
  })

  it('schreibt Umlaute richtig', () => {
    expect(prompt).not.toMatch(/Buecher|gebuehr/)
    expect(prompt).toContain('Bücher & Zeitungen')
  })

  it('kein Name steht ungekennzeichnet bei Lebenshaltung und Fixkosten', () => {
    const [lebenshaltung, fixkosten] = prompt.split('FIXKOSTEN:')
    const fixNamen = [...fixkosten.split('EINMALEFFEKTE')[0].matchAll(/^- (.+?): /gm)].map((m) => m[1])
    for (const name of fixNamen) expect(lebenshaltung, name).not.toContain(`${name} ca.`)
  })
})

it('funktioniert auch ohne Ziel', () => {
  const prompt = erstelleKiPrompt(lade('kontoexport_alex_finanzguru.xlsx'), undefined, undefined, START)
  expect(prompt).toContain('LEBENSHALTUNG')
  expect(prompt).not.toContain('VERMÖGEN UND ZIEL')
})
