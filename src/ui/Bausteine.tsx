import { useEffect, useState } from 'react'
import './ui.css'

/** Kleines „DEMO“-Label, wenn Beispieldaten geladen sind. */
export function DemoLabel() {
  return (
    <span className="demo" title="Beispieldaten">
      DEMO
    </span>
  )
}

type BalkenProps = {
  /** 0 bis 1 */
  anteil: number
  grau?: boolean
  dick?: boolean
  /** Für Screenreader, z. B. „Essen & Trinken: 520 €“ */
  beschriftung?: string
}

/** Balken, der beim Erscheinen von 0 auf seinen Wert wächst. */
export function Balken({ anteil, grau, dick, beschriftung }: BalkenProps) {
  const [breite, setBreite] = useState(0)
  useEffect(() => {
    const bild = requestAnimationFrame(() => setBreite(Math.max(0, Math.min(1, anteil))))
    return () => cancelAnimationFrame(bild)
  }, [anteil])
  return (
    <div className={dick ? 'balken balken--dick' : 'balken'} role={beschriftung ? 'img' : undefined} aria-label={beschriftung} aria-hidden={beschriftung ? undefined : true}>
      <div className={grau ? 'balken__fuellung balken__fuellung--grau' : 'balken__fuellung'} style={{ width: `${breite * 100}%` }} />
    </div>
  )
}

// ---------- Icons (aus der Design-Vorlage) ----------

const strich = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function IconDatei() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" strokeWidth="1.9" {...strich} aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M12 17v-6" />
      <path d="M9.5 13.5L12 11l2.5 2.5" />
    </svg>
  )
}

export function IconSchloss() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="1.9" {...strich} stroke="var(--gut)" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function IconZurueck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="2" {...strich} aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export function IconFertig() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="2.2" {...strich} stroke="var(--gut)" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  )
}

export function IconLaeuft() {
  return (
    <svg className="icon-laeuft" width="20" height="20" viewBox="0 0 24 24" strokeWidth="2.2" fill="none" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="var(--linie)" />
      <path d="M12 3a9 9 0 0 1 9 9" stroke="var(--akzent)" />
    </svg>
  )
}

export function IconOffen() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="2.2" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="var(--linie)" />
    </svg>
  )
}

export function IconZahnrad() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="1.8" {...strich} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}

export function IconHeute() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="1.9" {...strich} aria-hidden="true">
      <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  )
}

export function IconPrognose() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="1.9" {...strich} aria-hidden="true">
      <path d="M3 20h18" />
      <path d="M4 16l5-5 4 3 7-8" />
      <path d="M16 6h4v4" />
    </svg>
  )
}
