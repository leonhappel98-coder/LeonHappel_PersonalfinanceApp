import { useState } from 'react'
import { formatEuro } from '../engine/format'
import { erstelleKiPrompt } from '../engine/kiPrompt'
import type { Ziel } from '../engine/prognose'
import type { Schritt, Schrittplan } from '../engine/schritte'
import type { Analyse } from '../engine/typen'
import { DemoLabel, IconFertig } from '../ui/Bausteine'
import { TabLeiste, type Tab } from '../ui/TabLeiste'
import { aktuellerMonat, dauer, monatJahr } from '../ui/texte'
import './screens.css'

type Props = {
  analyse: Analyse
  ziel: Ziel
  plan: Schrittplan
  istDemo: boolean
  onUmschalten: (schritt: Schritt) => void
  onTab: (tab: Tab) => void
}

const plus = (betrag: number) => `+${formatEuro(betrag, 'ganz')}/Monat`

export function Schritte({ analyse, ziel, plan, istDemo, onUmschalten, onTab }: Props) {
  const offen = plan.schritte.filter((s) => !s.erledigt)
  const erledigt = plan.schritte.filter((s) => s.erledigt)
  const nachZiel = plan.soWieJetzt.monateNachZiel

  return (
    <main className="seite mit-tableiste schritte">
      <header className="kopfzeile">
        <div className="heute__titelblock">
          <p className="heute__gruss">
            {plan.anzahlErledigt} von {plan.schritte.length} erledigt
          </p>
          <h1 className="heute__titel">Nächste Schritte</h1>
        </div>
        {istDemo && <DemoLabel />}
      </header>

      <section className="karte karte--hervorgehoben schritte__bilanz" aria-label="Wirkung aller Schritte">
        <div className="schritte__vergleich">
          <div>
            <p className="label">So wie jetzt</p>
            <p className={nachZiel !== null && nachZiel <= 0 ? 'schritte__monat gut' : 'schritte__monat warnung'}>
              {plan.soWieJetzt.zielErreicht ? monatJahr(plan.soWieJetzt.zielErreicht) : 'nie'}
            </p>
          </div>
          <div>
            <p className="label">Mit allen Schritten</p>
            <p className="schritte__monat gut">{plan.mitAllenSchritten.zielErreicht ? monatJahr(plan.mitAllenSchritten.zielErreicht) : 'nie'}</p>
          </div>
        </div>
        <div className="schritte__fortschritt" role="img" aria-label={`${plan.anzahlErledigt} von ${plan.schritte.length} Schritten erledigt`}>
          <div style={{ width: `${plan.schritte.length ? (plan.anzahlErledigt / plan.schritte.length) * 100 : 0}%` }} />
        </div>
        <p className="schritte__summe">
          {plan.offenProMonat > 0 ? `Offene Schritte zusammen: +${formatEuro(plan.offenProMonat, 'ganz')} im Monat` : 'Alle Schritte mit Wirkung sind erledigt.'}
        </p>
      </section>

      {plan.schritte.length === 0 && <p className="schritte__leer">Gerade gibt es keine Vorschläge. Deine Zahlen sehen gut aus.</p>}

      {offen.map((s) => (
        <SchrittKarte key={s.id} schritt={s} onUmschalten={() => onUmschalten(s)} />
      ))}

      {erledigt.map((s) => (
        <button key={s.id} type="button" className="schritte__erledigt" onClick={() => onUmschalten(s)} aria-pressed="true" aria-label={`${s.titel}, erledigt. Antippen macht es rückgängig.`}>
          <IconFertig />
          <span className="schritte__erledigt-titel">{s.titel}</span>
          {s.plusProMonat !== null && <span className="schritte__erledigt-plus">{plus(s.plusProMonat)}</span>}
        </button>
      ))}

      <KiPrompt text={erstelleKiPrompt(analyse, ziel, plan, aktuellerMonat())} />

      <TabLeiste aktiv="schritte" onWechsel={onTab} />
    </main>
  )
}

function SchrittKarte({ schritt, onUmschalten }: { schritt: Schritt; onUmschalten: () => void }) {
  const absicherung = schritt.art === 'Absicherung'
  const klasse = ['schritte__karte', absicherung ? 'schritte__karte--absicherung' : 'schritte__karte--ausgaben', schritt.dieseWoche ? 'schritte__karte--jetzt' : '']
  return (
    <article className={klasse.join(' ')}>
      <div className="schritte__tags">
        <span className="schritte__tag">{schritt.art}</span>
        {schritt.dieseWoche && <span className="schritte__tag schritte__tag--stark">Diese Woche</span>}
        <span className="schritte__aufwand">{schritt.aufwand}</span>
      </div>
      <h2 className="schritte__titel">{schritt.titel}</h2>
      <p className="schritte__text">{schritt.text}</p>
      {schritt.plusProMonat !== null && (
        <p className="schritte__wirkung">
          <span className="schritte__plus">{plus(schritt.plusProMonat)}</span>
          {schritt.monateFrueher !== null && schritt.monateFrueher > 0 && <span>Ziel {dauer(schritt.monateFrueher)} früher</span>}
        </p>
      )}
      <button type="button" className="textknopf schritte__abhaken" onClick={onUmschalten}>
        Als erledigt abhaken
      </button>
    </article>
  )
}

/** Kopiert die anonyme Zusammenfassung. Es wird nichts gesendet. */
function KiPrompt({ text }: { text: string }) {
  const [status, setStatus] = useState<'bereit' | 'kopiert' | 'fehler'>('bereit')
  const [offen, setOffen] = useState(false)

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(text)
      setStatus('kopiert')
    } catch {
      setStatus('fehler')
      setOffen(true)
    }
  }

  return (
    <section className="karte schritte__ki" aria-labelledby="ki-titel">
      <h2 id="ki-titel" className="label">
        KI fragen
      </h2>
      <p className="schritte__ki-text">
        Kopiere eine anonyme Zusammenfassung und füge sie in dein Claude oder ChatGPT ein. Ohne Namen, IBAN und einzelne Buchungen, alle
        Beträge gerundet. Die App sendet nichts.
      </p>
      <button type="button" className="knopf schritte__kopieren" onClick={kopieren}>
        {status === 'kopiert' ? 'Kopiert ✓' : 'KI-Prompt kopieren'}
      </button>
      <p className="schritte__ki-status" role="status">
        {status === 'kopiert' && 'Jetzt in Claude oder ChatGPT einfügen.'}
        {status === 'fehler' && 'Automatisch kopieren ging nicht. Markiere den Text unten und kopiere ihn selbst.'}
      </p>
      <details open={offen} onToggle={(e) => setOffen(e.currentTarget.open)}>
        <summary className="schritte__vorschau">Was kopiert wird</summary>
        <pre className="schritte__prompt">{text}</pre>
      </details>
    </section>
  )
}
