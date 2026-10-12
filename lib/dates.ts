/** A complete calendar date; reject empty, partial and rolled-over input. */
export function isPlanDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const instant = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(instant.getTime()) && instant.toISOString().slice(0, 10) === value
}
