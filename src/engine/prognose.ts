// Vermögensprognose (RECHENKERN.md, Abschnitt 9).
import { PROGNOSE_MAX_JAHRE, SZENARIO_RENDITE } from '../config'

export type Szenario = keyof typeof SZENARIO_RENDITE

export const SZENARIEN: Szenario[] = ['vorsichtig', 'realistisch', 'optimistisch']

/** Was der Nutzer auf „Ziel festlegen“ eingibt. Monate als „YYYY-MM“. */
export type Ziel = {
  depot: number
  tagesgeld: number
  sparrateProMonat: number
  zielBetrag: number
  zielMonat: string
  /** Für den Altersvergleich im Finanz-Check (optional) */
  geburtsjahr?: number
}

export type Prognose = {
  /** „eigene“ = mit frei gewählter Rendite (Was wäre, wenn …?) */
  szenario: Szenario | 'eigene'
  rendite: number
  /** Nettovermögen je Monat, beginnend mit dem Startmonat */
  verlauf: { monat: string; wert: number }[]
  /** Erster Monat mit Nettovermögen ≥ Ziel, null wenn nicht erreichbar */
  zielErreicht: string | null
  /** Monate nach dem Zielmonat (negativ = früher), null wenn nicht erreichbar */
  monateNachZiel: number | null
}

/** „2026-10“ + 3 → „2027-01“ */
export function plusMonate(monat: string, anzahl: number): string {
  const [jahr, m] = monat.split('-').map(Number)
  const index = jahr * 12 + (m - 1) + anzahl
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/** Monate von „von“ bis „bis“ (positiv, wenn „bis“ später ist). */
export function monateZwischen(von: string, bis: string): number {
  const [j1, m1] = von.split('-').map(Number)
  const [j2, m2] = bis.split('-').map(Number)
  return j2 * 12 + m2 - (j1 * 12 + m1)
}

export function nettovermoegen(ziel: Ziel): number {
  return ziel.depot + ziel.tagesgeld
}

/** Anteil des Ziels, der heute schon erreicht ist (0–1, kann über 1 liegen). */
export function fortschritt(ziel: Ziel): number {
  return ziel.zielBetrag > 0 ? nettovermoegen(ziel) / ziel.zielBetrag : 0
}

/**
 * Rechnet Monat für Monat: Depot wächst mit der Monatsrendite, dann kommt die Sparrate dazu.
 * Das Tagesgeld bleibt gleich. Der Verlauf reicht bis `mindestensBis` (oder bis zum Ziel, falls später).
 */
export function berechnePrognose(ziel: Ziel, startMonat: string, szenario: Szenario, mindestensBis?: string): Prognose {
  return rechnePrognose(ziel, startMonat, SZENARIO_RENDITE[szenario], szenario, mindestensBis)
}

/** Wie berechnePrognose, aber mit beliebiger Jahresrendite (0,05 = 5 %). */
export function rechnePrognose(
  ziel: Ziel,
  startMonat: string,
  rendite: number,
  szenario: Prognose['szenario'] = 'eigene',
  mindestensBis?: string,
): Prognose {
  const monatsrendite = (1 + rendite) ** (1 / 12) - 1
  const maxMonate = PROGNOSE_MAX_JAHRE * 12
  const bisMindestens = mindestensBis ? Math.min(monateZwischen(startMonat, mindestensBis), maxMonate) : 0

  let depot = ziel.depot
  const verlauf = [{ monat: startMonat, wert: depot + ziel.tagesgeld }]
  let zielErreicht: string | null = depot + ziel.tagesgeld >= ziel.zielBetrag ? startMonat : null

  for (let n = 1; n <= maxMonate && (zielErreicht === null || n <= bisMindestens); n++) {
    depot = depot * (1 + monatsrendite) + ziel.sparrateProMonat
    const monat = plusMonate(startMonat, n)
    const wert = depot + ziel.tagesgeld
    verlauf.push({ monat, wert })
    if (zielErreicht === null && wert >= ziel.zielBetrag) zielErreicht = monat
  }

  return {
    szenario,
    rendite,
    verlauf,
    zielErreicht,
    monateNachZiel: zielErreicht ? monateZwischen(ziel.zielMonat, zielErreicht) : null,
  }
}
