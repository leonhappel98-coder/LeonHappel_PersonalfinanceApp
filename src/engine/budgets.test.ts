// Budgets mit Tempo-Markierung (RECHENKERN.md, Abschnitt 15). Alex, Oktober 2026, Stand 25.10. (unabhängig nachgerechnet).
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { budgetMonat, startBudgets } from './budgets'
import { analysiereDatei, type Analyse } from './index'

let analyse: Analyse
beforeAll(() => {
  const inhalt = readFileSync(new URL('../../testdata/kontoexport_alex_finanzguru.xlsx', import.meta.url))
  analyse = analysiereDatei(inhalt.buffer.slice(inhalt.byteOffset, inhalt.byteOffset + inhalt.byteLength) as ArrayBuffer)
})

const zeile = (monat: ReturnType<typeof budgetMonat>, kategorie: string) => monat.zeilen.find((z) => z.kategorie === kategorie)!

describe('Budgets für Alex', () => {
  it('Startwerte 10 % unter dem Schnitt, auf 10 € abgerundet: zusammen 1.200 €', () => {
    const b = startBudgets(analyse)
    expect(b).toEqual({ 'Essen & Trinken': 460, Mobilität: 150, Freizeit: 230, Shopping: 210, Sonstiges: 150 })
  })

  it('Oktober, Tag 25 von 31', () => {
    const m = budgetMonat(analyse, startBudgets(analyse), '2026-10-25')
    expect(m).toMatchObject({ monat: '2026-10', tag: 25, tageImMonat: 31 })
    expect(m.tempo).toBeCloseTo(25 / 31, 6)
  })

  it('Ausgaben im Oktober je Kategorie und Ampel nach Tempo', () => {
    const m = budgetMonat(analyse, startBudgets(analyse), '2026-10-25')
    expect(zeile(m, 'Essen & Trinken')).toMatchObject({ budget: 460, ampel: 'hinweis' })
    expect(zeile(m, 'Essen & Trinken').ausgegeben).toBeCloseTo(385.86, 2)
    expect(zeile(m, 'Mobilität').ausgegeben).toBeCloseTo(165.82, 2)
    expect(zeile(m, 'Mobilität').ampel).toBe('warnung')
    expect(zeile(m, 'Freizeit').ausgegeben).toBeCloseTo(234.17, 2)
    expect(zeile(m, 'Freizeit').ampel).toBe('warnung')
    expect(zeile(m, 'Shopping').ausgegeben).toBeCloseTo(84.17, 2)
    expect(zeile(m, 'Shopping').ampel).toBe('gut')
    expect(zeile(m, 'Sonstiges').ausgegeben).toBeCloseTo(139.64, 2)
    expect(zeile(m, 'Sonstiges').ampel).toBe('hinweis')
  })

  it('Summe 1.009,66 € von 1.200 €, 190,34 € frei', () => {
    const m = budgetMonat(analyse, startBudgets(analyse), '2026-10-25')
    expect(m.summeBudget).toBe(1200)
    expect(m.summeAusgegeben).toBeCloseTo(1009.66, 2)
    expect(m.frei).toBeCloseTo(190.34, 2)
  })

  it('Satz wie im Design: Lage, was drüber ist, wo noch Luft ist', () => {
    const m = budgetMonat(analyse, startBudgets(analyse), '2026-10-25')
    expect(m.satz.replace(/ /g, ' ')).toBe('Fast im Plan. Mobilität und Freizeit sind drüber, Shopping hat noch 126 € Luft.')
  })

  it('Fixkosten als eigene Zeilen: Wohnen und Verträge & Abos mit Monatsschnitt', () => {
    const m = budgetMonat(analyse, startBudgets(analyse), '2026-10-25')
    expect(zeile(m, 'Wohnen')).toMatchObject({ fix: true, budget: 1068 })
    expect(zeile(m, 'Wohnen').ausgegeben).toBeCloseTo(1105.08, 2)
    expect(zeile(m, 'Verträge & Abos')).toMatchObject({ fix: true, budget: 172 })
    expect(m.zeilen.slice(0, 2).map((z) => z.kategorie)).toEqual(['Wohnen', 'Verträge & Abos'])
  })

  it('noch keine Buchungen im aktuellen Monat: letzter Monat mit Daten, komplett vorbei', () => {
    const m = budgetMonat(analyse, startBudgets(analyse), '2026-12-05')
    expect(m).toMatchObject({ monat: '2026-10', tag: 31, tempo: 1 })
  })
})
