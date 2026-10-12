import { expect, it } from 'vitest'
import { parseRouteProse, PROSE_EXAMPLE } from './prose'

it('parses walking, grade letters and exposed rope work in route order', () => {
  const result = parseRouteProse(PROSE_EXAMPLE)
  expect(result.errors).toEqual([])
  expect(result.segments).toHaveLength(4)
  expect(result.segments[0]).toMatchObject({ label: 'Approach', terrain: 'trail', km: 5, vertM: 1000 })
  expect(result.segments[1]).toMatchObject({ terrain: 'pitches', count: 2, grade: '5.10b', exposed: true })
  expect(result.segments[2]).toMatchObject({ terrain: 'rappels', phase: 'descent', count: 3 })
})

it('does not apply a partially understood or incomplete route', () => {
  for (const text of ['', 'Approach: ascend trail 5 km.', 'Ridge: ascend and descend 2 pitches.',
    'Approach: ascend trail -5 km gaining 10 m.', 'Rappels: descend 1.5 rappels.']) {
    const result = parseRouteProse(text)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.segments).toEqual([])
  }
})

it('defaults omitted counts to one and respects not exposed', () => {
  const result = parseRouteProse('Ridge: ascend pitches at 5.9, not exposed.\nReturn: descend off-trail 2 km losing 500 m.')
  expect(result.errors).toEqual([])
  expect(result.segments[0]).toMatchObject({ count: 1, exposed: false })
  expect(result.segments[1]).toMatchObject({ terrain: 'offtrail', phase: 'descent' })
})
