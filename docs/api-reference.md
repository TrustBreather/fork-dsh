# API Reference

English | [中文](api-reference.zh.md)

Complete API reference for the DeepSeek Harness core interfaces, services, and event types. This page lists the main entry points; detailed subsystem API documentation lives in [subsystems/](subsystems/README.md).

## Core services

The harness exposes the following context keys (available via `ctx.<key>` in plugins):

| Key | Type | Description |
|-----|------|-------------|
| `ctx.sessions` | `SessionService` | Durable session management |
| `ctx.agents` | `AgentService` | Agent registry and execution |
| `ctx.agentLoop` | `AgentLoop` | Default agent driver |
| `ctx.llm` | `LLMService` | Model adapter and streaming |
| `ctx.tools` | `ToolRegistry` | Tool definition and execution |
| `ctx.systemPrompt` | `SystemPromptService` | Prompt assembly |
| `ctx.shell` | `ShellExecutor` | Shell command execution |
| `ctx.fs` | `FileSystemService` | File system operations |
| `ctx.web` | `WebRuntime` | Web search and fetch |
| `ctx.subprocess` | `SubprocessService` | Subprocess management |
| `ctx.sandbox` | `SandboxService` | Sandbox environment |
| `ctx.skill` | `SkillRegistry` | Skill management |

## Session API

### `SessionService`

- `create(options?: CreateSessionOptions): Promise<Session>`
- `get(sessionId: string): Promise<Session>`
- `list(filter?: SessionFilter): Promise<SessionSummary[]>`
- `fork(source: string, boundary?: string, childId?: string): Promise<Session>`
- `delete(sessionId: string): Promise<void>`

### `Session`

- `send(input: string | Message[]): AsyncIterable<SessionEvent>`
- `events(): AsyncIterable<SessionEvent>`
- `registerTool(tool: ToolDefinition): Promise<void>`
- `fork(boundary?: string, childId?: string): Promise<Session>`
- `resume(): Promise<void>`
- `close(): Promise<void>`

## Agent API

### `AgentService`

- `create(options: CreateAgentOptions): Promise<Agent>`
- `get(agentId: string): Promise<Agent>`
- `list(): Promise<AgentSummary[]>`
- `destroy(agentId: string): Promise<void>`

### `Agent`

- `run(input: string | Message[], options?: RunOptions): AsyncIterable<AgentEvent>`
- `inject(context: any): void`
- `scope: Scope` (scoped context for per-agent registrations)

## Tool API

### `ToolRegistry`

- `register(tool: ToolDefinition): Disposer`
- `get(name: string): ToolDefinition | undefined`
- `list(): ToolDefinition[]`
- `execute(name: string, args: any, exec: ExecutionContext): Promise<any>`
- `restrict(scopeKey: any, filter: (tool: ToolDefinition) => boolean): Disposer`

### `defineTool`

Creates a typed tool definition. See [Tool authoring reference](cookbook/adding-a-tool.md).

```ts
const tool = defineTool({
  name: string,
  description: string,
  parameters: ParameterSchema,
  output?: OutputSchema,
  execute: (args: any, exec: ExecutionContext) => Promise<any>,
  presentCall?: (args: any) => ToolCallView,
  presentResult?: (args: any, result: any) => ToolResultView,
})
```

## Event types

All session events are defined in `SessionEventMap`. Key events:

| Event | Description |
|-------|-------------|
| `session/created` | Session initialized |
| `user/message` | User input recorded |
| `assistant/chunk` | Streaming model output |
| `tool/call` | Tool invocation requested |
| `tool/result` | Tool execution completed |
| `session/complete` | Session concluded |

See [subsystems/session.md](subsystems/session.md) for the full event map.

## Configuration catalog

All configuration fields are documented in [config-catalog.md](config-catalog.md). Use `dsh --dump-config` to inspect the active configuration.

## Persistence catalog

Data storage schemas and migration policies are in [persistence-catalog.md](persistence-catalog.md).

## Tool catalog

All built-in tools are listed in [tool-catalog.md](tool-catalog.md).
