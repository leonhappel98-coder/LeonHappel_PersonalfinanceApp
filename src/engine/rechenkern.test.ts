// Abnahme: Beide Beispieldateien von Alex müssen die Kontrollzahlen treffen (RECHENKERN.md, Abschnitt 8).
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import kontrollzahlen from '../../testdata/kontrollzahlen.json'
import { analysiereDatei, vergleicheMitSchaetzung, type Analyse } from './index'

function lade(datei: string): ArrayBuffer {
  const inhalt = readFileSync(new URL(`../../testdata/${datei}`, import.meta.url))
  return inhalt.buffer.slice(inhalt.byteOffset, inhalt.byteOffset + inhalt.byteLength) as ArrayBuffer
}

const kategorie = (a: Analyse, name: string) => a.kategorien.find((k) => k.kategorie === name)?.proMonat ?? 0
const unterkategorie = (a: Analyse, name: string) =>
  a.kategorien.flatMap((k) => k.unterkategorien).find((u) => u.name === name)?.proMonat ?? 0
const einmalBetraege = (a: Analyse) => a.einmaleffekte.buchungen.map((b) => -b.betrag).sort((x, y) => x - y)
const hinweisTexte = (a: Analyse) => a.hinweise.map((h) => h.text.replace(/ /g, ' '))

describe('Finanzguru-Excel (kontoexport_alex_finanzguru.xlsx)', () => {
  let a: Analyse
  beforeAll(() => {
    a = analysiereDatei(lade('kontoexport_alex_finanzguru.xlsx'))
  })

  it('erkennt das Format und liest alle Buchungen', () => {
    expect(a.format).toBe('finanzguru')
    expect(a.anzahl.buchungen).toBe(kontrollzahlen.buchungen_gesamt)
    expect(a.zeitraum).toMatchObject({ von: '2025-10-24', bis: '2026-10-23', tage: 365 })
    expect(a.zeitraum.monate).toBeCloseTo(12, 6)
  })

  it('rechnet 38 Umbuchungen raus', () => {
    expect(a.anzahl.umbuchungen).toBe(kontrollzahlen.umbuchungen)
  })

  it('Lebenshaltung 1.360,00 € pro Monat', () => {
    expect(a.lebenshaltungProMonat).toBeCloseTo(kontrollzahlen.lebenshaltung_monat, 2)
  })

  it('Fixkosten 1.240,00 € pro Monat, 41 % vom Netto', () => {
    expect(a.fixkostenProMonat).toBeCloseTo(kontrollzahlen.fixkosten_monat, 2)
    expect(Math.round(a.fixkostenQuote * 100)).toBe(41)
  })

  it('Einmaleffekte 1.920 € (Waschmaschine 520, Flug 520, Hotel 880)', () => {
    expect(a.einmaleffekte.summe).toBeCloseTo(kontrollzahlen.einmaleffekte, 2)
    expect(einmalBetraege(a)).toEqual([520, 520, 880])
  })

  it('Gehalt 3.020 €, Sparplan 420 €, Sparquote 14 %', () => {
    expect(a.nettoeinkommenProMonat).toBeCloseTo(kontrollzahlen.gehalt_monat, 2)
    expect(a.sparenProMonat).toBeCloseTo(kontrollzahlen.sparplan_monat, 2)
    expect(Math.round(a.sparquote * 100)).toBe(14)
  })

  it('Kategorien pro Monat wie im Design', () => {
    expect(kategorie(a, 'Essen & Trinken')).toBeCloseTo(520, 2)
    expect(a.auswaertsEssenProMonat).toBeCloseTo(210, 2)
    expect(kategorie(a, 'Freizeit')).toBeCloseTo(260, 2)
    expect(kategorie(a, 'Shopping')).toBeCloseTo(240, 2)
    expect(kategorie(a, 'Mobilität')).toBeCloseTo(170, 2)
    expect(kategorie(a, 'Sonstiges')).toBeCloseTo(170, 2)
    expect(a.kategorien.map((k) => k.kategorie)).toEqual(['Essen & Trinken', 'Freizeit', 'Shopping', 'Mobilität', 'Sonstiges'])
  })

  it('Unterkategorien wie in kontrollzahlen.json', () => {
    for (const [schluessel, wert] of Object.entries(kontrollzahlen.kategorien_monat)) {
      const name = schluessel.split(' / ').slice(1).join(' / ')
      expect(unterkategorie(a, name), schluessel).toBeCloseTo(wert, 2)
    }
  })

  it('Strom 70 € im Monat als Vertrag', () => {
    const strom = a.vertraege.find((v) => v.name.includes('Stadtwerke'))
    expect(strom?.proMonat).toBeCloseTo(kontrollzahlen.strom, 2)
  })

  it('Hinweise: Handy „Tarif prüfen“, Netflix + Disney+ „doppelt?“', () => {
    expect(hinweisTexte(a)).toEqual(['Handy 39,99 €: Tarif prüfen', '2 Streaming-Abos: doppelt?'])
  })

  it('Vergleich mit der Schätzung 1.000 €: 360 € mehr im Monat, 4.320 € im Jahr', () => {
    const v = vergleicheMitSchaetzung(a, 1000)
    expect(v.differenzProMonat).toBeCloseTo(360, 2)
    expect(v.differenzProJahr).toBeCloseTo(4320, 2)
  })
})

describe('Sparkasse-CSV (kontoexport_alex_sparkasse.csv)', () => {
  let a: Analyse
  beforeAll(() => {
    a = analysiereDatei(lade('kontoexport_alex_sparkasse.csv'))
  })

  it('erkennt das Format und liest alle Buchungen', () => {
    expect(a.format).toBe('sparkasse')
    expect(a.anzahl.buchungen).toBe(kontrollzahlen.buchungen_giro)
  })

  it('rechnet 19 Umbuchungen raus', () => {
    expect(a.anzahl.umbuchungen).toBe(19)
  })

  it('Lebenshaltung 1.360 € pro Monat (±1 €)', () => {
    expect(Math.abs(a.lebenshaltungProMonat - kontrollzahlen.lebenshaltung_monat)).toBeLessThanOrEqual(1)
  })

  it('Fixkosten 1.240 € pro Monat (±1 €)', () => {
    expect(Math.abs(a.fixkostenProMonat - kontrollzahlen.fixkosten_monat)).toBeLessThanOrEqual(1)
  })

  it('erkennt alle 13 Verträge, auch zwei bei derselben Versicherung', () => {
    expect(a.vertraege).toHaveLength(13)
    expect(a.vertraege.filter((v) => v.name === 'Muster Versicherung AG').map((v) => v.betrag).sort()).toEqual([6.5, 8.9])
    expect(a.vertraege.find((v) => v.name === 'Hausverwaltung Berger')).toMatchObject({ kategorie: 'Wohnen', unterkategorie: 'Miete' })
    expect(a.vertraege.find((v) => v.name.startsWith('Rundfunk'))?.turnus).toBe('vierteljaehrlich')
  })

  it('Einmaleffekte 1.920 € wie bei Finanzguru', () => {
    expect(a.einmaleffekte.summe).toBeCloseTo(kontrollzahlen.einmaleffekte, 2)
    expect(einmalBetraege(a)).toEqual([520, 520, 880])
  })

  it('Gehalt 3.020 € und Sparquote 14 %', () => {
    expect(a.nettoeinkommenProMonat).toBeCloseTo(kontrollzahlen.gehalt_monat, 2)
    expect(Math.round(a.sparquote * 100)).toBe(14)
  })

  it('Kategorien ergeben zusammen die Lebenshaltung', () => {
    const summe = a.kategorien.reduce((s, k) => s + k.proMonat, 0)
    expect(summe).toBeCloseTo(a.lebenshaltungProMonat, 6)
  })

  it('Hinweise wie bei Finanzguru', () => {
    expect(hinweisTexte(a)).toEqual(['Handy 39,99 €: Tarif prüfen', '2 Streaming-Abos: doppelt?'])
  })

  it('Jonas Keller landet unter „Zum Nachschauen“', () => {
    const jonas = a.buchungen.filter((b) => b.gegenpartei === 'Jonas Keller')
    expect(jonas.length).toBeGreaterThan(0)
    expect(jonas.every((b) => b.zumNachschauen)).toBe(true)
  })
})
