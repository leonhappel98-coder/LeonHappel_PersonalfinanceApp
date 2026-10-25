import { vergleicheMitSchaetzung } from '../engine/auswerten'
import { formatEuro, formatProzent } from '../engine/format'
import type { Analyse } from '../engine/typen'
import { Balken, DemoLabel } from '../ui/Bausteine'
import { zahl } from '../ui/texte'
import './screens.css'

type Props = {
  analyse: Analyse
  schaetzung: number | null
  istDemo: boolean
  /** Gibt es schon ein Ziel, führt der Knopf zurück zu „Heute“. */
  hatZiel: boolean
  onWeiter: () => void
  onNeu: () => void
}

const euro = (betrag: number) => formatEuro(betrag, 'ganz')

export function Ergebnis({ analyse, schaetzung, istDemo, hatZiel, onWeiter, onNeu }: Props) {
  const monate = Math.max(1, Math.round(analyse.zeitraum.monate))
  const groessteKategorie = Math.max(...analyse.kategorien.map((k) => k.proMonat), 1)

  return (
    <main className="seite ergebnis">
      <header className="ergebnis__kopf">
        <div className="kopfzeile">
          <p className="label">Auswertung · {monate === 1 ? 'letzter Monat' : `letzte ${monate} Monate`}</p>
          {istDemo && <DemoLabel />}
        </div>
        <h1 className="ergebnis__titel">So lebst du wirklich</h1>
      </header>

      <section className="karte karte--hervorgehoben" aria-labelledby="lebenshaltung">
        <h2 id="lebenshaltung" className="label">
          Lebenshaltung pro Monat
        </h2>
        <div className="ergebnis__hauptzahl-block">
          <p className="ergebnis__hauptzahl">{euro(analyse.lebenshaltungProMonat)}</p>
          {schaetzung !== null && <Abweichung analyse={analyse} schaetzung={schaetzung} />}
        </div>
        {schaetzung !== null && <SchaetzungVergleich analyse={analyse} schaetzung={schaetzung} />}
      </section>

      <section className="karte" aria-labelledby="wohin">
        <h2 id="wohin" className="label">
          Wohin es geht
        </h2>
        {analyse.kategorien.map((k) => (
          <div key={k.kategorie} className="ergebnis__kategorie">
            <div className="ergebnis__zeile">
              <span>{k.kategorie}</span>
              <span className="zahl ergebnis__betrag">{euro(k.proMonat)}</span>
            </div>
            <Balken anteil={k.proMonat / groessteKategorie} />
            {k.kategorie === 'Essen & Trinken' && analyse.auswaertsEssenProMonat > 0 && (
              <p className="ergebnis__davon">davon Lieferdienste und Restaurants {euro(analyse.auswaertsEssenProMonat)}</p>
            )}
          </div>
        ))}
        {analyse.anzahl.zumNachschauen > 0 && (
          <p className="ergebnis__davon">
            {zahl(analyse.anzahl.zumNachschauen)} {analyse.anzahl.zumNachschauen === 1 ? 'Buchung' : 'Buchungen'} unter
            Sonstiges zum Nachschauen
          </p>
        )}
      </section>

      <section className="karte" aria-labelledby="fixkosten">
        <div className="ergebnis__fixkopf">
          <h2 id="fixkosten" className="ergebnis__fixtitel">
            Fixkosten {euro(analyse.fixkostenProMonat)}
          </h2>
          {analyse.nettoeinkommenProMonat > 0 && (
            <p className="zahl ergebnis__quote">{formatProzent(analyse.fixkostenQuote)} vom Netto</p>
          )}
        </div>
        {analyse.hinweise.length > 0 && (
          <ul className="ergebnis__chips">
            {analyse.hinweise.map((h) => (
              <li key={h.text} className="ergebnis__chip">
                {h.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      {analyse.einmaleffekte.buchungen.length > 0 && (
        <section className="karte" aria-labelledby="rausgerechnet">
          <div className="ergebnis__zeile">
            <h2 id="rausgerechnet" className="label">
              Rausgerechnet · Einmaleffekte
            </h2>
            <span className="zahl ergebnis__betrag">{euro(analyse.einmaleffekte.summe)}</span>
          </div>
          <ul className="ergebnis__liste">
            {analyse.einmaleffekte.buchungen.map((b) => (
              <li key={b.id} className="ergebnis__zeile">
                <span className="ergebnis__posten">{b.gegenpartei}</span>
                <span className="zahl ergebnis__betrag">{euro(-b.betrag)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="fusszeile-knopf">
        <button type="button" className="knopf" onClick={onWeiter}>
          {hatZiel ? 'Zurück zu Heute' : 'Weiter: Ziel festlegen'}
        </button>
        <p className="ergebnis__phase2">
          <button type="button" className="textknopf ergebnis__neu" onClick={onNeu}>
            Andere Datei auswerten
          </button>
        </p>
      </div>
    </main>
  )
}

function Abweichung({ analyse, schaetzung }: { analyse: Analyse; schaetzung: number }) {
  const { differenzProMonat } = vergleicheMitSchaetzung(analyse, schaetzung)
  const gerundet = Math.round(differenzProMonat)
  if (gerundet === 0) return <p className="ergebnis__abweichung ergebnis__abweichung--gut">Genau wie geschätzt</p>
  return gerundet > 0 ? (
    <p className="ergebnis__abweichung">{euro(gerundet)} mehr als geschätzt</p>
  ) : (
    <p className="ergebnis__abweichung ergebnis__abweichung--gut">{euro(-gerundet)} weniger als geschätzt</p>
  )
}

function SchaetzungVergleich({ analyse, schaetzung }: { analyse: Analyse; schaetzung: number }) {
  const tatsaechlich = analyse.lebenshaltungProMonat
  const groesster = Math.max(tatsaechlich, schaetzung, 1)
  const differenzJahr = Math.round(vergleicheMitSchaetzung(analyse, schaetzung).differenzProJahr)
  return (
    <>
      <div className="ergebnis__vergleich">
        <div className="ergebnis__zeile ergebnis__zeile--klein">
          <span>Geschätzt</span>
          <span className="zahl">{euro(schaetzung)}</span>
        </div>
        <Balken dick grau anteil={schaetzung / groesster} beschriftung={`Geschätzt: ${euro(schaetzung)}`} />
      </div>
      <div className="ergebnis__vergleich">
        <div className="ergebnis__zeile ergebnis__zeile--klein ergebnis__zeile--hell">
          <span>Tatsächlich</span>
          <span className="zahl">{euro(tatsaechlich)}</span>
        </div>
        <Balken dick anteil={tatsaechlich / groesster} beschriftung={`Tatsächlich: ${euro(tatsaechlich)}`} />
      </div>
      {differenzJahr !== 0 && (
        <p className="ergebnis__jahr">
          Aufs Jahr sind das {euro(Math.abs(differenzJahr))} {differenzJahr > 0 ? 'mehr' : 'weniger'} als gedacht.
        </p>
      )}
    </>
  )
}
