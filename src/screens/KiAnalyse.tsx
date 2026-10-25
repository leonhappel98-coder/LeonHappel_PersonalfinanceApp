import { useRef, useState } from 'react'
import { formatEuro } from '../engine/format'
import type { Ziel } from '../engine/prognose'
import { monateFrueher } from '../engine/schritte'
import { fordereKiAnalyse, kiEingerichtet, type KiErgebnis, type KiVorschlag } from '../ki/kiAnalyse'
import { dauer } from '../ui/texte'
import './screens.css'

type Props = {
  /** Die anonyme Zusammenfassung, genau so, wie sie gesendet würde */
  zusammenfassung: string
  ziel: Ziel
  /** Sparrate inklusive erledigter Schritte, Basis für „Ziel X früher“ */
  sparrateJetzt: number
  startMonat: string
  ergebnis?: KiErgebnis
  onErgebnis: (ergebnis: KiErgebnis) => void
}

const zeitpunkt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

/** „KI-Analyse starten“: Erst Zustimmung, dann senden, dann Vorschläge zeigen. Ohne „Senden“ geht nichts raus. */
export function KiAnalyse({ zusammenfassung, ziel, sparrateJetzt, startMonat, ergebnis, onErgebnis }: Props) {
  const fenster = useRef<HTMLDialogElement>(null)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string>()
  const eingerichtet = kiEingerichtet()

  // Pausiert, solange in config.ts kein KI_SERVER_URL eingetragen ist: dann gar nicht anzeigen.
  if (!eingerichtet) return null

  async function senden() {
    fenster.current?.close()
    setFehler(undefined)
    setLaedt(true)
    try {
      onErgebnis(await fordereKiAnalyse(zusammenfassung))
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Die KI-Analyse hat gerade nicht geklappt.')
    } finally {
      setLaedt(false)
    }
  }

  return (
    <section className="karte ki" aria-labelledby="ki-analyse-titel" aria-busy={laedt}>
      <div className="ki__kopf">
        <h2 id="ki-analyse-titel" className="label">
          KI-Analyse
        </h2>
        <span className="ki__marke">Claude</span>
      </div>
      <p className="schritte__ki-text">
        Claude schaut sich deine anonyme Zusammenfassung an und schlägt eigene Schritte vor, passend zu deinen Zahlen. Vor dem Senden
        siehst du genau, was rausgeht.
      </p>

      {ergebnis && !laedt && (
        <div className="ki__ergebnis">
          {ergebnis.vorschlaege.map((v) => (
            <KiKarte key={v.titel} vorschlag={v} frueher={v.euroProMonat > 0 ? monateFrueher(ziel, startMonat, sparrateJetzt, v.euroProMonat) : null} />
          ))}
          <p className="ki__hinweis">
            KI-Vorschläge vom {zeitpunkt.format(new Date(ergebnis.erstellt))} Uhr, können Fehler enthalten. {ergebnis.hinweis}
          </p>
        </div>
      )}

      {laedt && (
        <p className="ki__laedt" role="status">
          <span className="ki__punkt" aria-hidden="true" />
          Claude denkt nach … das dauert bis zu einer Minute.
        </p>
      )}
      {fehler && (
        <p className="start__fehler" role="alert">
          {fehler}
        </p>
      )}

      <button type="button" className="knopf schritte__kopieren" disabled={laedt} onClick={() => fenster.current?.showModal()}>
        {ergebnis ? 'Neu analysieren' : 'KI-Analyse starten'}
      </button>

      <dialog ref={fenster} className="zustimmung" aria-labelledby="zustimmung-titel">
        <h2 id="zustimmung-titel" className="zustimmung__titel">
          Das wird gesendet
        </h2>
        <ul className="zustimmung__fakten">
          <li>
            <strong>An:</strong> Claude (Anthropic, USA) über den Löwen-Finance-Server
          </li>
          <li>
            <strong>Nicht dabei:</strong> Namen, IBAN, Verwendungszweck, einzelne Buchungen, Daten
          </li>
          <li>
            <strong>Gespeichert:</strong> nichts auf unserem Server. Anthropic nutzt die Daten laut eigenen Bedingungen nicht zum Training.
          </li>
        </ul>
        <pre className="schritte__prompt zustimmung__text" tabIndex={0} aria-label="Text, der gesendet wird">
          {zusammenfassung}
        </pre>
        <div className="zustimmung__knoepfe">
          <button type="button" className="knopf" onClick={senden}>
            Senden
          </button>
          <button type="button" className="textknopf zustimmung__abbrechen" onClick={() => fenster.current?.close()}>
            Abbrechen
          </button>
        </div>
      </dialog>
    </section>
  )
}

const ART_KLASSE: Record<KiVorschlag['art'], string> = {
  Ausgaben: 'ki__karte--ausgaben',
  Einnahmen: 'ki__karte--einnahmen',
  Absicherung: 'ki__karte--absicherung',
  Vermögen: 'ki__karte--vermoegen',
}

function KiKarte({ vorschlag, frueher }: { vorschlag: KiVorschlag; frueher: number | null }) {
  return (
    <article className={`ki__karte ${ART_KLASSE[vorschlag.art]}`}>
      <div className="schritte__tags">
        <span className="schritte__tag ki__tag">{vorschlag.art}</span>
        <span className="schritte__aufwand">{vorschlag.aufwand}</span>
      </div>
      <h3 className="schritte__titel">{vorschlag.titel}</h3>
      <p className="schritte__text">{vorschlag.begruendung}</p>
      {vorschlag.euroProMonat > 0 && (
        <p className="schritte__wirkung">
          <span className="ki__plus">+{formatEuro(vorschlag.euroProMonat, 'ganz')}/Monat</span>
          {frueher !== null && frueher > 0 && <span>Ziel {dauer(frueher)} früher</span>}
        </p>
      )}
    </article>
  )
}
