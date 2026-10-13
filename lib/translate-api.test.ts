import { expect, it, vi } from 'vitest'
import { POST } from '../app/api/translate/route'

it('keeps the deferred translation endpoint offline without provider requests', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  try {
    const response = await POST()
    expect(response.status).toBe(501)
    expect((await response.json()).error).toContain('future release')
    expect(fetch).not.toHaveBeenCalled()
  } finally { fetch.mockRestore() }
})
