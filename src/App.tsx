import { useEffect, useState } from 'react'
import beispielUrl from '../testdata/kontoexport_alex_finanzguru.xlsx?url'
import type { Ziel as ZielDaten } from './engine/prognose'
import type { Analyse as AnalyseErgebnis } from './engine/typen'
import { leseBetrag } from './engine/zahlen'
import { Analyse } from './screens/Analyse'
import { Ergebnis } from './screens/Ergebnis'
import { Heute } from './screens/Heute'
import { Prognose } from './screens/Prognose'
import { Start } from './screens/Start'
import { Ziel } from './screens/Ziel'
import { ladeZustand, loescheAlles, speichereZustand } from './storage/speicher'

type Screen = 'start' | 'analyse' | 'ergebnis' | 'ziel' | 'heute' | 'prognose'

const BEISPIEL_NAME = 'kontoexport_alex_finanzguru.xlsx'

export default function App() {
  const [geladen, setGeladen] = useState(false)
  const [screen, setScreen] = useState<Screen>('start')
  const [schaetzungText, setSchaetzungText] = useState('')
  const [dateiname, setDateiname] = useState('')
  const [analyse, setAnalyse] = useState<AnalyseErgebnis | null>(null)
  const [ziel, setZiel] = useState<ZielDaten>()
  const [istDemo, setIstDemo] = useState(false)
  const [fehler, setFehler] = useState<string>()

  // Gespeicherten Stand vom Gerät holen: mit Ziel direkt zu „Heute“, sonst zum Ergebnis.
  useEffect(() => {
    ladeZustand().then((zustand) => {
      if (zustand) {
        setAnalyse(zustand.analyse)
        setDateiname(zustand.dateiname)
        setIstDemo(zustand.istDemo)
        setSchaetzungText(zustand.schaetzung ? new Intl.NumberFormat('de-DE').format(zustand.schaetzung) : '')
        setZiel(zustand.ziel)
        const ziel: Screen = zustand.ziel ? 'heute' : 'ergebnis'
        window.history.replaceState({ screen: ziel }, '')
        setScreen(ziel)
      }
      setGeladen(true)
    })
  }, [])

  // Zurück-Geste am iPhone und Zurück-Knopf im Browser wechseln den Screen.
  useEffect(() => {
    const zurueck = (e: PopStateEvent) => setScreen((e.state?.screen as Screen) ?? 'start')
    window.addEventListener('popstate', zurueck)
    return () => window.removeEventListener('popstate', zurueck)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  const gehe = (ziel: Screen) => {
    window.history.pushState({ screen: ziel }, '')
    setScreen(ziel)
  }

  const schaetzung = leseSchaetzung(schaetzungText)

  /** Liest die Datei auf dem Gerät und rechnet. Der Rechenkern wird erst jetzt geladen. */
  async function werteAus(name: string, ladeDaten: () => Promise<ArrayBuffer>, demo: boolean) {
    setFehler(undefined)
    setAnalyse(null)
    setDateiname(name)
    setIstDemo(demo)
    gehe('analyse')
    try {
      const [{ analysiereDatei }, daten] = await Promise.all([import('./engine'), ladeDaten()])
      const ergebnis = analysiereDatei(daten)
      if (ergebnis.anzahl.buchungen === 0) throw new Error('keine Buchungen')
      setAnalyse(ergebnis)
      speichereZustand({ version: 1, analyse: ergebnis, dateiname: name, istDemo: demo, schaetzung, ziel })
    } catch (e) {
      setFehler(fehlertext(e))
      setIstDemo(false)
      window.history.back()
    }
  }

  function zielSpeichern(neu: ZielDaten) {
    if (!analyse) return
    setZiel(neu)
    speichereZustand({ version: 1, analyse, dateiname, istDemo, schaetzung, ziel: neu })
    gehe('heute')
  }

  async function allesLoeschen() {
    await loescheAlles()
    setAnalyse(null)
    setZiel(undefined)
    setIstDemo(false)
    setSchaetzungText('')
    setDateiname('')
    window.history.replaceState({ screen: 'start' }, '')
    setScreen('start')
  }

  if (!geladen) return null

  if (screen === 'analyse') {
    return (
      <Analyse
        dateiname={dateiname}
        analyse={analyse}
        schaetzung={schaetzung}
        istDemo={istDemo}
        onZurueck={() => window.history.back()}
        onWeiter={() => gehe('ergebnis')}
      />
    )
  }

  if (analyse && screen === 'ergebnis') {
    return (
      <Ergebnis
        analyse={analyse}
        schaetzung={schaetzung}
        istDemo={istDemo}
        hatZiel={ziel !== undefined}
        onWeiter={() => gehe(ziel ? 'heute' : 'ziel')}
        onNeu={() => gehe('start')}
      />
    )
  }

  if (analyse && screen === 'ziel') {
    return (
      <Ziel
        analyse={analyse}
        istDemo={istDemo}
        ziel={ziel}
        onFertig={zielSpeichern}
        onZurueck={() => window.history.back()}
        onNeueDatei={() => gehe('start')}
        onAllesLoeschen={allesLoeschen}
      />
    )
  }

  if (analyse && ziel && screen === 'heute') {
    return (
      <Heute
        analyse={analyse}
        ziel={ziel}
        istDemo={istDemo}
        onTab={gehe}
        onEinstellungen={() => gehe('ziel')}
        onAuswertung={() => gehe('ergebnis')}
      />
    )
  }

  if (ziel && screen === 'prognose') {
    return <Prognose ziel={ziel} istDemo={istDemo} onTab={gehe} />
  }

  return (
    <Start
      schaetzung={schaetzungText}
      setSchaetzung={setSchaetzungText}
      istDemo={istDemo}
      fehler={fehler}
      onDatei={(datei) => werteAus(datei.name, () => datei.arrayBuffer(), false)}
      onBeispiel={() =>
        werteAus(BEISPIEL_NAME, () => fetch(beispielUrl).then((antwort) => antwort.arrayBuffer()), true)
      }
    />
  )
}

/** „1.000“ → 1000; leer oder 0 → keine Schätzung */
function leseSchaetzung(text: string): number | null {
  const wert = leseBetrag(text)
  return isNaN(wert) || wert <= 0 ? null : wert
}

function fehlertext(e: unknown): string {
  if (e instanceof Error && e.name === 'SpaltenUnbekanntFehler') {
    return 'Diese Datei kennt die App noch nicht: Datum, Betrag oder Empfänger wurden nicht gefunden. Probier den CSV-Export aus dem Online-Banking oder die Excel-Datei aus Finanzguru.'
  }
  return 'Die Datei konnte nicht gelesen werden. Ist es ein Kontoexport als CSV oder Excel?'
}
