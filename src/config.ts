// Zentrale Einstellungen der App. Hier ändern, nicht verteilt im Code.

/** Name der App. „Leon“ heißt „Löwe“, daher der kleine Löwe im Icon. */
export const APP_NAME = 'Löwen Finance'

/** Wird oben auf dem Start-Screen als „by …“ gezeigt. */
export const APP_AUTOR = 'Leon Happel'

/** Hintergrundfarbe für Home-Bildschirm, Startbild und Browser-Leiste (wie --hintergrund in index.css). */
export const APP_HINTERGRUND = '#0e1628'

/** Kurzbeschreibung für den Home-Bildschirm und die Suche. */
export const APP_BESCHREIBUNG = 'Zeigt aus deinem Kontoexport, wohin dein Geld geht. Alles bleibt auf deinem Gerät.'

/** Ab diesem Betrag (in €) gilt eine Ausgabe ohne Vertrag als Einmaleffekt. */
export const EINMALEFFEKT_SCHWELLE = 300

/** Ab diesem Monatsbetrag (in €) bekommt ein Handyvertrag den Hinweis „Tarif prüfen“. */
export const MOBILFUNK_TARIF_GRENZE = 25

/** Angenommene Jahresrendite des Depots je Szenario (Prognose, Phase 2). Annahmen, keine Garantie. */
export const SZENARIO_RENDITE = {
  vorsichtig: 0.03,
  realistisch: 0.05,
  optimistisch: 0.07,
} as const

/** So weit rechnet die Prognose höchstens voraus. */
export const PROGNOSE_MAX_JAHRE = 50

/** Nächste Schritte (Phase 3) */
export const SCHRITTE = {
  /** So viel kostet ein günstiger Handytarif im Monat (€). */
  mobilfunkZieltarif: 15,
  /** Ab so viel €/Monat für Lieferdienste und Restaurants wird „halbieren“ vorgeschlagen. */
  auswaertsMindestens: 50,
  /** Notgroschen = so viele Monate Lebenshaltung + Fixkosten. */
  notgroschenMonate: 3,
} as const
