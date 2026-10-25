// Tests für die einzelnen Bausteine: Zahlen, Datum, Kodierung, Kategorien, Verträge, Spalten.
import { describe, expect, it } from 'vitest'
import { leseDatei, SpaltenUnbekanntFehler } from './einlesen'
import { ordneEin } from './erkennen'
import { formatEuro, formatProzent } from './format'
import { ordneKategorieZu } from './kategorien'
import type { Rohbuchung } from './typen'
import { dekodiereText, leseBetrag, leseDatum } from './zahlen'

const alsDatei = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer

function roh(teil: Partial<Rohbuchung>): Rohbuchung {
  return { id: 'x', datum: '2026-01-01', betrag: -10, gegenpartei: '', zweck: '', konto: '', iban: '', buchungstext: '', ...teil }
}

describe('Beträge', () => {
  it.each([
    ['-1.234,56', -1234.56],
    ['-11,00', -11],
    ['3020,00', 3020],
    ['1,234.56', 1234.56],
    ['-7.7', -7.7],
    ['1.234', 1234],
    ['+12,50 €', 12.5],
    [-39.99, -39.99],
  ])('%s → %d', (eingabe, erwartet) => {
    expect(leseBetrag(eingabe)).toBe(erwartet)
  })

  it('erkennt Text ohne Zahl', () => {
    expect(leseBetrag('abc')).toBeNaN()
    expect(leseBetrag('')).toBeNaN()
  })
})

describe('Datum', () => {
  it.each([
    ['23.10.26', '2026-10-23'],
    ['01.02.2025', '2025-02-01'],
    ['2026-10-23', '2026-10-23'],
    [46318, '2026-10-23'],
  ])('%s → %s', (eingabe, erwartet) => {
    expect(leseDatum(eingabe)).toBe(erwartet)
  })

  it('lehnt ungültige Daten ab', () => {
    expect(leseDatum('31.02.26')).toBeNull()
    expect(leseDatum('Buchungstag')).toBeNull()
  })
})

describe('Text-Kodierung', () => {
  it('liest Windows-1252, wenn UTF-8 kaputte Zeichen ergibt', () => {
    const windows1252 = new Uint8Array([0x42, 0xe4, 0x63, 0x6b, 0x65, 0x72, 0x65, 0x69]) // „Bäckerei“
    expect(dekodiereText(windows1252)).toBe('Bäckerei')
  })

  it('lässt UTF-8 in Ruhe', () => {
    expect(dekodiereText(new TextEncoder().encode('Bäckerei'))).toBe('Bäckerei')
  })
})

describe('Formatierung', () => {
  it('schreibt Beträge deutsch', () => {
    expect(formatEuro(1360)).toBe('1.360 €')
    expect(formatEuro(39.99)).toBe('39,99 €')
    expect(formatEuro(1363.74, 'ganz')).toBe('1.364 €')
    expect(formatProzent(0.139)).toBe('14 %')
  })
})

describe('Kategorien', () => {
  const kategorie = (teil: Partial<Rohbuchung>) => ordneKategorieZu(roh(teil))

  it('erkennt Händler aus der Liste', () => {
    expect(kategorie({ gegenpartei: 'LIDL' })).toMatchObject({ kategorie: 'Essen & Trinken', unterkategorie: 'Lebensmittel' })
    expect(kategorie({ gegenpartei: 'Baeckerei Kamps' }).kategorie).toBe('Essen & Trinken')
    expect(kategorie({ gegenpartei: 'dm-drogerie markt' }).kategorie).toBe('Sonstiges')
  })

  it('längeres Stichwort gewinnt: Uber Eats ist Essen, Uber BV ist Taxi', () => {
    expect(kategorie({ gegenpartei: 'Uber Eats' }).unterkategorie).toBe('Lieferservice')
    expect(kategorie({ gegenpartei: 'Uber BV' }).unterkategorie).toBe('Taxi')
  })

  it('nur ganze Wörter: „Bar Lindwurm“ ist eine Bar, Geldautomat ist Bargeld', () => {
    expect(kategorie({ gegenpartei: 'Bar Lindwurm' }).unterkategorie).toBe('Restaurants')
    expect(kategorie({ gegenpartei: 'Sparkasse GA', buchungstext: 'GELDAUTOMAT', zweck: 'Bargeldauszahlung' })).toMatchObject({
      kategorie: 'Sonstiges',
      unterkategorie: 'Bargeld',
    })
  })

  it('PayPal: Händler aus dem Zweck, sonst zum Nachschauen', () => {
    expect(kategorie({ gegenpartei: 'PayPal Europe', zweck: 'Ihr Einkauf bei Zalando SE' }).kategorie).toBe('Shopping')
    expect(kategorie({ gegenpartei: 'PayPal Europe', zweck: 'Ihr Einkauf bei Max Mustermann' })).toMatchObject({ zumNachschauen: true })
  })

  it('Privatpersonen landen unter „Zum Nachschauen“', () => {
    expect(kategorie({ gegenpartei: 'Jonas Keller', zweck: 'Konzertkarte zurueck' })).toMatchObject({
      kategorie: 'Sonstiges',
      zumNachschauen: true,
    })
  })

  it('eigene Regeln gehen vor', () => {
    const z = ordneKategorieZu(roh({ gegenpartei: 'Jonas Keller' }), [{ stichwort: 'jonas keller', kategorie: 'Freizeit' }])
    expect(z).toMatchObject({ kategorie: 'Freizeit', zumNachschauen: false })
  })

  it('Gehalt bei Eingängen', () => {
    expect(kategorie({ betrag: 3020, zweck: 'Lohn/Gehalt 09/2026' })).toMatchObject({ kategorie: 'Einnahmen', unterkategorie: 'Lohn / Gehalt' })
  })
})

describe('Verträge und Umbuchungen in Bankdaten', () => {
  const monatlich = (betrag: number, teil: Partial<Rohbuchung> = {}) =>
    ['2026-01-01', '2026-02-01', '2026-03-02', '2026-04-01'].map((datum, i) =>
      roh({ id: `${teil.gegenpartei}-${betrag}-${i}`, datum, betrag, buchungstext: 'FOLGELASTSCHRIFT', ...teil }),
    )
  const ordne = (buchungen: Rohbuchung[], eigeneKonten: string[] = []) =>
    ordneEin({ format: 'bank-csv', buchungen, eigeneKonten })

  it('zwei Verträge bei derselben Firma werden getrennt erkannt', () => {
    const b = ordne([...monatlich(-6.5, { gegenpartei: 'Muster Versicherung' }), ...monatlich(-8.9, { gegenpartei: 'Muster Versicherung' })])
    expect(b.every((x) => x.istVertrag && x.turnus === 'monatlich')).toBe(true)
    expect(new Set(b.map((x) => x.vertragsId)).size).toBe(2)
  })

  it('Geldautomat ist nie ein Vertrag', () => {
    const b = ordne(monatlich(-50, { gegenpartei: 'Sparkasse GA', buchungstext: 'GELDAUTOMAT' }))
    expect(b.some((x) => x.istVertrag)).toBe(false)
  })

  it('ähnliche Kartenzahlungen sind kein Vertrag, gleiche schon', () => {
    const aehnlich = ordne(
      monatlich(-13.72, { gegenpartei: 'Rossmann', buchungstext: 'KARTENZAHLUNG' }).map((x, i) => ({ ...x, betrag: x.betrag - i * 0.1 })),
    )
    expect(aehnlich.some((x) => x.istVertrag)).toBe(false)
    const gleich = ordne(monatlich(-13.99, { gegenpartei: 'Netflix', buchungstext: 'KARTENZAHLUNG' }))
    expect(gleich.every((x) => x.istVertrag)).toBe(true)
  })

  it('Überweisung auf eigenes Konto ist eine Umbuchung', () => {
    const [b] = ordne([roh({ iban: 'DE001', gegenpartei: 'Tagesgeld' })], ['DE001'])
    expect(b.istUmbuchung).toBe(true)
  })

  it('ein Stichwort wie „Miete“ macht den Vertrag zur Miete', () => {
    const b = ordne(monatlich(-750, { gegenpartei: 'Frau Schmidt', zweck: 'Miete Wohnung', buchungstext: 'DAUERAUFTRAG' }))
    expect(b[0]).toMatchObject({ kategorie: 'Wohnen', unterkategorie: 'Miete' })
  })

  it('Urlaub und Ausgaben ab 300 € sind Einmaleffekte', () => {
    const b = ordne([roh({ gegenpartei: 'Condor', betrag: -250 }), roh({ gegenpartei: 'MediaMarkt', betrag: -300 }), roh({ gegenpartei: 'REWE', betrag: -40 })])
    expect(b.map((x) => x.istEinmaleffekt)).toEqual([true, true, false])
  })
})

describe('Andere Banken', () => {
  it('findet die Tabelle unter Kontoinfos (z. B. ING)', () => {
    const csv = [
      'Umsatzanzeige;Datei erstellt am: 23.10.2026',
      'IBAN;DE00 1234',
      '',
      'Buchung;Valuta;Auftraggeber/Empfänger;Buchungstext;Verwendungszweck;Saldo;Währung;Betrag;Währung',
      '23.10.2026;23.10.2026;REWE Markt;Lastschrift;Einkauf;100,00;EUR;-12,34;EUR',
    ].join('\n')
    const { format, buchungen } = leseDatei(alsDatei(csv))
    expect(format).toBe('ing')
    expect(buchungen[0]).toMatchObject({ datum: '2026-10-23', betrag: -12.34, gegenpartei: 'REWE Markt', zweck: 'Einkauf' })
  })

  it('DKB-Spalten mit Komma als Trennzeichen', () => {
    const csv = '"Buchungsdatum","Zahlungspflichtige*r","Zahlungsempfänger*in","Verwendungszweck","Betrag (€)"\n"23.10.26","Alex","Wolt","Bestellung","-17,80"'
    const { buchungen } = leseDatei(alsDatei(csv))
    expect(buchungen[0]).toMatchObject({ betrag: -17.8, gegenpartei: 'Wolt' })
  })

  it('unbekannte Spalten: Fehler mit Kopfzeile, damit die Oberfläche nachfragen kann', () => {
    const csv = 'Wann;Wieviel;Wer\n23.10.26;-5,00;Kiosk'
    expect(() => leseDatei(alsDatei(csv))).toThrow(SpaltenUnbekanntFehler)
    try {
      leseDatei(alsDatei(csv))
    } catch (fehler) {
      expect((fehler as SpaltenUnbekanntFehler).kopfzeile).toEqual(['Wann', 'Wieviel', 'Wer'])
    }
  })

  it('mit manueller Spaltenzuordnung klappt es', () => {
    const csv = 'Wann;Wieviel;Wer\n23.10.26;-5,00;Kiosk'
    const { buchungen } = leseDatei(alsDatei(csv), { datum: 0, betrag: 1, gegenpartei: 2, zweck: 2 })
    expect(buchungen[0]).toMatchObject({ datum: '2026-10-23', betrag: -5, gegenpartei: 'Kiosk' })
  })
})
