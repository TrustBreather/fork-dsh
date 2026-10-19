/** Run Vite with a repository-local temporary directory for esbuild. */

import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const tempDirectory = resolve(root, '.cache', 'dsh-vite-tmp')
mkdirSync(tempDirectory, { recursive: true })

const result = spawnSync(
  process.execPath,
  [resolve(root, 'apps', 'web', 'node_modules', 'vite', 'bin', 'vite.js'), ...process.argv.slice(2)],
  {
    cwd: resolve(root, 'apps', 'web'),
    env: { ...process.env, TEMP: tempDirectory, TMP: tempDirectory },
    stdio: 'inherit',
  },
)

if (result.error !== undefined) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
