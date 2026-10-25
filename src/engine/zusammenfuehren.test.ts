// Monatlicher Import (RECHENKERN.md, Abschnitt 14).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { leseDatei } from './einlesen'
import { werteAus } from './index'
import type { Rohbuchung } from './typen'
import { fuegeZusammen, letzte12Monate } from './zusammenfuehren'

const lade = (datei: string) => {
  const inhalt = readFileSync(new URL(`../../testdata/${datei}`, import.meta.url))
  return leseDatei(inhalt.buffer.slice(inhalt.byteOffset, inhalt.byteOffset + inhalt.byteLength) as ArrayBuffer)
}

function roh(teil: Partial<Rohbuchung>): Rohbuchung {
  return { id: 'x', datum: '2026-10-01', betrag: -3.5, gegenpartei: 'Cafe Kanne', zweck: 'Kaffee', konto: '', iban: '', buchungstext: '', ...teil }
}

describe('Zusammenführen', () => {
  it('Finanzguru, dann Sparkasse: alle 1.265 Giro-Buchungen sind schon da', () => {
    const fg = lade('kontoexport_alex_finanzguru.xlsx')
    const sk = lade('kontoexport_alex_sparkasse.csv')
    const z = fuegeZusammen(fg.buchungen, sk.buchungen)
    expect(z.doppelt).toBe(1265)
    expect(z.neu).toBe(0)
    expect(z.buchungen).toHaveLength(1284)
  })

  it('zweimal dieselbe Datei ändert nichts an der Auswertung', () => {
    const fg = lade('kontoexport_alex_finanzguru.xlsx')
    const z = fuegeZusammen(fg.buchungen, fg.buchungen)
    expect(z.neu).toBe(0)
    expect(werteAus({ ...fg, buchungen: z.buchungen }).lebenshaltungProMonat).toBeCloseTo(1360, 2)
  })

  it('zwei gleiche Kaffees am selben Tag in einer Datei bleiben zwei Buchungen', () => {
    const z = fuegeZusammen([], [roh({ id: 'a' }), roh({ id: 'b' })])
    expect(z.neu).toBe(2)
    // … und kommt dieselbe Datei nochmal, ist nichts neu
    expect(fuegeZusammen(z.buchungen, [roh({ id: 'a' }), roh({ id: 'b' })]).neu).toBe(0)
    // … ein dritter Kaffee in einer neuen Datei ist dagegen neu
    expect(fuegeZusammen(z.buchungen, [roh({ id: 'a' }), roh({ id: 'b' }), roh({ id: 'c' })]).neu).toBe(1)
  })

  it('IDs bleiben eindeutig, wenn zwei Dateien gleich nummerieren', () => {
    const z = fuegeZusammen([roh({ id: 'bank-csv-0' })], [roh({ id: 'bank-csv-0', datum: '2026-11-02' })])
    expect(new Set(z.buchungen.map((b) => b.id)).size).toBe(2)
  })
})

describe('Auswertung über 12 Monate', () => {
  it('Alex: 24.10.2025 bis 23.10.2026 bleibt komplett drin', () => {
    expect(letzte12Monate(lade('kontoexport_alex_finanzguru.xlsx').buchungen)).toHaveLength(1284)
  })

  it('ein neuer Monat schiebt den ältesten raus', () => {
    const buchungen = [roh({ id: '1', datum: '2025-10-24' }), roh({ id: '2', datum: '2025-11-30' }), roh({ id: '3', datum: '2026-11-30' })]
    expect(letzte12Monate(buchungen).map((b) => b.id)).toEqual(['3'])
    expect(letzte12Monate([...buchungen, roh({ id: '4', datum: '2026-11-29' })]).map((b) => b.id)).toEqual(['3', '4'])
  })
})
