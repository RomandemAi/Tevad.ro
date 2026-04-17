/**
 * Minimal call to xAI Grok — validates API key, HTTP, and JSON parsing path used by cross-check.
 *
 *   XAI_API_KEY=... npm run grok:smoke -w @tevad/verifier
 */
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { runGrokModel } from './model-runner'

function loadEnvFiles(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), 'apps/web/.env.local'),
    resolve(process.cwd(), '..', '.env'),
    resolve(process.cwd(), '..', '..', '.env'),
  ]
  for (const p of candidates) {
    if (!existsSync(p)) continue
    const text = readFileSync(p, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i <= 0) continue
      const k = t.slice(0, i).trim()
      let v = t.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (process.env[k] === undefined) process.env[k] = v
    }
    return
  }
}

const system = `You must output exactly one JSON object and nothing else (no markdown).
Keys: verdict (string: true|false|partial|pending), confidence (number 0-100), reasoning (string),
canBeDecided (boolean), requiresMoreSources (boolean).
For this smoke test set verdict to "pending", confidence 0, reasoning "grok-smoke-ok",
canBeDecided false, requiresMoreSources true.`

const user = `Reply with only the JSON object described in the system message.`

async function main(): Promise<void> {
  loadEnvFiles()
  const key = (process.env.XAI_API_KEY || '').trim()
  if (!key) {
    console.error('[grok-smoke] Missing XAI_API_KEY in environment.')
    process.exit(1)
  }

  const out = await runGrokModel(user, system)
  if (!out) {
    console.error('[grok-smoke] runGrokModel returned null (see warnings above).')
    process.exit(1)
  }

  const p = out.parsed
  if (!p || typeof p.verdict !== 'string') {
    console.error('[grok-smoke] Unparsable or invalid JSON. Raw (truncated):', out.rawText.slice(0, 800))
    process.exit(1)
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        verdict: p.verdict,
        confidence: p.confidence,
        canBeDecided: p.canBeDecided,
        requiresMoreSources: p.requiresMoreSources,
        raw_len: out.rawText.length,
      },
      null,
      2
    )
  )
}

main().catch(e => {
  console.error('[grok-smoke] Fatal:', e)
  process.exit(1)
})
