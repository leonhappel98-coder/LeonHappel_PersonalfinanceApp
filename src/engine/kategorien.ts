// Kategorien zuordnen (RECHENKERN.md, Abschnitt 5).
import haendlerliste from './merchants.de.json'
import type { Kategorie, Rohbuchung } from './typen'

export type Zuordnung = { kategorie: Kategorie; unterkategorie?: string; zumNachschauen: boolean }

/** Eine Regel, die der Nutzer selbst festgelegt hat: Stichwort → Kategorie. */
export type EigeneRegel = { stichwort: string; kategorie: Kategorie; unterkategorie?: string }

/** Kleinbuchstaben, Umlaute ausgeschrieben, Akzente weg: „Bäckerei Café“ → „baeckerei cafe“. */
export function normalisiere(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

type Eintrag = { stichwort: string; muster: RegExp; kategorie: Kategorie; unterkategorie: string }

/** Stichwort als ganzes Wort: „bar“ passt auf „Bar Lindwurm“, aber nicht auf „Bargeld“. */
function wortMuster(stichwort: string): RegExp {
  const maskiert = normalisiere(stichwort).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${maskiert}($|[^a-z0-9])`)
}

/** Alle Händler aus der Liste, längstes Stichwort zuerst („uber eats“ vor „uber“). */
const HAENDLER: Eintrag[] = Object.entries(haendlerliste as Record<string, Record<string, string[]>>)
  .flatMap(([kategorie, unter]) =>
    Object.entries(unter).flatMap(([unterkategorie, stichwoerter]) =>
      stichwoerter.map((stichwort) => ({
        stichwort,
        muster: wortMuster(stichwort),
        kategorie: kategorie as Kategorie,
        unterkategorie,
      })),
    ),
  )
  .sort((a, b) => normalisiere(b.stichwort).length - normalisiere(a.stichwort).length)

function findeHaendler(text: string, nurEinnahmen: boolean): Eintrag | undefined {
  const t = normalisiere(text)
  if (t === '') return undefined
  return HAENDLER.find((h) => (h.kategorie === 'Einnahmen') === nurEinnahmen && h.muster.test(t))
}

/** Ordnet eine Bankbuchung (ohne Finanzguru-Daten) einer Kategorie zu. */
export function ordneKategorieZu(b: Rohbuchung, regeln: EigeneRegel[] = []): Zuordnung {
  const gesamt = normalisiere(`${b.gegenpartei} ${b.zweck}`)

  const regel = regeln.find((r) => wortMuster(r.stichwort).test(gesamt))
  if (regel) return { kategorie: regel.kategorie, unterkategorie: regel.unterkategorie, zumNachschauen: false }

  if (b.betrag > 0) {
    const einnahme = findeHaendler(b.zweck, true) ?? findeHaendler(b.gegenpartei, true)
    return { kategorie: 'Einnahmen', unterkategorie: einnahme?.unterkategorie ?? 'Sonstige Einnahmen', zumNachschauen: false }
  }

  if (/geldautomat|barentnahme|bargeldauszahlung|bargeldabhebung/.test(normalisiere(`${b.buchungstext} ${b.zweck}`))) {
    return { kategorie: 'Sonstiges', unterkategorie: 'Bargeld', zumNachschauen: false }
  }

  // PayPal: Der eigentliche Händler steht im Zweck („Ihr Einkauf bei …“) oder nach dem Sternchen.
  if (gesamt.includes('paypal')) {
    const imZweck = /einkauf bei (.+)$/.exec(normalisiere(b.zweck))?.[1] ?? ''
    const nachStern = b.gegenpartei.split('*')[1] ?? ''
    const haendler = findeHaendler(imZweck, false) ?? findeHaendler(nachStern, false)
    if (haendler) return { kategorie: haendler.kategorie, unterkategorie: haendler.unterkategorie, zumNachschauen: false }
    return { kategorie: 'Sonstiges', zumNachschauen: true }
  }

  const haendler = findeHaendler(b.gegenpartei, false) ?? findeHaendler(b.zweck, false)
  if (haendler) return { kategorie: haendler.kategorie, unterkategorie: haendler.unterkategorie, zumNachschauen: false }
  return { kategorie: 'Sonstiges', zumNachschauen: true }
}

/** Finanzguru-Hauptkategorie → App-Kategorie (für Buchungen, die kein Vertrag sind). */
const FINANZGURU_KATEGORIE: Record<string, Kategorie> = {
  'Essen & Trinken': 'Essen & Trinken',
  Freizeit: 'Freizeit',
  Lifestyle: 'Shopping',
  Mobilitaet: 'Mobilität',
  Mobilität: 'Mobilität',
  Drogerie: 'Sonstiges',
  Sonstiges: 'Sonstiges',
  Gesundheit: 'Sonstiges',
  Haustiere: 'Sonstiges',
  Kinder: 'Sonstiges',
  Finanzen: 'Sonstiges',
  Wohnen: 'Wohnen',
  Versicherungen: 'Verträge & Abos',
  Sparen: 'Sparen',
  Einnahmen: 'Einnahmen',
}

export function finanzguruKategorie(hauptkategorie: string, istVertrag: boolean): Kategorie {
  const kategorie = FINANZGURU_KATEGORIE[hauptkategorie] ?? 'Sonstiges'
  if (!istVertrag || kategorie === 'Sparen' || kategorie === 'Einnahmen') return kategorie
  // Alle Verträge zählen zu den Fixkosten.
  return kategorie === 'Wohnen' ? 'Wohnen' : 'Verträge & Abos'
}
