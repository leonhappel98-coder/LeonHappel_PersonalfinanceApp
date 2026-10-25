import type { BudgetMonat } from '../engine/budgets'
import type { FinanzCheck } from '../engine/finanzCheck'
import { formatEuro, formatProzent } from '../engine/format'
import { fortschritt, nettovermoegen, type Ziel } from '../engine/prognose'
import type { Schrittplan } from '../engine/schritte'
import type { Analyse } from '../engine/typen'
import { DemoLabel, IconZahnrad } from '../ui/Bausteine'
import { TabLeiste, type Tab } from '../ui/TabLeiste'
import { begruessung, dauer, kurzEuro, monatJahr, monatJahrLang } from '../ui/texte'
import './screens.css'

type Props = {
  analyse: Analyse
  ziel: Ziel
  plan: Schrittplan
  check: FinanzCheck
  monat: BudgetMonat
  istDemo: boolean
  onTab: (tab: Tab) => void
  onEinstellungen: () => void
  onAuswertung: () => void
  onFinanzCheck: () => void
}

const UMFANG = 2 * Math.PI * 52

export function Heute({ ziel, plan, check, monat, istDemo, onTab, onEinstellungen, onAuswertung, onFinanzCheck }: Props) {
  const anteil = fortschritt(ziel)
  const prognose = plan.soWieJetzt
  const puenktlich = prognose.monateNachZiel !== null && prognose.monateNachZiel <= 0
  const mitSchritten = plan.mitAllenSchritten.zielErreicht
  const offen = plan.schritte.filter((s) => !s.erledigt)
  const naechster = offen.find((s) => s.plusProMonat !== null) ?? offen[0]
  // Die drei knappsten Budgets: am meisten verbraucht im Verhältnis zum Budget
  const knapp = monat.zeilen
    .filter((z) => !z.fix && z.budget > 0)
    .sort((a, b) => b.ausgegeben / b.budget - a.ausgegeben / a.budget)
    .slice(0, 3)

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
          {mitSchritten && mitSchritten !== prognose.zielErreicht && (
            <p className="heute__mit-schritten gut">Mit allen Schritten: {monatJahr(mitSchritten)}</p>
          )}
        </div>
      </section>

      {naechster && (
        <button type="button" className="heute__naechster" onClick={() => onTab('schritte')}>
          <span className="heute__naechster-kopf">
            <span className="heute__naechster-tag">NÄCHSTER SCHRITT</span>
            <span className="schritte__aufwand">{naechster.aufwand}</span>
          </span>
          <span className="heute__naechster-titel">{naechster.titel}</span>
          {naechster.plusProMonat !== null && (
            <span className="heute__naechster-wirkung">
              <span className="zahl gut">+{formatEuro(naechster.plusProMonat, 'ganz')}/Monat</span>
              {naechster.monateFrueher !== null && naechster.monateFrueher > 0 && <span>Ziel {dauer(naechster.monateFrueher)} früher</span>}
            </span>
          )}
        </button>
      )}

      {knapp.length > 0 && (
        <button type="button" className="karte heute__monat" onClick={() => onTab('budgets')} aria-label="Budgets öffnen">
          <span className="ergebnis__fixkopf">
            <span className="heute__monat-name">{monatJahrLang(monat.monat).split(' ')[0]}</span>
            <span className="schritte__aufwand">
              Tag {monat.tag} von {monat.tageImMonat}
            </span>
          </span>
          {knapp.map((z) => (
            <span key={z.kategorie} className="budgets__zeile">
              <span className="ergebnis__zeile">
                <span>{z.kategorie}</span>
                <span className={z.ampel === 'warnung' ? 'zahl warnung' : 'zahl ergebnis__betrag'}>
                  {new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(z.ausgegeben)} / {formatEuro(z.budget, 'ganz')}
                </span>
              </span>
              <span className="budgets__balken">
                <span
                  className={`budgets__fuellung budgets__fuellung--${z.ampel}`}
                  style={{ display: 'block', width: `${Math.min(1, z.ausgegeben / z.budget) * 100}%` }}
                />
                <span className="budgets__tempo" style={{ left: `${monat.tempo * 100}%` }} />
              </span>
            </span>
          ))}
        </button>
      )}

      <section aria-label="Finanz-Check">
        <div className="heute__kacheln">
          <Kachel
            label="Notgroschen"
            wert={`${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(check.notgroschen.monate)} Mon.`}
            farbe={check.notgroschen.ampel}
            onClick={onFinanzCheck}
          />
          <Kachel label="Sparquote" wert={formatProzent(check.sparquote.wert)} farbe={check.sparquote.ampel} onClick={onFinanzCheck} />
          <Kachel label="Fixkosten" wert={formatProzent(check.fixkosten.wert)} farbe={check.fixkosten.ampel} onClick={onFinanzCheck} />
        </div>
        <button type="button" className="textknopf heute__auswertung" onClick={onAuswertung}>
          Ganze Auswertung ansehen
        </button>
      </section>

      <TabLeiste aktiv="heute" onWechsel={onTab} />
    </main>
  )
}

type KachelProps = { label: string; wert: string; farbe: 'gut' | 'hinweis' | 'warnung'; onClick: () => void }

/** Kachel wie im Design; antippen öffnet den Finanz-Check. */
function Kachel({ label, wert, farbe, onClick }: KachelProps) {
  return (
    <button type="button" className="kachel" onClick={onClick} aria-label={`${label}: ${wert}, Finanz-Check öffnen`}>
      <span className="label">{label}</span>
      <span className={`kachel__zahl ${farbe}`}>{wert}</span>
    </button>
  )
}
