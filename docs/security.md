# Security guide

English | [中文](security.zh.md)

Security considerations, best practices, and built-in safeguards when using DeepSeek Harness in production.

## Threat model

The harness operates as an autonomous agent that executes code, accesses the file system, makes network requests, and interacts with LLMs. The primary threats are:

- **Code injection**: Malicious prompts or tool outputs that execute unintended commands.
- **Data leakage**: Sensitive information exposed to the LLM or logged.
- **Resource exhaustion**: Infinite loops or excessive computation.
- **Unauthorized access**: Insufficient authentication or authorization.
- **Credential theft**: API keys or secrets exposed.

## Built-in safeguards

### Sandboxing

Use the `ctx.sandbox` service to isolate subprocess and file system operations. Available backends:
- **Local**: No isolation (development only).
- **E2B**: Cloud-based sandbox with network and resource limits.
- **Landlock**: Linux kernel-level sandbox (via `native/landlock-run`).

Enable in config:

```yaml
plugins:
  - id: dsh-sandbox-e2b
    config:
      apiKey: ${E2B_API_KEY}
      timeout: 60000
```

### Permission policies

The `interaction` plugin enforces approval policies for dangerous operations:

```yaml
plugins:
  - id: dsh-interaction-approval
    config:
      requireApproval: true
      blockPatterns:
        - "rm -rf /"
        - "> /dev/sda"
```

### Tool restrictions

Restrict tools per scope or globally:

```ts
ctx.tools.restrict(agentScope, (tool) => tool.name !== 'dangerous_tool')
```

### Credential management

The `credentials` plugin provides secure storage and injection:

```yaml
plugins:
  - id: dsh-credentials-env
    config:
      source: .env
      required:
        - DEEPSEEK_API_KEY
```

Credentials are never logged or exposed to the model unless explicitly injected via `agent.inject()`.

### Input validation

All tool parameters are validated against the tool's schema before execution. The harness rejects malformed or extra keys unless `additionalProperties: true` is explicitly set.

## Best practices

1. **Never hardcode secrets** in code or config. Use environment variables or a secrets manager.
2. **Enable sandboxing** for all subprocess and file system operations in production.
3. **Set timeouts** on tools and agent loops to prevent resource exhaustion.
4. **Use least privilege** for tool permissions; restrict dangerous tools (e.g., `bash`, `write_file`) to specific agents or scopes.
5. **Audit session logs** for sensitive data; the log is durable and may contain user inputs and model outputs.
6. **Encrypt at rest** the SQLite database and session log files if they store sensitive information.
7. **Regularly update** the harness to get security patches.

## Secure configuration template

```yaml
plugins:
  - id: dsh-sandbox-e2b
    config:
      apiKey: ${E2B_API_KEY}
  - id: dsh-interaction-approval
    config:
      requireApproval: true
      blockPatterns: ["rm -rf /", ":(){:|:&};:"]
  - id: dsh-tools-restrict
    config:
      blocklist: ["bash", "subprocess"]  # disallow shell execution
  - id: dsh-credentials-env
    config:
      source: /secrets/.env
      required: ["DEEPSEEK_API_KEY"]
  - id: dsh-guard-tool-timeout
    config:
      timeout: 30000  # 30 seconds per tool
```

## Incident response

If a security incident occurs:

1. **Revoke compromised credentials** immediately.
2. **Disable the affected agent** or session.
3. **Investigate logs** to determine the scope and impact.
4. **Patch** the vulnerability and deploy the fix.
5. **Document** the incident in a postmortem (see [postmortem/](postmortem/README.md)).

## Reporting vulnerabilities

Please report security vulnerabilities privately to security@deepseek.com. Do not file public issues.

## Reference

- [Defensive patterns](defensive-patterns.md) for code-level safety.
- [Credentials subsystem](subsystems/credentials.md) for credential handling.
- [Sandbox subsystem](subsystems/sandbox.md) for isolation.
