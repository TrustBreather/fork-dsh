# Deployment guide

English | [中文](deployment.zh.md)

How to deploy DeepSeek Harness in production environments, including containerization, scaling, and operational considerations.

## Distribution formats

The Harness ships in multiple forms:

- **Source checkout**: for development and custom builds.
- **Bundled single executable**: built via `pnpm run build:exe` (platform-specific).
- **Docker image**: published to the DeepSeek registry.
- **Python runtime bundle**: included with the Python SDK distribution.

## Production prerequisites

- Node.js 22.19+ or 24+ (if not using the single executable).
- At least 2 GB RAM (recommended 4+ GB for large models).
- Persistent storage for session logs and SQLite database.
- Network access to LLM providers (DeepSeek API, etc.)
- Environment variables:
  - `DEEPSEEK_API_KEY` — required for DeepSeek models.
  - `DEEPSEEK_BASE_URL` — optional, override the API endpoint.
  - `DSH_HOME` — directory for profiles, patches, and persistent data (default: `~/.dsh`).

## Containerized deployment

### Docker

```dockerfile
FROM deepseek/dsh:latest
COPY cordis.patch.yml /app/overlay.yml
ENV DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
ENTRYPOINT ["dsh", "--profile", "headless", "--patch", "/app/overlay.yml"]
```

Build and run:

```bash
docker build -t dsh-app .
docker run -e DEEPSEEK_API_KEY=... dsh-app "Summarize this log"
```

For long-running services (ACP, web server):

```bash
docker run -p 3000:3000 -e DEEPSEEK_API_KEY=... dsh --profile web server
```

### Kubernetes

Example Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dsh-agent
spec:
  replicas: 3
  selector:
    matchLabels: app: dsh
  template:
    metadata:
      labels: app: dsh
    spec:
      containers:
      - name: harness
        image: deepseek/dsh:latest
        args: ["--profile", "web", "server"]
        env:
        - name: DEEPSEEK_API_KEY
          valueFrom:
            secretKeyRef:
              name: deepseek-credentials
              key: api-key
        ports:
        - containerPort: 3000
        volumeMounts:
        - name: data
          mountPath: /root/.dsh
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: dsh-pvc
```

## Scaling

- **Stateless workers**: For headless batch processing, use stateless workers with ephemeral sessions.
- **Session persistence**: Use a shared SQLite or PostgreSQL database (via config) for durable sessions across instances.
- **Load balancing**: Deploy multiple web server instances behind a reverse proxy (nginx, HAProxy).
- **Rate limiting**: Configure request throttling via the `guard` plugins.

## Monitoring

- **Logs**: The harness writes structured JSON logs to stdout; collect with Fluentd or Datadog.
- **Metrics**: Exposed via the `telemetry` plugin; integrate with Prometheus.
- **Health checks**: `/health` endpoint on the web server.

## Security

- Use environment variables or secrets for API keys.
- Limit tool permissions using the `interaction/approval` policy.
- Enable sandboxing for shell and subprocess execution (`ctx.sandbox`).
- Restrict file system access with `fs` policies.

See [Security guide](security.md) for detailed recommendations.

## Troubleshooting

Common deployment issues and resolutions are covered in [Troubleshooting](troubleshooting.md).

## Reference

- [Configuration catalog](config-catalog.md) for all tunable fields.
- [Profiles and bundles](architecture.md#profiles-and-bundles) for composition details.
- [Python runtime deployment](../../python/README.md) for Python SDK.
