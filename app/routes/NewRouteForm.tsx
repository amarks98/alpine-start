'use client'

import { useActionState } from 'react'
import { createRoute, type ActionState } from '@/app/actions'

export function NewRouteForm() {
  const [state, submit, pending] = useActionState<ActionState, FormData>(createRoute, null)

  return (
    <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <h2 className="text-sm font-semibold text-slate-200">New route</h2>
      <p className="mt-1 text-xs text-slate-400">
        The timezone is derived from the coordinates, so there is nothing to pick.
      </p>

      <form action={submit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="name" className="block text-xs font-medium text-slate-400">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={120}
            placeholder="North Ridge of Lone Pine Peak"
            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-amber-500"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <div>
            <label htmlFor="coordinates" className="block text-xs font-medium text-slate-400">
              Coordinates
            </label>
            <input
              id="coordinates"
              name="coordinates"
              required
              placeholder="37.0947, -118.5100"
              className="tabular mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-amber-500"
            />
          </div>
          <div>
            <label htmlFor="elevM" className="block text-xs font-medium text-slate-400">
              Summit elevation (m)
            </label>
            <input
              id="elevM"
              name="elevM"
              type="number"
              min={-500}
              max={9000}
              defaultValue={3000}
              className="tabular mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {state?.error && (
          <p role="alert" className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create route'}
        </button>
      </form>
    </section>
  )
}
