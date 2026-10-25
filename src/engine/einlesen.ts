// Datei erkennen und in einheitliche Rohbuchungen umwandeln (RECHENKERN.md, Abschnitt 1).
import Papa from 'papaparse'
import { read, utils } from 'xlsx'
import type { Dateiformat, Einlesergebnis, Rohbuchung, Turnus } from './typen'
import { dekodiereText, leseBetrag, leseDatum } from './zahlen'

type Zelle = string | number | boolean | Date | null | undefined
type Tabelle = Zelle[][]

/** Welche Spalte (Index) welche Bedeutung hat. */
export type Spaltenzuordnung = {
  datum: number
  betrag: number
  /** Fehlt bei comdirect: Dort steht der Name im Buchungstext. */
  gegenpartei?: number
  /** DKB: eigene Spalte für den Zahler. Bei Geldeingängen ist er die Gegenpartei. */
  zahler?: number
  zweck: number
  iban?: number
  konto?: number
  buchungstext?: number
}

/** Wird geworfen, wenn die Spalten nicht automatisch erkannt werden. Die Oberfläche fragt dann nach. */
export class SpaltenUnbekanntFehler extends Error {
  readonly kopfzeile: string[]
  readonly beispielzeilen: string[][]
  constructor(kopfzeile: string[], beispielzeilen: string[][]) {
    super('Die Spalten der Datei wurden nicht erkannt. Bitte Datum, Betrag und Empfänger zuordnen.')
    this.name = 'SpaltenUnbekanntFehler'
    this.kopfzeile = kopfzeile
    this.beispielzeilen = beispielzeilen
  }
}

/** Liest eine Datei (Excel oder CSV) als Rohbuchungen. */
export function leseDatei(daten: ArrayBuffer, spalten?: Spaltenzuordnung): Einlesergebnis {
  const tabelle = istExcel(daten) ? leseExcelTabelle(daten) : leseCsvTabelle(dekodiereText(daten))
  const kopfIndex = findeKopfzeile(tabelle)
  const kopf = (tabelle[kopfIndex] ?? []).map(text)
  const zeilen = tabelle.slice(kopfIndex + 1).filter((z) => z.some((zelle) => text(zelle) !== ''))

  if (kopf.includes('Analyse-Hauptkategorie')) return leseFinanzguru(kopf, zeilen)

  const format = erkenneBank(kopf)
  const zuordnung = spalten ?? erkenneSpalten(kopf)
  if (!zuordnung) throw new SpaltenUnbekanntFehler(kopf, zeilen.slice(0, 5).map((z) => z.map(text)))
  return leseBanktabelle(format, zuordnung, zeilen)
}

// ---------- Tabellen lesen ----------

function istExcel(daten: ArrayBuffer): boolean {
  const b = new Uint8Array(daten, 0, Math.min(4, daten.byteLength))
  // .xlsx ist ein ZIP-Archiv („PK“), altes .xls beginnt mit D0 CF 11 E0
  return (b[0] === 0x50 && b[1] === 0x4b) || (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0)
}

function leseExcelTabelle(daten: ArrayBuffer): Tabelle {
  const mappe = read(daten, { type: 'array' })
  const blatt = mappe.Sheets[mappe.SheetNames[0]]
  return utils.sheet_to_json<Zelle[]>(blatt, { header: 1, raw: true, defval: '' })
}

function leseCsvTabelle(inhalt: string): Tabelle {
  const ergebnis = Papa.parse<string[]>(inhalt, { skipEmptyLines: true })
  return ergebnis.data
}

function text(zelle: Zelle): string {
  if (zelle === null || zelle === undefined) return ''
  return String(zelle).trim()
}

/** Manche Banken schreiben Kontoinfos über die Tabelle. Die Kopfzeile ist die erste mit Datum und Betrag. */
function findeKopfzeile(tabelle: Tabelle): number {
  for (let i = 0; i < Math.min(tabelle.length, 40); i++) {
    const kopf = tabelle[i].map((z) => normal(text(z)))
    const hatDatum = kopf.some((k) => SPALTENNAMEN.datum.includes(k))
    const hatBetrag = kopf.some((k) => SPALTENNAMEN.betrag.includes(k))
    if ((hatDatum && hatBetrag) || kopf.includes('analyse-hauptkategorie')) return i
  }
  return 0
}

// ---------- Finanzguru ----------

const TURNUS: Record<string, Turnus> = {
  monatlich: 'monatlich',
  vierteljaehrlich: 'vierteljaehrlich',
  vierteljährlich: 'vierteljaehrlich',
  quartalsweise: 'vierteljaehrlich',
  halbjaehrlich: 'halbjaehrlich',
  halbjährlich: 'halbjaehrlich',
  jaehrlich: 'jaehrlich',
  jährlich: 'jaehrlich',
  zweiwoechentlich: 'zweiwoechentlich',
  zweiwöchentlich: 'zweiwoechentlich',
}

function leseFinanzguru(kopf: string[], zeilen: Tabelle): Einlesergebnis {
  const spalte = (name: string) => kopf.indexOf(name)
  const s = {
    datum: spalte('Buchungstag'),
    konto: spalte('Referenzkonto'),
    betrag: spalte('Betrag'),
    gegenpartei: spalte('Beguenstigter/Auftraggeber'),
    iban: spalte('IBAN Beguenstigter/Auftraggeber'),
    zweck: spalte('Verwendungszweck'),
    haupt: spalte('Analyse-Hauptkategorie'),
    unter: spalte('Analyse-Unterkategorie'),
    vertrag: spalte('Analyse-Vertrag'),
    turnus: spalte('Analyse-Vertragsturnus'),
    vertragsId: spalte('Analyse-Vertrags-ID'),
    umbuchung: spalte('Analyse-Umbuchung'),
    umsatzart: spalte('Analyse-Umsatzart'),
    id: spalte('Buchungs-ID'),
  }
  const feld = (zeile: Zelle[], index: number) => (index >= 0 ? text(zeile[index]) : '')

  const buchungen: Rohbuchung[] = []
  zeilen.forEach((zeile, i) => {
    const datum = leseDatum(zeile[s.datum])
    const betrag = leseBetrag(zeile[s.betrag])
    if (!datum || isNaN(betrag)) return
    buchungen.push({
      id: feld(zeile, s.id) || `fg-${i}`,
      datum,
      betrag,
      gegenpartei: feld(zeile, s.gegenpartei),
      zweck: feld(zeile, s.zweck),
      konto: feld(zeile, s.konto),
      iban: ohneLeerzeichen(feld(zeile, s.iban)),
      buchungstext: feld(zeile, s.umsatzart),
      finanzguru: {
        hauptkategorie: feld(zeile, s.haupt),
        unterkategorie: feld(zeile, s.unter),
        istVertrag: feld(zeile, s.vertrag).toLowerCase() === 'ja',
        turnus: TURNUS[feld(zeile, s.turnus).toLowerCase()],
        vertragsId: feld(zeile, s.vertragsId) || undefined,
        istUmbuchung: feld(zeile, s.umbuchung).toLowerCase() === 'ja',
      },
    })
  })
  const eigeneKonten = [...new Set(buchungen.map((b) => ohneLeerzeichen(b.konto)).filter(Boolean))]
  return { format: 'finanzguru', buchungen, eigeneKonten }
}

// ---------- Bank-CSV ----------

/** Erkennt die Bank an typischen Spaltennamen (testdata/banken/README.md). */
function erkenneBank(kopf: string[]): Dateiformat {
  const k = kopf.map(normal)
  const hat = (name: string) => k.includes(name)
  if (hat('auftragskonto') && hat('buchungstag')) return 'sparkasse'
  if (hat('name zahlungsbeteiligter')) return 'volksbank'
  if (hat('zahlungsempfaenger*in') || hat('auftraggeber / beguenstigter')) return 'dkb'
  if (hat('auftraggeber/empfaenger') && hat('buchung')) return 'ing'
  if (hat('vorgang') && k.some((s) => s.startsWith('umsatz in '))) return 'comdirect'
  return 'bank-csv'
}

/** Bekannte Spaltennamen verschiedener Banken (klein, ohne Umlaute), wichtigste zuerst. */
const SPALTENNAMEN = {
  datum: ['buchungstag', 'buchungsdatum', 'buchung', 'datum', 'wertstellung', 'valutadatum', 'valuta', 'date'],
  betrag: ['betrag', 'betrag (eur)', 'betrag (€)', 'betrag in eur', 'umsatz in eur', 'umsatz', 'amount'],
  gegenpartei: [
    'beguenstigter/zahlungspflichtiger',
    'auftraggeber/empfaenger',
    'auftraggeber / beguenstigter',
    'zahlungsempfaenger*in',
    'zahlungspflichtige*r',
    'empfaenger',
    'auftraggeber',
    'name zahlungsbeteiligter',
    'gegenpartei',
    'name',
    'payee',
  ],
  zweck: ['verwendungszweck', 'beschreibung', 'zweck', 'buchungsdetails', 'description', 'buchungstext'],
  iban: ['kontonummer/iban', 'iban zahlungsbeteiligter', 'iban', 'gegenkonto', 'kontonummer'],
  konto: ['auftragskonto', 'iban auftragskonto', 'konto'],
  buchungstext: ['buchungstext', 'umsatzart', 'umsatztyp', 'vorgang'],
}

function normal(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Sucht die Spalten über die Namensliste. Null, wenn Datum, Betrag oder Empfänger/Buchungstext fehlen. */
export function erkenneSpalten(kopf: string[]): Spaltenzuordnung | null {
  const normiert = kopf.map(normal)
  const vergeben = new Set<number>()
  const finde = (namen: string[]) => {
    for (const name of namen) {
      const i = normiert.findIndex((k, index) => k === name && !vergeben.has(index))
      if (i >= 0) {
        vergeben.add(i)
        return i
      }
    }
    return undefined
  }
  const datum = finde(SPALTENNAMEN.datum)
  const betrag = finde(SPALTENNAMEN.betrag)
  const gegenpartei = finde(SPALTENNAMEN.gegenpartei)
  const zweck = finde(SPALTENNAMEN.zweck)
  const buchungstext = finde(SPALTENNAMEN.buchungstext)
  const iban = finde(SPALTENNAMEN.iban)
  const konto = finde(SPALTENNAMEN.konto)
  // DKB: Zahler und Empfänger in getrennten Spalten
  const zahler = gegenpartei !== undefined && normiert[gegenpartei] === 'zahlungsempfaenger*in' ? finde(['zahlungspflichtige*r']) : undefined
  if (datum === undefined || betrag === undefined) return null
  // Ohne Empfänger-Spalte (comdirect) muss der Name im Buchungstext stehen
  if (gegenpartei === undefined && zweck === undefined) return null
  return { datum, betrag, gegenpartei, zahler, zweck: zweck ?? gegenpartei!, iban, konto, buchungstext }
}

function leseBanktabelle(format: Dateiformat, s: Spaltenzuordnung, zeilen: Tabelle): Einlesergebnis {
  const feld = (zeile: Zelle[], index?: number) => (index === undefined ? '' : text(zeile[index]))
  const buchungen: Rohbuchung[] = []
  zeilen.forEach((zeile, i) => {
    const datum = leseDatum(zeile[s.datum])
    const betrag = leseBetrag(zeile[s.betrag])
    if (!datum || isNaN(betrag)) return
    // DKB: Bei Geldeingängen ist der Zahler die Gegenpartei
    const name = s.zahler !== undefined && betrag > 0 ? feld(zeile, s.zahler) : feld(zeile, s.gegenpartei)
    const imText = s.gegenpartei === undefined ? zerlegeBuchungstext(feld(zeile, s.zweck)) : undefined
    buchungen.push({
      id: `${format}-${i}`,
      datum,
      betrag,
      gegenpartei: imText ? imText.gegenpartei : name,
      zweck: imText ? imText.zweck : feld(zeile, s.zweck),
      konto: feld(zeile, s.konto),
      iban: ohneLeerzeichen(imText?.iban || feld(zeile, s.iban)),
      buchungstext: feld(zeile, s.buchungstext),
    })
  })
  const eigeneKonten = [...new Set(buchungen.map((b) => ohneLeerzeichen(b.konto)).filter(Boolean))]
  return { format, buchungen, eigeneKonten }
}

/**
 * comdirect schreibt alles in eine Spalte, z. B.
 * „Empfänger: Hausverwaltung Berger Kto/IBAN: DE00… BLZ/BIC: … Buchungstext: Miete Oktober Ref. 9X…“.
 */
export function zerlegeBuchungstext(text: string): { gegenpartei: string; zweck: string; iban: string } {
  const teile = new Map<string, string>()
  const muster = /(Auftraggeber:|Empfänger:|Kto\/IBAN:|BLZ\/BIC:|Buchungstext:|Ref\.)/g
  const treffer = [...text.matchAll(muster)]
  treffer.forEach((t, i) => {
    const ende = treffer[i + 1]?.index ?? text.length
    teile.set(t[1], text.slice(t.index! + t[1].length, ende).trim())
  })
  return {
    gegenpartei: teile.get('Auftraggeber:') ?? teile.get('Empfänger:') ?? '',
    zweck: teile.get('Buchungstext:') ?? (treffer.length > 0 ? '' : text),
    iban: teile.get('Kto/IBAN:') ?? '',
  }
}

function ohneLeerzeichen(s: string): string {
  return s.replace(/\s/g, '').toUpperCase()
}
