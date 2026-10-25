// Rechenkern: Datei rein, Analyse raus. Reines TypeScript, ohne React, läuft komplett auf dem Gerät.
import { analysiere } from './auswerten'
import { leseDatei, type Spaltenzuordnung } from './einlesen'
import { ordneEin, type Optionen } from './erkennen'
import type { Analyse } from './typen'

export { analysiere, art, vergleicheMitSchaetzung } from './auswerten'
export { erkenneSpalten, leseDatei, SpaltenUnbekanntFehler, type Spaltenzuordnung } from './einlesen'
export { ordneEin, type Optionen } from './erkennen'
export { formatEuro, formatProzent } from './format'
export type { EigeneRegel } from './kategorien'
export type * from './typen'

/** Alles in einem Schritt: Datei lesen, einordnen, auswerten. */
export function analysiereDatei(daten: ArrayBuffer, optionen: Optionen & { spalten?: Spaltenzuordnung } = {}): Analyse {
  const eingelesen = leseDatei(daten, optionen.spalten)
  return analysiere(ordneEin(eingelesen, optionen), eingelesen.format)
}
