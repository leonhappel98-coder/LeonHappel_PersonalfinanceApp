// Umbuchungen, Sparen, Verträge und Einmaleffekte erkennen (RECHENKERN.md, Abschnitte 2–4).
import { EINMALEFFEKT_SCHWELLE } from '../config'
import { finanzguruKategorie, normalisiere, ordneKategorieZu, type EigeneRegel } from './kategorien'
import type { Buchung, Einlesergebnis, Rohbuchung, Turnus } from './typen'
import { tageZwischen } from './zahlen'

export type Optionen = {
  /** Vom Nutzer gespeicherte Zuordnungen, werden zuerst angewendet. */
  regeln?: EigeneRegel[]
  /** Name des Kontoinhabers: Überweisungen an sich selbst sind Umbuchungen. */
  kontoinhaber?: string
}

/** Macht aus Rohbuchungen fertig eingeordnete Buchungen. */
export function ordneEin(eingelesen: Einlesergebnis, optionen: Optionen = {}): Buchung[] {
  const eigeneKonten = new Set(eingelesen.eigeneKonten)
  const buchungen = eingelesen.buchungen.map((roh) =>
    roh.finanzguru ? ausFinanzguru(roh) : ausBankdaten(roh, eigeneKonten, optionen),
  )
  if (eingelesen.format !== 'finanzguru') {
    erkenneVertraege(buchungen, eingelesen.buchungen)
    erkenneMiete(buchungen, eingelesen.buchungen)
  }
  for (const b of buchungen) b.istEinmaleffekt = istEinmaleffekt(b)
  return buchungen
}

function grundgeruest(roh: Rohbuchung): Buchung {
  return {
    id: roh.id,
    datum: roh.datum,
    betrag: roh.betrag,
    gegenpartei: roh.gegenpartei,
    zweck: roh.zweck,
    konto: roh.konto,
    istVertrag: false,
    istUmbuchung: false,
    istSparen: false,
    istEinmaleffekt: false,
    zumNachschauen: false,
  }
}

// ---------- Finanzguru: übernimmt dessen Einordnung ----------

function ausFinanzguru(roh: Rohbuchung): Buchung {
  const fg = roh.finanzguru!
  const b = grundgeruest(roh)
  b.istUmbuchung = fg.istUmbuchung
  b.istSparen =
    !fg.istUmbuchung && (fg.hauptkategorie === 'Sparen' || ['Kapitalanlage', 'Sparen'].includes(fg.unterkategorie))
  b.istVertrag = fg.istVertrag && !fg.istUmbuchung
  b.turnus = b.istVertrag ? fg.turnus : undefined
  b.vertragsId = b.istVertrag ? (fg.vertragsId ?? vertragsSchluessel(roh.gegenpartei, roh.betrag)) : undefined
  if (!b.istUmbuchung) {
    b.kategorie = b.istSparen ? 'Sparen' : finanzguruKategorie(fg.hauptkategorie, b.istVertrag)
    b.unterkategorie = fg.unterkategorie || undefined
  }
  return b
}

// ---------- Bank-CSV: selbst erkennen ----------

function ausBankdaten(roh: Rohbuchung, eigeneKonten: Set<string>, optionen: Optionen): Buchung {
  const b = grundgeruest(roh)
  b.istUmbuchung = istUmbuchung(roh, eigeneKonten, optionen.kontoinhaber)
  if (b.istUmbuchung) return b

  const zuordnung = ordneKategorieZu(roh, optionen.regeln)
  b.kategorie = zuordnung.kategorie
  b.unterkategorie = zuordnung.unterkategorie
  b.zumNachschauen = zuordnung.zumNachschauen
  b.istSparen = zuordnung.kategorie === 'Sparen'
  return b
}

function istUmbuchung(roh: Rohbuchung, eigeneKonten: Set<string>, kontoinhaber?: string): boolean {
  if (roh.iban && eigeneKonten.has(roh.iban)) return true
  if (kontoinhaber && normalisiere(roh.gegenpartei) === normalisiere(kontoinhaber)) return true
  return /(^|[^a-z])(umbuchung|uebertrag|ubertrag)/.test(normalisiere(roh.zweck))
}

// ---------- Verträge ----------

const TURNUS_TAGE: [Turnus, number, number][] = [
  ['zweiwoechentlich', 12, 16],
  ['monatlich', 27, 33],
  ['vierteljaehrlich', 85, 95],
  ['halbjaehrlich', 175, 190],
  ['jaehrlich', 355, 375],
]

/** Höchstens 5 % Unterschied zwischen den Beträgen eines Vertrags. */
const BETRAG_TOLERANZ = 0.05

function vertragsSchluessel(gegenpartei: string, betrag: number): string {
  return `${normalisiere(gegenpartei)}|${Math.abs(betrag).toFixed(2)}`
}

/**
 * Vertrag = dieselbe Gegenpartei mindestens 3-mal, Beträge höchstens 5 % auseinander,
 * Abstände passen zu einem Turnus. Eine Gegenpartei kann mehrere Verträge haben
 * (z. B. zwei Versicherungen), deshalb wird zusätzlich nach Betrag gruppiert.
 * Kartenzahlungen im Laden sind fast nie Verträge: Dort müssen die Beträge auf den Cent gleich sein.
 */
function erkenneVertraege(buchungen: Buchung[], roh: Rohbuchung[]): void {
  const gruppen = new Map<string, number[]>()
  buchungen.forEach((b, i) => {
    if (b.betrag >= 0 || b.istUmbuchung || b.unterkategorie === 'Bargeld' || !b.gegenpartei) return
    const schluessel = normalisiere(b.gegenpartei)
    gruppen.set(schluessel, [...(gruppen.get(schluessel) ?? []), i])
  })

  for (const indizes of gruppen.values()) {
    for (const gruppe of nachBetragGruppieren(indizes, buchungen)) {
      if (gruppe.length < 3) continue
      const betraege = new Set(gruppe.map((i) => buchungen[i].betrag))
      if (betraege.size > 1 && gruppe.some((i) => istKartenzahlung(roh[i]))) continue
      const turnus = passenderTurnus(gruppe.map((i) => buchungen[i].datum))
      if (!turnus) continue
      const erste = buchungen[gruppe[0]]
      const id = vertragsSchluessel(erste.gegenpartei, erste.betrag)
      for (const i of gruppe) {
        const b = buchungen[i]
        b.istVertrag = true
        b.turnus = turnus
        b.vertragsId = id
        b.zumNachschauen = false
        // Verträge zählen zu den Fixkosten: Wohnen bleibt Wohnen, Sparen bleibt Sparen, alles andere wird „Verträge & Abos“.
        if (b.kategorie !== 'Wohnen' && b.kategorie !== 'Sparen') b.kategorie = 'Verträge & Abos'
      }
    }
  }
}

function istKartenzahlung(b: Rohbuchung): boolean {
  return /karte|girocard|debit/.test(normalisiere(b.buchungstext))
}

/** Teilt Buchungen in Gruppen, deren Beträge höchstens 5 % vom kleinsten Betrag der Gruppe abweichen. */
function nachBetragGruppieren(indizes: number[], buchungen: Buchung[]): number[][] {
  const sortiert = [...indizes].sort((a, b) => Math.abs(buchungen[a].betrag) - Math.abs(buchungen[b].betrag))
  const gruppen: number[][] = []
  let aktuell: number[] = []
  let basis = 0
  for (const i of sortiert) {
    const betrag = Math.abs(buchungen[i].betrag)
    if (aktuell.length > 0 && betrag <= basis * (1 + BETRAG_TOLERANZ)) {
      aktuell.push(i)
    } else {
      if (aktuell.length > 0) gruppen.push(aktuell)
      aktuell = [i]
      basis = betrag
    }
  }
  if (aktuell.length > 0) gruppen.push(aktuell)
  return gruppen
}

/** Turnus, zu dem der mittlere Abstand passt und mindestens 80 % aller Abstände. */
function passenderTurnus(daten: string[]): Turnus | undefined {
  const sortiert = [...daten].sort()
  const abstaende = sortiert.slice(1).map((d, i) => tageZwischen(sortiert[i], d))
  const median = [...abstaende].sort((a, b) => a - b)[Math.floor(abstaende.length / 2)]
  for (const [turnus, min, max] of TURNUS_TAGE) {
    if (median < min || median > max) continue
    const passend = abstaende.filter((a) => a >= min && a <= max).length
    if (passend / abstaende.length >= 0.8) return turnus
  }
  return undefined
}

/** Miete: Stichwort „Miete“, sonst der Dauerauftrag mit dem größten regelmäßigen Betrag. */
function erkenneMiete(buchungen: Buchung[], roh: Rohbuchung[]): void {
  if (buchungen.some((b) => b.istVertrag && b.unterkategorie === 'Miete')) return
  const mitStichwort = buchungen.filter((b) => b.istVertrag && /(^|[^a-z])miete([^a-z]|$)/.test(normalisiere(b.zweck)))
  const kandidaten =
    mitStichwort.length > 0
      ? mitStichwort
      : buchungen.filter((b, i) => b.istVertrag && !b.istSparen && /dauerauftrag/i.test(roh[i].buchungstext))
  if (kandidaten.length === 0) return
  const groesster = kandidaten.reduce((a, b) => (Math.abs(b.betrag) > Math.abs(a.betrag) ? b : a))
  for (const b of buchungen) {
    if (b.vertragsId === groesster.vertragsId) {
      b.kategorie = 'Wohnen'
      b.unterkategorie = 'Miete'
    }
  }
}

// ---------- Einmaleffekte ----------

/** Kein Vertrag und entweder Urlaub oder mindestens 300 € (Schwelle in config.ts). */
function istEinmaleffekt(b: Buchung): boolean {
  if (b.betrag >= 0 || b.istVertrag || b.istUmbuchung || b.istSparen) return false
  return b.unterkategorie === 'Urlaub' || -b.betrag >= EINMALEFFEKT_SCHWELLE
}
