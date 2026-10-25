import { useCallback, useEffect, useState } from 'react'
import { formatEuro } from '../engine/format'
import type { Analyse as AnalyseErgebnis } from '../engine/typen'
import { Balken, DemoLabel, IconFertig, IconLaeuft, IconOffen, IconZurueck } from '../ui/Bausteine'
import { deinGeraet, monatJahr, zahl } from '../ui/texte'
import './screens.css'

type Props = {
  dateiname: string
  /** null, solange die Datei noch gelesen wird */
  analyse: AnalyseErgebnis | null
  schaetzung: number | null
  istDemo: boolean
  onZurueck: () => void
  onWeiter: () => void
}

/** So lange bleibt jeder Schritt sichtbar „in Arbeit“, damit man mitlesen kann. */
const SCHRITT_DAUER_MS = 450

export function Analyse({ dateiname, analyse, schaetzung, istDemo, onZurueck, onWeiter }: Props) {
  const schritte = analyse ? beschreibeSchritte(analyse) : beschreibeSchritte(null)
  const fertig = useSchrittFolge(analyse !== null, schritte.length)
  const allesFertig = fertig === schritte.length
  // Sobald der Befund erscheint, dorthin scrollen, damit ihn der Knopf unten nicht verdeckt.
  const zeigeBefund = useCallback((karte: HTMLElement | null) => {
    karte?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  return (
    <main className="seite analyse">
      <header className="kopfzeile">
        <button type="button" className="analyse__zurueck" onClick={onZurueck} aria-label="Zurück">
          <IconZurueck />
        </button>
        {istDemo && <DemoLabel />}
      </header>

      <div className="analyse__titelblock">
        <h1 className="analyse__titel">{allesFertig ? 'Analyse fertig' : 'Analyse läuft'}</h1>
        <p className="analyse__datei">
          <span className="analyse__dateiname">{dateiname}</span>
          {analyse && <span>{` · ${monatJahr(analyse.zeitraum.von)} – ${monatJahr(analyse.zeitraum.bis)}`}</span>}
        </p>
      </div>

      <div className="analyse__fortschritt">
        <Balken dick anteil={allesFertig ? 1 : (fertig + 0.5) / schritte.length} />
        <div className="analyse__status" aria-live="polite">
          <span>{allesFertig ? 'Fertig' : `Schritt ${fertig + 1} von ${schritte.length}`}</span>
          <span>läuft auf {deinGeraet()}, offline</span>
        </div>
      </div>

      <ol className="karte analyse__schritte">
        {schritte.map((schritt, i) => {
          const zustand = i < fertig ? 'fertig' : i === fertig ? 'laeuft' : 'offen'
          return (
            <li key={schritt.titel} className={`analyse__schritt analyse__schritt--${zustand}`}>
              {zustand === 'fertig' ? <IconFertig /> : zustand === 'laeuft' ? <IconLaeuft /> : <IconOffen />}
              <div>
                <p className="analyse__schritt-titel">
                  {zustand === 'fertig' ? schritt.titel : `${schritt.titelLaufend} …`}
                </p>
                <p className="analyse__schritt-text">{zustand === 'fertig' ? schritt.ergebnis : schritt.beschreibung}</p>
              </div>
            </li>
          )
        })}
      </ol>

      {analyse && fertig >= 5 && (
        <section ref={zeigeBefund} className="karte karte--akzent analyse__befund" aria-live="polite">
          <p className="label">Erster Befund</p>
          <p className="analyse__befund-satz">
            Du brauchst {formatEuro(analyse.lebenshaltungProMonat, 'ganz')} im Monat zum Leben.
          </p>
          {schaetzung !== null && <p className="analyse__befund-schaetzung">Geschätzt hattest du {formatEuro(schaetzung, 'ganz')}.</p>}
        </section>
      )}

      <div className="fusszeile-knopf">
        <button type="button" className="knopf" disabled={!allesFertig} onClick={onWeiter}>
          Ergebnis ansehen
        </button>
      </div>
    </main>
  )
}

/** Zählt die fertigen Schritte nacheinander hoch, sobald die Analyse da ist. */
function useSchrittFolge(bereit: boolean, anzahl: number): number {
  const [fertig, setFertig] = useState(0)
  const [ohneBewegung] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (!bereit || ohneBewegung) return
    const takt = setInterval(() => {
      setFertig((n) => {
        if (n + 1 >= anzahl) clearInterval(takt)
        return Math.min(n + 1, anzahl)
      })
    }, SCHRITT_DAUER_MS)
    return () => clearInterval(takt)
  }, [bereit, anzahl, ohneBewegung])
  if (bereit && ohneBewegung) return anzahl
  return fertig
}

type Schritt = { titel: string; titelLaufend: string; beschreibung: string; ergebnis: string }

function beschreibeSchritte(a: AnalyseErgebnis | null): Schritt[] {
  const monate = a ? Math.max(1, Math.round(a.zeitraum.monate)) : 0
  return [
    {
      titel: 'Buchungen gelesen',
      titelLaufend: 'Buchungen lesen',
      beschreibung: 'Datei wird auf dem Gerät gelesen',
      ergebnis: a ? `${zahl(a.anzahl.buchungen)} Buchungen aus ${monate} ${monate === 1 ? 'Monat' : 'Monaten'}` : '',
    },
    {
      titel: 'Umbuchungen rausgerechnet',
      titelLaufend: 'Umbuchungen rausrechnen',
      beschreibung: 'Überweisungen zwischen deinen eigenen Konten',
      ergebnis: a
        ? a.anzahl.umbuchungen > 0
          ? `${zahl(a.anzahl.umbuchungen)} zwischen deinen eigenen Konten`
          : 'Keine zwischen deinen eigenen Konten'
        : '',
    },
    {
      titel: 'Kategorien zugeordnet',
      titelLaufend: 'Kategorien zuordnen',
      beschreibung: 'Händler erkennen, Ausgaben sortieren',
      ergebnis: a
        ? a.anzahl.zumNachschauen > 0
          ? `${zahl(a.anzahl.automatischZugeordnet)} automatisch, ${zahl(a.anzahl.zumNachschauen)} zum Nachschauen`
          : `Alle ${zahl(a.anzahl.buchungen)} automatisch`
        : '',
    },
    {
      titel: 'Einmaleffekte erkannt',
      titelLaufend: 'Einmaleffekte erkennen',
      beschreibung: 'Urlaub und große Einzelausgaben',
      ergebnis: a ? beschreibeEinmaleffekte(a) : '',
    },
    {
      titel: 'Lebenshaltung berechnet',
      titelLaufend: 'Lebenshaltung berechnen',
      beschreibung: 'Durchschnitt pro Monat',
      ergebnis: 'Durchschnitt ohne Miete, Verträge und Einmaleffekte',
    },
    {
      titel: 'Fixkosten geprüft',
      titelLaufend: 'Fixkosten prüfen',
      beschreibung: 'Verträge, Abos, doppelte Zahlungen',
      ergebnis: a
        ? `${zahl(a.vertraege.filter((v) => v.kategorie !== 'Sparen').length)} Verträge, ${
            a.hinweise.length === 1 ? '1 Hinweis' : `${a.hinweise.length} Hinweise`
          }`
        : '',
    },
  ]
}

/** „Urlaub 1.400 €, MediaMarkt 520 €“ */
function beschreibeEinmaleffekte(a: AnalyseErgebnis): string {
  const posten = new Map<string, number>()
  for (const b of a.einmaleffekte.buchungen) {
    const name = b.unterkategorie === 'Urlaub' ? 'Urlaub' : kurzname(b.gegenpartei)
    posten.set(name, (posten.get(name) ?? 0) - b.betrag)
  }
  if (posten.size === 0) return 'Keine gefunden'
  return [...posten.entries()]
    .sort((x, y) => y[1] - x[1])
    .map(([name, summe]) => `${name} ${formatEuro(summe, 'ganz')}`)
    .join(', ')
}

/** „MediaMarkt Musterstadt“ → „MediaMarkt“ */
function kurzname(gegenpartei: string): string {
  const erstesWort = gegenpartei.split(/\s+/)[0] ?? ''
  return erstesWort.length > 2 ? erstesWort : gegenpartei || 'Ausgabe'
}
