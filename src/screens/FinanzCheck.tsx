import { AMPEL } from '../config'
import { formatEuro, formatProzent } from '../engine/format'
import type { Ampel, FinanzCheck as Check } from '../engine/finanzCheck'
import { SPARQUOTE_QUELLE, VERMOEGEN_QUELLE } from '../engine/vergleichswerte'
import { DemoLabel, IconZurueck } from '../ui/Bausteine'
import './screens.css'

type Props = {
  check: Check
  istDemo: boolean
  onZurueck: () => void
  onZielBearbeiten: () => void
}

const AMPEL_TEXT: Record<Ampel, string> = { gut: 'Gut', hinweis: 'Ausbaufähig', warnung: 'Achtung' }
/** 0,105 → „10,5 %“ */
const prozentGenau = (anteil: number) => `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(anteil * 100)}\u00a0%`
const monate = (wert: number) => `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(wert)} Mon.`

/** Finanz-Check: jede Kennzahl mit Ampel, Erklärung und Vergleich. */
export function FinanzCheck({ check, istDemo, onZurueck, onZielBearbeiten }: Props) {
  const { notgroschen, sparquote, fixkosten, vermoegen } = check
  return (
    <main className="seite finanzcheck">
      <header className="kopfzeile">
        <button type="button" className="analyse__zurueck" onClick={onZurueck} aria-label="Zurück">
          <IconZurueck />
        </button>
        {istDemo && <DemoLabel />}
      </header>

      <div className="analyse__titelblock">
        <h1 className="analyse__titel">Finanz-Check</h1>
        <p className="ziel__text">Drei Kennzahlen, die zeigen, wie stabil deine Finanzen sind.</p>
      </div>

      <Kennzahl
        titel="Notgroschen"
        wert={monate(notgroschen.monate)}
        ampel={notgroschen.ampel}
        text={`So lange reicht dein Tagesgeld, wenn das Einkommen ausfällt. Empfohlen sind mindestens ${notgroschen.ziel} Monate.`}
        anteil={notgroschen.monate / 6}
        marken={[
          { bei: AMPEL.notgroschen.gelb / 6, text: '1' },
          { bei: AMPEL.notgroschen.gruen / 6, text: '3' },
        ]}
        skala="0 bis 6 Monate"
      />

      <Kennzahl
        titel="Sparquote"
        wert={formatProzent(sparquote.wert)}
        ampel={sparquote.ampel}
        text={`So viel von deinem Netto fließt ins Depot. Der Durchschnitt in Deutschland liegt bei ${prozentGenau(sparquote.deutschland)}.`}
        anteil={sparquote.wert / 0.3}
        marken={[{ bei: sparquote.deutschland / 0.3, text: 'Ø' }]}
        skala="0 bis 30 %"
        quelle={SPARQUOTE_QUELLE}
      />

      <Kennzahl
        titel="Fixkosten"
        wert={formatProzent(fixkosten.wert)}
        ampel={fixkosten.ampel}
        text={`So viel von deinem Netto ist fest verplant: Miete, Verträge, Abos. Gut sind bis ${formatProzent(AMPEL.fixkosten.gruen)}, über ${formatProzent(AMPEL.fixkosten.gelb)} wird es eng.`}
        anteil={fixkosten.wert}
        marken={[
          { bei: AMPEL.fixkosten.gruen, text: '35' },
          { bei: AMPEL.fixkosten.gelb, text: '50' },
        ]}
        skala="0 bis 100 %"
      />

      <section className="karte" aria-labelledby="vergleich">
        <h2 id="vergleich" className="label">
          Vermögen im Vergleich
        </h2>
        {vermoegen ? (
          <>
            <p className="finanzcheck__vergleich">
              Haushalte mit {vermoegen.gruppe} Jahren haben im Mittel <strong>{formatEuro(vermoegen.median, 'ganz')}</strong>. Du hast{' '}
              <strong>{formatEuro(vermoegen.deins, 'ganz')}</strong>
              {vermoegen.deins >= vermoegen.median ? ', also mehr als die Hälfte deiner Altersgruppe.' : '.'}
            </p>
            <VergleichsBalken median={vermoegen.median} deins={vermoegen.deins} />
            <p className="finanzcheck__quelle">
              Quelle: {VERMOEGEN_QUELLE}. „Im Mittel“ heißt: Die Hälfte hat mehr, die Hälfte weniger. Gezählt wird je Haushalt, mit Haus oder
              Wohnung.
            </p>
          </>
        ) : (
          <>
            <p className="finanzcheck__vergleich">Gib dein Geburtsjahr an, dann vergleichen wir dein Vermögen mit Gleichaltrigen.</p>
            <button type="button" className="textknopf finanzcheck__link" onClick={onZielBearbeiten}>
              Geburtsjahr eintragen
            </button>
          </>
        )}
      </section>
    </main>
  )
}

type KennzahlProps = {
  titel: string
  wert: string
  ampel: Ampel
  text: string
  /** Füllstand des Balkens, 0–1 */
  anteil: number
  marken: { bei: number; text: string }[]
  skala: string
  quelle?: string
}

function Kennzahl({ titel, wert, ampel, text, anteil, marken, skala, quelle }: KennzahlProps) {
  return (
    <section className="karte finanzcheck__kennzahl" aria-label={`${titel}: ${wert}, ${AMPEL_TEXT[ampel]}`}>
      <div className="finanzcheck__kopf">
        <h2 className="label">{titel}</h2>
        <span className={`finanzcheck__ampel finanzcheck__ampel--${ampel}`}>{AMPEL_TEXT[ampel]}</span>
      </div>
      <p className={`finanzcheck__wert ${ampel}`}>{wert}</p>
      <div className="finanzcheck__skala" role="img" aria-label={`Skala ${skala}`}>
        <div className={`finanzcheck__fuellung finanzcheck__fuellung--${ampel}`} style={{ width: `${Math.min(1, Math.max(0, anteil)) * 100}%` }} />
        {marken.map((m) => (
          <span key={m.text} className="finanzcheck__marke" style={{ left: `${Math.min(1, m.bei) * 100}%` }}>
            <span>{m.text}</span>
          </span>
        ))}
      </div>
      <p className="finanzcheck__text">{text}</p>
      {quelle && <p className="finanzcheck__quelle">Quelle: {quelle}</p>}
    </section>
  )
}

function VergleichsBalken({ median, deins }: { median: number; deins: number }) {
  const groesster = Math.max(median, deins, 1)
  return (
    <div className="finanzcheck__balkenpaar">
      <div className="ergebnis__zeile ergebnis__zeile--klein">
        <span>Gleichaltrige (Mitte)</span>
        <span className="zahl">{formatEuro(median, 'ganz')}</span>
      </div>
      <div className="balken balken--dick">
        <div className="balken__fuellung balken__fuellung--grau" style={{ width: `${(median / groesster) * 100}%` }} />
      </div>
      <div className="ergebnis__zeile ergebnis__zeile--klein ergebnis__zeile--hell">
        <span>Du</span>
        <span className="zahl">{formatEuro(deins, 'ganz')}</span>
      </div>
      <div className="balken balken--dick">
        <div className="balken__fuellung" style={{ width: `${(deins / groesster) * 100}%` }} />
      </div>
    </div>
  )
}
