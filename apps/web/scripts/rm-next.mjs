import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(fileURLToPath(new URL('.', import.meta.url)), '..', '.next')
try {
  rmSync(dir, { recursive: true, force: true })
  console.log('Removed', dir)
} catch {
  // ignore
}
