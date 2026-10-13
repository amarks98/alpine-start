import { expect, it } from 'vitest'
import { segmentProblems } from './validation'
import type { Segment } from './engine'
const trail: Segment = { id: 'test', label: 'Approach', terrain: 'trail', phase: 'ascent', km: 2, vertM: 0 }
it('requires explicit walking measurements but accepts flat ground', () => {
  expect(segmentProblems(trail)).toEqual([])
  expect(segmentProblems({ ...trail, km: undefined })).toContain('Enter distance in km.')
  expect(segmentProblems({ ...trail, vertM: undefined })).toHaveLength(1)
})
it('rejects negative measurements and zero rope counts while retaining the one-pitch default', () => {
  expect(segmentProblems({ ...trail, km: -1 })).toHaveLength(1)
  expect(segmentProblems({ ...trail, terrain: 'pitches', count: 0 })).toHaveLength(1)
  expect(segmentProblems({ ...trail, terrain: 'pitches' })).toEqual([])
})
