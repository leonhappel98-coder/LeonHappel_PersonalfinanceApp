// Kleine Helfer für Texte auf den Screens.

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

/** „2025-10-24“ → „Okt 2025“ */
export function monatJahr(datum: string): string {
  const [jahr, monat] = datum.split('-')
  return `${MONATE[Number(monat) - 1]} ${jahr}`
}

/** 1284 → „1.284“ */
export function zahl(wert: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(wert)
}

/** Wie das Gerät im Text heißt: „deinem iPhone“, „deinem Handy“ oder „deinem Gerät“. */
export function deinGeraet(): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  if (/iPhone/.test(ua)) return 'deinem iPhone'
  if (/iPad/.test(ua)) return 'deinem iPad'
  if (/Android/.test(ua)) return 'deinem Handy'
  return 'deinem Gerät'
}
