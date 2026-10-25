// Liniendiagramm der Prognose: gewähltes Szenario durchgezogen, die anderen gestrichelt, Ziel als Linie.
import type { Prognose } from '../engine/prognose'
import { kurzEuro, monatJahr } from './texte'

type Props = {
  /** Alle drei Szenarien, gleich lang */
  prognosen: Prognose[]
  gewaehlt: Prognose
  zielBetrag: number
}

// Zeichenfläche wie im Design (viewBox 350 × 210)
const LINKS = 36
const RECHTS = 340
const OBEN = 20
const UNTEN = 190

/** Runde Obergrenze für die Achse: 4 Abschnitte mit „schönen“ Schritten (10k, 25k, 50k, …). */
function achsenSchritt(maximum: number): number {
  const schritte = [1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000]
  return schritte.find((s) => s * 4 >= maximum) ?? Math.ceil(maximum / 4)
}

export function PrognoseDiagramm({ prognosen, gewaehlt, zielBetrag }: Props) {
  const verlauf = gewaehlt.verlauf
  const anzahl = verlauf.length - 1
  const maximum = Math.max(zielBetrag, ...prognosen.flatMap((p) => p.verlauf.map((v) => v.wert)))
  const schritt = achsenSchritt(maximum * 1.05)
  const oben = schritt * 4

  const x = (i: number) => LINKS + (i / Math.max(anzahl, 1)) * (RECHTS - LINKS)
  const y = (wert: number) => UNTEN - (wert / oben) * (UNTEN - OBEN)
  const linie = (p: Prognose) => p.verlauf.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v.wert).toFixed(1)}`).join(' ')

  // Jahresmarken: Januar jedes Jahres, bei langen Zeiträumen nur jedes 2. oder 5. Jahr
  const januare = verlauf.map((v, i) => ({ i, jahr: v.monat.slice(0, 4) })).filter((v) => v.i > 0 && verlauf[v.i].monat.endsWith('-01'))
  const abstand = januare.length > 12 ? 5 : januare.length > 6 ? 2 : 1
  const jahre = januare.filter((v) => Number(v.jahr) % abstand === 0)

  const erreichtIndex = gewaehlt.zielErreicht ? verlauf.findIndex((v) => v.monat === gewaehlt.zielErreicht) : -1
  const andere = prognosen.filter((p) => p.szenario !== gewaehlt.szenario)
  const beschreibung = gewaehlt.zielErreicht
    ? `Vermögen bis ${monatJahr(verlauf[anzahl].monat)} in drei Szenarien, ${gewaehlt.szenario} ${kurzEuro(zielBetrag)} im ${monatJahr(gewaehlt.zielErreicht)}`
    : `Vermögen bis ${monatJahr(verlauf[anzahl].monat)} in drei Szenarien, Ziel ${kurzEuro(zielBetrag)} wird nicht erreicht`

  return (
    <svg className="diagramm" viewBox="0 0 350 210" role="img" aria-label={beschreibung}>
      <g className="diagramm__achse">
        {[0, 1, 2, 3, 4].map((stufe) => (
          <g key={stufe}>
            <line x1={LINKS} x2={RECHTS} y1={y(stufe * schritt)} y2={y(stufe * schritt)} />
            <text x={LINKS - 6} y={y(stufe * schritt) + 3} textAnchor="end">
              {stufe === 0 ? '0' : kurzEuro(stufe * schritt)}
            </text>
          </g>
        ))}
        {jahre.map((j) => (
          <text key={j.jahr} x={x(j.i)} y={205} textAnchor="middle">
            {j.jahr.slice(2)}
          </text>
        ))}
      </g>

      <line className="diagramm__ziel" x1={LINKS} x2={RECHTS} y1={y(zielBetrag)} y2={y(zielBetrag)} />
      {andere.map((p) => (
        <path key={p.szenario} className="diagramm__andere" d={linie(p)} />
      ))}
      <path className="diagramm__flaeche" d={`${linie(gewaehlt)} L${RECHTS} ${UNTEN} L${LINKS} ${UNTEN} Z`} />
      <path className="diagramm__gewaehlt" d={linie(gewaehlt)} />

      <rect className="diagramm__heute" x={LINKS - 6} y={y(verlauf[0].wert) - 6} width="12" height="12" transform={`rotate(45 ${LINKS} ${y(verlauf[0].wert)})`} />
      <text className="diagramm__beschriftung" x={LINKS + 12} y={Math.min(y(verlauf[0].wert) + 17, UNTEN - 4)}>
        heute {kurzEuro(verlauf[0].wert)}
      </text>

      {erreichtIndex > 0 && (
        <>
          <circle className="diagramm__erreicht" cx={x(erreichtIndex)} cy={y(zielBetrag)} r="6" />
          <text
            className="diagramm__beschriftung diagramm__beschriftung--gut"
            x={x(erreichtIndex) - 5}
            y={y(zielBetrag) - 9}
            textAnchor="end"
          >
            {monatJahr(gewaehlt.zielErreicht!).replace(/ \d\d(\d\d)$/, ' $1')}
          </text>
        </>
      )}
    </svg>
  )
}
