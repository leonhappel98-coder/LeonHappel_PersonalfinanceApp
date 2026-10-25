// Abnahme des Finanz-Checks mit Alex (RECHENKERN.md, Abschnitt 12).
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { erstelleFinanzCheck } from './finanzCheck'
import { analysiereDatei, type Analyse } from './index'
import type { Ziel } from './prognose'

const alex: Ziel = { depot: 31_800, tagesgeld: 2_400, sparrateProMonat: 420, zielBetrag: 100_000, zielMonat: '2030-07', geburtsjahr: 1997 }

let analyse: Analyse
beforeAll(() => {
  const inhalt = readFileSync(new URL('../../testdata/kontoexport_alex_finanzguru.xlsx', import.meta.url))
  analyse = analysiereDatei(inhalt.buffer.slice(inhalt.byteOffset, inhalt.byteOffset + inhalt.byteLength) as ArrayBuffer)
})

describe('Finanz-Check für Alex', () => {
  it('Notgroschen 0,9 Monate (2.400 € ÷ 2.600 €): rot', () => {
    const { notgroschen } = erstelleFinanzCheck(analyse, alex, 2026)
    expect(notgroschen.monate).toBeCloseTo(2400 / 2600, 6)
    expect(notgroschen.ziel).toBe(3)
    expect(notgroschen.ampel).toBe('warnung')
  })

  it('Sparquote 14 % über dem Deutschland-Schnitt 10,5 %: grün', () => {
    const { sparquote } = erstelleFinanzCheck(analyse, alex, 2026)
    expect(Math.round(sparquote.wert * 100)).toBe(14)
    expect(sparquote.deutschland).toBe(0.105)
    expect(sparquote.ampel).toBe('gut')
  })

  it('Fixkosten 41 % vom Netto: gelb', () => {
    const { fixkosten } = erstelleFinanzCheck(analyse, alex, 2026)
    expect(Math.round(fixkosten.wert * 100)).toBe(41)
    expect(fixkosten.ampel).toBe('hinweis')
  })

  it('Altersvergleich: 29 Jahre, Gruppe 25–34, Median 19.100 €, Alex 34.200 €', () => {
    expect(erstelleFinanzCheck(analyse, alex, 2026).vermoegen).toEqual({ alter: 29, gruppe: '25–34', median: 19_100, deins: 34_200 })
  })
})

describe('Grenzen und Sonderfälle', () => {
  it('Ampel-Grenzen beim Notgroschen: 3 Monate grün, 1 Monat gelb', () => {
    const kosten = analyse.lebenshaltungProMonat + analyse.fixkostenProMonat
    expect(erstelleFinanzCheck(analyse, { ...alex, tagesgeld: kosten * 3 }, 2026).notgroschen.ampel).toBe('gut')
    expect(erstelleFinanzCheck(analyse, { ...alex, tagesgeld: kosten }, 2026).notgroschen.ampel).toBe('hinweis')
  })

  it('Altersgruppen am Rand: 24 → 16–24, 80 → ab 75', () => {
    expect(erstelleFinanzCheck(analyse, { ...alex, geburtsjahr: 2002 }, 2026).vermoegen?.gruppe).toBe('16–24')
    expect(erstelleFinanzCheck(analyse, { ...alex, geburtsjahr: 1946 }, 2026).vermoegen).toMatchObject({ gruppe: 'ab 75', median: 149_400 })
  })

  it('ohne Geburtsjahr oder unter 16 kein Altersvergleich', () => {
    expect(erstelleFinanzCheck(analyse, { ...alex, geburtsjahr: undefined }, 2026).vermoegen).toBeNull()
    expect(erstelleFinanzCheck(analyse, { ...alex, geburtsjahr: 2015 }, 2026).vermoegen).toBeNull()
  })
})
