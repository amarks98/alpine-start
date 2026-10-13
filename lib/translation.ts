import { z } from 'zod'
import type { Segment } from './engine'
import { terrainSchema, phaseSchema, segmentsSchema } from './validation'

export const MAX_DESCRIPTION = 8000
export const MAX_DRAFTS = 20

export const draftSchema = z.object({
  label: z.string().trim().min(1).max(120),
  source: z.string().min(1).max(MAX_DESCRIPTION),
  terrain: terrainSchema.nullable(),
  phase: phaseSchema.nullable(),
  km: z.number().min(0).max(200).nullable(),
  vertM: z.number().min(0).max(10000).nullable(),
  count: z.number().int().min(1).max(200).nullable(),
  grade: z.string().max(20).nullable(),
  exposed: z.boolean().nullable(),
})
export const draftsSchema = z.array(draftSchema).min(1).max(MAX_DRAFTS)
export type SegmentDraft = z.infer<typeof draftSchema>

// Retain original units until validation; conversions are deterministic, not model arithmetic.
export const extractionSchema = z.object({ segments: z.array(draftSchema.omit({ km: true, vertM: true }).extend({
  distance: z.object({ value: z.number().min(0).max(200000), unit: z.enum(['km', 'm', 'mi', 'ft']) }).nullable(),
  vertical: z.object({ value: z.number().min(0).max(40000), unit: z.enum(['m', 'ft']) }).nullable(),
})).min(1).max(MAX_DRAFTS) })

const normalized = (s: string) => s.replace(/\s+/g, ' ').trim()
export function extractDrafts(value: unknown, description: string): SegmentDraft[] {
  const result = extractionSchema.parse(value)
  const input = normalized(description)
  const factors = { km: 1, m: 0.001, mi: 1.609344, ft: 0.0003048 }
  return draftsSchema.parse(result.segments.map(({ distance, vertical, ...s }) => {
    if (!input.includes(normalized(s.source))) throw new Error('Unmatched source text')
    if (s.terrain === 'rappels' && s.phase === 'ascent') throw new Error('Rappels cannot ascend')
    return { ...s, km: distance ? Number((distance.value * factors[distance.unit]).toFixed(4)) : null,
      vertM: vertical ? Number((vertical.value * (vertical.unit === 'ft' ? 0.3048 : 1)).toFixed(2)) : null }
  }))
}

export function draftProblems(draft: SegmentDraft): string[] {
  const problems: string[] = []
  const checked = draftSchema.safeParse(draft)
  if (!checked.success) return ['Check the name and numeric ranges.']
  if (!draft.terrain) problems.push('Choose terrain.')
  if (!draft.phase) problems.push('Choose direction.')
  if (draft.exposed === null) problems.push('Choose whether the segment is exposed.')
  if (draft.terrain === 'trail' || draft.terrain === 'offtrail') {
    if (draft.km === null) problems.push('Enter distance in km.')
    if (draft.vertM === null) problems.push('Enter vertical change in m (0 for flat).')
  }
  if (draft.terrain === 'rappels' && draft.phase === 'ascent') problems.push('Rappels must descend.')
  return problems
}

export function applyDrafts(drafts: SegmentDraft[]): Segment[] {
  draftsSchema.parse(drafts)
  if (drafts.some(d => draftProblems(d).length)) throw new Error('Complete all missing details before applying.')
  return segmentsSchema.parse(drafts.map((d) => ({
    id: crypto.randomUUID(), label: d.label, terrain: d.terrain!, phase: d.phase!, exposed: d.exposed!,
    ...(d.terrain === 'trail' || d.terrain === 'offtrail'
      ? { km: d.km!, vertM: d.vertM! }
      : { count: d.count ?? 1, ...(d.terrain === 'pitches' && d.grade ? { grade: d.grade } : {}) }),
  })))
}

export function localDrafts(segments: Segment[], description: string): SegmentDraft[] {
  const lines = description.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  return segments.map((s, i) => ({ label: s.label, source: lines[i]!, terrain: s.terrain, phase: s.phase,
    km: s.km ?? null, vertM: s.vertM ?? null, count: s.count ?? null, grade: s.grade ?? null,
    exposed: s.exposed ? true : /\b(?:not exposed|unexposed)\b/i.test(lines[i]!) ? false : null }))
}
