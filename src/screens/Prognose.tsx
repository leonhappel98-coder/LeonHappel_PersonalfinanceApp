import { useState } from 'react'
import { PROGNOSE_MAX_JAHRE } from '../config'
import { formatEuro } from '../engine/format'
import { berechnePrognose, monateZwischen, plusMonate, SZENARIEN, type Szenario, type Ziel } from '../engine/prognose'
import { DemoLabel } from '../ui/Bausteine'
import { PrognoseDiagramm } from '../ui/PrognoseDiagramm'
import { TabLeiste, type Tab } from '../ui/TabLeiste'
import { aktuellerMonat, dauer, kurzEuro, monatJahr, monatJahrLang } from '../ui/texte'
import './screens.css'

type Props = {
  ziel: Ziel
  istDemo: boolean
  onTab: (tab: Tab) => void
}

const NAMEN: Record<Szenario, string> = { vorsichtig: 'Vorsichtig', realistisch: 'Realistisch', optimistisch: 'Optimistisch' }

export function Prognose({ ziel, istDemo, onTab }: Props) {
  const [szenario, setSzenario] = useState<Szenario>('realistisch')
  const start = aktuellerMonat()

  // Diagramm bis ein Jahr nach Ziel oder Erreichen (je nachdem, was später ist), mindestens 2 Jahre
  const erreicht = berechnePrognose(ziel, start, szenario).zielErreicht
  const spaetestens = plusMonate(start, PROGNOSE_MAX_JAHRE * 12)
  const spaeter = [ziel.zielMonat, erreicht ?? spaetestens, plusMonate(start, 12)].sort().at(-1)!
  const ende = [plusMonate(spaeter, 12), spaetestens].sort()[0]
  const prognosen = SZENARIEN.map((s) => {
    const p = berechnePrognose(ziel, start, s, ende)
    return { ...p, verlauf: p.verlauf.slice(0, monateZwischen(start, ende) + 1) }
  })
  const gewaehlt = prognosen[SZENARIEN.indexOf(szenario)]

  return (
    <main className="seite mit-tableiste prognose">
      <header className="kopfzeile">
        <h1 className="heute__titel">Prognose</h1>
        {istDemo && <DemoLabel />}
      </header>

      <div className="prognose__szenarien" role="group" aria-label="Szenario">
        {SZENARIEN.map((s) => (
          <button key={s} type="button" aria-pressed={s === szenario} onClick={() => setSzenario(s)}>
            {NAMEN[s]}
          </button>
        ))}
      </div>

      <div className="prognose__ergebnis" aria-live="polite">
        <p className="label">{kurzEuro(ziel.zielBetrag)} erreicht</p>
        <p className="prognose__monat">{gewaehlt.zielErreicht ? monatJahr(gewaehlt.zielErreicht) : 'Nicht in 50 Jahren'}</p>
        <Abstand monate={gewaehlt.monateNachZiel} zielMonat={ziel.zielMonat} />
      </div>

      <section className="karte prognose__diagramm">
        <PrognoseDiagramm prognosen={prognosen} gewaehlt={gewaehlt} zielBetrag={ziel.zielBetrag} />
        <div className="prognose__legende" aria-hidden="true">
          <span>
            <span className="prognose__legende-linie" />
            {szenario}
          </span>
          <span>
            <span className="prognose__legende-linie prognose__legende-linie--gestrichelt" />
            {SZENARIEN.filter((s) => s !== szenario).join(', ')}
          </span>
          <span>
            <span className="prognose__legende-raute" />
            Ist
          </span>
        </div>
      </section>

      <div className="prognose__kacheln">
        <div className="kachel">
          <p className="label">Ins Depot</p>
          <p className="kachel__zahl">{formatEuro(ziel.sparrateProMonat, 'ganz')}/Mon.</p>
        </div>
        <div className="kachel">
          <p className="label">Annahmen</p>
          <p className="prognose__annahmen">{Math.round(gewaehlt.rendite * 100)} % Rendite, Sparrate bleibt gleich</p>
        </div>
      </div>

      <p className="prognose__hinweis">
        Eine Rechnung mit Annahmen, keine Garantie und keine Anlageberatung. Das Tagesgeld rechnet ohne Zinsen.
      </p>

      <TabLeiste aktiv="prognose" onWechsel={onTab} />
    </main>
  )
}

function Abstand({ monate, zielMonat }: { monate: number | null; zielMonat: string }) {
  if (monate === null) return <p className="warnung prognose__abstand">Mit diesen Zahlen wird das Ziel nicht erreicht.</p>
  if (monate === 0) return <p className="gut prognose__abstand">Genau im Zielmonat {monatJahrLang(zielMonat)}</p>
  return monate > 0 ? (
    <p className="warnung prognose__abstand">
      {dauer(monate)} nach dem Ziel {monatJahrLang(zielMonat)}
    </p>
  ) : (
    <p className="gut prognose__abstand">
      {dauer(-monate)} vor dem Ziel {monatJahrLang(zielMonat)}
    </p>
  )
}
