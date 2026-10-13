import { expect, it } from 'vitest'
import { applyDrafts, draftProblems, extractDrafts, localDrafts, type SegmentDraft } from './translation'
import { isConstrainedProse, parseRouteProse, PROSE_EXAMPLE } from './prose'

const description = 'Hike 3 miles uphill gaining 2000 feet on a sheltered trail.'
const extracted = { label: 'Approach', source: description, terrain: 'trail', phase: 'ascent',
  distance: { value: 3, unit: 'mi' }, vertical: { value: 2000, unit: 'ft' }, count: null, grade: null, exposed: false }
const draft: SegmentDraft = { label: 'Approach', source: description, terrain: 'trail', phase: 'ascent',
  km: 4.828, vertM: 609.6, count: null, grade: null, exposed: false }

it('converts original imperial units deterministically and preserves zero', () => {
  expect(extractDrafts({ segments: [extracted] }, description)[0]).toMatchObject({ km: 4.828, vertM: 609.6 })
  expect(extractDrafts({ segments: [{ ...extracted, distance: { value: 0, unit: 'm' }, vertical: { value: 0, unit: 'm' } }] }, description)[0])
    .toMatchObject({ km: 0, vertM: 0 })
})
it('keeps missing fields null and blocks application until reviewed', () => {
  const missing = { ...draft, km: null, vertM: null, phase: null, exposed: null }
  expect(draftProblems(missing)).toHaveLength(4)
  expect(() => applyDrafts([missing])).toThrow()
  expect(applyDrafts([draft])[0]).toMatchObject({ km: 4.828, vertM: 609.6, exposed: false })
})
it('defaults omitted rope counts to one, keeps letter grades and uses fresh IDs', () => {
  const rope = { ...draft, terrain: 'pitches' as const, km: null, vertM: null, grade: '5.10b' }
  const segments = applyDrafts([rope, rope])
  expect(segments[0]).toMatchObject({ count: 1, grade: '5.10b' })
  expect(segments[0]?.id).not.toBe(segments[1]?.id)
  expect(segments[0]).not.toHaveProperty('km')
})
it('rejects invalid values, unsupported output and fabricated source text', () => {
  for (const patch of [{ distance: { value: -1, unit: 'mi' } }, { source: 'invented' },
    { terrain: 'skiing' }, { terrain: 'rappels', phase: 'ascent' }, { distance: { value: 201, unit: 'km' } }]) {
    expect(() => extractDrafts({ segments: [{ ...extracted, ...patch }] }, description)).toThrow()
  }
  expect(() => applyDrafts([{ ...draft, count: 0 }])).toThrow()
  expect(() => applyDrafts([])).toThrow()
})
it('does not silently use the free parser on a multi-leg paragraph', () => {
  expect(isConstrainedProse(PROSE_EXAMPLE)).toBe(true)
  expect(isConstrainedProse('Approach: ascend 3 km trail gaining 500 m then climb 3 pitches at 5.8.')).toBe(false)
  expect(isConstrainedProse('Ridge: ascend 2 pitches at 5.8 then ascend 3 pitches at 5.10b.')).toBe(false)
})
it('free parser also requires review of unspecified exposure', () => {
  const drafts = localDrafts(parseRouteProse(PROSE_EXAMPLE).segments, PROSE_EXAMPLE)
  expect(drafts[0]?.exposed).toBeNull()
  expect(drafts[1]?.exposed).toBe(true)
  expect(() => applyDrafts(drafts)).toThrow()
})
