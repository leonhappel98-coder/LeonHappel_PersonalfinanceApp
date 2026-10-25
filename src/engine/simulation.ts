// „Was wäre, wenn …?“: Regler für Gehalt, Ausgaben, Sparrate und Rendite (RECHENKERN.md, Abschnitt 13).
import { rechnePrognose, type Prognose, type Ziel } from './prognose'
import type { Analyse } from './typen'

/** Alle Werte pro Monat in Euro, Rendite als Anteil (0,05 = 5 %). */
export type Regler = { gehalt: number; ausgaben: number; sparrate: number; rendite: number }

export type Simulation = {
  prognose: Prognose
  /** Gehalt − Ausgaben: so viel bleibt im Monat übrig */
  ueberschuss: number
  /** So viel der Sparrate müsste aus dem Tagesgeld kommen, weil der Überschuss nicht reicht */
  ausTagesgeld: number
}

/** Startwerte aus der Auswertung: heutiges Netto, laufende Kosten, Sparrate (inkl. erledigter Schritte), 5 % Rendite. */
export function startRegler(analyse: Analyse, sparrate: number): Regler {
  return {
    gehalt: Math.round(analyse.nettoeinkommenProMonat),
    ausgaben: Math.round(analyse.lebenshaltungProMonat + analyse.fixkostenProMonat),
    sparrate: Math.round(sparrate),
    rendite: 0.05,
  }
}

/**
 * Verschiebt einen Regler. Gehalt und Ausgaben sind mit der Sparrate gekoppelt:
 * Mehr Gehalt oder weniger Ausgaben fließen ins Depot, und umgekehrt (nie unter 0).
 */
export function verschiebe(regler: Regler, feld: keyof Regler, wert: number): Regler {
  if (feld === 'gehalt') return { ...regler, gehalt: wert, sparrate: Math.max(0, regler.sparrate + (wert - regler.gehalt)) }
  if (feld === 'ausgaben') return { ...regler, ausgaben: wert, sparrate: Math.max(0, regler.sparrate - (wert - regler.ausgaben)) }
  return { ...regler, [feld]: wert }
}

export function simuliere(ziel: Ziel, regler: Regler, startMonat: string, mindestensBis?: string): Simulation {
  const ueberschuss = regler.gehalt - regler.ausgaben
  return {
    prognose: rechnePrognose({ ...ziel, sparrateProMonat: regler.sparrate }, startMonat, regler.rendite, 'eigene', mindestensBis),
    ueberschuss,
    ausTagesgeld: Math.max(0, regler.sparrate - Math.max(0, ueberschuss)),
  }
}
