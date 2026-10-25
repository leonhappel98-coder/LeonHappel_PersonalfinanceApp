// Backup als JSON-Datei, die der Nutzer selbst speichert und wieder einliest (CLAUDE.md, Datenschutz-Regel 3).
import type { Gespeichert } from './speicher'

const KENNUNG = 'loewen-finance-backup'

type BackupDatei = { app: typeof KENNUNG; erstellt: string; daten: Gespeichert }

/** Inhalt der Backup-Datei als Text. */
export function erstelleBackup(daten: Gespeichert, jetzt = new Date()): string {
  const datei: BackupDatei = { app: KENNUNG, erstellt: jetzt.toISOString(), daten }
  return JSON.stringify(datei)
}

/** Dateiname wie „loewen-finance-backup-2026-10-25.json“ */
export function backupDateiname(jetzt = new Date()): string {
  return `${KENNUNG}-${jetzt.toISOString().slice(0, 10)}.json`
}

/** Liest eine Backup-Datei. Wirft einen Fehler mit verständlichem Text, wenn es keine ist. */
export function leseBackup(text: string): Gespeichert {
  let datei: Partial<BackupDatei>
  try {
    datei = JSON.parse(text)
  } catch {
    throw new Error('Das ist keine Backup-Datei von Löwen Finance.')
  }
  const daten = datei?.daten
  if (datei?.app !== KENNUNG || !daten || daten.version !== 1 || !Array.isArray(daten.analyse?.buchungen)) {
    throw new Error('Das ist keine Backup-Datei von Löwen Finance.')
  }
  return daten
}

/** Lädt die Backup-Datei herunter. Alles passiert im Browser, nichts geht an einen Server. */
export function ladeBackupHerunter(daten: Gespeichert): void {
  const url = URL.createObjectURL(new Blob([erstelleBackup(daten)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = backupDateiname()
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
