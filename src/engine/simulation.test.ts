// „Was wäre, wenn …?“ mit Alex (RECHENKERN.md, Abschnitt 13). Werte decken sich mit Prognose und Schritten.
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { analysiereDatei, type Analyse } from './index'
import { berechnePrognose, type Ziel } from './prognose'
import { simuliere, startRegler, verschiebe } from './simulation'

const alex: Ziel = { depot: 31_800, tagesgeld: 2_400, sparrateProMonat: 420, zielBetrag: 100_000, zielMonat: '2030-07' }
const START = '2026-10'

let analyse: Analyse
beforeAll(() => {
  const inhalt = readFileSync(new URL('../../testdata/kontoexport_alex_finanzguru.xlsx', import.meta.url))
  analyse = analysiereDatei(inhalt.buffer.slice(inhalt.byteOffset, inhalt.byteOffset + inhalt.byteLength) as ArrayBuffer)
})

describe('Was wäre, wenn …? für Alex', () => {
  it('Startwerte: 3.020 € Netto, 2.600 € Ausgaben, 420 € Sparrate, 5 %', () => {
    expect(startRegler(analyse, 420)).toEqual({ gehalt: 3020, ausgaben: 2600, sparrate: 420, rendite: 0.05 })
  })

  it('ohne Änderung genau wie die realistische Prognose: Dez 2034, nichts aus dem Tagesgeld', () => {
    const s = simuliere(alex, startRegler(analyse, 420), START)
    expect(s.prognose.zielErreicht).toBe(berechnePrognose(alex, START, 'realistisch').zielErreicht)
    expect(s.prognose.zielErreicht).toBe('2034-12')
    expect(s.ueberschuss).toBe(420)
    expect(s.ausTagesgeld).toBe(0)
  })

  it('105 € weniger Ausgaben → Sparrate 525 €, Nov 2033 (wie „auswärts essen halbieren“)', () => {
    const r = verschiebe(startRegler(analyse, 420), 'ausgaben', 2495)
    expect(r.sparrate).toBe(525)
    expect(simuliere(alex, r, START).prognose.zielErreicht).toBe('2033-11')
  })

  it('100 € mehr Gehalt → 100 € mehr Sparrate', () => {
    expect(verschiebe(startRegler(analyse, 420), 'gehalt', 3120).sparrate).toBe(520)
  })

  it('7 % Rendite → Dez 2033 (wie „optimistisch“)', () => {
    const r = verschiebe(startRegler(analyse, 420), 'rendite', 0.07)
    expect(simuliere(alex, r, START).prognose.zielErreicht).toBe('2033-12')
  })

  it('Sparrate über dem Überschuss: der Rest müsste aus dem Tagesgeld kommen', () => {
    const r = verschiebe(startRegler(analyse, 420), 'sparrate', 800)
    expect(simuliere(alex, r, START).ausTagesgeld).toBe(380)
  })

  it('Sparrate fällt nie unter 0, auch bei viel höheren Ausgaben', () => {
    expect(verschiebe(startRegler(analyse, 420), 'ausgaben', 3500).sparrate).toBe(0)
  })
})
