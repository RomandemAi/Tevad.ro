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

function parseJsonFromRaw(rawText: string): ModelResult | null {
  const cleaned = rawText.replace(/```json|```/g, '').trim()
  if (!cleaned.startsWith('{') || !cleaned.endsWith('}')) return null
  try {
    return JSON.parse(cleaned) as ModelResult
  } catch {
    return null
  }
}

export async function runAnthropicModel(
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
    const parsed = parseJsonFromRaw(rawText)
    return { parsed, rawText }
  } catch (e) {
    console.warn(`[model-runner] Anthropic ${model} failed:`, (e as Error).message)
    return null
  }
}

const XAI_BASE_URL = 'https://api.x.ai/v1' as const
export const GROK_MODEL = 'grok-4.20-reasoning' as const

export async function runGrokModel(
  userPrompt: string,
  systemPrompt: string
): Promise<ModelRunOutput | null> {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(`${XAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        temperature: 0,
        max_tokens: 650,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    const rawJson = (await res.json()) as any
    if (!res.ok) {
      const errSnippet = JSON.stringify(rawJson ?? {}).slice(0, 600)
      console.warn(`[model-runner] Grok HTTP ${res.status}:`, errSnippet)
      return null
    }
    const rawText = String(rawJson?.choices?.[0]?.message?.content ?? '')
    const parsed = parseJsonFromRaw(rawText)
    return { parsed, rawText }
  } catch (e) {
    console.warn(`[model-runner] Grok failed:`, (e as Error).message)
    return null
  }
}

/**
 * Backwards-compatible entrypoint used across the verifier.
 * - Anthropic models are passed through as-is
 * - Grok can be invoked by passing GROK_MODEL
 */
export async function runVerificationModel(
  model: string,
  userPrompt: string,
  systemPrompt: string
): Promise<ModelRunOutput | null> {
  if (model === GROK_MODEL) return runGrokModel(userPrompt, systemPrompt)
  return runAnthropicModel(model, userPrompt, systemPrompt)
}

/** Loads the public prompt once; use for parallel calls with same system text. */
export function getVerificationSystemPrompt(): string {
  return loadNeutralitySystemPrompt()
}
