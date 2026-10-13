import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ generate: vi.fn(), provider: vi.fn(), credentials: vi.fn(), model: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('ai', () => ({ generateText: mocks.generate, Output: { object: (value: unknown) => value } }))
vi.mock('@ai-sdk/amazon-bedrock', () => ({ createAmazonBedrock: mocks.provider }))
vi.mock('@aws-sdk/credential-providers', () => ({ fromNodeProviderChain: mocks.credentials }))
import { translateWithBedrock } from './bedrock'
const description = 'Climb two exposed pitches at 5.10b.'
const output = { segments: [{ label: 'Climb', source: description, terrain: 'pitches', phase: 'ascent',
  count: 2, grade: '5.10b', exposed: true, distance: null, vertical: null }] }
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('AWS_REGION', 'us-west-2'); vi.stubEnv('BEDROCK_MODEL_ID', 'test-model')
  mocks.provider.mockReturnValue(mocks.model)
  mocks.model.mockReturnValue('model')
  mocks.generate.mockResolvedValue({ output, finishReason: 'stop' })
})
afterEach(() => vi.unstubAllEnvs())
it('uses the configured Bedrock model and a bounded structured request', async () => {
  expect(await translateWithBedrock(description)).toMatchObject([{ count: 2, grade: '5.10b' }])
  expect(mocks.model).toHaveBeenCalledWith('test-model')
  expect(mocks.credentials).toHaveBeenCalledOnce()
  expect(mocks.generate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    prompt: description, maxOutputTokens: 4096, maxRetries: 0, abortSignal: expect.any(AbortSignal),
    output: expect.objectContaining({ schema: expect.anything() }),
  }))
})
it('rejects missing configuration and invalid input before inference', async () => {
  for (const value of ['', 'x'.repeat(8001)]) await expect(translateWithBedrock(value)).rejects.toThrow()
  vi.stubEnv('BEDROCK_MODEL_ID', '')
  await expect(translateWithBedrock(description)).rejects.toThrow('BEDROCK_MODEL_ID')
  expect(mocks.generate).not.toHaveBeenCalled()
})
it('rejects truncation, invalid drafts, and unsupported source excerpts', async () => {
  for (const result of [{ output, finishReason: 'length' }, { output: { segments: [] }, finishReason: 'stop' },
    { output: { segments: [{ ...output.segments[0], source: 'Invented route facts' }] }, finishReason: 'stop' }]) {
    mocks.generate.mockResolvedValueOnce(result)
    await expect(translateWithBedrock(description)).rejects.toThrow()
  }
})
it('propagates provider failure without an application retry', async () => {
  mocks.generate.mockRejectedValue(new Error('Provider unavailable'))
  await expect(translateWithBedrock(description)).rejects.toThrow('Provider unavailable')
  expect(mocks.generate).toHaveBeenCalledOnce()
})
