// Offizielle Vergleichswerte für den Finanz-Check (RECHENKERN.md, Abschnitt 12).
// Bei neuen Veröffentlichungen hier aktualisieren und die Quelle mitändern.

/**
 * Nettovermögen (Median) privater Haushalte nach Alter der Referenzperson, 2023.
 * Quelle: Deutsche Bundesbank, Vermögensbefragung „Private Haushalte und ihre Finanzen“ (PHF) 2023,
 * Monatsbericht April 2025, Tabellenanhang, Tabelle 2.
 * Achtung: pro Haushalt (nicht pro Person) und inklusive Immobilien.
 */
export const VERMOEGEN_NACH_ALTER = [
  { von: 16, bis: 24, median: 13_000 },
  { von: 25, bis: 34, median: 19_100 },
  { von: 35, bis: 44, median: 75_100 },
  { von: 45, bis: 54, median: 156_200 },
  { von: 55, bis: 64, median: 255_900 },
  { von: 65, bis: 74, median: 211_900 },
  { von: 75, bis: 120, median: 149_400 },
] as const

export const VERMOEGEN_QUELLE = 'Deutsche Bundesbank, Vermögensbefragung 2023 (Median je Haushalt, inkl. Immobilien)'

/** Sparquote der privaten Haushalte in Deutschland 2025 (Anteil am verfügbaren Einkommen). Quelle: Statistisches Bundesamt. */
export const SPARQUOTE_DEUTSCHLAND = 0.105

export const SPARQUOTE_QUELLE = 'Statistisches Bundesamt, Sparquote der privaten Haushalte 2025'
