#!/usr/bin/env node

/**
 * Read-only source-evidence audit for an unexpectedly large OpenAI `tools` array.
 *
 * This script never boots dsh, starts BackendOS, writes a fixture, or changes
 * the worktree. It compares the captured wire evidence with the source-side
 * manifests, BackendOS configuration, and committed DSH tool-schema fixtures.
 */

import { readFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { basename, resolve } from 'node:path'

function option(name, fallback) {
  const index = process.argv.indexOf(name)
  return index >= 0 && process.argv[index + 1] !== undefined
    ? process.argv[index + 1]
    : fallback
}

function read(path) {
  return readFileSync(path, 'utf8')
}

function json(path) {
  return JSON.parse(read(path))
}

function countAvailableTools(text) {
  const start = text.indexOf('[AVAILABLE TOOLS]')
  const end = text.indexOf('[EXPECTED BEHAVIOR]', start)
  if (start < 0 || end < 0) return { count: null, names: [] }
  const body = text.slice(start, end)
  const names = [...body.matchAll(/^[- ]+([A-Za-z_][A-Za-z0-9_-]*):/gm)]
    .map(match => match[1])
    .filter(name => !['Purpose', 'Rules', 'CRITICAL'].includes(name))
  return { count: names.length, names }
}

function toolCountInFixture(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.initial)) return value.initial
  if (Array.isArray(value?.tools)) return value.tools
  return undefined
}

function toolName(tool) {
  return tool?.function?.name ?? tool?.name
}

function duplicateNames(tools) {
  const counts = new Map()
  for (const tool of tools) {
    const name = toolName(tool) ?? '<unnamed>'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name, count]) => ({ name, count }))
}

function fileInfo(path) {
  const stat = statSync(path)
  return { path, bytes: stat.size, mtime: stat.mtime.toISOString() }
}

function gitStatus(root) {
  try {
    return execFileSync('git', ['status', '--short', '--untracked-files=all'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim().split(/\r?\n/).filter(Boolean)
  } catch (error) {
    return [`ERROR: git status failed: ${error instanceof Error ? error.message : String(error)}`]
  }
}

function gitChangedFiles(root) {
  return gitStatus(root)
    .map(line => line.slice(3).trim())
    .filter(path => /(?:tool|prompt|agent|llm|bundle|patch|preset|skill|mcp)/i.test(path))
}

const harnessRoot = resolve(option('--harness', process.cwd()))
const backendRoot = resolve(option('--backend', resolve(harnessRoot, '..', 'backend-os-kernel-integrated')))
const headlessRoot = resolve(option('--headless', resolve(harnessRoot, '..', '..', 'tools', 'BackendOS_Contract_Parts', 'plugin', 'DeepSeek-Headless')))
const attachmentPath = option('--attachment', '')
const bridgeLogPath = option('--log', resolve(backendRoot, 'bridge_debug.log'))
const bridgeSettingsPath = resolve(backendRoot, 'bridge_settings.json')
const manifestPath = resolve(headlessRoot, 'backend_os_plugin.json')
const backendPatchPath = resolve(harnessRoot, 'backend-os.patch.yml')
const piAiAdapterPath = resolve(harnessRoot, 'packages', 'llm', 'llm-pi-ai', 'src', 'adapter.ts')

const bridgeSettings = json(bridgeSettingsPath)
const manifest = json(manifestPath)
const bridgeLog = read(bridgeLogPath)
const backendPatch = read(backendPatchPath)
const piAiAdapter = read(piAiAdapterPath)
const received = [...bridgeLog.matchAll(/Received (\d+) tools/g)].map(match => Number(match[1]))
const enabledPlugins = (Array.isArray(bridgeSettings.plugins) ? bridgeSettings.plugins : [])
  .filter(plugin => plugin?.enabled === true)
const appendedPluginTools = enabledPlugins.flatMap(plugin => [
  ...(Array.isArray(plugin.tools) ? plugin.tools : []),
  ...(plugin.tool && plugin.endpoints ? [plugin.tool] : []),
])

const snapshotPaths = execFileSync('rg', [
  '--files', 'snapshots',
], { cwd: harnessRoot, encoding: 'utf8' })
  .trim().split(/\r?\n/).filter(path => /tool-schemas\.expected\.json$/.test(path))

const snapshotRows = []
for (const relativePath of snapshotPaths) {
  try {
    const tools = toolCountInFixture(json(resolve(harnessRoot, relativePath)))
    if (tools !== undefined) {
      snapshotRows.push({
        path: relativePath,
        count: tools.length,
        unique: new Set(tools.map(toolName)).size,
        duplicates: duplicateNames(tools),
      })
    }
  } catch {
    // Ignore non-JSON or malformed derivative files; the source audit remains usable.
  }
}

const attachment = attachmentPath === ''
  ? undefined
  : {
      ...fileInfo(attachmentPath),
      ...countAvailableTools(read(attachmentPath)),
    }

const result = {
  sourceEvidence: {
    harness: fileInfo(harnessRoot),
    backend: fileInfo(backendRoot),
    headless: fileInfo(headlessRoot),
    bridgeLog: fileInfo(bridgeLogPath),
    attachment,
  },
  backend: {
    receivedCounts: received,
    enabledPluginCount: enabledPlugins.length,
    enabledPluginIds: enabledPlugins.map(plugin => plugin.id ?? '<unnamed>'),
    enabledPluginToolCount: appendedPluginTools.length,
    enabledPluginToolNames: appendedPluginTools.map(toolName),
    backendSystemPromptEnabled: bridgeSettings.backend_system_prompt_enabled === true,
    backendSystemPromptChars: String(bridgeSettings.backend_system_prompt ?? '').length,
    nativeGrammar: bridgeSettings.use_native_grammar_protocol === true,
    nativeGrammarBatch: bridgeSettings.use_native_grammar_batch_mode === true,
    backendPatchToolUpdateDeclarations: [...backendPatch.matchAll(/toolUpdate\s*:/g)].length,
    piAiModelInfoToolUpdateMentions: [...piAiAdapter.matchAll(/toolUpdate/g)].length,
  },
  headless: {
    manifestId: manifest.id,
    manifestToolNames: [toolName(manifest.tool)].filter(Boolean),
    endpointCount: Object.keys(manifest.endpoints ?? {}).length,
  },
  dshSnapshots: {
    fixtureCount: snapshotRows.length,
    maxCount: Math.max(0, ...snapshotRows.map(row => row.count)),
    rows: snapshotRows.sort((left, right) => right.count - left.count).slice(0, 20),
  },
  dirtyRelevantFiles: gitChangedFiles(harnessRoot),
}

const maxSnapshot = result.dshSnapshots.maxCount
const maxReceived = Math.max(0, ...received)
const attachmentCount = attachment?.count ?? null
result.verdict = {
  backendAdds236: maxReceived > 0 && result.backend.enabledPluginToolCount >= maxReceived,
  backendHasEnabledPluginAppend: result.backend.enabledPluginToolCount > 0,
  headlessManifestExplains236: result.headless.manifestToolNames.length >= 236,
  dshSnapshotExplains236: maxSnapshot >= 236,
  attachmentMatchesLogCount: attachmentCount !== null && received.includes(attachmentCount),
  likelyUpstreamOrSourceMismatch:
    maxReceived >= 236
    && result.backend.enabledPluginToolCount === 0
    && result.headless.manifestToolNames.length < 236
    && maxSnapshot < 236
    && attachmentCount !== 236,
}

console.log(JSON.stringify(result, null, 2))
