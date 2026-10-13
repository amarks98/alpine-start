/** Pure planner using local minutes since midnight; negative times refer to earlier days. */

import { getTimes } from 'suncalc'
import { isPlanDate } from './dates'

export type Terrain = 'trail' | 'offtrail' | 'pitches' | 'rappels'
export type Phase = 'ascent' | 'descent'

export type Segment = {
  id: string
  label: string
  terrain: Terrain
  phase: Phase
  km?: number // trail, offtrail
  vertM?: number // trail, offtrail
  count?: number // pitches, rappels — defaults to 1
  grade?: string // pitches — YDS
  exposed?: boolean // the storm deadline applies through this segment
}

/** Phase 2 calibration seam: a per-terrain multiplier learned from logged trips. */
export type TerrainFactors = Partial<Record<Terrain, number>>

/** Coerce partial numeric edits to keep NaN out of live calculations. */
export const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

// Time models

/** Munter rates. Assumed defaults, labelled as such in the UI. */
const MUNTER: Record<'trail' | 'offtrail', Record<Phase, number>> = {
  trail: { ascent: 4, descent: 6 },
  offtrail: { ascent: 2, descent: 3 },
}

const RAPPEL_MIN = 15
const PITCH_MIN = { easy: 30, mid: 45, hard: 60 } as const

/** Rope work scales with party size; walking does not. */
export const partyFactor = (partySize: number): number =>
  1 + 0.5 * Math.max(0, num(partySize, 2) - 2)

// Yds  grades

const YDS = /^5\.(\d{1,2})\s*([abcd])?(?:\s*\/\s*[abcd])?\s*([+-])?$/i
const LETTER = { a: 0, b: 0.25, c: 0.5, d: 0.75 } as const

/** Parse numeric YDS grades plus letter/sign offsets so 5.9 sorts before 5.10a. */
export function gradeValue(grade?: string): number | null {
  const m = YDS.exec((grade ?? '').trim())
  if (!m) return null // '', '4th class', 'A1', undefined
  const letter = m[2]?.toLowerCase() as keyof typeof LETTER | undefined
  const frac = letter ? LETTER[letter] : m[3] === '+' ? 0.25 : m[3] === '-' ? -0.25 : 0
  return Number(m[1]) + frac
}

/** Grade bands determine pitch times; unreadable grades use the middle band (45 min). */
export function pitchMinutes(grade?: string): { minutes: number; assumed: boolean } {
  const v = gradeValue(grade)
  if (v === null) return { minutes: PITCH_MIN.mid, assumed: true }
  return {
    minutes: v <= 6 ? PITCH_MIN.easy : v < 10 ? PITCH_MIN.mid : PITCH_MIN.hard,
    assumed: false,
  }
}

// Segment timing

export function segmentMinutes(
  seg: Segment,
  partySize: number,
  factors?: TerrainFactors,
): number {
  const factor = num(factors?.[seg.terrain], 1)

  switch (seg.terrain) {
    case 'trail':
    case 'offtrail': {
      const units = num(seg.km) + num(seg.vertM) / 100
      const rate = MUNTER[seg.terrain][seg.phase]
      return (units / rate) * 60 * factor
    }
    case 'pitches':
      return num(seg.count, 1) * pitchMinutes(seg.grade).minutes * partyFactor(partySize) * factor
    case 'rappels':
      return num(seg.count, 1) * RAPPEL_MIN * partyFactor(partySize) * factor
  }
}

// Timezones

/** An instant → local minutes since midnight in `tz`. */
export function toLocalMinutes(d: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0')
  return get('hour') * 60 + get('minute')
}

/** Date-specific minutes east of UTC, corrected from a noon probe for the local date. */
export function utcOffsetMinutes(date: string, tz: string): number {
  const read = (at: Date) => {
    const name =
      new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
        .formatToParts(at)
        .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00'
    const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name)
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0
  }
  const noonUtc = Date.parse(`${date}T12:00:00Z`)
  return read(new Date(noonUtc - read(new Date(noonUtc)) * 60_000))
}

// Daylight

export type Daylight = {
  sunriseMin: number | null
  duskMin: number | null
  alwaysUp: boolean
  alwaysDown: boolean
}

/** Local sunrise and nautical dusk (−12°). Pass elevation and calendar-day UTC offset;
 * preserve null times for polar conditions. */
export function daylight(
  date: string,
  tz: string,
  lat: number,
  lng: number,
  elevM: number,
): Daylight {
  if (!isPlanDate(date)) throw new Error('Choose a complete, valid plan date.')
  const offset = utcOffsetMinutes(date, tz)
  const localNoonUtc = new Date(Date.parse(`${date}T12:00:00Z`) - offset * 60_000)
  const t = getTimes(localNoonUtc, lat, lng, Math.max(0, num(elevM)), offset)

  return {
    sunriseMin: t.sunrise ? toLocalMinutes(t.sunrise, tz) : null,
    duskMin: t.nauticalDusk ? toLocalMinutes(t.nauticalDusk, tz) : null,
    alwaysUp: t.alwaysUp === true,
    alwaysDown: t.alwaysDown === true,
  }
}

// Plan

export type PlanInput = {
  date: string // 'YYYY-MM-DD', local to the route
  timezone: string // IANA, from the route row
  lat: number
  lng: number
  elevM: number
  segments: Segment[]
  partySize: number
  stormCutoffMin: number // 14:00 = 840
  marginMin: number // required, never optional — 60 at the call site
  factors?: TerrainFactors
}

export type SegmentPlan = {
  segmentId: string
  label: string
  minutes: number
  startMin: number
  endMin: number
  assumedGrade: boolean
}

export type Warning = 'bivy' | 'no-dusk' | 'polar-day' | 'polar-night' | 'assumed-grade'

export type Plan = {
  segments: SegmentPlan[]
  startMin: number // negative = the previous evening
  turnaroundMin: number
  binding: 'storm' | 'dark'
  upMinutes: number
  downMinutes: number
  totalMinutes: number
  remainingMinutes: number
  anchorLabel: string | null
  anchorSegmentId: string | null
  sunriseMin: number | null
  duskMin: number | null
  headlampMin: number
  warnings: Warning[]
}

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0)

/** Storm timing uses elapsed time through the checkpoint; darkness uses total duration.
 * A phase sum would omit descents before the checkpoint on interleaved traverses. */
export function buildPlan(input: PlanInput): Plan {
  const { segments, partySize, stormCutoffMin, marginMin, factors } = input

  const mins = segments.map((s) => segmentMinutes(s, partySize, factors))
  const totalMinutes = sum(mins)
  const upMinutes = sum(mins.filter((_, i) => segments[i]?.phase === 'ascent'))
  const downMinutes = sum(mins.filter((_, i) => segments[i]?.phase === 'descent'))

  // Explicit `exposed` flags win; otherwise the last ascent segment, which
  // reproduces there-and-back behaviour exactly.
  const lastFlagged = segments.reduce((last, s, i) => (s.exposed ? i : last), -1)
  const anchor =
    lastFlagged >= 0
      ? lastFlagged
      : segments.reduce((last, s, i) => (s.phase === 'ascent' ? i : last), -1)
  const throughAnchor = anchor < 0 ? 0 : sum(mins.slice(0, anchor + 1))

  const { sunriseMin, duskMin, alwaysUp, alwaysDown } = daylight(
    input.date,
    input.timezone,
    input.lat,
    input.lng,
    input.elevM,
  )

  const lastLightMin = duskMin === null ? null : duskMin - marginMin

  const startStorm = stormCutoffMin - throughAnchor
  const startDark = lastLightMin === null ? null : lastLightMin - totalMinutes

  const startMin = startDark === null ? startStorm : Math.min(startStorm, startDark)
  const binding: 'storm' | 'dark' =
    startDark === null || startStorm <= startDark ? 'storm' : 'dark'

  // At the named checkpoint, use the ordered remainder of the route, including
  // any further ascent. A phase sum includes earlier descents and misses later climbs.
  const remainingMinutes = sum(mins.slice(anchor + 1))
  const turnaroundDark = lastLightMin === null ? null : lastLightMin - remainingMinutes
  const turnaroundMin =
    turnaroundDark === null ? stormCutoffMin : Math.min(stormCutoffMin, turnaroundDark)

  // One forward pass, so the clock column and the headline cannot disagree.
  let cursor = startMin
  const segmentPlans: SegmentPlan[] = segments.map((s, i) => {
    const minutes = mins[i] ?? 0
    const startAt = cursor
    cursor += minutes
    return {
      segmentId: s.id,
      label: s.label,
      minutes,
      startMin: startAt,
      endMin: cursor,
      assumedGrade: s.terrain === 'pitches' && pitchMinutes(s.grade).assumed,
    }
  })

  const warnings: Warning[] = []
  if (startMin < 0) warnings.push('bivy')
  if (duskMin === null) warnings.push('no-dusk')
  if (alwaysUp) warnings.push('polar-day')
  if (alwaysDown) warnings.push('polar-night')
  if (segmentPlans.some((s) => s.assumedGrade)) warnings.push('assumed-grade')

  return {
    segments: segmentPlans,
    startMin,
    turnaroundMin,
    binding,
    upMinutes,
    downMinutes,
    totalMinutes,
    remainingMinutes,
    anchorLabel: segments[anchor]?.label ?? null,
    anchorSegmentId: anchor < 0 ? null : (segments[anchor]?.id ?? null),
    sunriseMin,
    duskMin,
    headlampMin: sunriseMin === null ? 0 : Math.max(0, sunriseMin - startMin),
    warnings,
  }
}

// Formatting

/** Local minutes → 'HH:MM', wrapping negatives into the previous day. */
export function formatClock(min: number): string {
  const m = (((Math.round(min) % 1440) + 1440) % 1440)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** How many days `min` sits from the plan date. -1 is the previous evening. */
export function dayOffset(min: number): number {
  return Math.floor(Math.round(min) / 1440)
}

/** Minutes → '3h 45m'. */
export function formatDuration(min: number): string {
  const total = Math.round(Math.max(0, min))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Route-local date shifted by dayOffset; the server supplies it to avoid hydration drift. */
export function dateInZone(now: Date, tz: string, dayOffset = 0): string {
  const local = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const shifted = new Date(`${local}T00:00:00Z`)
  shifted.setUTCDate(shifted.getUTCDate() + dayOffset)
  return shifted.toISOString().slice(0, 10)
}
