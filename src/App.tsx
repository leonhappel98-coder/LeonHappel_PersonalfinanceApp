import { useEffect, useMemo, useState } from 'react'
import beispielUrl from '../testdata/kontoexport_alex_finanzguru.xlsx?url'
import type { Ziel as ZielDaten } from './engine/prognose'
import { erstelleFinanzCheck } from './engine/finanzCheck'
import { erstelleSchrittplan, type SchrittId } from './engine/schritte'
import type { KiErgebnis } from './ki/kiAnalyse'
import type { Analyse as AnalyseErgebnis } from './engine/typen'
import { leseBetrag } from './engine/zahlen'
import { Analyse } from './screens/Analyse'
import { Ergebnis } from './screens/Ergebnis'
import { FinanzCheck } from './screens/FinanzCheck'
import { Heute } from './screens/Heute'
import { Prognose } from './screens/Prognose'
import { Schritte } from './screens/Schritte'
import { Start } from './screens/Start'
import { WasWaere } from './screens/WasWaere'
import { Ziel } from './screens/Ziel'
import { ladeZustand, loescheAlles, speichereZustand, type Gespeichert } from './storage/speicher'
import { aktuellerMonat } from './ui/texte'

type Screen = 'start' | 'analyse' | 'ergebnis' | 'ziel' | 'heute' | 'schritte' | 'prognose' | 'finanzcheck' | 'waswaere'

const BEISPIEL_NAME = 'kontoexport_alex_finanzguru.xlsx'

export default function App() {
  const [geladen, setGeladen] = useState(false)
  const [screen, setScreen] = useState<Screen>('start')
  const [schaetzungText, setSchaetzungText] = useState('')
  const [dateiname, setDateiname] = useState('')
  const [analyse, setAnalyse] = useState<AnalyseErgebnis | null>(null)
  const [ziel, setZiel] = useState<ZielDaten>()
  const [erledigt, setErledigt] = useState<SchrittId[]>([])
  const [kiErgebnis, setKiErgebnis] = useState<KiErgebnis>()
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
        setErledigt(zustand.erledigt ?? [])
        setKiErgebnis(zustand.kiErgebnis)
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

  // Nächste Schritte und Prognose „so wie jetzt“ (mit erledigten Schritten)
  const plan = useMemo(
    () => (analyse && ziel ? erstelleSchrittplan(analyse, ziel, erledigt, aktuellerMonat()) : undefined),
    [analyse, ziel, erledigt],
  )

  const [jahr] = useState(() => new Date().getFullYear())
  const check = useMemo(() => (analyse && ziel ? erstelleFinanzCheck(analyse, ziel, jahr) : undefined), [analyse, ziel, jahr])

  /** Speichert den aktuellen Stand, mit den übergebenen Änderungen. */
  function sichere(aenderung: Partial<Gespeichert> & Pick<Gespeichert, 'analyse'>) {
    speichereZustand({ version: 1, dateiname, istDemo, schaetzung, ziel, erledigt, kiErgebnis, ...aenderung })
  }

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
      // Eine alte KI-Analyse passt nicht mehr zu neuen Daten
      setKiErgebnis(undefined)
      sichere({ analyse: ergebnis, dateiname: name, istDemo: demo, kiErgebnis: undefined })
    } catch (e) {
      setFehler(fehlertext(e))
      setIstDemo(false)
      window.history.back()
    }
  }

  function zielSpeichern(neu: ZielDaten) {
    if (!analyse) return
    setZiel(neu)
    sichere({ analyse, ziel: neu })
    gehe('heute')
  }

  function schrittUmschalten(id: SchrittId) {
    if (!analyse) return
    const neu = erledigt.includes(id) ? erledigt.filter((e) => e !== id) : [...erledigt, id]
    setErledigt(neu)
    sichere({ analyse, erledigt: neu })
  }

  async function allesLoeschen() {
    await loescheAlles()
    setAnalyse(null)
    setZiel(undefined)
    setErledigt([])
    setKiErgebnis(undefined)
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

  if (check && screen === 'finanzcheck') {
    return <FinanzCheck check={check} istDemo={istDemo} onZurueck={() => window.history.back()} onZielBearbeiten={() => gehe('ziel')} />
  }

  if (analyse && ziel && plan && check && screen === 'heute') {
    return (
      <Heute
        analyse={analyse}
        ziel={ziel}
        plan={plan}
        check={check}
        istDemo={istDemo}
        onTab={gehe}
        onEinstellungen={() => gehe('ziel')}
        onAuswertung={() => gehe('ergebnis')}
        onFinanzCheck={() => gehe('finanzcheck')}
      />
    )
  }

  if (analyse && ziel && plan && screen === 'schritte') {
    return (
      <Schritte
        analyse={analyse}
        ziel={ziel}
        plan={plan}
        istDemo={istDemo}
        kiErgebnis={kiErgebnis}
        onKiErgebnis={(neu) => {
          setKiErgebnis(neu)
          sichere({ analyse, kiErgebnis: neu })
        }}
        onUmschalten={(schritt) => schrittUmschalten(schritt.id)}
        onTab={gehe}
      />
    )
  }

  if (ziel && plan && screen === 'prognose') {
    // Erledigte Schritte erhöhen die Sparrate ins Depot.
    return (
      <Prognose ziel={{ ...ziel, sparrateProMonat: plan.sparrateJetzt }} istDemo={istDemo} onTab={gehe} onWasWaere={() => gehe('waswaere')} />
    )
  }

  if (analyse && ziel && plan && screen === 'waswaere') {
    return (
      <WasWaere
        analyse={analyse}
        ziel={{ ...ziel, sparrateProMonat: plan.sparrateJetzt }}
        istDemo={istDemo}
        onZurueck={() => window.history.back()}
      />
    )
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
