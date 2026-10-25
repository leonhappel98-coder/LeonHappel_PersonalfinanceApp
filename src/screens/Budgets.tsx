import { useState } from 'react'
import type { BudgetMonat, BudgetZeile } from '../engine/budgets'
import { formatEuro } from '../engine/format'
import type { Hinweis, Kategorie } from '../engine/typen'
import { DemoLabel } from '../ui/Bausteine'
import { TabLeiste, type Tab } from '../ui/TabLeiste'
import { monatJahrLang } from '../ui/texte'
import './screens.css'

type Props = {
  monat: BudgetMonat
  hinweise: Hinweis[]
  istDemo: boolean
  onAendern: (kategorie: Kategorie, wert: number) => void
  onTab: (tab: Tab) => void
}

const euro = (betrag: number) => formatEuro(betrag, 'ganz')
const zahl = (betrag: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(betrag)

/** Budgets mit Tempo-Markierung (Design: docs/design/screens/07-Budgets.png). */
export function BudgetsScreen({ monat, hinweise, istDemo, onAendern, onTab }: Props) {
  const [bearbeiten, setBearbeiten] = useState(false)
  const monatsname = monatJahrLang(monat.monat).split(' ')[0]
  const gesamtAnteil = monat.summeBudget > 0 ? monat.summeAusgegeben / monat.summeBudget : 0

  return (
    <main className="seite mit-tableiste budgets">
      <header className="kopfzeile">
        <div className="heute__titelblock">
          <p className="heute__gruss">
            Tag {monat.tag} von {monat.tageImMonat}
          </p>
          <h1 className="heute__titel">{monatsname}</h1>
        </div>
        {istDemo && <DemoLabel />}
      </header>

      <section className="karte karte--hervorgehoben" aria-label="Monatsbudget">
        <div className="ergebnis__fixkopf">
          <p className="budgets__frei">{euro(Math.max(0, monat.frei))}</p>
          <p className="zahl ergebnis__quote">von {euro(monat.summeBudget)} frei</p>
        </div>
        <TempoBalken anteil={gesamtAnteil} tempo={monat.tempo} ampel={gesamtAnteil <= monat.tempo ? 'gut' : gesamtAnteil <= 1 ? 'hinweis' : 'warnung'} />
        <p className="budgets__satz">{monat.satz}</p>
      </section>

      <section className="karte budgets__liste" aria-label="Budgets je Kategorie">
        {monat.zeilen.map((z) =>
          bearbeiten && !z.fix ? (
            <BudgetEingabe key={z.kategorie} zeile={z} onAendern={onAendern} />
          ) : (
            <BudgetZeileAnzeige key={z.kategorie} zeile={z} tempo={monat.tempo} />
          ),
        )}
        <button type="button" className="textknopf budgets__bearbeiten" onClick={() => setBearbeiten((b) => !b)}>
          {bearbeiten ? 'Fertig' : 'Budgets anpassen'}
        </button>
      </section>

      {hinweise.length > 0 && (
        <section className="karte" aria-labelledby="vertraege-hinweis">
          <h2 id="vertraege-hinweis" className="label">
            Verträge mit Hinweis
          </h2>
          <ul className="budgets__hinweise">
            {hinweise.map((h) => (
              <li key={h.text} className="budgets__hinweis">
                <span>{h.art === 'tarif-pruefen' ? 'Handyvertrag' : `${h.vertraege.length} Streaming-Abos`}</span>
                <span className="budgets__chip">{h.art === 'tarif-pruefen' ? 'Tarif prüfen' : 'doppelt?'}</span>
                <span className="zahl ergebnis__betrag">{formatEuro(h.art === 'tarif-pruefen' ? h.vertrag.betrag : h.proMonat, 'cent')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TabLeiste aktiv="budgets" onWechsel={onTab} />
    </main>
  )
}

function BudgetZeileAnzeige({ zeile, tempo }: { zeile: BudgetZeile; tempo: number }) {
  const anteil = zeile.budget > 0 ? zeile.ausgegeben / zeile.budget : zeile.ausgegeben > 0 ? 1 : 0
  const beschreibung = `${zeile.kategorie}: ${euro(zeile.ausgegeben)} von ${euro(zeile.budget)}`
  return (
    <div className="budgets__zeile">
      <div className="ergebnis__zeile">
        <span>
          {zeile.kategorie}
          {zeile.fix && <span className="budgets__fix"> FIX</span>}
        </span>
        <span className={`zahl ${zeile.fix ? 'ergebnis__betrag' : zeile.ampel === 'warnung' ? 'warnung' : 'ergebnis__betrag'}`}>
          {zahl(zeile.ausgegeben)} / {euro(zeile.budget)}
        </span>
      </div>
      <TempoBalken anteil={anteil} tempo={zeile.fix ? undefined : tempo} ampel={zeile.fix ? 'fix' : zeile.ampel} beschriftung={beschreibung} />
    </div>
  )
}

function BudgetEingabe({ zeile, onAendern }: { zeile: BudgetZeile; onAendern: (kategorie: Kategorie, wert: number) => void }) {
  const id = `budget-${zeile.kategorie}`
  return (
    <div className="feld">
      <label htmlFor={id} className="feld__name">
        {zeile.kategorie} <span className="feld__hilfe">(bisher {euro(zeile.ausgegeben)})</span>
      </label>
      <span className="feld__eingabe">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          defaultValue={String(zeile.budget)}
          onBlur={(e) => {
            const wert = Number(e.target.value.replace(/\D/g, ''))
            if (Number.isFinite(wert)) onAendern(zeile.kategorie, wert)
          }}
        />
        <span className="feld__einheit" aria-hidden="true">
          €
        </span>
      </span>
    </div>
  )
}

/** Balken mit Tempo-Markierung: Der Strich zeigt, wie weit der Monat schon ist. */
function TempoBalken({ anteil, tempo, ampel, beschriftung }: { anteil: number; tempo?: number; ampel: string; beschriftung?: string }) {
  return (
    <div className="budgets__balken" role={beschriftung ? 'img' : undefined} aria-label={beschriftung} aria-hidden={beschriftung ? undefined : true}>
      <div className={`budgets__fuellung budgets__fuellung--${ampel}`} style={{ width: `${Math.min(1, Math.max(0, anteil)) * 100}%` }} />
      {tempo !== undefined && <span className="budgets__tempo" style={{ left: `${tempo * 100}%` }} />}
    </div>
  )
}
