# Plugin authoring guide

English | [中文](plugins.zh.md)

Reference for creating, registering, and configuring plugins in DeepSeek Harness. The [Cordis primer](cordis-primer.md) introduces the ideas; this guide adds harness-specific conventions. For a hands-on first plugin, follow the [Build a plugin](../user/develop/basic/index.md) tutorial.

## What is a plugin

A plugin is a Cordis `Service` implementation that contributes behavior to the agent harness. Every plugin declares its dependencies (`inject`), its configuration schema, and its lifecycle methods (`apply`). Plugins mount into a `Context` and register effects—tools, prompt sections, service providers, event listeners, or policies—that unwind when the plugin unloads.

## Plugin structure

A plugin is one of:

- **Function plugin**: an object with optional `inject` and `apply(ctx)` fields.
- **Class plugin**: a `Service` subclass whose constructor receives `ctx` and whose `apply()` method runs the mount logic.

### Minimal function plugin

```ts
import type { Context } from '@deepseek-ai/cordis'

export const inject = ['tools']  // required services
export const config = {
  enabled: { type: 'boolean', default: true },
}

export function apply(ctx: Context, config: typeof config) {
  if (!config.enabled) return
  ctx.tools.register(/* tool */)
}
```

### Class plugin

```ts
import { Service } from '@deepseek-ai/cordis'

export class MyPlugin extends Service {
  static inject = ['tools']
  static config = {
    timeout: { type: 'number', default: 30000 },
  }

  constructor(ctx: Context, config: typeof MyPlugin.config) {
    super(ctx, 'myPlugin')
    // store config and initialize state
  }

  apply() {
    // mount logic — registers effects, listeners, providers
    this.ctx.tools.register(/* tool */)
  }
}
```

## Registration patterns

### Effect-based registration

Use `ctx.effect()` for contributions that must be undone on unload. The returned disposer runs when the plugin fiber disposes.

```ts
const dispose = ctx.effect(() => {
  // setup
  const listener = (event) => { /* handle */ }
  ctx.on('session/event', listener)
  return () => { ctx.off('session/event', listener) }
})
```

Cordis helpers like `ctx.tools.register()` already return a disposer, so you can pass them directly:

```ts
ctx.effect(() => ctx.tools.register(toolDefinition))
```

### Event listeners

All listeners are registered through `ctx.on()`, `ctx.emit()`, `ctx.waterfall()`, `ctx.parallel()`, or `ctx.serial()`. Waterfall listeners **must call `next()`** to delegate; returning without `next()` short-circuits the chain.

```ts
ctx.waterfall('tools/execute', (args, next) => {
  // pre-execution policy
  const result = await next(args)
  // post-execution processing
  return result
})
```

### Service providers

Register a service provider by implementing the Service Definition and calling `ctx.provide()`:

```ts
import { ShellExecutor } from '@deepseek-ai/dsh-shell'

export class MyShellProvider extends ShellExecutor {
  async execute(command: string, options: ExecuteOptions) {
    // implementation
  }
}

// in apply():
ctx.provide('shell', MyShellProvider, config)
```

## Configuration

Plugins declare their configuration schema using `@deepseek-ai/schemastery` types. Fields become settable through `cordis.yml` rows.

```ts
import { Schema } from '@deepseek-ai/schemastery'

export const config = Schema.object({
  enabled: Schema.boolean().default(true),
  timeout: Schema.number().min(1000).default(30000),
})
```

### cordis.yml entry

```yaml
plugins:
  - id: my-plugin
    config:
      enabled: true
      timeout: 60000
```

## Lifecycle

| Phase | Hook | Description |
|-------|------|-------------|
| Load | `constructor` | Plugin instantiated; dependencies not yet available |
| Start | `apply()` | Dependencies are injected; mount contributions |
| Update | config reload | Plugin reconfigured; `apply()` re-runs after disposal |
| Unload | disposer chain | Disposers run in reverse registration order |

A plugin must not assume its `apply()` runs only once. Configuration changes may reload the plugin; design registration as idempotent effects.

## Best practices

- **Declare dependencies explicitly** in `inject`. Load order is service-driven, not manual.
- **Keep apply() synchronous** for mount logic; use `ctx.defer()` for async setup that must complete before the plugin is considered ready.
- **Use scoped registrations** for per-agent contributions: register through `agent.ctx` instead of the root context to make the contribution visible only to that agent's scope.
- **Never hardcode tunables** in plugin logic. Deployment-varying choices are `Config` fields.
- **Test with a real composition** for product-visible plugins. Hand-built `ctx.plugin()` suites are insufficient; boot `cordis.yml` through the Loader and assert model-visible output or durable state.

## Verification

Follow the [repository testing policy](../testing.md). A shipped plugin change requires:

- Unit tests for the plugin's core logic
- A built-artifact smoke test if the plugin includes a runtime entry
- Snapshot coverage if the plugin changes model-visible or human-visible output

Run `pnpm run doc-sync` to validate this page's cross-references and type-equiv fences (if any).
