# Rechenkern: Regeln

Alles läuft lokal im Browser. Eingabe: eine Datei. Ausgabe: ein `Analyse`-Objekt, das die Screens anzeigen.

## 1. Datei erkennen und einlesen

| Format | Erkennung | Hinweise |
| --- | --- | --- |
| Finanzguru-Excel (.xlsx) | Kopfzeile enthält `Analyse-Hauptkategorie` | Ein Blatt, eine Zeile pro Buchung, mehrere Konten (`Name Referenzkonto`). Datum als Excel-Datum. |
| Sparkasse-CSV (CAMT V2) | Kopfzeile enthält `Auftragskonto` und `Buchungstag` | Semikolon, Felder in Anführungszeichen, Datum `TT.MM.JJ`, Betrag `-1.234,56`, Kodierung oft Windows-1252. |
| ING, DKB (neu und alt), Volksbank, comdirect | typische Spaltennamen (siehe `testdata/banken/README.md`) | DKB neu: Zahler und Empfänger getrennt, bei Eingängen ist der Zahler die Gegenpartei. comdirect: Name, IBAN und Zweck stehen im Buchungstext („Auftraggeber:“, „Empfänger:“, „Kto/IBAN:“, „Buchungstext:“). Tests: `src/engine/banken.test.ts`. |
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

## 10. Nächste Schritte (Phase 3)

Die App schlägt Schritte aus Auswertung und Ziel vor. Jeder Schritt hat eine Wirkung in €/Monat (außer Absicherung). Gespartes Geld fließt annahmegemäß zusätzlich ins Depot.

| Schritt | Wann | Wirkung pro Monat |
| --- | --- | --- |
| Notgroschen aufbauen (Absicherung) | Tagesgeld < 3 × (Lebenshaltung + Fixkosten) | keine; Text: „Flüssig sind X €, das reicht für N Tage.“ plus die noch offenen Etappen (500 €, 1.000 €, ein Monat, drei Monate), z. B. „Erst einen Monat (2.600 €), dann drei Monate.“ |
| Handytarif wechseln | Hinweis „Tarif prüfen“ (Mobilfunk > 25 €) | Betrag − 15 € (Zieltarif in `config.ts`) |
| Ein Streaming-Abo kündigen | Hinweis „doppelt?“ | Betrag des teuersten Streaming-Abos |
| Lieferdienste und Restaurants halbieren | Auswärts essen ≥ 50 €/Monat | Hälfte davon |

- „Ziel X Monate früher“ = Monate bis zum Ziel (realistisch) mit heutiger Sparrate minus Monate mit Sparrate + Wirkung.
- Erledigte Schritte zählen zur Sparrate („So wie jetzt“, Heute, Prognose). „Mit allen Schritten“ rechnet zusätzlich alle offenen Schritte ein.
- „Diese Woche“ bekommen der Notgroschen und der offene Ausgaben-Schritt mit der größten Wirkung.

Abnahme mit Alex (Sparrate 420 €, realistisch Dez 2034): Handytarif +24,99 € → 3 Monate früher; Streaming +13,99 € → 2 Monate früher; Auswärts essen +105 € → 13 Monate früher; Notgroschen 7.800 €, 2.400 € reichen für 28 Tage; alle offenen Schritte zusammen +143,98 € → Jul 2033.

## 11. KI-Prompt (Phase 3)

Ein Text, den der Nutzer selbst in sein Claude oder ChatGPT kopiert. Die App sendet nichts.

- Drin: Zeitraum in Monaten, Nettoeinkommen, Lebenshaltung je Kategorie und Unterkategorie, Fixkosten je Unterkategorie, Einmaleffekte als eine Summe, Sparquote, Fixkostenquote, Vermögen, Ziel, Prognose (Jahr/Monat), Hinweise ohne Händlernamen.
- Gerundet: Monatsbeträge auf 10 €, Vermögen und Ziel auf 1.000 €, Quoten auf ganze Prozent.
- Nie drin: Namen (auch keine Händler), IBAN, Verwendungszweck, einzelne Buchungen, Datum einzelner Buchungen.
- Sensible Unterkategorien (Gesundheit, Arzt, Apotheke, Spenden, Kirche, Gewerkschaft, Partei, Mitgliedschaften) werden vorher unter „Sonstiges“ zusammengefasst.

## 12. Finanz-Check (Phase 4)

| Kennzahl | Rechnung | grün | gelb | rot |
| --- | --- | --- | --- | --- |
| Notgroschen | Tagesgeld ÷ (Lebenshaltung + Fixkosten) pro Monat, in Monaten | ab 3 | 1 bis unter 3 | unter 1 |
| Sparquote | Sparen ÷ Nettoeinkommen (Abschnitt 6) | ab 10,5 % (Deutschland-Schnitt) | 5 bis 10,5 % | unter 5 % |
| Fixkostenquote | Fixkosten ÷ Nettoeinkommen (Abschnitt 3) | bis 35 % | bis 50 % | über 50 % |

Grenzen in `config.ts` (`AMPEL`). Vergleichswerte mit Quelle in `src/engine/vergleichswerte.ts`:

- Sparquote Deutschland 2025: 10,5 % (Statistisches Bundesamt).
- Nettovermögen nach Alter (Median je Haushalt, inkl. Immobilien), Bundesbank-Vermögensbefragung 2023: 16–24: 13.000 €, 25–34: 19.100 €, 35–44: 75.100 €, 45–54: 156.200 €, 55–64: 255.900 €, 65–74: 211.900 €, ab 75: 149.400 €. Alter = aktuelles Jahr − Geburtsjahr (Eingabe in „Dein Ziel“, freiwillig).

Abnahme mit Alex (Geburtsjahr 1997): Notgroschen 0,9 Monate (rot), Sparquote 14 % (grün), Fixkosten 41 % (gelb), Altersgruppe 25–34 mit Median 19.100 €, Alex 34.200 €.

## 13. Was wäre, wenn …? (Phase 5)

Vier Regler, Startwerte aus Auswertung und Ziel: Netto-Gehalt (Nettoeinkommen pro Monat), Ausgaben (Lebenshaltung + Fixkosten pro Monat), Sparrate (inkl. erledigter Schritte), Rendite 5 %.

- Gekoppelt (Entscheidung Leon): Gehalt +X € → Sparrate +X €; Ausgaben −X € → Sparrate +X €. Die Sparrate fällt nie unter 0 und kann danach frei verschoben werden.
- Prognose wie Abschnitt 9, mit der gewählten Sparrate und Rendite (`rechnePrognose`).
- Überschuss = Gehalt − Ausgaben. Ist die Sparrate höher, zeigt die App den Rest als „aus dem Tagesgeld“.
- Die Regler werden nicht gespeichert (Spielwiese).

Abnahme mit Alex: ohne Änderung Dez 2034 (= realistisch); Ausgaben 2.495 € → Sparrate 525 € → Nov 2033 (= Schritt „auswärts essen halbieren“); Rendite 7 % → Dez 2033 (= optimistisch); Sparrate 800 € → 380 € aus dem Tagesgeld.

## 14. Monatlicher Import (Phase 6)

- Neue Exporte ergänzen die gespeicherten Buchungen (Entscheidung Leon). Doppelt = gleiches Datum, gleicher Betrag, gleiche Gegenpartei, gleicher Verwendungszweck – verglichen wird nur alt gegen neu, gleiche Buchungen innerhalb einer Datei bleiben.
- Die Auswertung rechnet immer über die letzten 12 Monate bis zur neuesten Buchung (`letzte12Monate`), Abschnitt 6 gilt unverändert.
- Verträge werden pro Buchung erkannt: Finanzguru-Buchungen bringen sie mit, Bankbuchungen nach Abschnitt 3. So funktionieren auch gemischte Importe.

Abnahme: Finanzguru-Excel, dann Sparkasse-CSV von Alex → 1.265 doppelt, 0 neu, weiter 1.284 Buchungen und 1.360 € Lebenshaltung.
