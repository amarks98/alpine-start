import { z } from 'zod'
import { isPlanDate } from './dates'
import type { Segment } from '@/lib/engine'

export const terrainSchema = z.enum(['trail', 'offtrail', 'pitches', 'rappels'])
export const phaseSchema = z.enum(['ascent', 'descent'])

/**
 * The persistence contract for the jsonb column. The engine coerces its own
 * inputs, so this is not protecting arithmetic — it is stopping a stale or
 * hostile client from corrupting the column.
 */
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

/**
 * Coordinates are validated BEFORE tzlookup() sees them: tz-lookup throws on
 * NaN or out-of-range input, and it is the only input path that can crash
 * createRoute.
 */
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
