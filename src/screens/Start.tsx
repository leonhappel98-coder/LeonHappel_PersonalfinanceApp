import { useRef, useState, type DragEvent } from 'react'
import { APP_AUTOR, APP_NAME } from '../config'
import { DemoLabel, IconDatei, IconSchloss } from '../ui/Bausteine'
import { deinGeraet } from '../ui/texte'
import './screens.css'

type Props = {
  schaetzung: string
  setSchaetzung: (wert: string) => void
  onDatei: (datei: File) => void
  onBeispiel: () => void
  istDemo: boolean
  fehler?: string
}

export function Start({ schaetzung, setSchaetzung, onDatei, onBeispiel, istDemo, fehler }: Props) {
  const dateiFeld = useRef<HTMLInputElement>(null)
  const [ziehtDrueber, setZiehtDrueber] = useState(false)

  const ablegen = (e: DragEvent) => {
    e.preventDefault()
    setZiehtDrueber(false)
    const datei = e.dataTransfer.files[0]
    if (datei) onDatei(datei)
  }

  return (
    <main className="seite start">
      <div className="start__bogen" aria-hidden="true" />

      <header className="kopfzeile">
        <p className="start__name">
          <img className="start__logo" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width="34" height="34" />
          <span>
            {APP_NAME} <span className="start__autor">by {APP_AUTOR}</span>
          </span>
        </p>
        {istDemo && <DemoLabel />}
      </header>

      <div className="start__intro">
        <h1 className="start__titel">
          Wohin geht
          <br />
          dein Geld?
        </h1>
        <p className="start__text">
          Zieh deinen Kontoexport rein. Die App sortiert jede Buchung und zeigt dir, was du wirklich zum Leben brauchst.
        </p>
      </div>

      <div className="karte start__raten">
        <label htmlFor="schaetzung" className="start__frage">
          Erst raten: Was gibst du im Monat zum Leben aus? Ohne Miete und Verträge.
        </label>
        <div className="start__eingabe">
          <input
            id="schaetzung"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="1.000"
            value={schaetzung}
            onChange={(e) => setSchaetzung(e.target.value.replace(/[^\d.,]/g, ''))}
          />
          <span aria-hidden="true">€</span>
        </div>
      </div>

      <section
        className={ziehtDrueber ? 'start__ablage start__ablage--aktiv' : 'start__ablage'}
        onDragOver={(e) => {
          e.preventDefault()
          setZiehtDrueber(true)
        }}
        onDragLeave={() => setZiehtDrueber(false)}
        onDrop={ablegen}
        aria-labelledby="ablage-titel"
      >
        <div className="start__icon">
          <IconDatei />
        </div>
        <h2 id="ablage-titel" className="start__ablage-titel">
          Kontoexport reinziehen
        </h2>
        <p className="start__ablage-text">CSV aus dem Online-Banking oder Excel aus Finanzguru, am besten 12 Monate</p>
        <button type="button" className="knopf start__waehlen" onClick={() => dateiFeld.current?.click()}>
          Datei auswählen
        </button>
        <input
          ref={dateiFeld}
          type="file"
          accept=".csv,.txt,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="nur-vorlesen"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const datei = e.target.files?.[0]
            e.target.value = ''
            if (datei) onDatei(datei)
          }}
        />
        <button type="button" className="textknopf" onClick={onBeispiel}>
          Mit Beispieldaten ausprobieren
        </button>
      </section>

      {fehler && (
        <p className="start__fehler" role="alert">
          {fehler}
        </p>
      )}

      <p className="start__datenschutz">
        <IconSchloss />
        <span>
          <span className="start__datenschutz-hervor">Bleibt auf {deinGeraet()}.</span> Gerechnet wird auf dem Gerät, nichts geht an einen Server.
        </span>
      </p>

      <footer className="start__fuss">Mit Claude gebaut</footer>
    </main>
  )
}
