'use client'

import { useState } from 'react'
import type { Segment } from '@/lib/engine'
import { isConstrainedProse, parseRouteProse, PROSE_EXAMPLE } from '@/lib/prose'

export function ProseInput({ description, onDescription, onApply }: {
  description: string; onDescription: (value: string) => void; onApply: (segments: Segment[]) => void
}) {
  const [preview, setPreview] = useState<Segment[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  function parse() {
    if (!isConstrainedProse(description)) {
      setPreview(null)
      setErrors(['Use the example format with one segment per line. Free-form AI translation is planned for a future release.'])
      return
    }
    const result = parseRouteProse(description)
    setErrors(result.errors)
    setPreview(result.errors.length ? null : result.segments)
  }
  return <details className="mt-5 rounded-lg border border-slate-800 p-3">
    <summary className="cursor-pointer text-sm font-medium text-slate-200">Describe your route in prose</summary>
    <p id="prose-help" className="mt-2 text-xs leading-relaxed text-slate-300">
      Use the example format: one named segment per line, ascend or descend, and measurements in km and m.
      Add “exposed” where the storm deadline applies. This parser runs in your browser; it does not use AI.
    </p>
    <label htmlFor="route-description" className="mt-3 block text-xs text-slate-300">Route description</label>
    <textarea id="route-description" aria-describedby="prose-help" rows={6} value={description}
      maxLength={20000} placeholder={PROSE_EXAMPLE}
      onChange={e => { onDescription(e.target.value); setPreview(null); setErrors([]) }}
      className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100 placeholder:text-slate-400" />
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" onClick={() => { onDescription(PROSE_EXAMPLE); setPreview(null); setErrors([]) }}
        className="min-h-10 rounded border border-slate-700 px-3 text-sm text-slate-200">Use example</button>
      <button type="button" disabled={!description.trim()} onClick={parse}
        className="min-h-10 rounded border border-slate-700 px-3 text-sm text-slate-200 disabled:opacity-40">Preview segments</button>
    </div>
    {errors.length > 0 && <ul role="alert" className="mt-3 space-y-1 text-sm text-amber-300">{errors.map(error => <li key={error}>{error}</li>)}</ul>}
    {preview && <div className="mt-4 space-y-3">
      <p role="status" className="text-sm text-slate-300">Review {preview.length} segments. Applying replaces the current segment list; Save persists it.</p>
      <ol className="list-inside list-decimal space-y-2 text-sm text-slate-200">{preview.map(segment => <li key={segment.id}>
        {segment.label} · {segment.terrain} · {segment.phase} · {segment.terrain === 'trail' || segment.terrain === 'offtrail'
          ? `${segment.km} km / ${segment.vertM} m` : `${segment.count} ${segment.terrain}`}
        {segment.grade ? ` · ${segment.grade}` : segment.terrain === 'pitches' ? ' · assumed 45 min/pitch' : ''}
        {segment.exposed ? ' · exposed' : ' · not exposed'}
      </li>)}</ol>
      <button type="button" onClick={() => {
        if (window.confirm('Replace the current segments with this preview? Review the result, then Save.')) {
          onApply(preview); setPreview(null)
        }
      }} className="min-h-10 rounded bg-amber-500 px-3 text-sm font-semibold text-slate-950">Use these segments</button>
    </div>}
  </details>
}
