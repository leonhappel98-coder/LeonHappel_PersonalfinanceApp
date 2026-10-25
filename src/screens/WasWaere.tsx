import { useState } from 'react'
import { PROGNOSE_MAX_JAHRE } from '../config'
import { formatEuro } from '../engine/format'
import { berechnePrognose, monateZwischen, plusMonate, type Ziel } from '../engine/prognose'
import { simuliere, startRegler, verschiebe, type Regler } from '../engine/simulation'
import type { Analyse } from '../engine/typen'
import { DemoLabel, IconZurueck } from '../ui/Bausteine'
import { PrognoseDiagramm } from '../ui/PrognoseDiagramm'
import { aktuellerMonat, dauer, kurzEuro, monatJahr, monatJahrLang } from '../ui/texte'
import './screens.css'

type Props = {
  analyse: Analyse
  /** Ziel mit der heutigen Sparrate (inkl. erledigter Schritte) */
  ziel: Ziel
  istDemo: boolean
  onZurueck: () => void
}

const euro = (betrag: number) => formatEuro(betrag, 'ganz')
const prozent = (anteil: number) => `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(anteil * 100)} %`

/** Spielwiese: Regler verschieben, Prognose ändert sich live. Wird nicht gespeichert. */
export function WasWaere({ analyse, ziel, istDemo, onZurueck }: Props) {
  const [start] = useState(aktuellerMonat)
  const basis = startRegler(analyse, ziel.sparrateProMonat)
  const [regler, setRegler] = useState<Regler>(basis)
  const veraendert = (Object.keys(basis) as (keyof Regler)[]).some((k) => basis[k] !== regler[k])

  // Beide Kurven gleich lang: bis ein Jahr nach dem spätesten wichtigen Monat
  const jetztErreicht = berechnePrognose(ziel, start, 'realistisch').zielErreicht
  const simErreicht = simuliere(ziel, regler, start).prognose.zielErreicht
  const spaetestens = plusMonate(start, PROGNOSE_MAX_JAHRE * 12)
  const spaeter = [ziel.zielMonat, jetztErreicht ?? spaetestens, simErreicht ?? spaetestens, plusMonate(start, 12)].sort().at(-1)!
  const ende = [plusMonate(spaeter, 12), spaetestens].sort()[0]
  const laenge = monateZwischen(start, ende) + 1
  const jetzt = berechnePrognose(ziel, start, 'realistisch', ende)
  const sim = simuliere(ziel, regler, start, ende)
  const kurz = (p: typeof jetzt) => ({ ...p, verlauf: p.verlauf.slice(0, laenge) })

  const gegenueberJetzt = jetztErreicht && simErreicht ? monateZwischen(simErreicht, jetztErreicht) : null
  const setze = (feld: keyof Regler) => (wert: number) => setRegler((r) => verschiebe(r, feld, wert))

  return (
    <main className="seite waswaere">
      <header className="kopfzeile">
        <button type="button" className="analyse__zurueck" onClick={onZurueck} aria-label="Zurück">
          <IconZurueck />
        </button>
        {istDemo && <DemoLabel />}
      </header>

      <h1 className="analyse__titel">Was wäre, wenn …?</h1>

      <div className="prognose__ergebnis" aria-live="polite">
        <p className="label">{kurzEuro(ziel.zielBetrag)} erreicht</p>
        <p className="prognose__monat">{simErreicht ? monatJahr(simErreicht) : 'Nicht in 50 Jahren'}</p>
        <p className="prognose__abstand">
          {gegenueberJetzt === null || gegenueberJetzt === 0 ? (
            <span className="waswaere__neutral">{veraendert ? 'Gleich wie jetzt' : 'So wie jetzt. Verschieb die Regler.'}</span>
          ) : gegenueberJetzt > 0 ? (
            <span className="gut">{dauer(gegenueberJetzt)} früher als jetzt</span>
          ) : (
            <span className="warnung">{dauer(-gegenueberJetzt)} später als jetzt</span>
          )}
          {sim.prognose.monateNachZiel !== null && (
            <span className="waswaere__neutral">
              {' · '}
              {sim.prognose.monateNachZiel <= 0 ? `pünktlich zum Ziel ${monatJahrLang(ziel.zielMonat)}` : `Ziel ${monatJahrLang(ziel.zielMonat)}`}
            </span>
          )}
        </p>
      </div>

      <section className="karte prognose__diagramm">
        <PrognoseDiagramm prognosen={[kurz(jetzt), kurz(sim.prognose)]} gewaehlt={kurz(sim.prognose)} zielBetrag={ziel.zielBetrag} />
        <div className="prognose__legende" aria-hidden="true">
          <span>
            <span className="prognose__legende-linie" />
            mit deinen Reglern
          </span>
          <span>
            <span className="prognose__legende-linie prognose__legende-linie--gestrichelt" />
            so wie jetzt
          </span>
        </div>
      </section>

      <section className="karte waswaere__regler" aria-label="Regler">
        <Schieber id="gehalt" name="Netto-Gehalt" wert={regler.gehalt} anzeige={`${euro(regler.gehalt)}/Mon.`} min={Math.max(0, basis.gehalt - 1000)} max={basis.gehalt + 2000} schritt={10} onChange={setze('gehalt')} />
        <Schieber id="ausgaben" name="Ausgaben" wert={regler.ausgaben} anzeige={`${euro(regler.ausgaben)}/Mon.`} min={Math.max(0, basis.ausgaben - 1000)} max={basis.ausgaben + 1000} schritt={10} onChange={setze('ausgaben')} />
        <Schieber id="sparrate" name="Ins Depot" wert={regler.sparrate} anzeige={`${euro(regler.sparrate)}/Mon.`} min={0} max={Math.max(2000, basis.sparrate + 1500)} schritt={10} onChange={setze('sparrate')} />
        <Schieber id="rendite" name="Rendite pro Jahr" wert={regler.rendite} anzeige={prozent(regler.rendite)} min={0} max={0.1} schritt={0.005} onChange={setze('rendite')} />
        <p className="feld__hilfe">Mehr Gehalt oder weniger Ausgaben fließen automatisch ins Depot.</p>
      </section>

      <section className="karte waswaere__spielraum" aria-label="Spielraum">
        <div className="ergebnis__zeile">
          <span>Übrig pro Monat</span>
          <span className="zahl ergebnis__betrag">
            {euro(regler.gehalt)} − {euro(regler.ausgaben)} = {euro(sim.ueberschuss)}
          </span>
        </div>
        {sim.ausTagesgeld > 0 && (
          <p className="waswaere__warnung" role="status">
            {euro(sim.ausTagesgeld)} der Sparrate müssten jeden Monat aus dem Tagesgeld kommen. Das reicht nur{' '}
            {dauer(Math.floor(ziel.tagesgeld / sim.ausTagesgeld))}.
          </p>
        )}
      </section>

      <p className="prognose__hinweis">Eine Rechnung mit Annahmen, keine Garantie und keine Anlageberatung. Die Regler werden nicht gespeichert.</p>

      <div className="fusszeile-knopf">
        <button type="button" className="knopf" disabled={!veraendert} onClick={() => setRegler(basis)}>
          Zurücksetzen
        </button>
      </div>
    </main>
  )
}

type SchieberProps = {
  id: string
  name: string
  wert: number
  anzeige: string
  min: number
  max: number
  schritt: number
  onChange: (wert: number) => void
}

function Schieber({ id, name, wert, anzeige, min, max, schritt, onChange }: SchieberProps) {
  return (
    <div className="schieber">
      <div className="ergebnis__zeile">
        <label htmlFor={id}>{name}</label>
        <span className="zahl ergebnis__betrag">{anzeige}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={schritt}
        value={wert}
        aria-valuetext={anzeige}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
