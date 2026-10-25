// Verbindung zum eigenen KI-Server (ki-server/). Wird nur nach „Senden“ im Zustimmungsfenster aufgerufen
// und schickt genau die anonyme Zusammenfassung, die dort angezeigt wurde (CLAUDE.md, Datenschutz-Regel 4).
import { KI_SERVER_URL, KI_ZEITLIMIT_MS } from '../config'

/** Ein Vorschlag von Claude, wie ihn der KI-Server zurückgibt (siehe ki-server/src/index.ts). */
export type KiVorschlag = {
  titel: string
  begruendung: string
  euroProMonat: number
  aufwand: string
  art: 'Ausgaben' | 'Einnahmen' | 'Absicherung' | 'Vermögen'
}

export type KiErgebnis = {
  vorschlaege: KiVorschlag[]
  hinweis: string
  /** Wann die Analyse gemacht wurde (ISO-Zeitpunkt), nur für die Anzeige auf dem Gerät */
  erstellt: string
}

export const kiEingerichtet = () => KI_SERVER_URL !== ''

/** Schickt die Zusammenfassung an den KI-Server. Wirft einen Fehler mit verständlichem Text. */
export async function fordereKiAnalyse(zusammenfassung: string): Promise<KiErgebnis> {
  if (!kiEingerichtet()) throw new Error('Die KI-Analyse ist noch nicht eingerichtet.')

  const abbruch = new AbortController()
  const zeitlimit = setTimeout(() => abbruch.abort(), KI_ZEITLIMIT_MS)
  let antwort: Response
  try {
    antwort = await fetch(`${KI_SERVER_URL}/analyse`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ zusammenfassung }),
      signal: abbruch.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
  } catch {
    throw new Error(
      abbruch.signal.aborted
        ? 'Die KI hat zu lange gebraucht. Versuch es gleich noch mal.'
        : 'Keine Verbindung zur KI. Bist du online?',
    )
  } finally {
    clearTimeout(zeitlimit)
  }

  const daten = (await antwort.json().catch(() => null)) as { vorschlaege?: KiVorschlag[]; hinweis?: string; fehler?: string } | null
  if (!antwort.ok || !daten?.vorschlaege) throw new Error(daten?.fehler ?? 'Die KI-Analyse hat gerade nicht geklappt.')
  return { vorschlaege: daten.vorschlaege, hinweis: daten.hinweis ?? '', erstellt: new Date().toISOString() }
}
