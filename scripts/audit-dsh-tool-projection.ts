import { projectToolUpdates } from '../packages/llm/llm/src/content.ts'
import type { ToolSchema } from '../packages/llm/llm/src/types.ts'

/**
 * Exercise the DSH route projection that runs immediately before an adapter
 * receives `GenerateOptions`. This is synthetic and has no network, process,
 * filesystem, session, or runtime side effect.
 */

const schema = (name: string): ToolSchema => ({
  name,
  description: `synthetic ${name}`,
  parameters: { type: 'object', properties: {} },
})

const currentTools = Array.from({ length: 30 }, (_, index) => schema(`current_${index}`))
const historicalTools = [
  ...currentTools,
  ...Array.from({ length: 206 }, (_, index) => schema(`historical_${index}`)),
]
const history = { tools: historicalTools, updates: [] }

const cases = [
  { name: 'route has no toolUpdate', mode: undefined, expected: 30 },
  { name: 'route uses addition-only', mode: 'addition-only' as const, expected: 30 },
  { name: 'route uses in-history', mode: 'in-history' as const, expected: 236 },
]

const results = cases.map((testCase) => {
  const projected = projectToolUpdates([], currentTools, testCase.mode, history)
  const count = projected.tools?.length ?? 0
  const unique = new Set(projected.tools?.map(tool => tool.name)).size
  const pass = count === testCase.expected && unique === count
  return { ...testCase, actual: count, unique, pass }
})

const failed = results.filter(result => !result.pass)
console.log(JSON.stringify({
  currentToolCount: currentTools.length,
  historicalToolCount: historicalTools.length,
  results,
}, null, 2))

if (failed.length > 0) {
  throw new Error(`projection matrix failed: ${failed.map(result => result.name).join(', ')}`)
}
