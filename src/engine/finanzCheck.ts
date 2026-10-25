// Finanz-Check: Notgroschen, Sparquote, Fixkostenquote, Altersvergleich (RECHENKERN.md, Abschnitt 12).
import { AMPEL } from '../config'
import { nettovermoegen, type Ziel } from './prognose'
import type { Analyse } from './typen'
import { SPARQUOTE_DEUTSCHLAND, VERMOEGEN_NACH_ALTER } from './vergleichswerte'

export type Ampel = 'gut' | 'hinweis' | 'warnung'

export type FinanzCheck = {
  /** Wie viele Monate das Tagesgeld die laufenden Kosten (Lebenshaltung + Fixkosten) deckt */
  notgroschen: { monate: number; ziel: number; ampel: Ampel }
  sparquote: { wert: number; deutschland: number; ampel: Ampel }
  fixkosten: { wert: number; ampel: Ampel }
  /** Nur mit Geburtsjahr */
  vermoegen: { alter: number; gruppe: string; median: number; deins: number } | null
}

/** Höher ist besser (Notgroschen, Sparquote). */
function ampelAb(wert: number, grenzen: { gruen: number; gelb: number }): Ampel {
  return wert >= grenzen.gruen ? 'gut' : wert >= grenzen.gelb ? 'hinweis' : 'warnung'
}

/** Niedriger ist besser (Fixkosten). */
function ampelBis(wert: number, grenzen: { gruen: number; gelb: number }): Ampel {
  return wert <= grenzen.gruen ? 'gut' : wert <= grenzen.gelb ? 'hinweis' : 'warnung'
}

export function erstelleFinanzCheck(analyse: Analyse, ziel: Ziel, jahr: number): FinanzCheck {
  const kosten = analyse.lebenshaltungProMonat + analyse.fixkostenProMonat
  const monate = kosten > 0 ? ziel.tagesgeld / kosten : 0

  let vermoegen: FinanzCheck['vermoegen'] = null
  if (ziel.geburtsjahr) {
    const alter = jahr - ziel.geburtsjahr
    const gruppe = VERMOEGEN_NACH_ALTER.find((g) => alter >= g.von && alter <= g.bis)
    if (gruppe) {
      vermoegen = {
        alter,
        gruppe: gruppe.bis >= 120 ? `ab ${gruppe.von}` : `${gruppe.von}–${gruppe.bis}`,
        median: gruppe.median,
        deins: nettovermoegen(ziel),
      }
    }
  }

  return {
    notgroschen: { monate, ziel: AMPEL.notgroschen.gruen, ampel: ampelAb(monate, AMPEL.notgroschen) },
    sparquote: { wert: analyse.sparquote, deutschland: SPARQUOTE_DEUTSCHLAND, ampel: ampelAb(analyse.sparquote, AMPEL.sparquote) },
    fixkosten: { wert: analyse.fixkostenQuote, ampel: ampelBis(analyse.fixkostenQuote, AMPEL.fixkosten) },
    vermoegen,
  }
}
