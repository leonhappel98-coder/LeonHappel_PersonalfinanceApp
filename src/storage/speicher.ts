// Speichert Auswertung und Ziel lokal im Browser (IndexedDB). Nichts verlässt das Gerät.
import { del, get, set } from 'idb-keyval'
import type { Budgets } from '../engine/budgets'
import type { Ziel } from '../engine/prognose'
import type { SchrittId } from '../engine/schritte'
import type { Analyse, Rohbuchung } from '../engine/typen'
import type { KiErgebnis } from '../ki/kiAnalyse'

const SCHLUESSEL = 'kurs-zustand'

/** Ein Import auf dem Tab „Daten“ (für „Letzter Import“) */
export type Import = { datum: string; dateiname: string; gelesen: number; neu: number; doppelt: number }

/** Monats-Check-in: Depotwert an einem Tag */
export type Checkin = { datum: string; depot: number }

export type Gespeichert = {
  version: 1
  analyse: Analyse
  dateiname: string
  istDemo: boolean
  schaetzung: number | null
  ziel?: Ziel
  /** Abgehakte nächste Schritte */
  erledigt?: SchrittId[]
  /** Letzte KI-Analyse, damit sie nicht jedes Mal neu bezahlt werden muss */
  kiErgebnis?: KiErgebnis
  /** Alle eingelesenen Buchungen, damit neue Exporte ergänzt werden können (Phase 6) */
  rohbuchungen?: Rohbuchung[]
  eigeneKonten?: string[]
  importe?: Import[]
  /** Selbst gewählte Budgets; fehlt = Startwerte aus der Auswertung */
  budgets?: Budgets
  checkins?: Checkin[]
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
