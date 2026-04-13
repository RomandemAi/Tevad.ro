import Anthropic from '@anthropic-ai/sdk'
import { loadNeutralitySystemPrompt } from './neutrality-prompt'
import type { ModelResult } from './blind-types'

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  // Don't throw here; callers already handle failures and downgrade to pending.
  return new Anthropic({ apiKey: apiKey || undefined })
}

export interface ModelRunOutput {
  parsed: ModelResult | null
  rawText: string
}

export async function runVerificationModel(
  model: string,
  userPrompt: string,
  systemPrompt: string
): Promise<ModelRunOutput | null> {
  try {
    const anthropic = getClient()
    const response = await anthropic.messages.create({
      model,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = rawText.replace(/```json|```/g, '').trim()
    try {
      const parsed = JSON.parse(cleaned) as ModelResult
      return { parsed, rawText }
    } catch {
      return { parsed: null, rawText }
    }
  } catch (e) {
    console.warn(`[model-runner] Model ${model} failed:`, (e as Error).message)
    return null
  }
}

/** Loads the public prompt once; use for parallel calls with same system text. */
export function getVerificationSystemPrompt(): string {
  return loadNeutralitySystemPrompt()
}
