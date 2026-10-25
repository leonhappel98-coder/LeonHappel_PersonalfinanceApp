// Nächste Schritte aus Auswertung und Ziel (RECHENKERN.md, Abschnitt 10).
import { SCHRITTE } from '../config'
import { formatEuro } from './format'
import { berechnePrognose, monateZwischen, type Prognose, type Ziel } from './prognose'
import type { Analyse } from './typen'

export type SchrittId = 'notgroschen' | 'handytarif' | 'streaming' | 'auswaerts'

export type Schritt = {
  id: SchrittId
  art: 'Absicherung' | 'Ausgaben'
  /** Wie viel Aufwand, z. B. „30 Min“ oder „laufend“ */
  aufwand: string
  dieseWoche: boolean
  titel: string
  text: string
  /** Wirkung in €/Monat, null bei Absicherung */
  plusProMonat: number | null
  /** So viele Monate früher am Ziel (realistisch), null wenn nicht berechenbar */
  monateFrueher: number | null
  erledigt: boolean
}

export type Schrittplan = {
  schritte: Schritt[]
  anzahlErledigt: number
  /** Summe der offenen Schritte in €/Monat */
  offenProMonat: number
  /** Sparrate inklusive erledigter Schritte */
  sparrateJetzt: number
  soWieJetzt: Prognose
  mitAllenSchritten: Prognose
}

const summe = (schritte: { plusProMonat: number | null }[]) => schritte.reduce((s, x) => s + (x.plusProMonat ?? 0), 0)

/** „Netflix International B.V.“ → „Netflix“ */
const kurzname = (name: string) => name.split(/\s+/)[0] || name

/** Sparrate plus die Wirkung aller erledigten Schritte. */
export function sparrateMitErledigten(ziel: Ziel, analyse: Analyse, erledigt: SchrittId[]): number {
  return ziel.sparrateProMonat + summe(findeSchritte(analyse, ziel).filter((s) => erledigt.includes(s.id)))
}

/** Alle Schritte, die zu den Daten passen (noch ohne Status und „Monate früher“). */
function findeSchritte(analyse: Analyse, ziel: Ziel): Omit<Schritt, 'dieseWoche' | 'monateFrueher' | 'erledigt'>[] {
  const schritte: Omit<Schritt, 'dieseWoche' | 'monateFrueher' | 'erledigt'>[] = []

  const kostenProMonat = analyse.lebenshaltungProMonat + analyse.fixkostenProMonat
  const notgroschen = Math.ceil((kostenProMonat * SCHRITTE.notgroschenMonate) / 100) * 100
  if (kostenProMonat > 0 && ziel.tagesgeld < notgroschen) {
    const tage = Math.round((ziel.tagesgeld / kostenProMonat) * 30)
    // Etappen, die noch nicht erreicht sind: 500 €, 1.000 €, ein Monat, drei Monate
    const einMonat = Math.ceil(kostenProMonat / 100) * 100
    const offen = [
      { ab: 500, text: formatEuro(500) },
      { ab: 1_000, text: formatEuro(1_000) },
      { ab: einMonat, text: `einen Monat (${formatEuro(einMonat, 'ganz')})` },
    ].filter((e) => e.ab > ziel.tagesgeld && e.ab < notgroschen)
    const etappen = [...offen.map((e) => e.text), 'drei Monate']
      .map((text, i) => `${i === 0 ? 'Erst' : 'dann'} ${text}`)
      .join(', ')
      .concat('.')
    schritte.push({
      id: 'notgroschen',
      art: 'Absicherung',
      aufwand: 'laufend',
      titel: `Notgroschen auf ${formatEuro(notgroschen, 'ganz')} aufbauen`,
      text: `Flüssig sind ${formatEuro(ziel.tagesgeld, 'ganz')}, das reicht für ${tage} ${tage === 1 ? 'Tag' : 'Tage'}. ${etappen}`,
      plusProMonat: null,
    })
  }

  for (const hinweis of analyse.hinweise) {
    if (hinweis.art === 'tarif-pruefen') {
      const plus = hinweis.vertrag.proMonat - SCHRITTE.mobilfunkZieltarif
      if (plus > 0) {
        schritte.push({
          id: 'handytarif',
          art: 'Ausgaben',
          aufwand: '30 Min',
          titel: 'Handytarif wechseln',
          text: `Dein Vertrag kostet ${formatEuro(hinweis.vertrag.betrag)} im Monat. Vergleichbare Tarife gibt es ab etwa ${formatEuro(SCHRITTE.mobilfunkZieltarif)}.`,
          plusProMonat: plus,
        })
      }
    }
    if (hinweis.art === 'doppelt') {
      const teuerstes = hinweis.vertraege.reduce((a, b) => (b.proMonat > a.proMonat ? b : a))
      schritte.push({
        id: 'streaming',
        art: 'Ausgaben',
        aufwand: '10 Min',
        titel: 'Ein Streaming-Abo kündigen',
        text: `${hinweis.vertraege.map((v) => kurzname(v.name)).join(' und ')} laufen gleichzeitig. Kündigst du ${kurzname(teuerstes.name)}, sparst du ${formatEuro(teuerstes.proMonat)}.`,
        plusProMonat: teuerstes.proMonat,
      })
    }
  }

  if (analyse.auswaertsEssenProMonat >= SCHRITTE.auswaertsMindestens) {
    const plus = analyse.auswaertsEssenProMonat / 2
    schritte.push({
      id: 'auswaerts',
      art: 'Ausgaben',
      aufwand: 'laufend',
      titel: 'Lieferdienste und Restaurants halbieren',
      text: `Aktuell ${formatEuro(analyse.auswaertsEssenProMonat, 'ganz')} im Monat. Öfter selbst kochen spart die Hälfte.`,
      plusProMonat: plus,
    })
  }

  // Absicherung zuerst, dann Ausgaben nach Wirkung
  return schritte.sort((a, b) => (a.art === b.art ? (b.plusProMonat ?? 0) - (a.plusProMonat ?? 0) : a.art === 'Absicherung' ? -1 : 1))
}

/** Monate, die das Ziel mit `mehr` €/Monat früher erreicht wird. */
function monateFrueher(ziel: Ziel, startMonat: string, sparrate: number, mehr: number): number | null {
  const ohne = berechnePrognose({ ...ziel, sparrateProMonat: sparrate }, startMonat, 'realistisch').zielErreicht
  const mit = berechnePrognose({ ...ziel, sparrateProMonat: sparrate + mehr }, startMonat, 'realistisch').zielErreicht
  return ohne && mit ? monateZwischen(mit, ohne) : null
}

export function erstelleSchrittplan(analyse: Analyse, ziel: Ziel, erledigt: SchrittId[], startMonat: string): Schrittplan {
  const gefunden = findeSchritte(analyse, ziel)
  const istErledigt = (id: SchrittId) => erledigt.includes(id)
  const sparrateJetzt = ziel.sparrateProMonat + summe(gefunden.filter((s) => istErledigt(s.id)))
  const ersterAusgabenSchritt = gefunden.find((s) => s.art === 'Ausgaben' && !istErledigt(s.id))

  const schritte: Schritt[] = gefunden.map((s) => {
    const fertig = istErledigt(s.id)
    // Wirkung gegenüber „ohne diesen Schritt“, alle anderen erledigten Schritte eingerechnet
    const basis = fertig ? sparrateJetzt - (s.plusProMonat ?? 0) : sparrateJetzt
    return {
      ...s,
      erledigt: fertig,
      dieseWoche: !fertig && (s.id === 'notgroschen' || s === ersterAusgabenSchritt),
      monateFrueher: s.plusProMonat === null ? null : monateFrueher(ziel, startMonat, basis, s.plusProMonat),
    }
  })

  const offenProMonat = summe(schritte.filter((s) => !s.erledigt))
  return {
    schritte,
    anzahlErledigt: schritte.filter((s) => s.erledigt).length,
    offenProMonat,
    sparrateJetzt,
    soWieJetzt: berechnePrognose({ ...ziel, sparrateProMonat: sparrateJetzt }, startMonat, 'realistisch'),
    mitAllenSchritten: berechnePrognose({ ...ziel, sparrateProMonat: sparrateJetzt + offenProMonat }, startMonat, 'realistisch'),
  }
}
