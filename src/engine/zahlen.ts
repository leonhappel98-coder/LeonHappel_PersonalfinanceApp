// Beträge, Datumsangaben und Text-Kodierung aus Bankdateien verstehen.

/**
 * Liest einen Betrag: „-1.234,56“, „1234.56“, „-11,00 €“ oder schon eine Zahl.
 * Gibt NaN zurück, wenn es keine Zahl ist.
 */
export function leseBetrag(wert: unknown): number {
  if (typeof wert === 'number') return wert
  if (typeof wert !== 'string') return NaN
  let s = wert.replace(/[\s€]|EUR/g, '').replace(/^\+/, '')
  if (s === '') return NaN
  const letztesKomma = s.lastIndexOf(',')
  const letzterPunkt = s.lastIndexOf('.')
  if (letztesKomma > letzterPunkt) {
    // Deutsch: Punkt = Tausender, Komma = Dezimal
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (letzterPunkt > letztesKomma && letztesKomma !== -1) {
    // Englisch: Komma = Tausender, Punkt = Dezimal
    s = s.replace(/,/g, '')
  } else if (letztesKomma === -1 && /^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // Nur Tausenderpunkte, z. B. „1.234“
    s = s.replace(/\./g, '')
  }
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN
}

/** Excel zählt Tage ab dem 30.12.1899. */
function excelSerienzahlZuDatum(zahl: number): string {
  const ms = Date.UTC(1899, 11, 30) + Math.round(zahl) * 86_400_000
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Liest ein Datum: „23.10.26“, „23.10.2026“, „2026-10-23“ oder Excel-Seriennummer.
 * Gibt YYYY-MM-DD zurück oder null.
 */
export function leseDatum(wert: unknown): string | null {
  if (typeof wert === 'number' && wert > 20000 && wert < 80000) return excelSerienzahlZuDatum(wert)
  if (wert instanceof Date && !isNaN(wert.getTime())) return wert.toISOString().slice(0, 10)
  if (typeof wert !== 'string') return null
  const s = wert.trim()

  const deutsch = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(s)
  if (deutsch) {
    const [, t, m, j] = deutsch
    const jahr = j.length === 2 ? 2000 + Number(j) : Number(j)
    return gueltigesDatum(jahr, Number(m), Number(t))
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) return gueltigesDatum(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  if (/^\d{5}(\.\d+)?$/.test(s)) return leseDatum(Number(s))
  return null
}

function gueltigesDatum(jahr: number, monat: number, tag: number): string | null {
  const d = new Date(Date.UTC(jahr, monat - 1, tag))
  if (d.getUTCMonth() !== monat - 1 || d.getUTCDate() !== tag) return null
  return d.toISOString().slice(0, 10)
}

/** Tage zwischen zwei Daten (YYYY-MM-DD). */
export function tageZwischen(von: string, bis: string): number {
  return Math.round((Date.parse(bis) - Date.parse(von)) / 86_400_000)
}

/** Erst UTF-8 versuchen; bei kaputten Zeichen (�) als Windows-1252 lesen. */
export function dekodiereText(daten: ArrayBuffer | Uint8Array): string {
  const utf8 = new TextDecoder('utf-8').decode(daten)
  const text = utf8.includes('�') ? new TextDecoder('windows-1252').decode(daten) : utf8
  return text.replace(/^﻿/, '')
}
