import { useState } from 'react'
import { formatEuro } from '../engine/format'
import { plusMonate, type Ziel as ZielDaten } from '../engine/prognose'
import type { Analyse } from '../engine/typen'
import { leseBetrag } from '../engine/zahlen'
import { DemoLabel, IconZurueck } from '../ui/Bausteine'
import { aktuellerMonat } from '../ui/texte'
import './screens.css'

type Props = {
  analyse: Analyse
  istDemo: boolean
  /** Vorhandenes Ziel zum Bearbeiten */
  ziel?: ZielDaten
  onFertig: (ziel: ZielDaten) => void
  onZurueck: () => void
  onNeueDatei: () => void
  onAllesLoeschen: () => void
}

/** Beispielperson Alex aus docs/ROADMAP.md */
const ALEX = { depot: 31_800, tagesgeld: 2_400, zielBetrag: 100_000, zielMonat: '2030-07' }

const alsText = (betrag: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(betrag)
const nurZahl = (text: string) => text.replace(/[^\d.,]/g, '')

export function Ziel({ analyse, istDemo, ziel, onFertig, onZurueck, onNeueDatei, onAllesLoeschen }: Props) {
  const sparenLautAuswertung = Math.round(analyse.sparenProMonat)
  const start = ziel ?? (istDemo ? { ...ALEX, sparrateProMonat: sparenLautAuswertung } : undefined)

  const [depot, setDepot] = useState(start ? alsText(start.depot) : '')
  const [tagesgeld, setTagesgeld] = useState(start ? alsText(start.tagesgeld) : '')
  const [sparrate, setSparrate] = useState(alsText(start?.sparrateProMonat ?? sparenLautAuswertung))
  const [zielBetrag, setZielBetrag] = useState(alsText(start?.zielBetrag ?? 100_000))
  const [zielMonat, setZielMonat] = useState(start?.zielMonat ?? plusMonate(aktuellerMonat(), 60))

  const zahl = (text: string) => (text.trim() === '' ? 0 : leseBetrag(text))
  const werte = {
    depot: zahl(depot),
    tagesgeld: zahl(tagesgeld),
    sparrateProMonat: zahl(sparrate),
    zielBetrag: zahl(zielBetrag),
    zielMonat,
  }
  const gueltig =
    [werte.depot, werte.tagesgeld, werte.sparrateProMonat].every((w) => !isNaN(w) && w >= 0) &&
    werte.zielBetrag > 0 &&
    /^\d{4}-\d{2}$/.test(zielMonat)

  return (
    <main className="seite ziel">
      <header className="kopfzeile">
        <button type="button" className="analyse__zurueck" onClick={onZurueck} aria-label="Zurück">
          <IconZurueck />
        </button>
        {istDemo && <DemoLabel />}
      </header>

      <div className="analyse__titelblock">
        <h1 className="analyse__titel">Dein Ziel</h1>
        <p className="ziel__text">Wie viel hast du heute, und wo willst du hin? Gerechnet wird auf dem Gerät.</p>
      </div>

      <form
        className="ziel__formular"
        onSubmit={(e) => {
          e.preventDefault()
          if (gueltig) onFertig(werte)
        }}
      >
        <section className="karte" aria-labelledby="ziel-heute">
          <h2 id="ziel-heute" className="label">
            Heute
          </h2>
          <Betragsfeld id="depot" name="Depotwert" wert={depot} setWert={setDepot} platzhalter="0" />
          <Betragsfeld id="tagesgeld" name="Tagesgeld und Erspartes" wert={tagesgeld} setWert={setTagesgeld} platzhalter="0" />
        </section>

        <section className="karte" aria-labelledby="ziel-monat">
          <h2 id="ziel-monat" className="label">
            Jeden Monat
          </h2>
          <Betragsfeld
            id="sparrate"
            name="Ins Depot"
            wert={sparrate}
            setWert={setSparrate}
            einheit="€/Mon."
            hilfe={`Laut deiner Auswertung sparst du ${formatEuro(sparenLautAuswertung, 'ganz')} im Monat.`}
          />
        </section>

        <section className="karte" aria-labelledby="ziel-wohin">
          <h2 id="ziel-wohin" className="label">
            Ziel
          </h2>
          <Betragsfeld id="zielbetrag" name="Vermögen" wert={zielBetrag} setWert={setZielBetrag} platzhalter="100.000" />
          <label className="feld">
            <span className="feld__name">Bis</span>
            <span className="feld__eingabe">
              <input type="month" value={zielMonat} min={aktuellerMonat()} onChange={(e) => setZielMonat(e.target.value)} />
            </span>
          </label>
        </section>

        <div className="fusszeile-knopf">
          <button type="submit" className="knopf" disabled={!gueltig}>
            Prognose berechnen
          </button>
        </div>
      </form>

      {ziel && (
        <section className="ziel__daten" aria-label="Daten">
          <button type="button" className="textknopf" onClick={onNeueDatei}>
            Andere Datei auswerten
          </button>
          <button
            type="button"
            className="textknopf ziel__loeschen"
            onClick={() => {
              if (window.confirm('Auswertung und Ziel von diesem Gerät löschen?')) onAllesLoeschen()
            }}
          >
            Alle Daten löschen
          </button>
        </section>
      )}
    </main>
  )
}

type BetragsfeldProps = {
  id: string
  name: string
  wert: string
  setWert: (wert: string) => void
  platzhalter?: string
  einheit?: string
  hilfe?: string
}

function Betragsfeld({ id, name, wert, setWert, platzhalter, einheit = '€', hilfe }: BetragsfeldProps) {
  return (
    <div className="feld">
      <label htmlFor={id} className="feld__name">
        {name}
      </label>
      <span className="feld__eingabe">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={platzhalter}
          value={wert}
          onChange={(e) => setWert(nurZahl(e.target.value))}
          aria-describedby={hilfe ? `${id}-hilfe` : undefined}
        />
        <span className="feld__einheit" aria-hidden="true">
          {einheit}
        </span>
      </span>
      {hilfe && (
        <span id={`${id}-hilfe`} className="feld__hilfe">
          {hilfe}
        </span>
      )}
    </div>
  )
}
