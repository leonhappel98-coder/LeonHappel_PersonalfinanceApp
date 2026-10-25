// Backup speichern und wiederherstellen.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { analysiereDatei } from '../engine'
import { backupDateiname, erstelleBackup, leseBackup } from './backup'
import type { Gespeichert } from './speicher'

const inhalt = readFileSync(new URL('../../testdata/kontoexport_alex_finanzguru.xlsx', import.meta.url))
const analyse = analysiereDatei(inhalt.buffer.slice(inhalt.byteOffset, inhalt.byteOffset + inhalt.byteLength) as ArrayBuffer)

const stand: Gespeichert = {
  version: 1,
  analyse,
  dateiname: 'kontoexport_alex_finanzguru.xlsx',
  istDemo: true,
  schaetzung: 1000,
  ziel: { depot: 31_800, tagesgeld: 2_400, sparrateProMonat: 420, zielBetrag: 100_000, zielMonat: '2030-07', geburtsjahr: 1997 },
  erledigt: ['handytarif'],
  budgets: { 'Essen & Trinken': 450 },
  checkins: [{ datum: '2026-09-30', depot: 30_950 }],
}

describe('Backup', () => {
  it('speichern und wiederherstellen ergibt genau denselben Stand', () => {
    expect(leseBackup(erstelleBackup(stand))).toEqual(stand)
  })

  it('Dateiname mit Datum', () => {
    expect(backupDateiname(new Date('2026-10-25T12:00:00Z'))).toBe('loewen-finance-backup-2026-10-25.json')
  })

  it.each([
    ['kein JSON', 'Hallo'],
    ['fremdes JSON', '{"name":"irgendwas"}'],
    ['falsche Version', JSON.stringify({ app: 'loewen-finance-backup', daten: { ...stand, version: 2 } })],
  ])('lehnt %s ab', (_, text) => {
    expect(() => leseBackup(text)).toThrow('keine Backup-Datei von Löwen Finance')
  })
})
