import { useEffect, useMemo, useState } from 'react'
import beispielUrl from '../testdata/kontoexport_alex_finanzguru.xlsx?url'
import { budgetMonat, startBudgets, type Budgets } from './engine/budgets'
import type { Ziel as ZielDaten } from './engine/prognose'
import { erstelleFinanzCheck } from './engine/finanzCheck'
import { erstelleSchrittplan, type SchrittId } from './engine/schritte'
import type { KiErgebnis } from './ki/kiAnalyse'
import type { Analyse as AnalyseErgebnis, Kategorie, Rohbuchung } from './engine/typen'
import { leseBetrag } from './engine/zahlen'
import { Analyse } from './screens/Analyse'
import { BudgetsScreen } from './screens/Budgets'
import { Daten } from './screens/Daten'
import { Ergebnis } from './screens/Ergebnis'
import { FinanzCheck } from './screens/FinanzCheck'
import { Heute } from './screens/Heute'
import { Prognose } from './screens/Prognose'
import { Schritte } from './screens/Schritte'
import { Start } from './screens/Start'
import { WasWaere } from './screens/WasWaere'
import { Ziel } from './screens/Ziel'
import { ladeBackupHerunter } from './storage/backup'
import { ladeZustand, loescheAlles, speichereZustand, type Checkin, type Gespeichert, type Import } from './storage/speicher'
import { aktuellerMonat } from './ui/texte'

type Screen = 'start' | 'analyse' | 'ergebnis' | 'ziel' | 'heute' | 'schritte' | 'prognose' | 'finanzcheck' | 'waswaere' | 'budgets' | 'daten'

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
  const [rohbuchungen, setRohbuchungen] = useState<Rohbuchung[]>([])
  const [eigeneKonten, setEigeneKonten] = useState<string[]>([])
  const [importe, setImporte] = useState<Import[]>([])
  const [budgets, setBudgets] = useState<Budgets>()
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [istDemo, setIstDemo] = useState(false)
  const [fehler, setFehler] = useState<string>()

  /** Übernimmt einen gespeicherten Stand (beim Start oder aus einem Backup). */
  function uebernimm(zustand: Gespeichert) {
    setAnalyse(zustand.analyse)
    setDateiname(zustand.dateiname)
    setIstDemo(zustand.istDemo)
    setSchaetzungText(zustand.schaetzung ? new Intl.NumberFormat('de-DE').format(zustand.schaetzung) : '')
    setZiel(zustand.ziel)
    setErledigt(zustand.erledigt ?? [])
    setKiErgebnis(zustand.kiErgebnis)
    setRohbuchungen(zustand.rohbuchungen ?? [])
    setEigeneKonten(zustand.eigeneKonten ?? [])
    setImporte(zustand.importe ?? [])
    setBudgets(zustand.budgets)
    setCheckins(zustand.checkins ?? [])
    const ziel: Screen = zustand.ziel ? 'heute' : 'ergebnis'
    window.history.replaceState({ screen: ziel }, '')
    setScreen(ziel)
  }

  // Gespeicherten Stand vom Gerät holen: mit Ziel direkt zu „Heute“, sonst zum Ergebnis.
  useEffect(() => {
    ladeZustand().then((zustand) => {
      if (zustand) uebernimm(zustand)
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

  // Budgets: eigene Werte oder Startwerte, Monat mit Tempo-Markierung
  const [heute] = useState(() => new Date().toISOString().slice(0, 10))
  const aktuelleBudgets = useMemo(() => budgets ?? (analyse ? startBudgets(analyse) : {}), [budgets, analyse])
  const monat = useMemo(() => (analyse ? budgetMonat(analyse, aktuelleBudgets, heute) : undefined), [analyse, aktuelleBudgets, heute])

  /** Der komplette Stand, wie er gespeichert wird (auch fürs Backup). */
  function stand(aenderung: Partial<Gespeichert> & Pick<Gespeichert, 'analyse'>): Gespeichert {
    return { version: 1, dateiname, istDemo, schaetzung, ziel, erledigt, kiErgebnis, rohbuchungen, eigeneKonten, importe, budgets, checkins, ...aenderung }
  }

  /** Speichert den aktuellen Stand, mit den übergebenen Änderungen. */
  function sichere(aenderung: Partial<Gespeichert> & Pick<Gespeichert, 'analyse'>) {
    speichereZustand(stand(aenderung))
  }

  /**
   * Liest die Datei auf dem Gerät und rechnet. Der Rechenkern wird erst jetzt geladen.
   * „ergaenzen“ (Tab „Daten“): neue Buchungen kommen zu den gespeicherten dazu. Beispieldaten werden dabei ersetzt.
   */
  async function werteAus(name: string, ladeDaten: () => Promise<ArrayBuffer>, demo: boolean, ergaenzen = false) {
    const mitAltem = ergaenzen && !istDemo && rohbuchungen.length > 0
    setFehler(undefined)
    setAnalyse(null)
    setDateiname(name)
    setIstDemo(demo)
    gehe('analyse')
    try {
      const [engine, daten] = await Promise.all([import('./engine'), ladeDaten()])
      const neu = engine.leseDatei(daten)
      const z = mitAltem ? engine.fuegeZusammen(rohbuchungen, neu.buchungen) : { buchungen: neu.buchungen, neu: neu.buchungen.length, doppelt: 0 }
      const konten = [...new Set([...(mitAltem ? eigeneKonten : []), ...neu.eigeneKonten])]
      const ergebnis = engine.werteAus({ format: neu.format, buchungen: z.buchungen, eigeneKonten: konten })
      if (ergebnis.anzahl.buchungen === 0) throw new Error('keine Buchungen')
      const eintrag: Import = { datum: new Date().toISOString(), dateiname: name, gelesen: neu.buchungen.length, neu: z.neu, doppelt: z.doppelt }
      const neueImporte = mitAltem ? [...importe, eintrag] : [eintrag]
      const neueBudgets = mitAltem ? budgets : undefined
      setAnalyse(ergebnis)
      setRohbuchungen(z.buchungen)
      setEigeneKonten(konten)
      setImporte(neueImporte)
      setBudgets(neueBudgets)
      // Eine alte KI-Analyse passt nicht mehr zu neuen Daten
      setKiErgebnis(undefined)
      sichere({
        analyse: ergebnis,
        dateiname: name,
        istDemo: demo,
        kiErgebnis: undefined,
        rohbuchungen: z.buchungen,
        eigeneKonten: konten,
        importe: neueImporte,
        budgets: neueBudgets,
      })
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

  function budgetAendern(kategorie: Kategorie, wert: number) {
    if (!analyse) return
    const neu = { ...aktuelleBudgets, [kategorie]: wert }
    setBudgets(neu)
    sichere({ analyse, budgets: neu })
  }

  function checkinSpeichern(depot: number) {
    if (!analyse || !ziel) return
    const neuesZiel = { ...ziel, depot }
    const neu = [...checkins, { datum: heute, depot }]
    setZiel(neuesZiel)
    setCheckins(neu)
    sichere({ analyse, ziel: neuesZiel, checkins: neu })
  }

  function wiederherstellen(zustand: Gespeichert) {
    speichereZustand(zustand)
    uebernimm(zustand)
  }

  async function allesLoeschen() {
    await loescheAlles()
    setAnalyse(null)
    setZiel(undefined)
    setErledigt([])
    setKiErgebnis(undefined)
    setRohbuchungen([])
    setEigeneKonten([])
    setImporte([])
    setBudgets(undefined)
    setCheckins([])
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

  if (analyse && monat && screen === 'budgets') {
    return (
      <BudgetsScreen monat={monat} hinweise={analyse.hinweise} istDemo={istDemo} onAendern={budgetAendern} onTab={gehe} />
    )
  }

  if (analyse && ziel && screen === 'daten') {
    return (
      <Daten
        analyse={analyse}
        ziel={ziel}
        istDemo={istDemo}
        anzahlBuchungen={rohbuchungen.length || analyse.anzahl.buchungen}
        letzterImport={importe.at(-1)}
        checkins={checkins}
        heute={heute}
        fehler={fehler}
        onDatei={(datei) => werteAus(datei.name, () => datei.arrayBuffer(), false, true)}
        onCheckin={checkinSpeichern}
        onBackup={() => ladeBackupHerunter(stand({ analyse }))}
        onWiederherstellen={wiederherstellen}
        onAllesLoeschen={allesLoeschen}
        onTab={gehe}
      />
    )
  }

  if (analyse && ziel && plan && check && monat && screen === 'heute') {
    return (
      <Heute
        analyse={analyse}
        ziel={ziel}
        plan={plan}
        check={check}
        monat={monat}
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
