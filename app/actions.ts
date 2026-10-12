'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import tzlookup from 'tz-lookup'
import { dateInZone } from '@/lib/engine'
import { SAMPLE_ROUTE } from '@/lib/sample-route'
import { createClient } from '@/lib/supabase/server'
import {
  createRouteSchema,
  parseCoordinates,
  savePayloadSchema,
  type SavePayload,
} from '@/lib/validation'

export type ActionState = { error?: string; message?: string } | null

const field = (data: FormData, name: string): string => String(data.get(name) ?? '').trim()

// ------------------------------------------------------------------- auth

export async function signIn(_prev: ActionState, data: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: field(data, 'email'),
    password: String(data.get('password') ?? ''),
  })
  if (error) return { error: error.message }

  revalidatePath('/routes')
  redirect('/routes')
}

export async function signUp(_prev: ActionState, data: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: auth, error } = await supabase.auth.signUp({
    email: field(data, 'email'),
    password: String(data.get('password') ?? ''),
  })
  if (error) return { error: error.message }

  if (!auth.session) return { message: 'Check your email to confirm your account, then sign in.' }

  revalidatePath('/routes')
  redirect('/routes')
}

/**
 * One shared demo account. DEMO_* are server-only and never reach the client
 * bundle. Every demo visitor shares this account's routes — accepted, and
 * documented in the architecture doc's caveats.
 */
export async function signInDemo(_prev: ActionState): Promise<ActionState> {
  const email = process.env.DEMO_EMAIL
  const password = process.env.DEMO_PASSWORD
  if (!email || !password) {
    return { error: 'The demo account is not configured. Set DEMO_EMAIL and DEMO_PASSWORD.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }

  revalidatePath('/routes')
  redirect('/routes')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
  redirect('/login')
}

// ----------------------------------------------------------------- routes

export async function createRoute(_prev: ActionState, data: FormData): Promise<ActionState> {
  const coords = parseCoordinates(field(data, 'coordinates'))
  if (!coords) {
    return { error: 'Coordinates should look like 37.0947, -118.5100' }
  }

  const parsed = createRouteSchema.safeParse({
    name: field(data, 'name'),
    lat: coords.lat,
    lng: coords.lng,
    elevM: Number(field(data, 'elevM') || 0),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the route details' }
  }

  const { name, lat, lng, elevM } = parsed.data

  // Safe now: the schema has already bounded lat/lng, which is the only input
  // that can make tzlookup throw.
  const timezone = tzlookup(lat, lng)

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('routes')
    .insert({ name, lat, lng, elev_m: elevM, timezone, plan_date: dateInZone(new Date(), timezone, 1), segments: [] })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/routes')
  redirect(`/routes/${row.id}`)
}

export async function addSampleRoute(): Promise<void> {
  const { name, lat, lng, elevM, segments } = SAMPLE_ROUTE

  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('routes')
    .insert({
      name,
      lat,
      lng,
      elev_m: elevM,
      timezone: tzlookup(lat, lng),
      plan_date: dateInZone(new Date(), tzlookup(lat, lng), 1),
      segments,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/routes')
  redirect(`/routes/${row.id}`)
}

export async function deleteRoute(data: FormData): Promise<void> {
  const id = field(data, 'id')
  if (!id) return

  const supabase = await createClient()
  const { error } = await supabase.from('routes').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/routes')
}

/**
 * One save for the whole editor: segments plus the three plan controls. The
 * controls are persisted because the demo changes them and they must survive a
 * reload, including the selected plan date and original prose description.
 */
export async function saveRoute(
  id: string,
  payload: SavePayload,
): Promise<{ error: string } | { ok: true }> {
  const parsed = savePayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'That route did not validate' }
  }

  const { segments, partySize, stormCutoffMin, marginMin, date, description } = parsed.data

  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from('routes')
    .update({
      segments,
      plan_date: date,
      description,
      party_size: partySize,
      storm_cutoff_min: stormCutoffMin,
      margin_min: marginMin,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!updated) return { error: 'This route no longer exists or you no longer have access. Return to your routes and sign in again if needed.' }

  revalidatePath(`/routes/${id}`)
  return { ok: true }
}
