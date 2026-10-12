import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ result: vi.fn(), update: vi.fn(), revalidate: vi.fn(), signUp: vi.fn(), redirect: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('./supabase/server', () => ({
  createClient: async () => ({ auth: { signUp: mocks.signUp }, from: () => ({ update: (values: unknown) => {
    mocks.update(values)
    return { eq: () => ({ select: () => ({ maybeSingle: mocks.result }) }) }
  } }) }),
}))
import { saveRoute, signUp } from '../app/actions'

const payload = { segments: [], partySize: 2, stormCutoffMin: 840, marginMin: 60,
  date: '2026-07-15', description: 'Approach: ascend 5 km trail gaining 1000 m.' }

beforeEach(() => vi.clearAllMocks())

it('does not report success or revalidate when RLS or deletion leaves no row', async () => {
  mocks.result.mockResolvedValue({ data: null, error: null })
  const result = await saveRoute('missing-route', payload)
  expect(result).toHaveProperty('error')
  expect(mocks.revalidate).not.toHaveBeenCalled()
})

it('saves all controls including the date and original prose', async () => {
  mocks.result.mockResolvedValue({ data: { id: 'route-id' }, error: null })
  expect(await saveRoute('route-id', payload)).toEqual({ ok: true })
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ plan_date: payload.date, description: payload.description }))
  expect(mocks.revalidate).toHaveBeenCalledWith('/routes/route-id')
})

it('rejects an invalid date before making a database request', async () => {
  expect(await saveRoute('route-id', { ...payload, date: '' })).toHaveProperty('error')
  expect(mocks.update).not.toHaveBeenCalled()
})

it('shows confirmation instructions when signup does not create a session', async () => {
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null })
  const form = new FormData()
  form.set('email', 'climber@example.test')
  form.set('password', 'test-password')
  expect(await signUp(null, form)).toHaveProperty('message')
  expect(mocks.redirect).not.toHaveBeenCalled()
})
