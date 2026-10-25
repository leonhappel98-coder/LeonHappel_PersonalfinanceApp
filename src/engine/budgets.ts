// Budgets mit Tempo-Markierung (RECHENKERN.md, Abschnitt 15).
import { art } from './auswerten'
import type { Ampel } from './finanzCheck'
import type { Analyse, Kategorie } from './typen'

/** Monatsbudget je Kategorie in Euro */
export type Budgets = Partial<Record<Kategorie, number>>

/** Kategorien mit frei wählbarem Budget, in der Reihenfolge des Designs */
export const BUDGET_KATEGORIEN: Kategorie[] = ['Essen & Trinken', 'Mobilität', 'Freizeit', 'Shopping', 'Sonstiges']
const FIX_KATEGORIEN: Kategorie[] = ['Wohnen', 'Verträge & Abos']

/** Startwert: 10 % unter dem Monatsdurchschnitt, abgerundet auf 10 € (Entscheidung Leon). */
export function startBudgets(analyse: Analyse): Budgets {
  const budgets: Budgets = {}
  for (const kategorie of BUDGET_KATEGORIEN) {
    const schnitt = analyse.kategorien.find((k) => k.kategorie === kategorie)?.proMonat ?? 0
    budgets[kategorie] = Math.floor((schnitt * 0.9) / 10) * 10
  }
  return budgets
}

export type BudgetZeile = { kategorie: Kategorie; ausgegeben: number; budget: number; fix: boolean; ampel: Ampel }

export type BudgetMonat = {
  monat: string
  tag: number
  tageImMonat: number
  /** Anteil des Monats, der vorbei ist (0–1): die Tempo-Markierung */
  tempo: number
  zeilen: BudgetZeile[]
  summeBudget: number
  summeAusgegeben: number
  frei: number
  satz: string
}

const KURZ: Partial<Record<Kategorie, string>> = { 'Essen & Trinken': 'Essen' }
const kurz = (k: Kategorie) => KURZ[k] ?? k

function ampel(ausgegeben: number, budget: number, tempo: number): Ampel {
  if (budget <= 0) return ausgegeben > 0 ? 'warnung' : 'gut'
  const anteil = ausgegeben / budget
  return anteil <= tempo ? 'gut' : anteil <= 1 ? 'hinweis' : 'warnung'
}

/**
 * Budgets für den aktuellen Monat. Gibt es darin noch keine Buchungen, zählt der Monat der neuesten Buchung
 * (dann komplett vorbei). Ausgaben = alles außer Umbuchungen, Sparen und Fixkosten, auch Einmaleffekte.
 */
export function budgetMonat(analyse: Analyse, budgets: Budgets, heute: string): BudgetMonat {
  const neueste = analyse.zeitraum.bis
  const monat = analyse.buchungen.some((b) => b.datum.startsWith(heute.slice(0, 7))) ? heute.slice(0, 7) : neueste.slice(0, 7)
  const [jahr, m] = monat.split('-').map(Number)
  const tageImMonat = new Date(Date.UTC(jahr, m, 0)).getUTCDate()
  const tag = monat === heute.slice(0, 7) ? Number(heute.slice(8, 10)) : tageImMonat
  const tempo = tag / tageImMonat

  const imMonat = analyse.buchungen.filter((b) => b.datum.startsWith(monat) && b.betrag < 0)
  const summe = (kategorie: Kategorie, fix: boolean) =>
    -imMonat
      .filter((b) => b.kategorie === kategorie && (fix ? art(b) === 'fixkosten' : art(b) === 'lebenshaltung' || art(b) === 'einmaleffekt'))
      .reduce((s, b) => s + b.betrag, 0)
  const fixSchnitt = (kategorie: Kategorie) =>
    -analyse.buchungen.filter((b) => b.kategorie === kategorie && art(b) === 'fixkosten').reduce((s, b) => s + b.betrag, 0) /
    Math.max(analyse.zeitraum.monate, 1)

  const variabel: BudgetZeile[] = BUDGET_KATEGORIEN.map((kategorie) => {
    const ausgegeben = summe(kategorie, false)
    const budget = budgets[kategorie] ?? 0
    return { kategorie, ausgegeben, budget, fix: false, ampel: ampel(ausgegeben, budget, tempo) }
  })
  const fix: BudgetZeile[] = FIX_KATEGORIEN.map((kategorie) => ({
    kategorie,
    ausgegeben: summe(kategorie, true),
    budget: Math.round(fixSchnitt(kategorie)),
    fix: true,
    ampel: 'gut',
  }))

  const summeBudget = variabel.reduce((s, z) => s + z.budget, 0)
  const summeAusgegeben = variabel.reduce((s, z) => s + z.ausgegeben, 0)
  return {
    monat,
    tag,
    tageImMonat,
    tempo,
    zeilen: [...fix, ...variabel],
    summeBudget,
    summeAusgegeben,
    frei: summeBudget - summeAusgegeben,
    satz: beschreibe(variabel, summeAusgegeben, summeBudget, tempo),
  }
}

/** „Fast im Plan. Mobilität und Freizeit sind drüber, Shopping hat noch 126 € Luft.“ */
function beschreibe(zeilen: BudgetZeile[], ausgegeben: number, budget: number, tempo: number): string {
  const anteil = budget > 0 ? ausgegeben / budget : 0
  const lage = anteil <= tempo ? 'Gut im Plan.' : anteil <= 1 ? 'Fast im Plan.' : 'Über dem Budget.'
  const drueber = zeilen.filter((z) => z.ausgegeben > z.budget).map((z) => kurz(z.kategorie))
  const luft = zeilen.filter((z) => z.budget - z.ausgegeben > 0).sort((a, b) => b.budget - b.ausgegeben - (a.budget - a.ausgegeben))[0]
  const teile: string[] = []
  if (drueber.length > 0) {
    const namen = drueber.length === 1 ? drueber[0] : `${drueber.slice(0, -1).join(', ')} und ${drueber.at(-1)}`
    teile.push(`${namen} ${drueber.length === 1 ? 'ist' : 'sind'} drüber`)
  }
  if (luft) teile.push(`${kurz(luft.kategorie)} hat noch ${Math.round(luft.budget - luft.ausgegeben)} € Luft`)
  return teile.length > 0 ? `${lage} ${teile.join(', ')}.` : lage
}
