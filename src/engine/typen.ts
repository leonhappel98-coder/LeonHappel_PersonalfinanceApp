// Datentypen des Rechenkerns (siehe docs/RECHENKERN.md).

export type Kategorie =
  | 'Essen & Trinken'
  | 'Freizeit'
  | 'Shopping'
  | 'Mobilität'
  | 'Sonstiges'
  | 'Wohnen'
  | 'Verträge & Abos'
  | 'Sparen'
  | 'Einnahmen'

export type Turnus = 'monatlich' | 'vierteljaehrlich' | 'halbjaehrlich' | 'jaehrlich' | 'zweiwoechentlich'

/** Eine Buchung im einheitlichen Format, egal aus welcher Datei sie kommt. */
export type Buchung = {
  id: string
  /** YYYY-MM-DD */
  datum: string
  /** Ausgabe negativ, Eingang positiv */
  betrag: number
  gegenpartei: string
  zweck: string
  konto: string
  kategorie?: Kategorie
  unterkategorie?: string
  istVertrag: boolean
  turnus?: Turnus
  /** Gleiche ID = gleicher Vertrag (z. B. zwei Verträge bei derselben Versicherung). */
  vertragsId?: string
  istUmbuchung: boolean
  istSparen: boolean
  istEinmaleffekt: boolean
  zumNachschauen: boolean
}

/** Buchung direkt nach dem Einlesen, bevor der Rechenkern sie einordnet. */
export type Rohbuchung = {
  id: string
  datum: string
  betrag: number
  gegenpartei: string
  zweck: string
  konto: string
  /** IBAN der Gegenpartei, ohne Leerzeichen */
  iban: string
  /** Art der Buchung laut Bank, z. B. „KARTENZAHLUNG“, „DAUERAUFTRAG“, „GELDAUTOMAT“ */
  buchungstext: string
  /** Nur bei Finanzguru: dessen eigene Einordnung. */
  finanzguru?: {
    hauptkategorie: string
    unterkategorie: string
    istVertrag: boolean
    turnus?: Turnus
    vertragsId?: string
    istUmbuchung: boolean
  }
}

export type Dateiformat = 'finanzguru' | 'sparkasse' | 'bank-csv'

export type Einlesergebnis = {
  format: Dateiformat
  buchungen: Rohbuchung[]
  /** IBANs der eigenen Konten, die in der Datei vorkommen (für Umbuchungen). */
  eigeneKonten: string[]
}

export type Vertrag = {
  id: string
  name: string
  /** Betrag pro Abbuchung (positiv) */
  betrag: number
  turnus?: Turnus
  /** Auf einen Monat umgerechnet */
  proMonat: number
  kategorie: Kategorie
  unterkategorie?: string
}

export type Hinweis =
  | { art: 'tarif-pruefen'; text: string; vertrag: Vertrag }
  | { art: 'doppelt'; text: string; vertraege: Vertrag[]; proMonat: number }

export type KategorieSumme = {
  kategorie: Kategorie
  proMonat: number
  unterkategorien: { name: string; proMonat: number }[]
}

export type Analyse = {
  format: Dateiformat
  zeitraum: { von: string; bis: string; tage: number; monate: number }
  anzahl: {
    buchungen: number
    umbuchungen: number
    automatischZugeordnet: number
    zumNachschauen: number
  }
  /** Lebenshaltung pro Monat: alle Ausgaben ohne Verträge, Umbuchungen, Sparen und Einmaleffekte */
  lebenshaltungProMonat: number
  /** Nur die Alltagskategorien, größte zuerst */
  kategorien: KategorieSumme[]
  /** Essen & Trinken: davon Lieferdienste und Restaurants, pro Monat */
  auswaertsEssenProMonat: number
  fixkostenProMonat: number
  /** Fixkosten ÷ Nettoeinkommen, 0–1 */
  fixkostenQuote: number
  vertraege: Vertrag[]
  einmaleffekte: { summe: number; buchungen: Buchung[] }
  nettoeinkommenProMonat: number
  sparenProMonat: number
  /** Sparen ÷ Nettoeinkommen, 0–1 */
  sparquote: number
  hinweise: Hinweis[]
  buchungen: Buchung[]
}
