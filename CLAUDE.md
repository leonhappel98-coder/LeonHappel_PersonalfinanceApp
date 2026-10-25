# Personal Finance App – Projektbriefing für Claude Code

Lies diese Datei zu Beginn jeder Sitzung. Sie beschreibt, was wir bauen, wie, und was nie passieren darf.

## Worum es geht

Eine Finanz-App fürs Handy, die aus einem Kontoexport zeigt, wohin das Geld geht, ob man sein Vermögensziel schafft und was man als Nächstes tun sollte. Sie entsteht in einer YouTube-Reihe: Leon hat **keine Programmiererfahrung** und baut die App per Vibecoding mit dir. Deshalb:

- Erkläre jeden Schritt in einfachen Worten, bevor du ihn machst, und sag am Ende, was Leon jetzt sehen oder testen kann.
- Keine Fachbegriffe ohne kurze Erklärung. Frag nach, bevor du etwas Großes umbaust.
- Arbeite in kleinen Schritten, die man im Video zeigen kann. Nach jedem Schritt muss die App laufen.

App-Name: zentral in `src/config.ts` als `APP_NAME`, aktuell **„Kurs“** (Arbeitsname, wird evtl. „Personal Finance“).

## Unverhandelbare Regeln: Datenschutz

1. **Kontodaten verlassen nie das Gerät.** Kein Upload von Dateien oder Buchungen, keine Analyse-Tools, keine Tracker, keine Cookies. Einzige Ausnahme: die KI-Analyse (Regel 4).
2. **Keine externen Quellen zur Laufzeit.** Schriften selbst ausliefern (`@fontsource/...`), keine CDNs, kein Google Fonts.
3. **Speicher nur lokal:** IndexedDB im Browser. Backup als JSON-Datei, die der Nutzer selbst speichert und wieder einliest.
4. **KI nur mit anonymer Zusammenfassung** (Entscheidung Leon, Phase 3): Die App baut einen Text mit gerundeten Summen (`src/engine/kiPrompt.ts`). Darin nie: Namen, IBAN, Verwendungszweck, einzelne Buchungen, Datum einzelner Buchungen. Gesundheit, Spenden, Kirche, Gewerkschaft, Partei vorher unter „Sonstiges“ zusammenfassen. Zwei Wege:
   - „KI-Prompt kopieren“: Der Nutzer kopiert den Text selbst in sein Claude oder ChatGPT.
   - „KI-Analyse starten“: Die App zeigt **vor jedem Senden** genau diesen Text und schickt ihn erst nach „Senden“ über unseren eigenen KI-Server (`ki-server/`, Cloudflare Worker) an Claude. Der Server speichert und protokolliert keine Inhalte, hält den API-Schlüssel geheim und begrenzt die Anfragen. Ohne Zustimmung geht nichts raus.
5. Prüfe vor jedem Release im Netzwerk-Tab, dass beim Import und ohne „Senden“ keine Anfrage rausgeht.
6. Vor öffentlichem Start (Phase 7): Datenschutzerklärung mit Hinweis auf die KI-Analyse (Empfänger Anthropic, USA) und rechtliche Prüfung.

## Technik

- Vite + React + TypeScript, mobil zuerst (Breite 390 px), läuft auch am Desktop.
- PWA mit `vite-plugin-pwa`: Manifest, Icon, offline nutzbar, „Zum Home-Bildschirm“ auf iPhone.
- CSV: `papaparse`. Excel: SheetJS, installiert über `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (die npm-Version „xlsx“ ist veraltet).
- Speicher: IndexedDB über `idb-keyval` oder `dexie`.
- Tests: `vitest`. Der Rechenkern (`src/engine/`) ist reines TypeScript ohne React und vollständig getestet.
- Hosting später: GitHub Pages über GitHub Actions (Vite `base` passend setzen).
- Git: nach jedem funktionierenden Schritt ein Commit mit klarer deutscher Nachricht.

## Ordnerstruktur

```
src/
  config.ts            App-Name, Schwellenwerte
  engine/              Rechenkern (Import, Kategorien, Auswertung) + Tests
  engine/merchants.de.json   Händlerliste -> Kategorie
  screens/             Start, Analyse, Ergebnis (später Heute, Schritte, Prognose, Budgets, Daten)
  ui/                  Karten, Balken, Buttons
  storage/             IndexedDB, Backup
testdata/              Alex' Beispiel-Exporte + kontrollzahlen.json (nicht ändern)
docs/                  RECHENKERN.md, ROADMAP.md, design/
```

## Design

Vorlage: `docs/design/screens/*.png` und die klickbare Demo `docs/design/klick-demo.html`. Nachbauen, nicht neu erfinden.

| Token | Wert |
| --- | --- |
| Hintergrund | `#1f1e1d` |
| Fläche / Karte | `#2b2a27`, hervorgehoben `#30302d` |
| Rand | `rgba(250,249,245,0.10)`, Linien/Balkenspur `#3d3c38` |
| Text | `#f5f4ee`, zweitrangig `#d6d3ca`, gedämpft `#a5a198` |
| Akzent | `#D97757` (Buttons, aktiver Tab, Balken) |
| Gut / Warnung / Hinweis | `#8fbf8a` / `#f28b82` (Balken `#e5534b`) / `#e3b862` |
| Schriften | Überschriften und große Zahlen: Source Serif 4 (600). Text: IBM Plex Sans. Kleine Labels in Großbuchstaben: IBM Plex Mono |
| Radien | Karten 18–22 px, Buttons 14–16 px, Chips rund |

Regeln: Touch-Ziele ≥ 44 px, Kontrast ≥ 4.5:1, echte `<button>`/`<label>`, Beträge deutsch formatiert („1.360 €“, „39,99 €“). Kleines „DEMO“-Label, wenn Beispieldaten geladen sind.

## Rechenkern

Die genauen Regeln stehen in `docs/RECHENKERN.md`. Kurz: Datei erkennen (Finanzguru-Excel oder Bank-CSV), Buchungen vereinheitlichen, Umbuchungen und Sparen rausrechnen, Verträge/Fixkosten erkennen, Einmaleffekte erkennen, Kategorien zuordnen, Lebenshaltung pro Monat berechnen, Hinweise erzeugen.

**Abnahme:** Beide Dateien in `testdata/` müssen die Werte aus `testdata/kontrollzahlen.json` ergeben (Lebenshaltung 1.360,00 €/Monat, Fixkosten 1.240,00 €/Monat, Einmaleffekte 1.920 €, Sparquote 14 %). Schreib dafür Tests, bevor du die Oberfläche baust.

## Was jetzt dran ist

Phase 1 (siehe `docs/ROADMAP.md`): Start → Analyse → Ergebnis mit echtem Rechenkern. Alles Weitere erst, wenn Leon es sagt.
