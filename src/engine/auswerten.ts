// Ergebnis berechnen und Hinweise erzeugen (RECHENKERN.md, Abschnitte 3, 6 und 7).
import { MOBILFUNK_TARIF_GRENZE } from '../config'
import { formatEuro } from './format'
import { normalisiere } from './kategorien'
import type { Analyse, Buchung, Dateiformat, Hinweis, Kategorie, KategorieSumme, Turnus, Vertrag } from './typen'
import { tageZwischen } from './zahlen'

/** Diese Kategorien sind Fixkosten, auch ohne erkannten Vertrag. */
const FIXKATEGORIEN: Kategorie[] = ['Wohnen', 'Verträge & Abos']

const MONATSFAKTOR: Record<Turnus, number> = {
  zweiwoechentlich: 26 / 12,
  monatlich: 1,
  vierteljaehrlich: 1 / 3,
  halbjaehrlich: 1 / 6,
  jaehrlich: 1 / 12,
}

/** Reihenfolge bei Gleichstand, wie im Design. */
const ANZEIGEREIHENFOLGE: Kategorie[] = ['Essen & Trinken', 'Freizeit', 'Shopping', 'Mobilität', 'Sonstiges']

const STREAMING = ['netflix', 'disney', 'prime video', 'wow', 'paramount', 'apple tv', 'dazn', 'joyn']

/** Wohin eine Ausgabe in der Auswertung gehört. */
export function art(b: Buchung): 'umbuchung' | 'sparen' | 'einmaleffekt' | 'fixkosten' | 'lebenshaltung' | 'einnahme' {
  if (b.istUmbuchung) return 'umbuchung'
  if (b.istSparen) return 'sparen'
  if (b.betrag >= 0) return 'einnahme'
  if (b.istEinmaleffekt) return 'einmaleffekt'
  if (b.istVertrag || (b.kategorie && FIXKATEGORIEN.includes(b.kategorie))) return 'fixkosten'
  return 'lebenshaltung'
}

export function analysiere(buchungen: Buchung[], format: Dateiformat): Analyse {
  const daten = buchungen.map((b) => b.datum).sort()
  const von = daten[0] ?? ''
  const bis = daten[daten.length - 1] ?? ''
  // Erster und letzter Tag zählen beide mit: 24.10.2025–23.10.2026 = 365 Tage = 12 Monate.
  const tage = buchungen.length > 0 ? tageZwischen(von, bis) + 1 : 0
  const monate = (tage / 365) * 12
  const proMonat = (summe: number) => (monate > 0 ? summe / monate : 0)
  const summeAusgaben = (liste: Buchung[]) => -liste.reduce((s, b) => s + b.betrag, 0)

  const nach = (gesucht: ReturnType<typeof art>) => buchungen.filter((b) => art(b) === gesucht)
  const lebenshaltung = nach('lebenshaltung')
  const fixkosten = nach('fixkosten')
  const einmaleffekte = nach('einmaleffekt')
  const sparen = nach('sparen')

  const nettoeinkommenProMonat = proMonat(summeGehalt(buchungen, monate))
  const fixkostenProMonat = proMonat(summeAusgaben(fixkosten))
  const sparenProMonat = proMonat(summeAusgaben(sparen))
  const quote = (wert: number) => (nettoeinkommenProMonat > 0 ? wert / nettoeinkommenProMonat : 0)

  const kategorien = summiereKategorien(lebenshaltung, proMonat)
  const essen = lebenshaltung.filter(
    (b) => b.kategorie === 'Essen & Trinken' && (b.unterkategorie === 'Lieferservice' || b.unterkategorie === 'Restaurants'),
  )
  const vertraege = sammleVertraege(buchungen, monate)
  const zumNachschauen = buchungen.filter((b) => b.zumNachschauen).length

  return {
    format,
    zeitraum: { von, bis, tage, monate },
    anzahl: {
      buchungen: buchungen.length,
      umbuchungen: buchungen.filter((b) => b.istUmbuchung).length,
      automatischZugeordnet: buchungen.length - zumNachschauen,
      zumNachschauen,
    },
    lebenshaltungProMonat: proMonat(summeAusgaben(lebenshaltung)),
    kategorien,
    auswaertsEssenProMonat: proMonat(summeAusgaben(essen)),
    fixkostenProMonat,
    fixkostenQuote: quote(fixkostenProMonat),
    vertraege,
    einmaleffekte: { summe: summeAusgaben(einmaleffekte), buchungen: einmaleffekte },
    nettoeinkommenProMonat,
    sparenProMonat,
    sparquote: quote(sparenProMonat),
    hinweise: erzeugeHinweise(vertraege),
    buchungen,
  }
}

/** Vergleich mit der Schätzung des Nutzers vom Start-Screen. */
export function vergleicheMitSchaetzung(analyse: Analyse, schaetzungProMonat: number) {
  const differenzProMonat = analyse.lebenshaltungProMonat - schaetzungProMonat
  return { schaetzungProMonat, differenzProMonat, differenzProJahr: differenzProMonat * 12 }
}

function summiereKategorien(buchungen: Buchung[], proMonat: (summe: number) => number): KategorieSumme[] {
  const summen = new Map<Kategorie, Map<string, number>>()
  for (const b of buchungen) {
    const kategorie = b.kategorie ?? 'Sonstiges'
    const unter = b.unterkategorie ?? (b.zumNachschauen ? 'Zum Nachschauen' : 'Sonstige Ausgaben')
    const map = summen.get(kategorie) ?? new Map<string, number>()
    map.set(unter, (map.get(unter) ?? 0) - b.betrag)
    summen.set(kategorie, map)
  }
  return [...summen.entries()]
    .map(([kategorie, unter]) => ({
      kategorie,
      proMonat: proMonat([...unter.values()].reduce((a, b) => a + b, 0)),
      unterkategorien: [...unter.entries()]
        .map(([name, summe]) => ({ name, proMonat: proMonat(summe) }))
        .sort((a, b) => b.proMonat - a.proMonat),
    }))
    .sort(
      (a, b) =>
        Math.round(b.proMonat * 100) - Math.round(a.proMonat * 100) ||
        ANZEIGEREIHENFOLGE.indexOf(a.kategorie) - ANZEIGEREIHENFOLGE.indexOf(b.kategorie),
    )
}

/**
 * Nettoeinkommen: Gehaltseingänge (Unterkategorie „Lohn / Gehalt“).
 * Gibt es keine, zählt der größte regelmäßige Eingang (in mindestens der Hälfte der Monate).
 */
function summeGehalt(buchungen: Buchung[], monate: number): number {
  const eingaenge = buchungen.filter((b) => b.betrag > 0 && !b.istUmbuchung && !b.istSparen)
  const gehalt = eingaenge.filter((b) => b.unterkategorie === 'Lohn / Gehalt')
  if (gehalt.length > 0) return gehalt.reduce((s, b) => s + b.betrag, 0)

  const nachAbsender = new Map<string, Buchung[]>()
  for (const b of eingaenge) {
    const schluessel = normalisiere(b.gegenpartei)
    nachAbsender.set(schluessel, [...(nachAbsender.get(schluessel) ?? []), b])
  }
  let groesste = 0
  for (const liste of nachAbsender.values()) {
    const monateMitEingang = new Set(liste.map((b) => b.datum.slice(0, 7))).size
    const summe = liste.reduce((s, b) => s + b.betrag, 0)
    if (monateMitEingang >= monate / 2 && summe > groesste) groesste = summe
  }
  return groesste
}

function sammleVertraege(buchungen: Buchung[], monate: number): Vertrag[] {
  const gruppen = new Map<string, Buchung[]>()
  for (const b of buchungen) {
    if (!b.istVertrag || !b.vertragsId || b.betrag >= 0) continue
    gruppen.set(b.vertragsId, [...(gruppen.get(b.vertragsId) ?? []), b])
  }
  return [...gruppen.entries()]
    .map(([id, liste]) => {
      const letzte = liste.reduce((a, b) => (b.datum > a.datum ? b : a))
      const betrag = -letzte.betrag
      const proMonat = letzte.turnus
        ? betrag * MONATSFAKTOR[letzte.turnus]
        : -liste.reduce((s, b) => s + b.betrag, 0) / Math.max(monate, 1)
      return {
        id,
        name: letzte.gegenpartei,
        betrag,
        turnus: letzte.turnus,
        proMonat,
        kategorie: letzte.kategorie ?? 'Verträge & Abos',
        unterkategorie: letzte.unterkategorie,
      }
    })
    .sort((a, b) => b.proMonat - a.proMonat)
}

function erzeugeHinweise(vertraege: Vertrag[]): Hinweis[] {
  const hinweise: Hinweis[] = []
  const laufend = vertraege.filter((v) => v.kategorie !== 'Sparen')

  for (const v of laufend) {
    if (v.unterkategorie === 'Mobilfunk' && v.proMonat > MOBILFUNK_TARIF_GRENZE) {
      hinweise.push({ art: 'tarif-pruefen', text: `Handy ${formatEuro(v.betrag)}: Tarif prüfen`, vertrag: v })
    }
  }

  const streaming = laufend.filter((v) => {
    const name = normalisiere(v.name)
    return STREAMING.some((s) => new RegExp(`(^|[^a-z])${s.replace('+', '\\+')}([^a-z]|$)`).test(name))
  })
  if (streaming.length >= 2) {
    hinweise.push({
      art: 'doppelt',
      text: `${streaming.length} Streaming-Abos: doppelt?`,
      vertraege: streaming,
      proMonat: streaming.reduce((s, v) => s + v.proMonat, 0),
    })
  }
  return hinweise
}
