// Beträge und Prozente deutsch schreiben: „1.360 €“, „39,99 €“, „14 %“.

const ganz = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 })
const mitCent = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * „auto“ zeigt Cent nur, wenn es welche gibt (1.360 € / 39,99 €),
 * „ganz“ rundet auf ganze Euro, „cent“ zeigt immer zwei Stellen.
 */
export function formatEuro(betrag: number, stellen: 'auto' | 'ganz' | 'cent' = 'auto'): string {
  const gerundet = Math.round(betrag * 100) / 100
  const zeigeCent = stellen === 'cent' || (stellen === 'auto' && !Number.isInteger(gerundet))
  return `${(zeigeCent ? mitCent : ganz).format(gerundet)} €`
}

/** 0,139 → „14 %“ */
export function formatProzent(anteil: number): string {
  return `${Math.round(anteil * 100)} %`
}
