# TypeScript SDK

English | [中文](sdk-typescript.zh.md)

Reference for using the TypeScript SDK to interact with the DeepSeek Harness programmatically. The SDK exposes the agent loop, session management, and event stream through a typed client.

## Installation

```bash
pnpm add @deepseek-ai/dsh-sdk
```

The SDK is ESM-only and requires Node.js 22.19+ or 24+.

## Client setup

Create a client connected to a running harness instance (ACP, JSON-RPC, or direct in-process).

```ts
import { createClient } from '@deepseek-ai/dsh-sdk'

const client = createClient({
  transport: 'stdio',  // or 'http', 'ws'
  command: 'dsh',
  args: ['--profile', 'headless'],
})
```

For in-process usage (embedding in a Node.js app):

```ts
import { createHarness } from '@deepseek-ai/dsh-sdk'

const harness = await createHarness({
  profile: 'headless',
  config: { /* overrides */ }
})
```

## Session management

Create, fork, and resume sessions.

```ts
const session = await client.sessions.create()

// Send a prompt
const response = await session.send('Summarize this file')

// Fork a session
const forked = await session.fork()

// Resume a session by ID
const resumed = await client.sessions.get('session-id')
```

## Event stream

Listen to session events as they occur.

```ts
const stream = session.events()
for await (const event of stream) {
  switch (event.type) {
    case 'assistant/chunk':
      process.stdout.write(event.content)
      break
    case 'tool/call':
      console.log('Tool called:', event.name)
      break
    case 'session/complete':
      console.log('Session finished')
      break
  }
}
```

## Tool registration

Register custom tools dynamically.

```ts
import { defineTool } from '@deepseek-ai/dsh-sdk'

const tool = defineTool({
  name: 'calculate',
  description: 'Perform a calculation',
  parameters: {
    expression: { type: 'string', required: true },
  },
  async execute(args) {
    return eval(args.expression) // security: use a sandbox in production
  },
})

await session.registerTool(tool)
```

## Error handling

All SDK methods throw typed errors.

```ts
import { HarnessError } from '@deepseek-ai/dsh-sdk'

try {
  await session.send(prompt)
} catch (err) {
  if (err instanceof HarnessError) {
    console.error('Harness error:', err.code, err.message)
  }
}
```

## Type safety

The SDK is fully typed and infers parameter types from tool schemas. Use `InferArgs<T>` to derive argument types from a tool definition.

```ts
import type { InferArgs } from '@deepseek-ai/dsh-sdk'

type CalculateArgs = InferArgs<typeof calculateTool>
```

## Browser usage

The SDK also ships with a browser-compatible build for web clients. Import from `@deepseek-ai/dsh-sdk/web`.

```ts
import { createClient } from '@deepseek-ai/dsh-sdk/web'

const client = createClient({ transport: 'websocket', url: 'ws://localhost:3000' })
```

## Reference

- [API Reference](api-reference.md) for complete method listings.
- [Example JSON-RPC agent](../../examples/jsonrpc-agent) for a full implementation.
- [Session lifecycle](subsystems/session.md) for durable session semantics.
