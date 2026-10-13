import 'server-only'

import { createMCPClient } from '@ai-sdk/mcp'
import type { ToolSet } from 'ai'
import { requiredEnv } from './env'

/** JWT-authorized AgentCore Gateway tools; callers supply a fresh access token. */
export async function withAgentCoreTools<T>(
  accessToken: string,
  allowedNames: readonly string[],
  run: (tools: ToolSet) => Promise<T>,
): Promise<T> {
  if (!accessToken.trim() || !allowedNames.length) throw new Error('AgentCore token and tool allowlist are required')
  const url = new URL(requiredEnv('AGENTCORE_GATEWAY_URL'))
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('AgentCore requires an HTTPS gateway URL')
  const client = await createMCPClient({
    transport: { type: 'http', url: url.toString(), headers: { Authorization: `Bearer ${accessToken}` } },
  })
  try {
    const available = await client.tools()
    const selected: ToolSet = {}
    for (const name of allowedNames) {
      if (!Object.hasOwn(available, name)) throw new Error(`AgentCore tool unavailable: ${name}`)
      selected[name] = available[name]!
    }
    return await run(selected)
  } finally {
    await client.close()
  }
}
