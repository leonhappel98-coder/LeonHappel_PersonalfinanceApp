// Rechenkern: Datei rein, Analyse raus. Reines TypeScript, ohne React, läuft komplett auf dem Gerät.
import { analysiere } from './auswerten'
import { leseDatei, type Spaltenzuordnung } from './einlesen'
import { ordneEin, type Optionen } from './erkennen'
import type { Analyse, Einlesergebnis } from './typen'
import { letzte12Monate } from './zusammenfuehren'

export { analysiere, art, vergleicheMitSchaetzung } from './auswerten'
export { erkenneSpalten, leseDatei, SpaltenUnbekanntFehler, type Spaltenzuordnung } from './einlesen'
export { ordneEin, type Optionen } from './erkennen'
export { formatEuro, formatProzent } from './format'
export type { EigeneRegel } from './kategorien'
export type * from './typen'
export { fuegeZusammen, letzte12Monate } from './zusammenfuehren'

/** Wertet eingelesene (oder zusammengeführte) Buchungen aus, immer über die letzten 12 Monate. */
export function werteAus(eingelesen: Einlesergebnis, optionen: Optionen = {}): Analyse {
  const zeitraum = { ...eingelesen, buchungen: letzte12Monate(eingelesen.buchungen) }
  return analysiere(ordneEin(zeitraum, optionen), eingelesen.format)
}

/** Alles in einem Schritt: Datei lesen, einordnen, auswerten. */
export function analysiereDatei(daten: ArrayBuffer, optionen: Optionen & { spalten?: Spaltenzuordnung } = {}): Analyse {
  return werteAus(leseDatei(daten, optionen.spalten), optionen)
}
