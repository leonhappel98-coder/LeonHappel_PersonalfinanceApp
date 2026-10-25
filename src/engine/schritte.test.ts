// Abnahme der nächsten Schritte mit Alex (RECHENKERN.md, Abschnitt 10). Werte unabhängig nachgerechnet.
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { analysiereDatei, type Analyse } from './index'
import type { Ziel } from './prognose'
import { erstelleSchrittplan, sparrateMitErledigten } from './schritte'

const alex: Ziel = { depot: 31_800, tagesgeld: 2_400, sparrateProMonat: 420, zielBetrag: 100_000, zielMonat: '2030-07' }
const START = '2026-10'

let analyse: Analyse
beforeAll(() => {
  const inhalt = readFileSync(new URL('../../testdata/kontoexport_alex_finanzguru.xlsx', import.meta.url))
  analyse = analysiereDatei(inhalt.buffer.slice(inhalt.byteOffset, inhalt.byteOffset + inhalt.byteLength) as ArrayBuffer)
})

describe('Schritte für Alex', () => {
  it('schlägt vier Schritte vor: Notgroschen zuerst, dann nach Wirkung', () => {
    const plan = erstelleSchrittplan(analyse, alex, [], START)
    expect(plan.schritte.map((s) => s.id)).toEqual(['notgroschen', 'auswaerts', 'handytarif', 'streaming'])
  })

  it('Notgroschen 7.800 €, 2.400 € reichen für 28 Tage', () => {
    const [notgroschen] = erstelleSchrittplan(analyse, alex, [], START).schritte
    expect(notgroschen.titel.replace(/ /g, ' ')).toBe('Notgroschen auf 7.800 € aufbauen')
    expect(notgroschen.text).toContain('reicht für 28 Tage')
    expect(notgroschen.text.replace(/\u00a0/g, ' ')).toContain('Erst einen Monat (2.600 €), dann drei Monate.')
    expect(notgroschen.plusProMonat).toBeNull()
  })

  it.each([
    ['auswaerts', 105, 13],
    ['handytarif', 24.99, 3],
    ['streaming', 13.99, 2],
  ] as const)('%s: +%d €/Monat, Ziel %i Monate früher', (id, plus, frueher) => {
    const schritt = erstelleSchrittplan(analyse, alex, [], START).schritte.find((s) => s.id === id)!
    expect(schritt.plusProMonat).toBeCloseTo(plus, 2)
    expect(schritt.monateFrueher).toBe(frueher)
  })

  it('so wie jetzt Dez 2034, mit allen Schritten Jul 2033 (+143,98 €)', () => {
    const plan = erstelleSchrittplan(analyse, alex, [], START)
    expect(plan.offenProMonat).toBeCloseTo(143.98, 2)
    expect(plan.soWieJetzt.zielErreicht).toBe('2034-12')
    expect(plan.mitAllenSchritten.zielErreicht).toBe('2033-07')
  })

  it('„Diese Woche“: Notgroschen und der größte offene Ausgaben-Schritt', () => {
    const plan = erstelleSchrittplan(analyse, alex, [], START)
    expect(plan.schritte.filter((s) => s.dieseWoche).map((s) => s.id)).toEqual(['notgroschen', 'auswaerts'])
  })

  it('erledigte Schritte zählen zur Sparrate und verschieben „so wie jetzt“', () => {
    const plan = erstelleSchrittplan(analyse, alex, ['handytarif'], START)
    expect(plan.anzahlErledigt).toBe(1)
    expect(plan.sparrateJetzt).toBeCloseTo(444.99, 2)
    expect(plan.soWieJetzt.zielErreicht).toBe('2034-09')
    expect(plan.offenProMonat).toBeCloseTo(118.99, 2)
    expect(plan.mitAllenSchritten.zielErreicht).toBe('2033-07')
    expect(plan.schritte.find((s) => s.id === 'handytarif')?.monateFrueher).toBe(3)
    expect(plan.schritte.filter((s) => s.dieseWoche).map((s) => s.id)).toEqual(['notgroschen', 'auswaerts'])
    expect(sparrateMitErledigten(alex, analyse, ['handytarif'])).toBeCloseTo(444.99, 2)
  })

  it('Etappen bei wenig Tagesgeld: erst 500 €, dann 1.000 €, …', () => {
    const [notgroschen] = erstelleSchrittplan(analyse, { ...alex, tagesgeld: 200 }, [], START).schritte
    expect(notgroschen.text.replace(/\u00a0/g, ' ')).toContain('Erst 500 €, dann 1.000 €, dann einen Monat (2.600 €), dann drei Monate.')
  })

  it('kein Notgroschen-Schritt, wenn genug Tagesgeld da ist', () => {
    const plan = erstelleSchrittplan(analyse, { ...alex, tagesgeld: 8_000 }, [], START)
    expect(plan.schritte.some((s) => s.id === 'notgroschen')).toBe(false)
  })
})
