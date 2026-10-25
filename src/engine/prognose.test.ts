// Abnahme der Prognose mit Alex (RECHENKERN.md, Abschnitt 9). Werte unabhängig nachgerechnet.
import { describe, expect, it } from 'vitest'
import { berechnePrognose, fortschritt, monateZwischen, nettovermoegen, plusMonate, type Ziel } from './prognose'

const alex: Ziel = { depot: 31_800, tagesgeld: 2_400, sparrateProMonat: 420, zielBetrag: 100_000, zielMonat: '2030-07' }
const START = '2026-10'

describe('Prognose für Alex', () => {
  it('Nettovermögen 34.200 €, 34 % vom Ziel', () => {
    expect(nettovermoegen(alex)).toBe(34_200)
    expect(Math.round(fortschritt(alex) * 100)).toBe(34)
  })

  it.each([
    ['vorsichtig', '2036-05', 70],
    ['realistisch', '2034-12', 53],
    ['optimistisch', '2033-12', 41],
  ] as const)('%s: 100k erreicht %s, %i Monate nach dem Ziel', (szenario, monat, spaeter) => {
    const p = berechnePrognose(alex, START, szenario)
    expect(p.zielErreicht).toBe(monat)
    expect(p.monateNachZiel).toBe(spaeter)
  })

  it('erster Monat: Depot wächst um 5 % p. a. und bekommt 420 €', () => {
    const p = berechnePrognose(alex, START, 'realistisch')
    expect(p.verlauf[0]).toEqual({ monat: '2026-10', wert: 34_200 })
    const monatsrendite = 1.05 ** (1 / 12) - 1
    expect(p.verlauf[1].monat).toBe('2026-11')
    expect(p.verlauf[1].wert).toBeCloseTo(31_800 * (1 + monatsrendite) + 420 + 2_400, 6)
  })

  it('Verlauf reicht mindestens bis zum gewünschten Monat', () => {
    const p = berechnePrognose(alex, START, 'optimistisch', '2036-12')
    expect(p.verlauf[p.verlauf.length - 1].monat).toBe('2036-12')
  })
})

describe('Sonderfälle', () => {
  it('Ziel schon erreicht: Startmonat, Monate vor dem Ziel negativ', () => {
    const p = berechnePrognose({ ...alex, depot: 120_000 }, START, 'realistisch')
    expect(p.zielErreicht).toBe(START)
    expect(p.monateNachZiel).toBe(-45)
  })

  it('nicht erreichbar ohne Sparen und mit zu hohem Ziel: null nach 50 Jahren', () => {
    const p = berechnePrognose({ ...alex, depot: 0, sparrateProMonat: 0 }, START, 'optimistisch')
    expect(p.zielErreicht).toBeNull()
    expect(p.monateNachZiel).toBeNull()
    expect(p.verlauf).toHaveLength(50 * 12 + 1)
  })

  it('Monate rechnen über den Jahreswechsel', () => {
    expect(plusMonate('2026-10', 3)).toBe('2027-01')
    expect(plusMonate('2026-12', 1)).toBe('2027-01')
    expect(monateZwischen('2030-07', '2034-12')).toBe(53)
    expect(monateZwischen('2030-07', '2030-03')).toBe(-4)
  })
})
