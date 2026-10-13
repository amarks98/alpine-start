import { z } from 'zod'
import { isPlanDate } from './dates'
import type { Segment } from '@/lib/engine'

export const terrainSchema = z.enum(['trail', 'offtrail', 'pitches', 'rappels'])
export const phaseSchema = z.enum(['ascent', 'descent'])

/** Validation for persisted segment JSON. */
export const segmentSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().max(120),
  terrain: terrainSchema,
  phase: phaseSchema,
  km: z.number().min(0).max(200).optional(),
  vertM: z.number().min(0).max(10_000).optional(),
  count: z.number().int().min(0).max(200).optional(),
  grade: z.string().max(20).optional(),
  exposed: z.boolean().optional(),
})

/** Drafts may be saved, but incomplete measurements must never produce a recommendation. */
export function segmentProblems(segment: Segment): string[] {
  const parsed = segmentSchema.safeParse(segment)
  if (!parsed.success) return ['Use valid, non-negative measurements within the field limits.']
  const problems: string[] = []
  if (!segment.label.trim()) problems.push('Give this segment a name.')
  if (segment.terrain === 'trail' || segment.terrain === 'offtrail') {
    if (segment.km === undefined) problems.push('Enter distance in km.')
    if (segment.vertM === undefined) problems.push('Enter vertical change in m (0 for flat ground).')
  } else if (segment.count !== undefined && segment.count < 1) {
    problems.push('Enter at least one pitch or rappel.')
  }
  return problems
}

export const segmentsSchema = z.array(segmentSchema).max(80)

export const savePayloadSchema = z.object({
  date: z.string().refine(isPlanDate, 'Choose a complete, valid plan date.'),
  description: z.string().max(20000).default(''),
  segments: segmentsSchema,
  partySize: z.number().int().min(1).max(20),
  stormCutoffMin: z.number().int().min(0).max(1439),
  marginMin: z.number().int().min(0).max(600),
})

export type SavePayload = z.infer<typeof savePayloadSchema>

/** Validate coordinates before tzlookup, which throws on invalid ranges. */
export const createRouteSchema = z.object({
  name: z.string().trim().min(1, 'Give the route a name').max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  elevM: z.number().int().min(-500).max(9000),
})

/** '37.0947, -118.5100' — what CalTopo and Google Maps hand you. */
export function parseCoordinates(input: string): { lat: number; lng: number } | null {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(input)
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

/** A route as it comes back from Postgres. */
export type RouteRow = {
  id: string
  name: string
  lat: number
  lng: number
  elev_m: number
  timezone: string
  segments: Segment[]
  party_size: number
  storm_cutoff_min: number
  margin_min: number
  plan_date: string | null
  description: string
  created_at: string
}

export const ROUTE_COLUMNS =
  'id, name, lat, lng, elev_m, timezone, segments, party_size, storm_cutoff_min, margin_min, plan_date, description, created_at'
