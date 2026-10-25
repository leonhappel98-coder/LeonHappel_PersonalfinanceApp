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

const MONATE_LANG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

/** „2030-07“ → „Juli 2030“ */
export function monatJahrLang(monat: string): string {
  const [jahr, m] = monat.split('-')
  return `${MONATE_LANG[Number(m) - 1]} ${jahr}`
}

/** Aktueller Monat als „YYYY-MM“ */
export function aktuellerMonat(): string {
  const heute = new Date()
  return `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, '0')}`
}

/** 100000 → „100k“, 34200 → „34,2k“, 1500000 → „1,5 Mio.“ */
export function kurzEuro(betrag: number): string {
  const format = (wert: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(wert)
  if (Math.abs(betrag) >= 1_000_000) return `${format(betrag / 1_000_000)} Mio.`
  if (Math.abs(betrag) >= 1_000) return `${format(betrag / 1_000)}k`
  return format(betrag)
}

/** 53 → „4 Jahre und 5 Monate“, 3 → „3 Monate“, 12 → „1 Jahr“ */
export function dauer(monate: number): string {
  const jahre = Math.floor(monate / 12)
  const rest = monate % 12
  const teilJahre = jahre === 0 ? '' : jahre === 1 ? '1 Jahr' : `${jahre} Jahre`
  const teilMonate = rest === 0 ? '' : rest === 1 ? '1 Monat' : `${rest} Monate`
  return [teilJahre, teilMonate].filter(Boolean).join(' und ') || '0 Monate'
}

/** „Guten Morgen“, „Guten Tag“ oder „Guten Abend“ */
export function begruessung(): string {
  const stunde = new Date().getHours()
  if (stunde < 11) return 'Guten Morgen'
  if (stunde < 18) return 'Guten Tag'
  return 'Guten Abend'
}
