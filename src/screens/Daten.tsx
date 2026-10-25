import { useRef, useState, type DragEvent } from 'react'
import { formatEuro } from '../engine/format'
import type { Ziel } from '../engine/prognose'
import type { Analyse, Dateiformat } from '../engine/typen'
import { leseBetrag } from '../engine/zahlen'
import { leseBackup } from '../storage/backup'
import type { Checkin, Gespeichert, Import } from '../storage/speicher'
import { DemoLabel, IconDatei, IconSchloss } from '../ui/Bausteine'
import { TabLeiste, type Tab } from '../ui/TabLeiste'
import { deinGeraet } from '../ui/texte'
import './screens.css'

type Props = {
  analyse: Analyse
  ziel: Ziel
  istDemo: boolean
  anzahlBuchungen: number
  letzterImport?: Import
  checkins: Checkin[]
  /** YYYY-MM-DD */
  heute: string
  fehler?: string
  onDatei: (datei: File) => void
  onCheckin: (depot: number) => void
  onBackup: () => void
  onWiederherstellen: (stand: Gespeichert) => void
  onAllesLoeschen: () => void
  onTab: (tab: Tab) => void
}

const BANKEN: { name: string; format: Dateiformat }[] = [
  { name: 'Sparkasse', format: 'sparkasse' },
  { name: 'ING', format: 'ing' },
  { name: 'DKB', format: 'dkb' },
  { name: 'comdirect', format: 'comdirect' },
  { name: 'Volksbank', format: 'volksbank' },
  { name: 'Finanzguru', format: 'finanzguru' },
]

/** „2026-10-23“ → „23.10.2026“ */
const datum = (iso: string) => iso.slice(0, 10).split('-').reverse().join('.')
const zahl = (wert: number) => new Intl.NumberFormat('de-DE').format(wert)

/** Neue Daten, Monats-Check-in und Backup (Design: docs/design/screens/08-Daten.png). */
export function Daten(props: Props) {
  const { analyse, ziel, istDemo, anzahlBuchungen, letzterImport, checkins, heute, fehler, onDatei, onTab } = props
  const dateiFeld = useRef<HTMLInputElement>(null)
  const [ziehtDrueber, setZiehtDrueber] = useState(false)

  const ablegen = (e: DragEvent) => {
    e.preventDefault()
    setZiehtDrueber(false)
    const datei = e.dataTransfer.files[0]
    if (datei) onDatei(datei)
  }

  return (
    <main className="seite mit-tableiste daten">
      <header className="kopfzeile">
        <div className="heute__titelblock">
          <p className="heute__gruss">
            Stand {datum(analyse.zeitraum.bis)} · {zahl(anzahlBuchungen)} Buchungen
          </p>
          <h1 className="heute__titel">Neue Daten</h1>
        </div>
        {istDemo && <DemoLabel />}
      </header>

      <section
        className={ziehtDrueber ? 'start__ablage start__ablage--aktiv' : 'start__ablage'}
        onDragOver={(e) => {
          e.preventDefault()
          setZiehtDrueber(true)
        }}
        onDragLeave={() => setZiehtDrueber(false)}
        onDrop={ablegen}
        aria-labelledby="daten-ablage"
      >
        <div className="start__icon">
          <IconDatei />
        </div>
        <h2 id="daten-ablage" className="start__ablage-titel">
          Kontoexport auswählen
        </h2>
        <p className="start__ablage-text">
          {istDemo
            ? 'Deine eigene Datei ersetzt die Beispieldaten.'
            : 'Neue Buchungen kommen dazu, doppelte erkennt die App. Ausgewertet werden die letzten 12 Monate.'}
        </p>
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
        {letzterImport && (
          <p className="daten__import">
            Zuletzt: {letzterImport.dateiname} · {zahl(letzterImport.neu)} neu
            {letzterImport.doppelt > 0 && `, ${zahl(letzterImport.doppelt)} schon bekannt`}
          </p>
        )}
      </section>

      {fehler && (
        <p className="start__fehler" role="alert">
          {fehler}
        </p>
      )}

      <ul className="daten__banken" aria-label="Unterstützte Banken">
        {BANKEN.map((b) => (
          <li key={b.name} className={b.format === analyse.format ? 'daten__bank daten__bank--aktiv' : 'daten__bank'}>
            {b.name}
          </li>
        ))}
      </ul>

      <section className="karte daten__schutz">
        <IconSchloss />
        <div>
          <p className="daten__schutz-titel">Bleibt auf {deinGeraet()}</p>
          <p className="ziel__text">Die App rechnet lokal, nichts geht an einen Server.</p>
        </div>
      </section>

      <CheckinKarte ziel={ziel} checkins={checkins} heute={heute} onCheckin={props.onCheckin} />

      <BackupKarte onBackup={props.onBackup} onWiederherstellen={props.onWiederherstellen} onAllesLoeschen={props.onAllesLoeschen} />

      <TabLeiste aktiv="daten" onWechsel={onTab} />
    </main>
  )
}

function CheckinKarte({ ziel, checkins, heute, onCheckin }: { ziel: Ziel; checkins: Checkin[]; heute: string; onCheckin: (depot: number) => void }) {
  const letzter = checkins.at(-1)
  const faellig = !letzter || letzter.datum.slice(0, 7) !== heute.slice(0, 7)
  const [text, setText] = useState(new Intl.NumberFormat('de-DE').format(ziel.depot))
  const [gespeichert, setGespeichert] = useState(false)
  const wert = leseBetrag(text)

  return (
    <section className="karte" aria-labelledby="checkin">
      <div className="finanzcheck__kopf">
        <h2 id="checkin" className="label">
          Monats-Check-in
        </h2>
        <span className={faellig ? 'daten__status hinweis' : 'daten__status gut'}>{faellig ? 'fällig' : 'erledigt'}</span>
      </div>
      <div className="feld">
        <label htmlFor="depotwert" className="feld__name">
          Depotwert heute
        </label>
        <span className="feld__eingabe">
          <input
            id="depotwert"
            type="text"
            inputMode="decimal"
            value={text}
            onChange={(e) => {
              setText(e.target.value.replace(/[^\d.,]/g, ''))
              setGespeichert(false)
            }}
          />
          <span className="feld__einheit" aria-hidden="true">
            €
          </span>
        </span>
        <span className="feld__hilfe">
          {letzter ? `Letzter Stand ${datum(letzter.datum)}: ${formatEuro(letzter.depot, 'ganz')}` : 'Noch kein Check-in. Schau in deine Depot-App und trag den Wert ein.'}
        </span>
      </div>
      <button
        type="button"
        className="knopf daten__umrandet"
        disabled={isNaN(wert) || wert < 0}
        onClick={() => {
          onCheckin(wert)
          setGespeichert(true)
        }}
      >
        {gespeichert ? 'Gespeichert ✓' : 'Check-in speichern'}
      </button>
    </section>
  )
}

function BackupKarte({
  onBackup,
  onWiederherstellen,
  onAllesLoeschen,
}: {
  onBackup: () => void
  onWiederherstellen: (stand: Gespeichert) => void
  onAllesLoeschen: () => void
}) {
  const dateiFeld = useRef<HTMLInputElement>(null)
  const [meldung, setMeldung] = useState<{ text: string; fehler: boolean }>()

  async function einlesen(datei: File) {
    try {
      const stand = leseBackup(await datei.text())
      if (window.confirm('Backup einlesen? Der aktuelle Stand auf diesem Gerät wird ersetzt.')) onWiederherstellen(stand)
    } catch (e) {
      setMeldung({ text: e instanceof Error ? e.message : 'Das Backup konnte nicht gelesen werden.', fehler: true })
    }
  }

  return (
    <section className="karte" aria-labelledby="backup">
      <h2 id="backup" className="label">
        Backup
      </h2>
      <p className="ziel__text">
        Speichert alles als Datei, z. B. in iCloud Drive. Damit kannst du auf einem neuen Gerät weitermachen. Die Datei enthält deine
        Buchungen: Bewahre sie sicher auf.
      </p>
      <button
        type="button"
        className="knopf daten__umrandet"
        onClick={() => {
          onBackup()
          setMeldung({ text: 'Backup-Datei gespeichert.', fehler: false })
        }}
      >
        Backup-Datei speichern
      </button>
      <button type="button" className="textknopf" onClick={() => dateiFeld.current?.click()}>
        Backup wiederherstellen
      </button>
      <input
        ref={dateiFeld}
        type="file"
        accept=".json,application/json"
        className="nur-vorlesen"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const datei = e.target.files?.[0]
          e.target.value = ''
          if (datei) einlesen(datei)
        }}
      />
      {meldung && (
        <p className={meldung.fehler ? 'start__fehler' : 'daten__ok'} role={meldung.fehler ? 'alert' : 'status'}>
          {meldung.text}
        </p>
      )}
      <button
        type="button"
        className="textknopf ziel__loeschen"
        onClick={() => {
          if (window.confirm('Alle Daten von diesem Gerät löschen?')) onAllesLoeschen()
        }}
      >
        Alle Daten löschen
      </button>
    </section>
  )
}
