// Echte Exportformate von ING, DKB (neu und alt), Volksbank und comdirect (testdata/banken/README.md).
// Jede Datei enthält dieselben 10 erfundenen Buchungen; alle Banken müssen gleich verstanden werden.
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { leseDatei } from './einlesen'
import { ordneEin } from './erkennen'
import type { Buchung } from './typen'

function lade(datei: string) {
  const inhalt = readFileSync(new URL(`../../testdata/banken/${datei}`, import.meta.url))
  const eingelesen = leseDatei(inhalt.buffer.slice(inhalt.byteOffset, inhalt.byteOffset + inhalt.byteLength) as ArrayBuffer)
  return { format: eingelesen.format, buchungen: ordneEin(eingelesen) }
}

const finde = (buchungen: Buchung[], betrag: number) => buchungen.find((b) => Math.abs(b.betrag - betrag) < 0.001)

describe.each([
  ['ing.csv', 'ing'],
  ['dkb.csv', 'dkb'],
  ['dkb-alt.csv', 'dkb'],
  ['volksbank.csv', 'volksbank'],
  ['comdirect.csv', 'comdirect'],
] as const)('%s', (datei, format) => {
  let erkannt: string
  let buchungen: Buchung[]
  beforeAll(() => {
    ;({ format: erkannt, buchungen } = lade(datei))
  })

  it(`erkennt das Format „${format}“ und liest alle 10 Buchungen`, () => {
    expect(erkannt).toBe(format)
    expect(buchungen).toHaveLength(10)
    expect(buchungen.map((b) => b.datum)).toContain('2026-09-30')
  })

  it('Gehalt: Absender ist die Firma, nicht man selbst', () => {
    const gehalt = finde(buchungen, 3020)
    expect(gehalt?.gegenpartei).toBe('Musterfirma GmbH')
    expect(gehalt?.unterkategorie).toBe('Lohn / Gehalt')
  })

  it('Miete: Empfänger ist die Hausverwaltung', () => {
    const miete = finde(buchungen, -980)
    expect(miete?.gegenpartei).toBe('Hausverwaltung Berger')
    expect(miete?.kategorie).toBe('Wohnen')
  })

  it('Umlaute richtig gelesen und Händler erkannt', () => {
    expect(buchungen.some((b) => `${b.gegenpartei} ${b.zweck}`.includes('Bäckerei Müller'))).toBe(true)
    expect(finde(buchungen, -45.67)?.kategorie).toBe('Essen & Trinken')
    expect(finde(buchungen, -24.9)?.unterkategorie).toBe('Lieferservice')
    expect(finde(buchungen, -13.99)?.unterkategorie).toBe('Serien & Filme')
  })

  it('Umbuchung aufs Tagesgeld und Bargeld erkannt', () => {
    expect(buchungen.filter((b) => b.istUmbuchung).map((b) => b.betrag)).toEqual([-200])
    expect(finde(buchungen, -100)?.unterkategorie).toBe('Bargeld')
  })

  it('Rückzahlung von einer Person ist kein Gehalt', () => {
    expect(finde(buchungen, 15)?.unterkategorie).not.toBe('Lohn / Gehalt')
  })
})
