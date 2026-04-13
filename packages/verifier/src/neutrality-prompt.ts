import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Loads the public system prompt from prompts/neutrality-system-prompt.md.
 * The fenced ``` block is extracted verbatim for the Anthropic API `system` field.
 */
export function loadNeutralitySystemPrompt(): string {
  const promptPath = join(__dirname, '../../../prompts/neutrality-system-prompt.md')
  const content = readFileSync(promptPath, 'utf-8')
  const match = content.match(/```(?:\w*\n)?([\s\S]+?)```/)
  if (!match) {
    throw new Error(
      'neutrality-system-prompt.md: no fenced prompt block found (expected ``` ... ```)'
    )
  }
  return match[1].trim()
}
