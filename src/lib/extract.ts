import Anthropic from '@anthropic-ai/sdk'

// Model used for all document extraction. Centralised so it can be bumped in
// one place. claude-sonnet-4-6 is the current Sonnet — stronger at messy
// real-world document extraction than the previous claude-sonnet-4-20250514.
export const EXTRACTION_MODEL = 'claude-sonnet-4-6'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type ContentBlock = Record<string, unknown>

/**
 * Run a document extraction by forcing Claude to call a single tool whose
 * input_schema describes the data we want. Because we force the tool, the
 * model returns a structured object in the tool_use block — the SDK parses it
 * for us, so there is no markdown-fence stripping and no JSON.parse that can
 * throw on truncated or prose-wrapped output (the previous failure mode that
 * caused whole documents to silently extract nothing).
 *
 * Returns the parsed object, or null if no tool call came back (rare). Network
 * / API errors propagate to the caller's existing try/catch.
 */
export async function extractStructured<T = Record<string, unknown>>(opts: {
  content: ContentBlock[]
  toolName: string
  toolDescription: string
  schema: Record<string, unknown>
  maxTokens?: number
  system?: string
}): Promise<T | null> {
  const { content, toolName, toolDescription, schema, maxTokens = 8000, system } = opts

  const response = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    tools: [{ name: toolName, description: toolDescription, input_schema: schema as any }],
    tool_choice: { type: 'tool', name: toolName },
    messages: [{ role: 'user', content: content as any }],
  })

  const block = response.content.find((b: any) => b.type === 'tool_use') as any
  return block ? (block.input as T) : null
}
