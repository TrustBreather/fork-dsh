# Troubleshooting guide

English | [中文](troubleshooting.zh.md)

Common issues when developing, deploying, or running DeepSeek Harness, with diagnostic steps and resolutions.

## Installation and setup

### `pnpm install` fails

**Symptoms**: dependency resolution errors, network timeouts, or missing native modules.

**Diagnosis**:
- Check Node.js version: `node --version` (must be 22.19+ or 24+).
- Ensure Corepack is enabled: `corepack enable`.
- Check network connectivity to npm registry.

**Resolution**:
```bash
# Clear cache and retry
pnpm store prune
pnpm install --force
```

### `pnpm run typecheck` fails

**Symptoms**: TypeScript errors in packages.

**Diagnosis**:
- Run `pnpm run build` first to ensure type references are up-to-date.
- Check for missing dependencies in `package.json`.
- Look for `any` types that need explicit explanation.

**Resolution**: Fix the reported type errors. Use `// @ts-expect-error` only with a comment explaining why it's safe.

## Build and test

### `pnpm run test:coverage` fails with coverage below 100%

**Symptoms**: Coverage report shows uncovered lines in a package.

**Diagnosis**:
- Open the coverage report (`coverage/index.html`) to see which lines are missing.
- Determine if the lines are dead code (delete them) or need tests (add them).
- Note: coverage is per-file, not global; each file must reach 100%.

**Resolution**: Add unit tests for the uncovered functions or delete the dead code.

### Snapshot tests fail

**Symptoms**: `pnpm run test:snapshot` reports mismatched expected outputs.

**Diagnosis**:
- A change in model behavior, tool output, or presentation logic occurred.
- Run `pnpm run test:snapshot:record` to record new expected outputs (requires `DEEPSEEK_API_KEY`).
- Review the diff to confirm it's intended.

**Resolution**: If the change is intentional, commit the updated snapshots. If not, revert the offending change.

### E2E tests skip without key

**Symptoms**: `pnpm run test:e2e` shows skipped tests and exits green.

**Diagnosis**: The tests require `DEEPSEEK_API_KEY` in the environment. They skip automatically when the key is absent.

**Resolution**: Set `DEEPSEEK_API_KEY` in `.env` or as an environment variable. If you don't have a key, the skips are normal.

## Runtime issues

### `dsh` command not found

**Symptoms**: `dsh: command not found` when running from source.

**Diagnosis**: The source-launch uses `pnpm dsh` or `node --import tsx`; the `dsh` binary is only available after `pnpm run build`.

**Resolution**:
- Use `pnpm dsh --profile headless "..."` for source-run.
- Or build and link: `pnpm run build && pnpm link` then use `dsh`.

### Session persistence errors

**Symptoms**: `SQLITE_CORRUPT` or `schema version mismatch` when loading sessions.

**Diagnosis**: The session database schema changed between versions. The harness rejects mismatched versions.

**Resolution**:
- Export old sessions using a previous version.
- Remove or migrate the database file (default: `~/.dsh/sessions.db`).
- Set `DSH_SESSION_DIR` to a fresh location if needed.

### Tool execution hangs or times out

**Symptoms**: A tool call never returns or exceeds the timeout limit.

**Diagnosis**:
- Check the `tool/timeout` configuration in cordis.yml.
- The tool might be stuck in I/O or an infinite loop.
- The `guard` plugin may be blocking the call.

**Resolution**:
- Increase the timeout for that tool.
- Kill the session and restart.
- Use `ctx.jobs` for long-running background work.

### LLM provider errors (e.g., quota exceeded, rate limit)

**Symptoms**: `429 Too Many Requests` or `insufficient_quota` in logs.

**Diagnosis**: Check the provider's usage dashboard.

**Resolution**:
- Wait for quota reset or increase the limit.
- Implement retry with exponential backoff via `ctx.llm` interceptors.
- Switch to a different model provider.

## Performance issues

### Slow prompt assembly or model response

**Symptoms**: High latency between turns or during streaming.

**Diagnosis**:
- Check token count (see [Token meter](subsystems/token-meter.md)).
- Inspect system-prompt assembly overhead.
- Profile the model adapter for streaming bottlenecks.

**Resolution**:
- Reduce the number of prompt sections or tools.
- Use the `compaction` plugin to summarize long histories.
- Optimize tool schemas (smaller descriptions, fewer parameters).

## Windows-specific issues

### `node-pty` fails to build

**Symptoms**: `gyp ERR!` during `pnpm install` on Windows.

**Diagnosis**: The `node-pty` package requires Visual Studio Build Tools with the Windows SDK.

**Resolution**:
- Install the required tools:
  ```bash
  pnpm install --global windows-build-tools
  ```
- Or use the prebuilt binary (package ships with prebuilt binaries for common platforms).

### `pwsh` not found

**Symptoms**: `pwsh` tests or tools fail on Windows.

**Diagnosis**: PowerShell Core (`pwsh`) is required for the `pwsh-local` provider. If missing, tests skip.

**Resolution**: Install PowerShell Core from https://github.com/PowerShell/PowerShell.

## Getting help

- Search existing GitHub issues.
- Check the [documentation](README.md) for the relevant subsystem.
- Post a new issue with:
  - Version of the harness.
  - Full error stack and logs.
  - Steps to reproduce.
  - Platform details (OS, Node version).
