import { describe, expect, it } from 'vitest'
import {
  buildPlan,
  daylight,
  gradeValue,
  pitchMinutes,
  segmentMinutes,
  toLocalMinutes,
  utcOffsetMinutes,
  type PlanInput,
  type Segment,
} from './engine'
import { SAMPLE_ROUTE } from './sample-route'

// The Palisades, for anything that needs a real place.
const PALISADES = {
  timezone: 'America/Los_Angeles',
  lat: 37.0947,
  lng: -118.51,
  elevM: 4273,
}

const seg = (s: Partial<Segment> & Pick<Segment, 'id' | 'terrain' | 'phase'>): Segment => ({
  label: s.id,
  ...s,
})

const base: Omit<PlanInput, 'segments'> = {
  date: '2026-07-15',
  ...PALISADES,
  partySize: 2,
  stormCutoffMin: 14 * 60, // 840
  marginMin: 60,
}

// 1 ─────────────────────────────────────────────────────────── Munter formula
describe('segmentMinutes', () => {
  it('prices 5 km with 1,000 m of trail ascent at 3.75 h', () => {
    const minutes = segmentMinutes(
      seg({ id: 'approach', terrain: 'trail', phase: 'ascent', km: 5, vertM: 1000 }),
      2,
    )
    // (5 + 1000/100) / 4 = 3.75 h
    expect(minutes).toBe(225)
  })

  it('applies the party factor to rope work only', () => {
    const pitches = seg({ id: 'p', terrain: 'pitches', phase: 'ascent', count: 4, grade: '5.8' })
    const walk = seg({ id: 'w', terrain: 'trail', phase: 'ascent', km: 5, vertM: 1000 })

    // 4 pitches x 45 min x (1 + 0.5 x 1) = 270
    expect(segmentMinutes(pitches, 3)).toBe(270)
    expect(segmentMinutes(pitches, 2)).toBe(180)
    // walking does not slow with party size
    expect(segmentMinutes(walk, 5)).toBe(segmentMinutes(walk, 2))
  })

  it('defaults a missing count to 1, and missing distances to 0', () => {
    expect(segmentMinutes(seg({ id: 'r', terrain: 'rappels', phase: 'descent' }), 2)).toBe(15)
    expect(segmentMinutes(seg({ id: 't', terrain: 'trail', phase: 'ascent' }), 2)).toBe(0)
    // a cleared input arrives as NaN on every keystroke — it must not poison the plan
    expect(
      segmentMinutes(seg({ id: 'n', terrain: 'pitches', phase: 'ascent', count: NaN }), 2),
    ).toBe(45)
  })

  it('accepts an explicit zero count', () => {
    expect(segmentMinutes(seg({ id: 'z', terrain: 'rappels', phase: 'descent', count: 0 }), 2)).toBe(0)
  })
})

// 2 ───────────────────────────────────────── the min() and binding constraint
describe('buildPlan — which deadline binds', () => {
  const upOnly = [
    seg({ id: 'up', terrain: 'trail', phase: 'ascent', km: 2, vertM: 1000 }), // 180
  ]

  it('is storm-bound when the cutoff is the earlier departure', () => {
    const plan = buildPlan({
      ...base,
      segments: [...upOnly, seg({ id: 'down', terrain: 'trail', phase: 'descent', km: 1, vertM: 300 })], // 40
    })
    expect(plan.binding).toBe('storm')
    expect(plan.startMin).toBe(840 - 180) // 11:00
  })

  it('is dark-bound when the day is long enough', () => {
    const plan = buildPlan({
      ...base,
      segments: [
        ...upOnly,
        seg({ id: 'down', terrain: 'trail', phase: 'descent', km: 40, vertM: 3000 }), // 700
      ],
    })
    const { duskMin } = daylight(base.date, base.timezone, base.lat, base.lng, base.elevM)
    expect(duskMin).not.toBeNull()

    const lastLight = duskMin! - base.marginMin
    expect(plan.binding).toBe('dark')
    expect(plan.startMin).toBe(lastLight - plan.totalMinutes)
    // and the dark-bound start is genuinely earlier than the storm-bound one
    expect(plan.startMin).toBeLessThan(840 - plan.upMinutes)
  })

  it('never reports a turnaround later than the storm cutoff', () => {
    const plan = buildPlan({
      ...base,
      segments: [...upOnly, seg({ id: 'down', terrain: 'trail', phase: 'descent', km: 1, vertM: 300 })],
    })
    // Derived from darkness alone this would be ~20:00 against a 14:00 cutoff —
    // a bail time later than the deadline the same panel calls binding.
    expect(plan.turnaroundMin).toBeLessThanOrEqual(base.stormCutoffMin)
  })

  it('warns about a bivy instead of printing a nonsense clock time', () => {
    const plan = buildPlan({
      ...base,
      segments: [seg({ id: 'huge', terrain: 'offtrail', phase: 'ascent', km: 20, vertM: 3000 })], // 1500
    })
    expect(plan.startMin).toBeLessThan(0)
    expect(plan.warnings).toContain('bivy')
  })
})

// 3 ──────────────────────────────────────────────────── timezone conversion
describe('timezones', () => {
  it('converts a known instant to local minutes in America/Los_Angeles', () => {
    // 2026-07-15T20:00:00Z is 13:00 PDT (UTC-7)
    expect(toLocalMinutes(new Date('2026-07-15T20:00:00Z'), 'America/Los_Angeles')).toBe(13 * 60)
    // 2026-01-15T20:00:00Z is 12:00 PST (UTC-8)
    expect(toLocalMinutes(new Date('2026-01-15T20:00:00Z'), 'America/Los_Angeles')).toBe(12 * 60)
  })

  it('reads the zone offset suncalc wants, in minutes east of UTC, across DST', () => {
    expect(utcOffsetMinutes('2026-07-15', 'America/Los_Angeles')).toBe(-420)
    expect(utcOffsetMinutes('2026-01-15', 'America/Los_Angeles')).toBe(-480)
    expect(utcOffsetMinutes('2026-06-15', 'UTC')).toBe(0)
    // a zone whose offset is not a whole hour, and one east of the line
    expect(utcOffsetMinutes('2026-11-10', 'Asia/Kathmandu')).toBe(345)
    // the US transition date itself: the fixed point reads local noon, so this
    // is MDT, not MST
    expect(utcOffsetMinutes('2026-03-08', 'America/Denver')).toBe(-360)
  })

  it('returns a dusk that accounts for elevation', () => {
    const low = daylight('2026-07-15', PALISADES.timezone, PALISADES.lat, PALISADES.lng, 0)
    const high = daylight('2026-07-15', PALISADES.timezone, PALISADES.lat, PALISADES.lng, 4273)
    expect(low.duskMin).not.toBeNull()
    expect(high.duskMin).not.toBeNull()
    // a higher observer sees the sun longer
    expect(high.duskMin!).toBeGreaterThan(low.duskMin!)
  })
})

// 4 ───────────────────────────────────────────────── YDS grades (the trap)
describe('YDS grades', () => {
  it('orders 5.9 below 5.10a, and letters within a number', () => {
    const ladder = ['5.8-', '5.8', '5.8+', '5.9', '5.9+', '5.10a', '5.10b', '5.10c', '5.10d', '5.11a']
    const values = ladder.map((g) => gradeValue(g)!)

    expect(values).toEqual([7.75, 8, 8.25, 9, 9.25, 10, 10.25, 10.5, 10.75, 11])
    for (let i = 1; i < values.length; i++) {
      expect(values[i]!).toBeGreaterThan(values[i - 1]!)
    }

    // the bug this exists to prevent: a raw string compare puts 5.10a below 5.6
    expect('5.10a' < '5.6').toBe(true)
    expect(gradeValue('5.10a')! > gradeValue('5.6')!).toBe(true)
  })

  it('bands grades, with fractional suffixes falling on the right side', () => {
    const minutes = (g?: string) => pitchMinutes(g).minutes
    expect(minutes('5.4')).toBe(30)
    expect(minutes('5.6')).toBe(30)
    expect(minutes('5.6+')).toBe(45)
    expect(minutes('5.7-')).toBe(45)
    expect(minutes('5.9')).toBe(45)
    expect(minutes('5.9+')).toBe(45)
    expect(minutes('5.10a')).toBe(60)
    expect(minutes('5.12d')).toBe(60)
    expect(minutes('5.10a/b')).toBe(60)
  })

  it('falls back to the middle band, flagged, when a grade will not parse', () => {
    for (const g of [undefined, '', '4th class', 'A1', 'scramble']) {
      expect(gradeValue(g)).toBeNull()
      expect(pitchMinutes(g)).toEqual({ minutes: 45, assumed: true })
    }
    expect(pitchMinutes('5.9').assumed).toBe(false)
  })

  it('surfaces an assumed grade as a plan warning', () => {
    const plan = buildPlan({
      ...base,
      segments: [seg({ id: 'p', terrain: 'pitches', phase: 'ascent', count: 2 })],
    })
    expect(plan.warnings).toContain('assumed-grade')
    expect(plan.segments[0]!.assumedGrade).toBe(true)
  })
})

// 5 ──────────────────────── interleaved traverse: prefix sum, not phase sum
describe('buildPlan — interleaved traverse', () => {
  // The Palisades shape: up, up, down into a notch, up again, then off.
  // Minutes are exact by construction: trail ascent = units x 15, offtrail
  // ascent = units x 30, trail descent = units x 10.
  const traverse: Segment[] = [
    seg({ id: 'approach', label: 'Approach trail', terrain: 'trail', phase: 'ascent', km: 2, vertM: 1000 }), // 180
    seg({ id: 'couloir', label: 'Couloir', terrain: 'offtrail', phase: 'ascent', km: 1, vertM: 300 }), // 120
    seg({ id: 'notch', label: 'Summit 1 to notch', terrain: 'trail', phase: 'descent', km: 1, vertM: 300 }), // 40
    seg({ id: 'summit2', label: 'Notch to summit 2', terrain: 'offtrail', phase: 'ascent', km: 0.5, vertM: 150 }), // 60
    seg({ id: 'gully', label: 'Descent gully', terrain: 'trail', phase: 'descent', km: 5, vertM: 1000 }), // 150
  ]

  const plan = buildPlan({ ...base, segments: traverse })

  it('sums the segments as constructed', () => {
    expect(plan.segments.map((s) => s.minutes)).toEqual([180, 120, 40, 60, 150])
    expect(plan.upMinutes).toBe(360)
    expect(plan.downMinutes).toBe(190)
    expect(plan.totalMinutes).toBe(550)
  })

  it('anchors the storm cutoff with a prefix sum, so the start is 07:20', () => {
    expect(plan.binding).toBe('storm')
    // prefix sum to the last ascent segment is 400, not the 360 phase sum
    expect(plan.startMin).toBe(840 - 400) // 07:20
    expect(plan.anchorSegmentId).toBe('summit2')
  })

  it('puts the anchor exactly on the cutoff, and the clock agrees with the headline', () => {
    const anchor = plan.segments.find((s) => s.segmentId === plan.anchorSegmentId)!
    expect(anchor.endMin).toBe(base.stormCutoffMin) // 14:00 exactly

    // the forward pass starts where the headline says it does, and is contiguous
    expect(plan.segments[0]!.startMin).toBe(plan.startMin)
    for (let i = 1; i < plan.segments.length; i++) {
      expect(plan.segments[i]!.startMin).toBe(plan.segments[i - 1]!.endMin)
    }
  })

  it('differs from the phase-sum answer by the descent before the anchor', () => {
    const phaseSumStart = base.stormCutoffMin - plan.upMinutes // 480 = 08:00
    expect(phaseSumStart - plan.startMin).toBe(40) // the notch descent
    // the phase-sum start would have overrun the cutoff by those 40 minutes
    expect(phaseSumStart + 400).toBe(base.stormCutoffMin + 40)
  })

  it('respects an explicit exposure anchor over the last-ascent default', () => {
    const flagged = traverse.map((s) => (s.id === 'couloir' ? { ...s, exposed: true } : s))
    const p = buildPlan({ ...base, segments: flagged })
    expect(p.anchorSegmentId).toBe('couloir')
    expect(p.startMin).toBe(840 - 300) // 09:00 — prefix sum to the couloir
    expect(p.segments[1]!.endMin).toBe(base.stormCutoffMin)
  })
})

// 6 ──────────────────────────────────── the sample route's demo script holds
// The README promises a specific interaction. These pin it, so editing the
// sample route cannot quietly break the thing a reviewer is told to try.
describe('the sample route', () => {
  const sample = {
    date: '2026-07-15',
    timezone: 'America/Los_Angeles',
    lat: SAMPLE_ROUTE.lat,
    lng: SAMPLE_ROUTE.lng,
    elevM: SAMPLE_ROUTE.elevM,
    segments: [...SAMPLE_ROUTE.segments],
    marginMin: 60,
  }

  it('is a single pushable day from camp, not a bivy', () => {
    const plan = buildPlan({ ...sample, partySize: 2, stormCutoffMin: 14 * 60 })
    expect(plan.startMin).toBeGreaterThan(0)
    expect(plan.warnings).not.toContain('bivy')
    expect(plan.totalMinutes).toBeLessThan(20 * 60)
  })

  it('is storm-bound at a 14:00 cutoff, and the turnaround is the cutoff', () => {
    const plan = buildPlan({ ...sample, partySize: 2, stormCutoffMin: 14 * 60 })
    expect(plan.binding).toBe('storm')
    expect(plan.startMin).toBe(168) // 02:48
    expect(plan.turnaroundMin).toBe(14 * 60)
    // the anchor is getting off the crest, not reaching a summit
    expect(plan.anchorSegmentId).toBe('raps')
  })

  it('flips to dark-bound when the cutoff moves to 17:00', () => {
    const plan = buildPlan({ ...sample, partySize: 2, stormCutoffMin: 17 * 60 })
    expect(plan.binding).toBe('dark')
  })

  it('slides the start earlier as the party grows, via rope work only', () => {
    const two = buildPlan({ ...sample, partySize: 2, stormCutoffMin: 14 * 60 })
    const three = buildPlan({ ...sample, partySize: 3, stormCutoffMin: 14 * 60 })
    expect(three.startMin).toBeLessThan(two.startMin)
    // the extra time is all in the pitches and rappels
    expect(three.totalMinutes - two.totalMinutes).toBe(112.5)
  })
})


describe('checkpoint deadline on a traverse', () => {
  it('uses every remaining segment, excluding earlier descents and including later climbs', () => {
    const plan = buildPlan({
      ...base, stormCutoffMin: 1439,
      segments: [
        seg({ id: 'approach', terrain: 'trail', phase: 'ascent', km: 12 }), // 180
        seg({ id: 'notch', terrain: 'trail', phase: 'descent', km: 4 }), // 40, before checkpoint
        seg({ id: 'checkpoint', label: 'Off the exposed ridge', terrain: 'rappels', phase: 'descent', exposed: true, count: 1 }), // 15
        seg({ id: 'saddle', terrain: 'trail', phase: 'ascent', km: 8 }), // 120, after checkpoint
        seg({ id: 'exit', terrain: 'trail', phase: 'descent', km: 15 }), // 150
      ],
    })
    expect(plan.remainingMinutes).toBe(270)
    expect(plan.anchorLabel).toBe('Off the exposed ridge')
    expect(plan.turnaroundMin).toBe(plan.duskMin! - base.marginMin - 270)
    expect(plan.segments[2]!.endMin).toBe(plan.turnaroundMin)
    expect(plan.segments.at(-1)!.endMin).toBe(plan.duskMin! - base.marginMin)
  })
})
