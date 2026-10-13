import Link from 'next/link'
import { addSampleRoute, deleteRoute, signOut } from '@/app/actions'
import { createClient } from '@/lib/supabase/server'
import { ROUTE_COLUMNS, type RouteRow } from '@/lib/validation'
import { DeleteRouteButton } from './DeleteRouteButton'
import { NewRouteForm } from './NewRouteForm'

export default async function RoutesPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('routes')
    .select(ROUTE_COLUMNS)
    .order('created_at', { ascending: false })

  const routes = (data ?? []) as RouteRow[]

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="flex items-baseline justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Your routes</h1>
          <p className="mt-1 text-sm text-slate-400">
            Build a route from segments, and the plan tells you when to leave.
          </p>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm text-slate-400 hover:text-slate-300">
            Sign out
          </button>
        </form>
      </header>

      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">
          Could not load your routes: {error.message}
        </p>
      )}

      {routes.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-800 px-6 py-10 text-center">
          <p className="text-sm text-slate-400">No routes yet.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
            Start with the pre-segmented Palisades Traverse, or add your own below.
          </p>
          <form action={addSampleRoute} className="mt-5">
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Add sample route
            </button>
          </form>
        </div>
      ) : (
        <>
          <ul className="mt-6 divide-y divide-slate-800">
            {routes.map((route) => (
              <li key={route.id} className="flex items-center justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <Link
                    href={`/routes/${route.id}`}
                    className="block truncate text-sm font-medium text-slate-100 hover:text-amber-400"
                  >
                    {route.name}
                  </Link>
                  <p className="tabular mt-0.5 text-xs text-slate-400">
                    {route.segments?.length ?? 0} segment
                    {(route.segments?.length ?? 0) === 1 ? '' : 's'} · {route.lat.toFixed(4)},{' '}
                    {route.lng.toFixed(4)} · {route.elev_m} m · {route.timezone}
                  </p>
                </div>
                <form action={deleteRoute}>
                  <input type="hidden" name="id" value={route.id} />
                  <DeleteRouteButton name={route.name} />
                </form>
              </li>
            ))}
          </ul>

          <form action={addSampleRoute} className="mt-6">
            <button
              type="submit"
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Add sample route
            </button>
          </form>
        </>
      )}

      <NewRouteForm />
    </main>
  )
}
