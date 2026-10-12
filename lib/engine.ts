/**
 * The planner. Pure — no Next.js, no Supabase, no React. Runs in the browser on
 * every change, which is why it has to stay this way.
 *
 * Everything is in LOCAL MINUTES SINCE MIDNIGHT. 14:00 is 840. A negative value
 * is the previous evening. This keeps timezone arithmetic out of the hot path:
 * the only conversions happen in `toLocalMinutes` and `utcOffsetMinutes`.
 */

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

/**
 * The engine runs on every keystroke, so a half-typed field is not an edge case
 * — it is every single edit. A cleared number input is '' / NaN, and one NaN
 * would render the entire panel as NaN:NaN mid-typing. So coerce here, at the
 * boundary. zod guards persistence; this guards arithmetic.
 */
export const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

// ---------------------------------------------------------------- time models

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

// -------------------------------------------------------------- YDS  grades

const YDS = /^5\.(\d{1,2})\s*([abcd])?(?:\s*\/\s*[abcd])?\s*([+-])?$/i
const LETTER = { a: 0, b: 0.25, c: 0.5, d: 0.75 } as const

/**
 * YDS grade as a comparable number: the decimal after "5.", plus a fraction for
 * the letter or sign. Letters order within a number, signs order around it.
 *
 *   5.8- → 7.75 · 5.9 → 9 · 5.9+ → 9.25 · 5.10a → 10 · 5.10d → 10.75 · 5.11a → 11
 *
 * A three-band lookup over the raw string would be silently wrong and dangerous:
 * lexicographically '5.10a' < '5.6', because '1' < '6'. That prices a 5.10a pitch
 * at 30 minutes instead of 60.
 */
export function gradeValue(grade?: string): number | null {
  const m = YDS.exec((grade ?? '').trim())
  if (!m) return null // '', '4th class', 'A1', undefined
  const letter = m[2]?.toLowerCase() as keyof typeof LETTER | undefined
  const frac = letter ? LETTER[letter] : m[3] === '+' ? 0.25 : m[3] === '-' ? -0.25 : 0
  return Number(m[1]) + frac
}

/**
 * Minutes per pitch, by band. The letter never changes the band — a through d all
 * sit in 5.10+ — but `gradeValue` is the comparable the UI validates with and the
 * seam Phase 2 needs when pitch times get finer than three bands.
 *
 * The fallback is the MIDDLE band, not the fast one. The errors are not
 * symmetric: underestimating makes you leave too late, which is the failure this
 * product exists to prevent. Round toward the slower estimate when parsing fails.
 */
export function pitchMinutes(grade?: string): { minutes: number; assumed: boolean } {
  const v = gradeValue(grade)
  if (v === null) return { minutes: PITCH_MIN.mid, assumed: true }
  return {
    minutes: v <= 6 ? PITCH_MIN.easy : v < 10 ? PITCH_MIN.mid : PITCH_MIN.hard,
    assumed: false,
  }
}

// ------------------------------------------------------------ segment timing

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

// --------------------------------------------------------------- timezones

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

/**
 * Minutes east of UTC for `tz` on `date` — the unit suncalc's `utcOffset` wants.
 *
 * Fixed point: probe at 12:00Z, correct the instant, re-read. One pass converges
 * for every real zone and removes the DST-boundary ambiguity that reading a
 * fixed UTC instant would have.
 */
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

// ---------------------------------------------------------------- daylight

export type Daylight = {
  sunriseMin: number | null
  duskMin: number | null
  alwaysUp: boolean
  alwaysDown: boolean
}

/**
 * Nautical dusk (−12°) and sunrise, in local minutes.
 *
 * Two suncalc parameters matter here:
 *   `utcOffset` (minutes east of UTC) returns exactly the local CALENDAR day
 *     containing `date`, rather than the solar day from one nadir to the next.
 *   `height` (metres) is applied to every named time's angle, not just
 *     sunrise/sunset, so dusk does account for the route's elevation.
 *
 * suncalc returns `null` — not Invalid Date — when the sun never reaches an
 * angle that day. Unguarded that is a TypeError in a client component on every
 * keystroke, so the nulls are propagated deliberately and handled in buildPlan.
 */
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

// ------------------------------------------------------------------- plan

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

/**
 * The invariant that drives this:
 *
 *   The DARK constraint depends on the route's TOTAL time, which is
 *   order-independent. The STORM constraint depends on the time elapsed UP TO A
 *   POINT in the route, which is order-dependent.
 *
 * So the storm term is a prefix sum to a cutoff anchor, not a phase sum. On an
 * interleaved traverse those differ by every descent minute before the anchor,
 * and a phase sum would print a summit time the clock column contradicts.
 */
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

// ---------------------------------------------------------------- formatting

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

/**
 * 'YYYY-MM-DD' for `now` shifted by `dayOffset` days, in `tz`. Takes `now` as an
 * argument so it stays pure — the server computes the editor's default date and
 * passes it down as a prop, which keeps SSR and hydration in agreement.
 */
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
