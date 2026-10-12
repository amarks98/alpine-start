import type { Segment } from '@/lib/engine'

/**
 * The Palisades Traverse — Thunderbolt to Polemonium, from a high camp at Sam
 * Mack Meadow. Camp-to-camp rather than car-to-car, because that is how the
 * route is actually climbed: car-to-car at these rates is a 23-hour day that
 * can only be planned as a bivy, which makes for an honest number and a
 * useless demo.
 *
 * Deliberately a real interleaved traverse rather than a there-and-back: the
 * ridge descends into notches between summits, which is exactly the shape that
 * makes a phase sum disagree with the clock column. The `exposed` flags run
 * from the couloir through the rappels off the crest, so the storm deadline
 * anchors on getting OFF the ridge rather than on reaching a summit.
 */
export const SAMPLE_ROUTE = {
  name: 'Palisades Traverse — Thunderbolt to Polemonium (from high camp)',
  lat: 37.0947,
  lng: -118.51,
  elevM: 4273,
  segments: [
    {
      id: 'moraine',
      label: 'Camp to the Palisade Glacier',
      terrain: 'offtrail',
      phase: 'ascent',
      km: 2.5,
      vertM: 500,
    },
    {
      id: 'underhill',
      label: 'Underhill Couloir to the crest',
      terrain: 'offtrail',
      phase: 'ascent',
      km: 0.8,
      vertM: 400,
      exposed: true,
    },
    {
      id: 'thunderbolt',
      label: 'Thunderbolt summit block',
      terrain: 'pitches',
      phase: 'ascent',
      count: 1,
      grade: '5.9',
      exposed: true,
    },
    {
      id: 'tb-starlight',
      label: 'Thunderbolt to Starlight ridge',
      terrain: 'offtrail',
      phase: 'ascent',
      km: 0.6,
      vertM: 120,
      exposed: true,
    },
    {
      id: 'starlight',
      label: 'Starlight summit block',
      terrain: 'pitches',
      phase: 'ascent',
      count: 1,
      grade: '5.7',
      exposed: true,
    },
    {
      id: 'northpal',
      label: 'Starlight to North Palisade',
      terrain: 'pitches',
      phase: 'ascent',
      count: 2,
      grade: '5.6',
      exposed: true,
    },
    {
      id: 'unotch-traverse',
      label: 'North Palisade down to the U-Notch col',
      terrain: 'offtrail',
      phase: 'descent',
      km: 0.4,
      vertM: 80,
      exposed: true,
    },
    {
      id: 'polemonium',
      label: 'Polemonium summit',
      terrain: 'pitches',
      phase: 'ascent',
      count: 1,
      grade: '5.6',
      exposed: true,
    },
    {
      id: 'raps',
      label: 'Rappels off the crest',
      terrain: 'rappels',
      phase: 'descent',
      count: 3,
      exposed: true,
    },
    {
      id: 'unotch',
      label: 'U-Notch couloir descent',
      terrain: 'offtrail',
      phase: 'descent',
      km: 1.2,
      vertM: 600,
    },
    {
      id: 'glacier-out',
      label: 'Glacier and moraine back to camp',
      terrain: 'offtrail',
      phase: 'descent',
      km: 2.5,
      vertM: 500,
    },
  ] satisfies Segment[],
} as const
