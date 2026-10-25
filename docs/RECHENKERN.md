# Rechenkern: Regeln

Alles läuft lokal im Browser. Eingabe: eine Datei. Ausgabe: ein `Analyse`-Objekt, das die Screens anzeigen.

## 1. Datei erkennen und einlesen

| Format | Erkennung | Hinweise |
| --- | --- | --- |
| Finanzguru-Excel (.xlsx) | Kopfzeile enthält `Analyse-Hauptkategorie` | Ein Blatt, eine Zeile pro Buchung, mehrere Konten (`Name Referenzkonto`). Datum als Excel-Datum. |
| Sparkasse-CSV (CAMT V2) | Kopfzeile enthält `Auftragskonto` und `Buchungstag` | Semikolon, Felder in Anführungszeichen, Datum `TT.MM.JJ`, Betrag `-1.234,56`, Kodierung oft Windows-1252. |
| Andere Bank-CSV | sonst | Trennzeichen erkennen (`;` oder `,`), Spalten für Datum, Betrag, Empfänger, Verwendungszweck per Namensliste suchen (z. B. ING: `Buchung`, `Auftraggeber/Empfänger`, `Betrag`; DKB: `Buchungsdatum`, `Zahlungsempfänger*in`, `Betrag (€)`). Findet sich keine Zuordnung: Nutzer wählt die Spalten in einem kleinen Dialog. |

Text-Kodierung: erst UTF-8 versuchen; enthält das Ergebnis `�`, mit `windows-1252` neu dekodieren. Zahlen: Tausenderpunkte entfernen, Komma zu Punkt. Datum: `TT.MM.JJ`, `TT.MM.JJJJ`, ISO und Excel-Seriennummer.

Einheitliches Format:

```ts
type Buchung = {
  id: string; datum: string /* YYYY-MM-DD */; betrag: number /* Ausgabe negativ */;
  gegenpartei: string; zweck: string; konto: string;
  kategorie?: Kategorie; unterkategorie?: string;
  istVertrag: boolean; turnus?: 'monatlich'|'vierteljaehrlich'|'halbjaehrlich'|'jaehrlich'|'zweiwoechentlich';
  istUmbuchung: boolean; istSparen: boolean; istEinmaleffekt: boolean; zumNachschauen: boolean;
}
type Kategorie = 'Essen & Trinken'|'Freizeit'|'Shopping'|'Mobilität'|'Sonstiges'|'Wohnen'|'Verträge & Abos'|'Sparen'|'Einnahmen';
```

## 2. Umbuchungen und Sparen

- Finanzguru: `Analyse-Umbuchung = ja` → Umbuchung.
- Bank-CSV: Umbuchung, wenn die IBAN der Gegenpartei ein eigenes Konto ist, oder Gegenpartei = Kontoinhaber, oder Zweck enthält „Umbuchung“, „Übertrag“, „Uebertrag“.
- Sparen: Unterkategorie `Kapitalanlage`/`Sparen`, oder Gegenpartei/Zweck enthält Broker-Stichworte (Trade Republic, Scalable, comdirect Depot, „Sparplan“, „ETF“).
- Umbuchungen zählen nirgends mit. Sparen zählt nur für die Sparquote.

## 3. Verträge und Fixkosten

- Finanzguru: `Analyse-Vertrag = ja` mit `Analyse-Vertragsturnus`.
- Bank-CSV: Vertrag, wenn dieselbe Gegenpartei mindestens 3-mal vorkommt, Beträge höchstens 5 % auseinander, Abstände passen zu monatlich (27–33 Tage), vierteljährlich (85–95) oder jährlich. Miete: Dauerauftrag mit größtem regelmäßigem Betrag oder Stichwort „Miete“.
- Fixkosten pro Monat = Summe der Vertragsausgaben im Zeitraum ÷ Monate im Zeitraum (ohne Sparen).
- Fixkostenquote = Fixkosten ÷ Nettoeinkommen pro Monat. Nettoeinkommen = regelmäßige Gehaltseingänge (Unterkategorie `Lohn / Gehalt` oder größter monatlicher Eingang).

## 4. Einmaleffekte

Eine Ausgabe ist Einmaleffekt, wenn sie kein Vertrag ist und
- Unterkategorie `Urlaub` hat, oder
- mindestens 300 € beträgt (Schwelle in `config.ts`).
Einmaleffekte werden in der Lebenshaltung nicht mitgezählt, aber im Ergebnis aufgelistet („Rausgerechnet“).

## 5. Kategorien für die Anzeige

Finanzguru-Hauptkategorie → App-Kategorie:

| Finanzguru | App |
| --- | --- |
| Essen & Trinken | Essen & Trinken |
| Freizeit | Freizeit |
| Lifestyle (ohne Verträge) | Shopping |
| Mobilitaet | Mobilität |
| Drogerie, Sonstiges, Gesundheit, Haustiere, Kinder, Finanzen | Sonstiges |
| Wohnen, Versicherungen und alle Verträge | Fixkosten (Wohnen bzw. Verträge & Abos) |
| Sparen | Sparen |
| Einnahmen | Einnahmen |

Bank-CSV: Gegenpartei und Zweck gegen `merchants.de.json` prüfen (Stichwort → Kategorie, Groß/Klein egal, z. B. „rewe“, „edeka“, „aldi“, „lidl“ → Essen & Trinken; „lieferando“, „wolt“, „uber eats“ → Essen & Trinken/Lieferservice; „db vertrieb“, „mvg“, „tier“, „lime“, „uber bv“, „freenow“ → Mobilität; „amazon“, „zalando“, „h&m“, „ikea“ → Shopping; „dm-drogerie“, „rossmann“ → Sonstiges). Mindestens 300 deutsche Händler. `GELDAUTOMAT` im Buchungstext → Sonstiges/Bargeld. PayPal: Händler aus dem Zweck lesen („Ihr Einkauf bei …“). Nichts gefunden → `zumNachschauen = true`, Kategorie Sonstiges. Was der Nutzer zuordnet, wird als lokale Regel gespeichert und beim nächsten Import angewendet.

## 6. Ergebnis

- Zeitraum = erster bis letzter Buchungstag; Monate = Tage ÷ 365 × 12.
- **Lebenshaltung pro Monat** = Summe aller Ausgaben ohne Verträge, Umbuchungen, Sparen, Einmaleffekte ÷ Monate.
- Je Kategorie dasselbe; bei Essen & Trinken zusätzlich „davon Lieferdienste und Restaurants“.
- Vergleich mit der Schätzung des Nutzers: Differenz pro Monat und pro Jahr.
- Sparquote = Sparen pro Monat ÷ Nettoeinkommen.

## 7. Hinweise

- Mobilfunk-Vertrag über 25 €/Monat → „Tarif prüfen“.
- Zwei oder mehr Streaming-Verträge (Netflix, Disney+, Prime Video, WOW, Paramount+, Apple TV, DAZN, Joyn) → „doppelt?“.
- Kategorie deutlich über dem Vorjahresschnitt → später (Phase 2).

## 8. Abnahme mit den Testdaten

| Wert | Finanzguru-Excel | Sparkasse-CSV |
| --- | --- | --- |
| Buchungen | 1.284 | 1.265 |
| Umbuchungen | 38 | 19 |
| Lebenshaltung | 1.360,00 €/Monat | 1.360,00 €/Monat (±1 €) |
| Fixkosten | 1.240,00 €/Monat | 1.240,00 €/Monat (±1 €) |
| Einmaleffekte | 1.920 € (Waschmaschine 520, Flug 520, Hotel 880) | gleich |
| Sparquote | 14 % | 14 % |
| Hinweise | Handy 39,99 € „Tarif prüfen“; Netflix + Disney+ „doppelt?“ | gleich |

Kategorien pro Monat (Finanzguru): Essen & Trinken 520 (davon Lieferdienst/Restaurants 210), Freizeit 260, Shopping 240, Mobilität 170, Sonstiges 170. Die CSV darf bei den Kategorien abweichen, solange die Summe stimmt; Buchungen wie „Jonas Keller“ oder PayPal ohne erkennbaren Händler landen unter „Zum Nachschauen“.

## 9. Prognose (Phase 2)

Eingabe: Depotwert, Tagesgeld (flüssig), Sparrate pro Monat (vorbelegt mit „Sparen pro Monat“ aus der Auswertung), Zielbetrag, Zielmonat.

- Nettovermögen heute = Depotwert + Tagesgeld.
- Jeden Monat: Depot wächst mit der Monatsrendite `(1 + Jahresrendite)^(1/12) − 1`, danach kommt die Sparrate dazu (am Monatsende). Das Tagesgeld bleibt gleich (keine Zinsen).
- Die Sparrate bleibt gleich (keine jährliche Steigerung).
- Szenarien (Jahresrendite, Schwellen in `config.ts`): vorsichtig 3 %, realistisch 5 %, optimistisch 7 %.
- Ziel erreicht = erster Monat, in dem Depot + Tagesgeld ≥ Zielbetrag. Abstand zum Zielmonat in Monaten (positiv = später, negativ = früher). Nach 50 Jahren ohne Erreichen: „nicht erreichbar“.
- Fortschritt = Nettovermögen heute ÷ Zielbetrag.

Ehrlich rechnen: Die Design-Bilder zeigen für Alex „Okt 2030“; mit seinen echten Zahlen (Sparplan 420 €/Monat) kommt etwas Späteres heraus. Die App zeigt das echte Ergebnis.

Abnahme mit Alex (Start Okt 2026, Depot 31.800 €, Tagesgeld 2.400 €, Sparrate 420 €, Ziel 100.000 € bis Juli 2030): Die Werte stehen in `src/engine/prognose.test.ts` und wurden unabhängig nachgerechnet.
