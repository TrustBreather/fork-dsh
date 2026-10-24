/** Cordis Loader configuration file discovery. */

import { existsSync, globSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const configReferencePattern = /^(?:\.\.?[\\/])+(?:[^\\/\r\n]+[\\/])*[^\\/\r\n]+\.ya?ml$/u

/**
 * Test profiles may keep a one-line relative reference to a shared Loader file.
 * The reference is not itself Loader input, but a missing target remains an
 * invalid config so the discovery gate does not hide a broken path.
 * @param root Repository root containing the candidate file.
 * @param file Repository-relative candidate path.
 * @returns whether the candidate points to an existing shared Loader file.
 */
function isExistingConfigReference(root: string, file: string): boolean {
  const text = readFileSync(resolve(root, file), 'utf8').trim()
  if (!configReferencePattern.test(text)) return false
  return existsSync(resolve(root, dirname(file), text))
}

/**
 * Return repository-relative Cordis Loader YAML paths under `root`.
 *
 * Translation consistency records are YAML sidecars, never Loader inputs.
 *
 * @param root Repository root to scan.
 * @returns Sorted repository-relative Loader configuration paths.
 */
export function cordisConfigFiles(root: string): string[] {
  return globSync(['**/*cordis*.yml', '**/*cordis*.yaml'], {
    cwd: root,
    exclude: ['.claude/**', 'node_modules/**', 'vendor/**', '**/*.i18n.yaml'],
  }).filter(file => !isExistingConfigReference(root, file)).sort()
}
