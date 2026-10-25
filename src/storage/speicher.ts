// Speichert Auswertung und Ziel lokal im Browser (IndexedDB). Nichts verlässt das Gerät.
import { del, get, set } from 'idb-keyval'
import type { Ziel } from '../engine/prognose'
import type { Analyse } from '../engine/typen'

const SCHLUESSEL = 'kurs-zustand'

export type Gespeichert = {
  version: 1
  analyse: Analyse
  dateiname: string
  istDemo: boolean
  schaetzung: number | null
  ziel?: Ziel
}

/** Liest den gespeicherten Stand. Ohne Speicher (z. B. privates Surfen) einfach nichts. */
export async function ladeZustand(): Promise<Gespeichert | undefined> {
  try {
    const zustand = await get<Gespeichert>(SCHLUESSEL)
    return zustand?.version === 1 ? zustand : undefined
  } catch {
    return undefined
  }
}

export async function speichereZustand(zustand: Gespeichert): Promise<void> {
  try {
    await set(SCHLUESSEL, zustand)
  } catch {
    // Speichern ist ein Komfort: Klappt es nicht, läuft die App trotzdem weiter.
  }
}

export async function loescheAlles(): Promise<void> {
  try {
    await del(SCHLUESSEL)
  } catch {
    // nichts zu löschen
  }
}
