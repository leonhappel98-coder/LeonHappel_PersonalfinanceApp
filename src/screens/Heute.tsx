import { formatEuro, formatProzent } from '../engine/format'
import { berechnePrognose, fortschritt, nettovermoegen, type Ziel } from '../engine/prognose'
import type { Analyse } from '../engine/typen'
import { DemoLabel, IconZahnrad } from '../ui/Bausteine'
import { TabLeiste, type Tab } from '../ui/TabLeiste'
import { aktuellerMonat, begruessung, kurzEuro, monatJahr, monatJahrLang } from '../ui/texte'
import './screens.css'

type Props = {
  analyse: Analyse
  ziel: Ziel
  istDemo: boolean
  onTab: (tab: Tab) => void
  onEinstellungen: () => void
  onAuswertung: () => void
}

const UMFANG = 2 * Math.PI * 52

export function Heute({ analyse, ziel, istDemo, onTab, onEinstellungen, onAuswertung }: Props) {
  const anteil = fortschritt(ziel)
  const prognose = berechnePrognose(ziel, aktuellerMonat(), 'realistisch')
  const puenktlich = prognose.monateNachZiel !== null && prognose.monateNachZiel <= 0

  return (
    <main className="seite mit-tableiste heute">
      <div className="heute__bogen" aria-hidden="true" />

      <header className="kopfzeile">
        <div className="heute__titelblock">
          <p className="heute__gruss">{begruessung()}</p>
          <h1 className="heute__titel">Heute</h1>
        </div>
        <div className="heute__aktionen">
          {istDemo && <DemoLabel />}
          <button type="button" className="heute__einstellungen" onClick={onEinstellungen} aria-label="Ziel und Daten bearbeiten">
            <IconZahnrad />
          </button>
        </div>
      </header>

      <section className="karte karte--hervorgehoben heute__ziel" aria-label="Fortschritt zum Ziel">
        <svg width="124" height="124" viewBox="0 0 124 124" role="img" aria-label={`${formatProzent(anteil)} des Ziels erreicht`}>
          <circle cx="62" cy="62" r="52" fill="none" stroke="var(--linie)" strokeWidth="10" />
          <circle
            className="heute__ring"
            cx="62"
            cy="62"
            r="52"
            fill="none"
            stroke="var(--akzent)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${Math.min(anteil, 1) * UMFANG} ${UMFANG}`}
            transform="rotate(-90 62 62)"
          />
          <text x="62" y="60" textAnchor="middle" className="heute__ring-zahl">
            {formatProzent(anteil)}
          </text>
          <text x="62" y="80" textAnchor="middle" className="heute__ring-text">
            von {kurzEuro(ziel.zielBetrag)}
          </text>
        </svg>
        <div className="heute__zahlen">
          <p className="label">Nettovermögen</p>
          <p className="heute__vermoegen">{formatEuro(nettovermoegen(ziel), 'ganz')}</p>
          <p className="heute__zieltext">
            Ziel {kurzEuro(ziel.zielBetrag)} bis {monatJahrLang(ziel.zielMonat)}
          </p>
          <p className={puenktlich ? 'heute__prognose gut' : 'heute__prognose warnung'}>
            {prognose.zielErreicht ? `Prognose: ${monatJahr(prognose.zielErreicht)}` : 'Prognose: nicht in 50 Jahren'}
          </p>
        </div>
      </section>

      <section aria-label="Aus deiner Auswertung">
        <div className="heute__kacheln">
          <Kachel label="Zum Leben" wert={formatEuro(analyse.lebenshaltungProMonat, 'ganz')} />
          <Kachel label="Sparquote" wert={formatProzent(analyse.sparquote)} farbe={analyse.sparquote >= 0.1 ? 'gut' : 'hinweis'} />
          <Kachel
            label="Fixkosten"
            wert={formatProzent(analyse.fixkostenQuote)}
            farbe={analyse.fixkostenQuote <= 0.35 ? 'gut' : analyse.fixkostenQuote <= 0.5 ? 'hinweis' : 'warnung'}
          />
        </div>
        <button type="button" className="textknopf heute__auswertung" onClick={onAuswertung}>
          Ganze Auswertung ansehen
        </button>
      </section>

      <TabLeiste aktiv="heute" onWechsel={onTab} />
    </main>
  )
}

function Kachel({ label, wert, farbe }: { label: string; wert: string; farbe?: 'gut' | 'hinweis' | 'warnung' }) {
  return (
    <div className="kachel">
      <p className="label">{label}</p>
      <p className={farbe ? `kachel__zahl ${farbe}` : 'kachel__zahl'}>{wert}</p>
    </div>
  )
}
