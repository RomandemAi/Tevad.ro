import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'

/**
 * Loads the public system prompt from prompts/neutrality-system-prompt.md.
 * The fenced ``` block is extracted verbatim for the Anthropic API `system` field.
 */
export function loadNeutralitySystemPrompt(): string {
  const candidates = [
    // Typical monorepo (repo root prompts/)
    resolve(process.cwd(), 'prompts/neutrality-system-prompt.md'),
    // Netlify/Next may execute from apps/web
    resolve(process.cwd(), 'apps/web/prompts/neutrality-system-prompt.md'),
    // Relative to compiled verifier location
    join(__dirname, '../../../prompts/neutrality-system-prompt.md'),
    join(__dirname, '../../../apps/web/prompts/neutrality-system-prompt.md'),
  ]

  const promptPath = candidates.find(p => existsSync(p))
  if (!promptPath) {
    throw new Error(`neutrality-system-prompt.md not found. Tried:\n- ${candidates.join('\n- ')}`)
  }

  const content = readFileSync(promptPath, 'utf-8')
  const match = content.match(/```(?:\w*\n)?([\s\S]+?)```/)
  if (!match) {
    throw new Error(
      'neutrality-system-prompt.md: no fenced prompt block found (expected ``` ... ```)'
    )
  }
  return match[1].trim()
}
