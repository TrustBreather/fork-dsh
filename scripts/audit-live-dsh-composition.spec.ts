import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { launchWebScaffold } from '../apps/web/tests/scaffold.ts'
import { SessionId } from '@deepseek-ai/dsh-session'

/** Measure the real source-plane Web composition without making a model call. */
it('reports the selected BackendOS overlay tool assembly', async () => {
  const scaffold = await launchWebScaffold({
    deepSeekMissingCredential: true,
    extraOverlayPath: resolve(process.cwd(), 'backend-os.patch.yml'),
  })
  try {
    const handle = await scaffold.ctx.agents.create({
      sessionId: SessionId('audit-live-dsh-composition'),
      setup: agentCtx => scaffold.ctx.agentPresets.mount(agentCtx).then(() => undefined),
    })
    try {
      const schemas = scaffold.ctx.tools.schemas(handle.agent)
      const assembly = await scaffold.ctx.systemPrompt.assemble({ scope: handle.agent })
      const names = schemas.map(schema => schema.name)
      const duplicateNames = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))]
      const result = {
        toolSchemaCount: schemas.length,
        assemblyToolCount: assembly.tools.length,
        uniqueToolCount: new Set(names).size,
        duplicateNames,
        systemPromptChars: assembly.sections.reduce((total, section) => total + section.text.length, 0),
        schemas: names,
      }
      console.log(JSON.stringify(result, null, 2))
      expect(result.toolSchemaCount).toBeLessThan(100)
      expect(result.assemblyToolCount).toBe(result.toolSchemaCount)
      expect(result.duplicateNames).toEqual([])
    } finally {
      await handle.dispose()
    }
  } finally {
    await scaffold.close()
  }
}, 120_000)
