import type { Segment, Terrain } from './engine'

export const PROSE_EXAMPLE = `Approach: ascend 5 km on trail gaining 1000 m.
Ridge: ascend 2 pitches at 5.10b, exposed.
Rappels: descend 3 rappels, exposed.
Return: descend 5 km on trail losing 1000 m.`

type ParsedRoute = { segments: Segment[]; errors: string[] }

/** One segment per line. Unknown or incomplete measurements are never invented. */
export function parseRouteProse(text: string): ParsedRoute {
  const segments: Segment[] = []
  const errors: string[] = []
  const lines = text.split(/\r?\n/).map((line, index) => ({ line: line.trim(), number: index + 1 }))
    .filter(({ line }) => line.length > 0)
  if (!lines.length) return { segments, errors: ['Describe at least one segment.'] }
  if (lines.length > 80) return { segments, errors: ['Use at most 80 segments.'] }

  for (const { line, number } of lines) {
    const body = line.includes(':') ? line.slice(line.indexOf(':') + 1) : line
    const terrain: Terrain | undefined = /\brappels?\b/i.test(body) ? 'rappels'
      : /\bpitch(?:es)?\b/i.test(body) ? 'pitches'
      : /\boff[ -]?trail\b|\bscrambl(?:e|ing)\b/i.test(body) ? 'offtrail'
      : /\btrail\b/i.test(body) ? 'trail' : undefined
    const up = /\b(?:ascend|ascent|up|uphill|climb|gaining|gain)\b/i.test(body)
    const down = /\b(?:descend|descent|down|downhill|losing|lose)\b/i.test(body)
    if (!terrain) { errors.push(`Line ${number}: specify trail, off-trail, pitches, or rappels.`); continue }
    if (terrain === 'rappels' && up) { errors.push(`Line ${number}: rappels must descend.`); continue }
    if (up && down) { errors.push(`Line ${number}: split ascent and descent into separate segments.`); continue }
    if (!up && !down && terrain !== 'rappels') {
      errors.push(`Line ${number}: say ascend or descend.`); continue
    }
    const label = (line.includes(':') ? line.slice(0, line.indexOf(':')) : `Segment ${segments.length + 1}`)
      .replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim()
    const segment: Segment = {
      id: `prose-${number}`, label, terrain, phase: down || terrain === 'rappels' ? 'descent' : 'ascent',
      exposed: /\bexposed\b/i.test(body) && !/\b(?:not exposed|unexposed)\b/i.test(body),
    }
    if (terrain === 'trail' || terrain === 'offtrail') {
      const km = /(-?\d+(?:\.\d+)?)\s*(?:km|kilomet(?:er|re)s?)\b/i.exec(body)
      const vert = /(-?\d+(?:\.\d+)?)\s*(?:m|met(?:er|re)s?)\b/i.exec(body)
      if (!km || !vert) {
        errors.push(`Line ${number}: provide distance in km and vertical change in m (use 0 m for flat ground).`)
        continue
      }
      segment.km = Number(km[1]); segment.vertM = Number(vert[1])
      if (segment.km < 0 || segment.km > 200 || segment.vertM < 0 || segment.vertM > 10000) {
        errors.push(`Line ${number}: use 0–200 km and 0–10000 m, with ascend/descend for direction.`); continue
      }
    } else {
      const count = /(-?\d+(?:\.\d+)?)\s*(?:pitch(?:es)?|rappels?)\b/i.exec(body)
      segment.count = count ? Number(count[1]) : 1
      if (!Number.isInteger(segment.count) || segment.count < 1 || segment.count > 200) {
        errors.push(`Line ${number}: use a whole count from 1 to 200.`); continue
      }
      if (terrain === 'pitches') {
        segment.grade = /\b5\.\d{1,2}(?:[abcd](?:\/[abcd])?)?[+-]?(?=[\s,.;]|$)/i.exec(body)?.[0]
      }
    }
    if (!label || label.length > 120) { errors.push(`Line ${number}: use a label of 1–120 characters.`); continue }
    segments.push(segment)
  }
  return { segments: errors.length ? [] : segments, errors }
}

/** Require complete single-leg lines so extra legs cannot be silently dropped. */
export function isConstrainedProse(text: string): boolean {
  const number = String.raw`\d+(?:\.\d+)?`
  const exposure = String.raw`(?:,?\s*(?:exposed|not exposed|unexposed))?\.?`
  const walking = String.raw`(?:ascend|descend)\s+${number}\s*km\s+(?:on\s+)?(?:trail|off[ -]trail)\s+(?:gaining|losing)\s+${number}\s*m${exposure}`
  const rope = String.raw`(?:ascend|descend)\s+(?:\d+\s+)?(?:pitch(?:es)?|rappels?)(?:\s+at\s+5\.\d{1,2}[abcd]?[+-]?)?${exposure}`
  const pattern = new RegExp(`^[^:\\n]+:\\s*(?:${walking}|${rope})$`, 'i')
  return text.split(/\r?\n/).filter(s => s.trim()).every(s => pattern.test(s.trim()))
}
