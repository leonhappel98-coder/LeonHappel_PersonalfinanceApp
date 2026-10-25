# Testdateien im Format echter Banken

Alle Buchungen sind **erfunden** (dieselben 10 Buchungen von Alex in jeder Datei). Nur Aufbau, Spalten, Trennzeichen und Zeichenkodierung entsprechen den echten Exporten. Die Banken veröffentlichen ihre Formate nicht; die Angaben stammen aus Open-Source-Importprogrammen und Nutzerforen (Stand Oktober 2026). Sobald echte Exporte vorliegen, damit gegenprüfen.

| Datei | Bank | Kodierung | Besonderheit | Quelle |
| --- | --- | --- | --- | --- |
| `ing.csv` | ING | ISO-8859-1 | 14 Zeilen Kontoinfos vor der Tabelle, zwei Spalten „Währung“ | [beancount-ing](https://github.com/siddhantgoel/beancount-ing) |
| `dkb.csv` | DKB (seit 2023) | UTF-8 mit BOM | Zahler und Empfänger in getrennten Spalten, Datum TT.MM.JJ | [beancount-dkb](https://github.com/siddhantgoel/beancount-dkb) |
| `dkb-alt.csv` | DKB (bis 2023) | ISO-8859-1 | „Auftraggeber / Begünstigter“, Datum TT.MM.JJJJ | [beancount-dkb](https://github.com/siddhantgoel/beancount-dkb) |
| `volksbank.csv` | Volksbank / Raiffeisenbank | UTF-8 mit BOM | 18 Spalten, „Name Zahlungsbeteiligter“ | [RechnungsFee](https://github.com/nicolettas-muggelbude/RechnungsFee/blob/main/vorlagen/bank-csv/README.md), [KontoKlar](https://github.com/mirkan-morgenfels-ai/kontoklar) |
| `comdirect.csv` | comdirect | ISO-8859-1 | Name steckt im Buchungstext („Auftraggeber: …“, „Empfänger: …“), Fußzeile „Alter Kontostand“ | [comdirect Community](https://community.comdirect.de/t5/website-apps/ums%C3%A4tze-exportieren-im-csv-format/td-p/3134) |

Die Sparkasse ist mit `../kontoexport_alex_sparkasse.csv` abgedeckt.
