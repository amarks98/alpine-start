import Link from 'next/link'
import { notFound } from 'next/navigation'
import { dateInZone } from '@/lib/engine'
import { createClient } from '@/lib/supabase/server'
import { ROUTE_COLUMNS, type RouteRow } from '@/lib/validation'
import { RouteEditor } from './RouteEditor'

export default async function RoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('routes')
    .select(ROUTE_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  // RLS filters another user's route out rather than refusing it, so zero rows
  // is the normal shape of "not yours". A 404 is both the correct answer and
  // the one that leaks least — but only if it is handled instead of rendering
  // the editor over an undefined route.
  if (error || !data) notFound()

  const route = data as RouteRow

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <nav className="mb-6">
        <Link href="/routes" className="text-xs text-slate-500 transition hover:text-slate-300">
          ← All routes
        </Link>
      </nav>
      <RouteEditor
        route={route}
        // Computed on the server so SSR and hydration agree on "tomorrow".
        defaultDate={route.plan_date ?? dateInZone(new Date(), route.timezone, 1)}
      />
    </main>
  )
}
