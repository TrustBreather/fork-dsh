import { spawn } from 'node:child_process'

const node = 'D:\\node.exe'
const entry = 'C:\\Users\\NCO\\OneDrive\\Desktop\\New folder (22)\\rea\\scripts\\rea.mjs'
const child = spawn(node, [entry, 'mcp'], { stdio: ['pipe', 'pipe', 'inherit'] })

let buffer = ''
let settled = false
let timer

const finish = (error, result) => {
  if (settled) return
  settled = true
  clearTimeout(timer)
  child.kill()
  if (error) {
    console.error(error instanceof Error ? error.stack : error)
    process.exitCode = 1
    return
  }
  const tools = Array.isArray(result?.tools) ? result.tools : []
  const names = tools.map(tool => tool?.name).filter(name => typeof name === 'string')
  const duplicates = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))]
  console.log(JSON.stringify({
    pid: child.pid,
    count: tools.length,
    unique: new Set(names).size,
    duplicates,
    first: names.slice(0, 12),
    last: names.slice(-12),
  }, null, 2))
}

function send(message) {
  child.stdin.write(`${JSON.stringify(message)}\n`)
}

child.stdout.on('data', chunk => {
  buffer += chunk.toString()
  for (;;) {
    const newline = buffer.indexOf('\n')
    if (newline < 0) break
    const line = buffer.slice(0, newline).trim()
    buffer = buffer.slice(newline + 1)
    if (line === '') continue
    try {
      const message = JSON.parse(line)
      if (message.id === 1) {
        send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })
        send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
      } else if (message.id === 2) {
        finish(undefined, message.result)
      }
    } catch {
      // Ignore startup diagnostics that are not JSON-RPC frames.
    }
  }
})

child.on('error', error => finish(error))
child.on('exit', (code, signal) => {
  if (!settled) finish(new Error(`REA MCP exited before tools/list: code=${String(code)} signal=${String(signal)}`))
})

send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'dsh-tool-catalog-audit', version: '1.0.0' },
  },
})
timer = setTimeout(() => finish(new Error('REA MCP tools/list timed out')), 15_000)
