import { describe, expect, it } from 'vitest'
import { APP_NAME, EINMALEFFEKT_SCHWELLE } from './config'

describe('config', () => {
  it('hat einen App-Namen', () => {
    expect(APP_NAME.trim()).not.toBe('')
  })

  it('zählt Ausgaben ab 300 € als Einmaleffekt (RECHENKERN.md, Abschnitt 4)', () => {
    expect(EINMALEFFEKT_SCHWELLE).toBe(300)
  })
})
