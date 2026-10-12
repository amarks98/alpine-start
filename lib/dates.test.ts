import { expect, it } from 'vitest'
import { isPlanDate } from './dates'

it('rejects cleared, partial and impossible dates while accepting leap days', () => {
  for (const value of ['', '2026-07-', '2026-02-29', '2026-04-31', '2026-13-01']) {
    expect(isPlanDate(value)).toBe(false)
  }
  expect(isPlanDate('2026-07-15')).toBe(true)
  expect(isPlanDate('2028-02-29')).toBe(true)
})
