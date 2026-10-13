'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { saveRoute } from '@/app/actions'
import { buildPlan, formatClock, type Segment, type Terrain } from '@/lib/engine'
import { savePayloadSchema, segmentProblems, type RouteRow } from '@/lib/validation'
import { ProseInput } from './ProseInput'
import { PlanPanel } from './PlanPanel'

const TERRAIN_LABEL: Record<Terrain, string> = {
  trail: 'Trail',
  offtrail: 'Off-trail',
  pitches: 'Pitches',
  rappels: 'Rappels',
}

const isDistance = (t: Terrain) => t === 'trail' || t === 'offtrail'

/** A cleared input must become undefined, so the engine's own defaults apply. */
const numOrUndefined = (v: string): number | undefined =>
  v.trim() === '' ? undefined : Number(v)

const fieldClass =
  'tabular w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-amber-500'

export function RouteEditor({ route, defaultDate }: { route: RouteRow; defaultDate: string }) {
  const [segments, setSegments] = useState<Segment[]>(route.segments ?? [])
  const [partySize, setPartySize] = useState(route.party_size)
  const [stormCutoffMin, setStormCutoffMin] = useState(route.storm_cutoff_min)
  const [marginMin, setMarginMin] = useState(route.margin_min)
  const [date, setDate] = useState(defaultDate)
  const [description, setDescription] = useState(route.description ?? '')

  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const snapshot = JSON.stringify({ segments, partySize, stormCutoffMin, marginMin, date, description })
  const [baseline, setBaseline] = useState(snapshot)
  const dirty = snapshot !== baseline
  const problems = segments.flatMap((segment, index) => segmentProblems(segment).map(message => `Segment ${index + 1}: ${message}`))
  const planReady = segments.length > 0 && problems.length === 0
  const [restored, setRestored] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const draftKey = `alpine-start:draft:${route.id}`

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey)
      const draft = raw ? savePayloadSchema.safeParse(JSON.parse(raw)) : null
      if (draft?.success) {
        const d = draft.data
        setSegments(d.segments); setPartySize(d.partySize); setStormCutoffMin(d.stormCutoffMin)
        setMarginMin(d.marginMin); setDate(d.date); setDescription(d.description)
        setRestored(true)
      }
    } catch { /* Storage is optional; saving to the server still works. */ }
    setDraftLoaded(true)
  }, [draftKey])

  useEffect(() => {
    if (!draftLoaded) return
    try {
      if (dirty) sessionStorage.setItem(draftKey, snapshot)
      else sessionStorage.removeItem(draftKey)
    } catch { /* Private browsing or full storage must not break editing. */ }
  }, [draftLoaded, draftKey, dirty, snapshot])

  useEffect(() => {
    if (!dirty) return
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const navigate = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null
      if (!link || link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const destination = new URL(link.href, location.href)
      if (destination.pathname === location.pathname && destination.search === location.search) return
      if (!window.confirm('Leave this route with unsaved changes? Save first to keep your edits on your account.')) {
        event.preventDefault(); event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', unload)
    document.addEventListener('click', navigate, true)
    return () => {
      window.removeEventListener('beforeunload', unload)
      document.removeEventListener('click', navigate, true)
    }
  }, [dirty])

  // Recompute locally on every edit.
  const plan = useMemo(
    () =>
      buildPlan({
        date,
        timezone: route.timezone,
        lat: route.lat,
        lng: route.lng,
        elevM: route.elev_m,
        segments,
        partySize,
        stormCutoffMin,
        marginMin,
      }),
    [date, route.timezone, route.lat, route.lng, route.elev_m, segments, partySize, stormCutoffMin, marginMin],
  )

  const patch = (index: number, change: Partial<Segment>) =>
    setSegments((prev) => prev.map((s, i) => (i === index ? { ...s, ...change } : s)))

  const move = (index: number, delta: number) =>
    setSegments((prev) => {
      const next = [...prev]
      const target = index + delta
      const a = next[index]
      const b = next[target]
      if (!a || !b) return prev
      next[index] = b
      next[target] = a
      return next
    })

  const remove = (index: number) => setSegments((prev) => prev.filter((_, i) => i !== index))

  const add = () =>
    setSegments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: 'New segment',
        terrain: 'trail',
        phase: 'ascent',
        km: 1,
        vertM: 200,
      },
    ])

  const save = () => {
    setError(null)
    const committed = snapshot
    startTransition(async () => {
      try {
        const result = await saveRoute(route.id, { segments, partySize, stormCutoffMin, marginMin, date, description })
        if ('error' in result) setError(result.error)
        else setBaseline(committed)
      } catch {
        setError('Could not save. Your edits are still here; check your connection and try again.')
      }
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <section id="route-editor" className="min-w-0 scroll-mt-4">
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">{route.name}</h1>
            <p className="tabular mt-1 text-xs text-slate-400">
              {route.lat.toFixed(4)}, {route.lng.toFixed(4)} · {route.elev_m} m · {route.timezone}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {dirty && !pending && <span className="text-xs text-amber-500">Unsaved changes</span>}
            {!dirty && !pending && <span className="text-xs text-slate-400">Saved</span>}
            <button
              type="button"
              onClick={save}
              disabled={pending || !dirty}
              className="rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </header>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {restored && dirty && <p role="status" className="mt-3 text-sm text-amber-300">Recovered unsaved edits from this tab. Save to keep them on your account.</p>}
        <a href="#route-plan" className="mt-4 inline-block rounded border border-slate-700 px-3 py-2 text-sm text-amber-300 lg:hidden">Jump to plan ↓</a>
        <ProseInput description={description} onDescription={setDescription} onApply={setSegments} />

        {segments.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-slate-800 px-6 py-10 text-center text-sm text-slate-400">
            No segments yet. Add the first one below and the plan appears immediately.
          </p>
        ) : (
          <ol className="mt-5 space-y-2">
            {segments.map((segment, index) => {
              const timed = plan.segments[index]
              return (
                <li
                  key={segment.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 p-3"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <span className="tabular mt-1.5 w-5 shrink-0 text-right text-xs text-slate-400">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1 basis-48 space-y-2">
                      <input
                        value={segment.label}
                        onChange={(e) => patch(index, { label: e.target.value })}
                        aria-label={`Segment ${index + 1} name`}
                        className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-slate-100 outline-none hover:border-slate-800 focus:border-amber-500"
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={segment.terrain}
                          onChange={(e) => patch(index, { terrain: e.target.value as Terrain })}
                          aria-label={`Segment ${index + 1} terrain`}
                          className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 outline-none focus:border-amber-500"
                        >
                          {(Object.keys(TERRAIN_LABEL) as Terrain[]).map((t) => (
                            <option key={t} value={t}>
                              {TERRAIN_LABEL[t]}
                            </option>
                          ))}
                        </select>

                        <select
                          value={segment.phase}
                          onChange={(e) =>
                            patch(index, { phase: e.target.value as Segment['phase'] })
                          }
                          aria-label={`Segment ${index + 1} direction`}
                          className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 outline-none focus:border-amber-500"
                        >
                          <option value="ascent">Up</option>
                          <option value="descent">Down</option>
                        </select>

                        {isDistance(segment.terrain) ? (
                          <>
                            <label className="flex items-center gap-1 text-xs text-slate-400">
                              km
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={segment.km ?? ''}
                                onChange={(e) =>
                                  patch(index, { km: numOrUndefined(e.target.value) })
                                }
                                className={`${fieldClass} w-16`}
                              />
                            </label>
                            <label className="flex items-center gap-1 text-xs text-slate-400">
                              vert m
                              <input
                                type="number"
                                step="10"
                                min="0"
                                value={segment.vertM ?? ''}
                                onChange={(e) =>
                                  patch(index, { vertM: numOrUndefined(e.target.value) })
                                }
                                className={`${fieldClass} w-20`}
                              />
                            </label>
                          </>
                        ) : (
                          <>
                            <label className="flex items-center gap-1 text-xs text-slate-400">
                              {segment.terrain === 'pitches' ? 'pitches' : 'rappels'}
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={segment.count ?? ''}
                                onChange={(e) =>
                                  patch(index, { count: numOrUndefined(e.target.value) })
                                }
                                className={`${fieldClass} w-14`}
                              />
                            </label>
                            {segment.terrain === 'pitches' && (
                              <label className="flex items-center gap-1 text-xs text-slate-400">
                                grade
                                <input
                                  value={segment.grade ?? ''}
                                  onChange={(e) => patch(index, { grade: e.target.value })}
                                  placeholder="5.9"
                                  className={`${fieldClass} w-16`}
                                />
                              </label>
                            )}
                          </>
                        )}

                        <label
                          className="flex items-center gap-1.5 text-xs text-slate-400"
                          title="The storm deadline applies through this segment"
                        >
                          <input
                            type="checkbox"
                            checked={segment.exposed ?? false}
                            onChange={(e) => patch(index, { exposed: e.target.checked })}
                            className="accent-amber-500"
                          />
                          exposed
                        </label>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {timed && planReady && (
                        <span
                          className={`tabular text-xs ${
                            segment.id === plan.anchorSegmentId
                              ? 'font-semibold text-amber-400'
                              : 'text-slate-400'
                          }`}
                          title={
                            segment.id === plan.anchorSegmentId
                              ? 'The storm cutoff is measured to the end of this segment'
                              : undefined
                          }
                        >
                          {formatClock(timed.startMin)}–{formatClock(timed.endMin)}
                        </span>
                      )}
                      <div className="flex items-center gap-0.5 text-slate-400">
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          aria-label="Move up"
                          className="min-h-9 min-w-9 px-2 transition hover:text-slate-300 disabled:opacity-25"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={index === segments.length - 1}
                          aria-label="Move down"
                          className="min-h-9 min-w-9 px-2 transition hover:text-slate-300 disabled:opacity-25"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          aria-label="Delete segment"
                          className="min-h-9 min-w-9 px-2 transition hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                  {segmentProblems(segment).map(message => <p key={message} className="mt-2 text-xs text-amber-300">{message}</p>)}
                </li>
              )
            })}
          </ol>
        )}

        <button
          type="button"
          onClick={add}
          className="mt-4 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
        >
          Add segment
        </button>
      </section>

      <PlanPanel
        plan={plan}
        ready={planReady}
        date={date}
        onDate={setDate}
        partySize={partySize}
        onPartySize={setPartySize}
        stormCutoffMin={stormCutoffMin}
        onStormCutoff={setStormCutoffMin}
        marginMin={marginMin}
        onMargin={setMarginMin}
      />
    </div>
  )
}
