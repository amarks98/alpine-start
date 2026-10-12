/**
 * Integration tests against a LOCAL Supabase stack. Skipped unless SB_URL is
 * set, so `npm test` stays fast and credential-free:
 *
 *   npx supabase start
 *   SB_URL=http://127.0.0.1:54321 SB_ANON=<anon key> npx vitest run lib/integration
 *
 * These cover the one thing the unit tests cannot: that the RLS policies behave
 * the way the app's 404 path assumes — filtering another user's row OUT rather
 * than refusing it.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildPlan, formatClock } from './engine'
import { SAMPLE_ROUTE } from './sample-route'
import { ROUTE_COLUMNS, type RouteRow } from './validation'

const SB_URL = process.env.SB_URL
const SB_ANON = process.env.SB_ANON

describe.skipIf(!SB_URL || !SB_ANON)('against a local Supabase stack', () => {
  let alice: SupabaseClient
  let bob: SupabaseClient
  let routeId: string
  let row: RouteRow

  beforeAll(async () => {
    const stamp = Date.now()
    const signUp = async (who: string) => {
      const client = createClient(SB_URL!, SB_ANON!)
      const { error } = await client.auth.signUp({
        email: `${who}-${stamp}@example.test`,
        password: 'local-stack-test-password',
      })
      if (error) throw new Error(`${who}: ${error.message}`)
      return client
    }
    alice = await signUp('alice')
    bob = await signUp('bob')

    const { data, error } = await alice
      .from('routes')
      .insert({
        name: SAMPLE_ROUTE.name,
        lat: SAMPLE_ROUTE.lat,
        lng: SAMPLE_ROUTE.lng,
        elev_m: SAMPLE_ROUTE.elevM,
        timezone: 'America/Los_Angeles',
        segments: SAMPLE_ROUTE.segments,
      })
      .select('id')
      .single()
    if (error) throw new Error(`insert: ${error.message}`)
    routeId = data.id

    const read = await alice.from('routes').select(ROUTE_COLUMNS).eq('id', routeId).maybeSingle()
    if (read.error || !read.data) throw new Error(`read back: ${read.error?.message}`)
    row = read.data as RouteRow
  })

  it('inserts without an explicit user_id, via the column default', () => {
    expect(routeId).toBeTruthy()
  })

  it('applies the plan-control column defaults', () => {
    expect(row.party_size).toBe(2)
    expect(row.storm_cutoff_min).toBe(840)
    expect(row.margin_min).toBe(60)
  })

  it('round-trips the segments jsonb, exposure flags included', () => {
    expect(row.segments).toHaveLength(SAMPLE_ROUTE.segments.length)
    const expected = SAMPLE_ROUTE.segments.filter((s) => 'exposed' in s && s.exposed).length
    expect(row.segments.filter((s) => s.exposed === true)).toHaveLength(expected)
  })

  it('persists the plan controls through saveRoute’s update', async () => {
    const { error } = await alice
      .from('routes')
      .update({ party_size: 3, storm_cutoff_min: 1020, margin_min: 45, plan_date: '2026-07-15', description: 'Ridge: ascend 2 pitches at 5.10b, exposed.' })
      .eq('id', routeId)
    expect(error).toBeNull()

    const { data } = await alice
      .from('routes')
      .select('party_size, storm_cutoff_min, margin_min, plan_date, description')
      .eq('id', routeId)
      .maybeSingle()
    expect(data).toEqual({ party_size: 3, storm_cutoff_min: 1020, margin_min: 45, plan_date: '2026-07-15', description: 'Ridge: ascend 2 pitches at 5.10b, exposed.' })
  })

  // The behaviour /routes/[id] depends on: zero rows, not an authorization error.
  it('hides another user’s route as zero rows rather than an error', async () => {
    const { data, error } = await bob
      .from('routes')
      .select(ROUTE_COLUMNS)
      .eq('id', routeId)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('refuses another user’s update and delete', async () => {
    const { data: updated } = await bob
      .from('routes')
      .update({ name: 'hijacked' })
      .eq('id', routeId)
      .select('id')
      .maybeSingle()
    expect(updated).toBeNull()

    const { data: deleted } = await bob.from('routes').delete().eq('id', routeId).select('id')
    expect(deleted ?? []).toHaveLength(0)

    const { data: stillMine } = await alice.from('routes').select('name').eq('id', routeId).maybeSingle()
    expect(stillMine?.name).toBe(SAMPLE_ROUTE.name)
  })

  it('shows an unrelated user an empty list', async () => {
    const { data } = await bob.from('routes').select('id')
    expect(data ?? []).toHaveLength(0)
  })

  it('enforces the CHECK constraints', async () => {
    const bad = [
      { label: 'latitude', patch: { lat: 999 } },
      { label: 'storm cutoff', patch: { storm_cutoff_min: 5000 } },
      { label: 'party size', patch: { party_size: 99 } },
      { label: 'blank name', patch: { name: '   ' } },
    ]
    for (const { label, patch } of bad) {
      const { error } = await alice.from('routes').insert({
        name: 'constraint probe',
        lat: 37,
        lng: -118,
        elev_m: 3000,
        timezone: 'America/Los_Angeles',
        ...patch,
      })
      expect(error, `${label} should have been rejected`).not.toBeNull()
    }
  })

  it('produces the README’s plan from rows that made a full DB round trip', () => {
    const plan = buildPlan({
      date: '2026-07-15',
      timezone: row.timezone,
      lat: row.lat,
      lng: row.lng,
      elevM: row.elev_m,
      segments: row.segments,
      partySize: 2,
      stormCutoffMin: 840,
      marginMin: 60,
    })
    expect(formatClock(plan.startMin)).toBe('02:48')
    expect(plan.binding).toBe('storm')
    expect(formatClock(plan.turnaroundMin)).toBe('14:00')
    expect(plan.anchorSegmentId).toBe('raps')
  })
})
