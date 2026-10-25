// Monatlicher Import: neue Buchungen zu den alten dazu, doppelte erkennen (RECHENKERN.md, Abschnitt 14).
import { normalisiere } from './kategorien'
import type { Rohbuchung } from './typen'

export type Zusammengefuehrt = { buchungen: Rohbuchung[]; neu: number; doppelt: number }

/** Gleiche Buchung = gleiches Datum, gleicher Betrag, gleiche Gegenpartei, gleicher Verwendungszweck. */
function schluessel(b: Rohbuchung): string {
  return `${b.datum}|${b.betrag.toFixed(2)}|${normalisiere(b.gegenpartei)}|${normalisiere(b.zweck).slice(0, 80)}`
}

/**
 * Fügt neue Buchungen zu den alten hinzu. Doppelt sind nur Buchungen, die es schon gab:
 * Zwei gleiche Kaffees am selben Tag in derselben Datei bleiben zwei Buchungen.
 */
export function fuegeZusammen(alt: Rohbuchung[], neu: Rohbuchung[]): Zusammengefuehrt {
  const vorhanden = new Map<string, number>()
  for (const b of alt) vorhanden.set(schluessel(b), (vorhanden.get(schluessel(b)) ?? 0) + 1)

  const ids = new Set(alt.map((b) => b.id))
  const hinzu: Rohbuchung[] = []
  let doppelt = 0
  for (const b of neu) {
    const k = schluessel(b)
    const rest = vorhanden.get(k) ?? 0
    if (rest > 0) {
      vorhanden.set(k, rest - 1)
      doppelt++
      continue
    }
    // IDs müssen eindeutig bleiben, auch wenn zwei Dateien gleich nummerieren
    let id = b.id
    for (let n = 2; ids.has(id); n++) id = `${b.id}~${n}`
    ids.add(id)
    hinzu.push({ ...b, id })
  }
  return { buchungen: [...alt, ...hinzu], neu: hinzu.length, doppelt }
}

/** Nur die letzten 12 Monate bis zur neuesten Buchung (erster und letzter Tag zählen mit). */
export function letzte12Monate(buchungen: Rohbuchung[]): Rohbuchung[] {
  if (buchungen.length === 0) return buchungen
  const neueste = buchungen.reduce((max, b) => (b.datum > max ? b.datum : max), buchungen[0].datum)
  const ab = new Date(`${neueste}T00:00:00Z`)
  ab.setUTCFullYear(ab.getUTCFullYear() - 1)
  ab.setUTCDate(ab.getUTCDate() + 1)
  const grenze = ab.toISOString().slice(0, 10)
  return buchungen.filter((b) => b.datum >= grenze)
}
