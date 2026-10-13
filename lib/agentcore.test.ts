import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ create: vi.fn(), tools: vi.fn(), close: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@ai-sdk/mcp', () => ({ createMCPClient: mocks.create }))
import { withAgentCoreTools } from './agentcore'
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('AGENTCORE_GATEWAY_URL', 'https://example.gateway.bedrock-agentcore.us-west-2.amazonaws.com/mcp')
  mocks.create.mockResolvedValue({ tools: mocks.tools, close: mocks.close })
  mocks.tools.mockResolvedValue({ readRoute: { description: 'Read route' }, deleteRoute: {} })
})
afterEach(() => vi.unstubAllEnvs())
it('exposes only allowed tools and closes after the caller finishes', async () => {
  const run = vi.fn().mockResolvedValue('done')
  expect(await withAgentCoreTools('fresh-token', ['readRoute'], run)).toBe('done')
  expect(run).toHaveBeenCalledWith({ readRoute: { description: 'Read route' } })
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ transport: expect.objectContaining({
    type: 'http', headers: { Authorization: 'Bearer fresh-token' },
  }) }))
  expect(mocks.close).toHaveBeenCalledOnce()
})
it('closes on discovery, missing-tool, and caller failures', async () => {
  mocks.tools.mockRejectedValueOnce(new Error('Discovery failed'))
  await expect(withAgentCoreTools('token', ['readRoute'], vi.fn())).rejects.toThrow('Discovery failed')
  await expect(withAgentCoreTools('token', ['missing'], vi.fn())).rejects.toThrow('unavailable')
  await expect(withAgentCoreTools('token', ['readRoute'], async () => { throw new Error('Call failed') })).rejects.toThrow('Call failed')
  expect(mocks.close).toHaveBeenCalledTimes(3)
})
it('rejects absent authorization, empty allowlists and insecure URLs before connection', async () => {
  await expect(withAgentCoreTools('', ['readRoute'], vi.fn())).rejects.toThrow()
  await expect(withAgentCoreTools('token', [], vi.fn())).rejects.toThrow()
  vi.stubEnv('AGENTCORE_GATEWAY_URL', 'http://localhost/mcp')
  await expect(withAgentCoreTools('token', ['readRoute'], vi.fn())).rejects.toThrow('HTTPS')
  expect(mocks.create).not.toHaveBeenCalled()
})
