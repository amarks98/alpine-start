'use client'

import { useState } from 'react'
import { isPlanDate } from '@/lib/dates'
import { dayOffset, formatClock, formatDuration, type Plan } from '@/lib/engine'

const WARNING_TEXT: Record<Plan['warnings'][number], string> = {
  bivy: 'This plan needs you to leave the previous evening. Consider a bivy instead.',
  'no-dusk': 'Dusk never arrives at this latitude on this date, so only the storm cutoff applies.',
  'polar-day': 'Polar day — the sun does not set here on this date.',
  'polar-night': 'Polar night — the sun does not rise here on this date.',
  'assumed-grade': 'A pitch has no readable grade, so it is priced at the middle band (45 min).',
}

const controlClass =
  'tabular w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-amber-500'

export function PlanPanel({
  plan,
  ready,
  date,
  onDate,
  partySize,
  onPartySize,
  stormCutoffMin,
  onStormCutoff,
  marginMin,
  onMargin,
}: {
  plan: Plan
  ready: boolean
  date: string
  onDate: (v: string) => void
  partySize: number
  onPartySize: (v: number) => void
  stormCutoffMin: number
  onStormCutoff: (v: number) => void
  marginMin: number
  onMargin: (v: number) => void
}) {
  const stormBound = plan.binding === 'storm'
  const [dateError, setDateError] = useState(false)

  return (
    <aside id="route-plan" className="min-w-0 scroll-mt-4 space-y-4 lg:sticky lg:top-8">
      <a href="#route-editor" className="inline-block rounded border border-slate-700 px-3 py-2 text-sm text-amber-300 lg:hidden">↑ Back to segments</a>
      {/* Controls */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">The day</h2>

        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="text-xs text-slate-400">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                const valid = isPlanDate(e.target.value)
                setDateError(!valid)
                if (valid) onDate(e.target.value)
              }}
              aria-invalid={dateError}
              className={`mt-1 ${controlClass}`}
            />
          </label>

          {dateError && <p role="alert" className="text-xs text-amber-300">Choose a complete date. The plan still uses {date}.</p>}
          <label className="block">
            <span className="text-xs text-slate-400">Party size</span>
            <input
              type="number"
              min={1}
              max={20}
              value={partySize}
              onChange={(e) => onPartySize(Math.min(20, Math.max(1, Math.round(Number(e.target.value) || 1))))}
              className={`mt-1 ${controlClass}`}
            />
            <span className="mt-1 block text-[11px] leading-snug text-slate-400">
              Scales rope work only — walking does not slow with party size.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-400">Storm cutoff</span>
              <input
                type="time"
                value={formatClock(stormCutoffMin)}
                onChange={(e) => onStormCutoff(minutesFromTime(e.target.value, stormCutoffMin))}
                className={`mt-1 ${controlClass}`}
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Margin (min)</span>
              <input
                type="number"
                min={0}
                max={600}
                step={15}
                value={marginMin}
                onChange={(e) => onMargin(clampMargin(e.target.value))}
                className={`mt-1 ${controlClass}`}
              />
            </label>
          </div>
        </div>
      </section>

      {!ready && <p role="status" className="rounded-xl border border-dashed border-slate-700 p-5 text-sm text-slate-300">Add segments and complete their measurements to calculate your plan. You can save an unfinished route as a draft.</p>}
      {ready && <>
      {/* Plan */}
      <section
        className={`rounded-xl border p-4 ${
          stormBound ? 'border-amber-600/40 bg-amber-950/20' : 'border-indigo-600/40 bg-indigo-950/20'
        }`}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Start route
        </h2>

        <p className="tabular mt-1 text-4xl font-semibold tracking-tight text-white">
          {formatClock(plan.startMin)}
        </p>
        <DayNote min={plan.startMin} />

        <div
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            stormBound ? 'bg-amber-500/15 text-amber-300' : 'bg-indigo-500/15 text-indigo-300'
          }`}
        >
          <span aria-hidden>{stormBound ? '⛈' : '🌙'}</span>
          {stormBound ? 'Storm-bound' : 'Dark-bound'}
        </div>

        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          {stormBound ? (
            <>
              You are racing the {formatClock(stormCutoffMin)} cutoff to the end of{' '}
              {plan.anchorLabel ?? 'the ascent'}. An earlier start is what
              buys margin.
            </>
          ) : (
            <>
              You are racing dusk. An earlier departure or a shorter route buys
              more daylight margin.
            </>
          )}
        </p>
      </section>

      {/* The clock */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <dl className="space-y-2 text-sm">
          <Row label="Checkpoint deadline" value={formatClock(plan.turnaroundMin)} emphasis />
          <Row label="Time up" value={formatDuration(plan.upMinutes)} />
          <Row label="Time down" value={formatDuration(plan.downMinutes)} />
          <Row label="Total route time" value={formatDuration(plan.totalMinutes)} />
          <div className="!mt-3 border-t border-slate-800 pt-2" />
          <Row
            label="Sunrise"
            value={plan.sunriseMin === null ? '—' : formatClock(plan.sunriseMin)}
          />
          <Row
            label="Nautical dusk"
            value={plan.duskMin === null ? '—' : formatClock(plan.duskMin)}
          />
          <Row
            label="Headlamp"
            value={plan.headlampMin > 0 ? formatDuration(plan.headlampMin) : 'none'}
          />
        </dl>
        <p className="mt-3 text-[11px] leading-snug text-slate-400">
          Pass {plan.anchorLabel ?? 'the checkpoint'} by this time to finish the remaining
          route before dusk minus your margin and meet the storm cutoff. This is a checkpoint
          deadline along the planned route, not an estimate for reversing or bailing from it.
        </p>
      </section>

      {plan.warnings.length > 0 && (
        <ul className="space-y-2">
          {plan.warnings.map((w) => (
            <li
              key={w}
              className="rounded-lg border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-xs leading-relaxed text-amber-200"
            >
              {WARNING_TEXT[w]}
            </li>
          ))}
        </ul>
      )}

      </>}
      <p className="px-1 text-[11px] leading-relaxed text-slate-400">
        Munter rates, pitch times and rappel times are assumed defaults, not measurements from your
        history. Pace calibration from logged trips is the next thing to build.
      </p>
    </aside>
  )
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className={`tabular ${emphasis ? 'text-base font-semibold text-white' : 'text-slate-300'}`}>
        {value}
      </dd>
    </div>
  )
}

/** A negative start is the previous evening — say so rather than showing a bare clock. */
function DayNote({ min }: { min: number }) {
  const offset = dayOffset(min)
  if (offset === 0) return null
  return (
    <p className="mt-0.5 text-xs font-medium text-amber-400">
      {offset === -1 ? 'the night before' : `${-offset} days earlier`}
    </p>
  )
}

function minutesFromTime(value: string, fallback: number): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!m) return fallback
  const minutes = Number(m[1]) * 60 + Number(m[2])
  return Number.isFinite(minutes) ? Math.min(1439, Math.max(0, minutes)) : fallback
}

function clampMargin(value: string): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(600, Math.max(0, Math.round(n)))
}
