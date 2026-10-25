// Anonyme Zusammenfassung zum Kopieren in Claude oder ChatGPT (RECHENKERN.md, Abschnitt 11).
// Die App sendet nichts: Der Nutzer kopiert den Text selbst.
import { art } from './auswerten'
import { formatEuro, formatProzent } from './format'
import { SZENARIO_RENDITE } from '../config'
import { berechnePrognose, nettovermoegen, noetigeSparrate, type Ziel } from './prognose'
import type { Schrittplan } from './schritte'
import type { Analyse } from './typen'

/** Sensible Unterkategorien landen unter „Sonstiges“ (Gesundheit, Spenden, Kirche, Gewerkschaft, Partei). */
const SENSIBEL = /gesundheit|arzt|apothek|kranken|zahn|dental|therapie|spende|kirche|gewerkschaft|partei|mitglied/i

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const monatJahr = (monat: string) => `${MONATE[Number(monat.slice(5, 7)) - 1]} ${monat.slice(0, 4)}`

const auf10 = (betrag: number) => Math.round(betrag / 10) * 10
const auf1000 = (betrag: number) => Math.round(betrag / 1000) * 1000
const euro10 = (betrag: number) => `ca. ${formatEuro(auf10(betrag), 'ganz')}`
const euro1000 = (betrag: number) => `ca. ${formatEuro(auf1000(betrag), 'ganz')}`
/** Die Händlerliste schreibt Umlaute aus („Buecher“), damit Finanzguru-Namen passen. Im Text für die KI stehen sie richtig. */
const MIT_UMLAUTEN: Record<string, string> = {
  'Buecher & Zeitungen': 'Bücher & Zeitungen',
  Rundfunkgebuehren: 'Rundfunkgebühren',
}
const anonym = (unterkategorie?: string) =>
  !unterkategorie || SENSIBEL.test(unterkategorie) ? 'Sonstiges' : (MIT_UMLAUTEN[unterkategorie] ?? unterkategorie)

/** Summen je (anonymisierter) Unterkategorie, pro Monat, größte zuerst. Kleinstbeträge unter 5 € fallen weg. */
function proUnterkategorie(posten: { name?: string; proMonat: number }[]): [string, number][] {
  const summen = new Map<string, number>()
  for (const p of posten) summen.set(anonym(p.name), (summen.get(anonym(p.name)) ?? 0) + p.proMonat)
  return [...summen.entries()].filter(([, wert]) => wert >= 5).sort((a, b) => b[1] - a[1])
}

export function erstelleKiPrompt(analyse: Analyse, ziel: Ziel | undefined, plan: Schrittplan | undefined, startMonat: string): string {
  const monate = Math.max(1, Math.round(analyse.zeitraum.monate))
  const zeilen: string[] = []
  const abschnitt = (titel: string, eintraege: string[]) => {
    if (eintraege.length > 0) zeilen.push('', titel, ...eintraege.map((e) => `- ${e}`))
  }

  zeilen.push(
    'Ich möchte meine Finanzen verbessern. Unten steht eine anonyme, gerundete Zusammenfassung aus meiner Finanz-App ' +
      `(Kontoauszüge der letzten ${monate} Monate, Beträge pro Monat).`,
    'Bitte gib mir 3 bis 5 konkrete Vorschläge, sortiert nach Wirkung, und schätze jeweils grob, wie viel € im Monat sie bringen. ' +
      'Frag nach, wenn dir für einen guten Rat etwas fehlt. Empfiehl keine konkreten Finanzprodukte.',
  )

  const personen = ziel?.personenImHaushalt
  abschnitt('EINNAHMEN UND QUOTEN', [
    ...(personen ? [`Haushalt: ${personen} ${personen === 1 ? 'Person' : 'Personen'}`] : []),
    `Nettoeinkommen: ${euro10(analyse.nettoeinkommenProMonat)}`,
    `Sparquote: ${formatProzent(analyse.sparquote)} (${euro10(analyse.sparenProMonat)} ins Depot)`,
    `Fixkostenquote: ${formatProzent(analyse.fixkostenQuote)} vom Netto`,
  ])

  abschnitt(
    `LEBENSHALTUNG: ${euro10(analyse.lebenshaltungProMonat)} (ohne Miete, Verträge und Einmaleffekte)`,
    analyse.kategorien.map((k) => {
      const teile = proUnterkategorie(k.unterkategorien).map(([name, wert]) => `${name} ${euro10(wert)}`)
      return `${k.kategorie}: ${euro10(k.proMonat)}${teile.length > 1 ? ` (${teile.join(', ')})` : ''}`
    }),
  )

  // Gleicher Name wie bei der Lebenshaltung (z. B. „Sport“) → als Vertrag kennzeichnen, sonst wirkt es doppelt gezählt
  const namenLebenshaltung = new Set(analyse.kategorien.flatMap((k) => k.unterkategorien.map((u) => anonym(u.name))))
  const fixkosten = analyse.buchungen
    .filter((b) => art(b) === 'fixkosten')
    .map((b) => ({ name: b.unterkategorie, proMonat: -b.betrag / analyse.zeitraum.monate }))
  abschnitt(
    `FIXKOSTEN: ${euro10(analyse.fixkostenProMonat)}`,
    proUnterkategorie(fixkosten).map(([name, wert]) => `${name}${namenLebenshaltung.has(name) ? ' (Vertrag)' : ''}: ${euro10(wert)}`),
  )

  if (analyse.einmaleffekte.summe > 0) {
    abschnitt('EINMALEFFEKTE', [`Im Zeitraum zusammen ${euro10(analyse.einmaleffekte.summe)} (z. B. Urlaub, Anschaffungen), oben nicht eingerechnet`])
  }

  abschnitt(
    'AUFFÄLLIGKEITEN',
    analyse.hinweise.map((h) =>
      h.art === 'tarif-pruefen'
        ? `Handyvertrag ${euro10(h.vertrag.proMonat)} im Monat`
        : `${h.vertraege.length} Streaming-Abos gleichzeitig, zusammen ${euro10(h.proMonat)}`,
    ),
  )

  if (ziel) {
    const sparrate = plan?.sparrateJetzt ?? ziel.sparrateProMonat
    const prognose = plan?.soWieJetzt ?? berechnePrognose({ ...ziel, sparrateProMonat: sparrate }, startMonat, 'realistisch')
    const noetig = noetigeSparrate(ziel, startMonat, SZENARIO_RENDITE.realistisch)
    abschnitt('VERMÖGEN UND ZIEL', [
      `Vermögen heute: ${euro1000(nettovermoegen(ziel))}, davon flüssig ${euro1000(ziel.tagesgeld)}`,
      `Ziel: ${euro1000(ziel.zielBetrag)} bis ${monatJahr(ziel.zielMonat)}`,
      `Sparrate ins Depot: ${euro10(sparrate)} im Monat`,
      ...(noetig === null
        ? []
        : noetig === 0
          ? ['Für das Ziel nötig: keine weitere Sparrate, das Depot wächst bei 5 % Rendite von allein dorthin']
          : [`Für das Ziel nötig bei 5 % Rendite: ${euro10(noetig)} im Monat`]),
      prognose.zielErreicht
        ? `Prognose bei 5 % Rendite: Ziel erreicht im ${monatJahr(prognose.zielErreicht)}`
        : 'Prognose bei 5 % Rendite: Ziel wird in 50 Jahren nicht erreicht',
    ])
  }

  if (plan) {
    abschnitt(
      'SCHON GEPLANT (VON DER APP VORGESCHLAGEN)',
      plan.schritte.map((s) => `${s.titel}${s.plusProMonat ? `: ${euro10(s.plusProMonat)} im Monat` : ''}${s.erledigt ? ' (erledigt)' : ''}`),
    )
  }

  return zeilen.join('\n')
}
