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

  // RLS hides inaccessible rows; return 404 for missing or inaccessible routes.
  if (error || !data) notFound()

  const route = data as RouteRow

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <nav className="mb-6">
        <Link href="/routes" className="text-xs text-slate-400 transition hover:text-slate-300">
          ← All routes
        </Link>
      </nav>
      <RouteEditor
        key={route.id}
        route={route}
        // Computed on the server so SSR and hydration agree on "tomorrow".
        defaultDate={route.plan_date ?? dateInZone(new Date(), route.timezone, 1)}
      />
    </main>
  )
}
