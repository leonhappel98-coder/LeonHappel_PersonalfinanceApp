# Erster Prompt für Claude Code

In Claude Code einfügen, nachdem du diesen Ordner geöffnet hast:

---

Hallo! Lies zuerst `CLAUDE.md`, `docs/RECHENKERN.md` und `docs/ROADMAP.md` und schau dir die Bilder in `docs/design/screens/` an. Ich habe keine Programmiererfahrung, erklär mir also bitte jeden Schritt in einfachen Worten.

Wir bauen Phase 1:

1. Richte das Projekt ein (Vite, React, TypeScript, PWA, Tests) und mach einen ersten Git-Commit.
2. Baue den Rechenkern in `src/engine/` nach `docs/RECHENKERN.md` und schreib Tests mit den beiden Dateien in `testdata/`. Die Tests müssen die Werte aus `testdata/kontrollzahlen.json` treffen. Zeig mir das Testergebnis.
3. Baue die drei Screens Start, Analyse und Ergebnis genau nach den Design-Bildern, mit echten Werten aus dem Rechenkern. Auf dem Start-Screen gibt es zusätzlich „Mit Beispieldaten ausprobieren“, das Alex' Finanzguru-Datei lädt.
4. Starte die App lokal und sag mir, welche Adresse ich im Browser öffnen soll und was ich dort testen soll.

Wichtig: Die Kontodaten dürfen nie das Gerät verlassen. Keine externen Aufrufe, keine CDNs, keine Tracker. Mach nach jedem funktionierenden Schritt einen Commit und warte nach Schritt 2 auf mein Okay.
