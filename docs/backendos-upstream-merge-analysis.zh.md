# BackendOS 上游合并分析

[English](backendos-upstream-merge-analysis.md) | 中文

这份仅针对仓库的分析记录当前 BackendOS 覆盖层在与已获取的官方远程分支比较时是否仍然有效。它是静态的合并影响分析，不是 BackendOS 或 DSH Web profile 已成功启动的证据。

## 摘要

合并上游可能影响当前 BackendOS 配置。风险不在 `--patch` 机制本身：获取的上游仍支持有序的 `--patch` 覆盖层。高风险变化在于，`origin/master` 不包含本地 BackendOS 覆盖层或启动器，而共享 bundle 与 preset 定义已经大幅变化。

只要 [`backend-os.patch.yml`](../backend-os.patch.yml) 保留，并且 [`start-dsh.ps1`](../start-dsh.ps1) 在 profile 与 home 层之后继续传递该文件，覆盖层中针对目标行的显式 `disabled` 和平台选择值仍然是最后生效的值。如果合并时丢失本地启动器或覆盖层，BackendOS 不会收到本地 bridge provider 或显式 preset policy，普通上游 profile 默认值会生效。

当前本地分支不应作为纯配置变更直接合并。它基于 `dsh-v0.1.7-rc.2`，而获取的官方分支是 `dsh-v0.2.1-rc.2`；本地 BackendOS 文件在获取的上游 tip 中不存在。因此应先在隔离分支中核对覆盖层。

## 比较基线

比较使用本地 `dsh-v0.1.7-rc.2` 线路和获取的官方 `dsh-v0.2.1-rc.2` 线路。没有配置名为 `upstream` 的 remote，因此 `git fetch upstream` 失败并报告远程仓库不存在。配置的官方仓库 remote 是 `origin`，`git fetch origin` 成功并更新了 `origin/master`。

获取的上游不包含 `backend-os.patch.yml`、`start-backend-os.bat`、`start-dsh-build.bat`、`start-dsh-no-build.bat`、`start-dsh.ps1`、`scripts/audit-backendos-tool-catalog.mjs` 或 `scripts/audit-live-dsh-composition.spec.ts`。这些本地文件属于部署集成，不是上游当前拥有的配置文件。

## 当前 BackendOS 覆盖层

[`start-dsh.ps1`](../start-dsh.ps1) 从外部 BackendOS `.env` 读取 token，作为 `BACKEND_OS_API_KEY` 导出，然后使用 `--patch .\backend-os.patch.yml` 启动 Web profile。它也会在启动前确认 BackendOS 覆盖层存在。

覆盖层在 [`backend-os.patch.yml`](../backend-os.patch.yml) 中定义以下顶层策略：

| 行 | 当前本地值 | 覆盖层保留时的效果 |
|---|---|---|
| `session-title-llm` | `disabled: true` | 关闭辅助标题请求。上游标题 provider 默认值变化不会重新启用它。 |
| `llm-pi-ai` | 在 `http://127.0.0.1:3210/v1` 添加 `backend-os-bridge`、`openai-completions`、`BACKEND_OS_API_KEY` 和 `backend-os-browser`。 | 将主模型请求路由到 BackendOS，并声明文本与图片输入。 |
| `agent-default-model` | 选择 `backend-os-bridge` 和 `backend-os-browser`。 | 保持 Agent 默认模型使用 BackendOS bridge。 |
| `preset-standard` | 替换完整 preset 配置，并显式关闭 Windows Bash、非 Windows PowerShell、自动 compaction、Codex/Claude subagent、Ralph 和 plugin-manager tools。 | 这些显式值覆盖上游 `preset-standard` 行。 |
| `preset-ptc` | 替换完整 PTC preset 配置，并保留本地 tool 与平台开关。 | 这些显式值覆盖上游 `preset-ptc` 行。 |
| `preset-cordis` | 替换完整 Cordis preset 配置，并保留本地 Cordis composition。 | 这些显式值覆盖上游 `preset-cordis` 行。 |

三个本地 preset 中的 shell 选择都依赖平台：Windows 禁用 `tool-bash`，非 Windows 平台禁用 `tool-pwsh`。

## 影响覆盖层的上游变化

获取的上游修改了 [`packages/bundle/base/cordis.patch.yml`](../packages/bundle/base/cordis.patch.yml) 中的共享 base，相关变化包括新的 `remote-access`、`working-directory`、`tool-working-directory` 和 `otel` 行，`session-title-llm.maxOutputTokens` 从 `64` 增加到 `4096`，以及 telemetry endpoint 和 batch 配置变化。本地 BackendOS 覆盖层没有替换这些 base 行，因此合并上游后它们可能进入有效的 BackendOS profile。

上游 Web preset 在 [`packages/bundle/web-app/presets/standard.patch.yml`](../packages/bundle/web-app/presets/standard.patch.yml)、[`packages/bundle/web-app/presets/ptc.patch.yml`](../packages/bundle/web-app/presets/ptc.patch.yml) 和 [`packages/bundle/web-app/presets/cordis.patch.yml`](../packages/bundle/web-app/presets/cordis.patch.yml) 中添加或删除 `agent-instructions`、`time-context`、`tool-schedule` 和 `tool-plugin-market` 等行，并修改 persona 与 delegation 细节。BackendOS 覆盖层替换三个完整 preset 配置，因此在手动同步前不会继承这些变化。

上游 Web bundle 在 [`packages/bundle/web-app/cordis.patch.yml`](../packages/bundle/web-app/cordis.patch.yml) 中修改 host 行为，并移除本地对 `schedule` 和 `ui-schedule` 的 `disabled: true`。本地覆盖层不操作这些行，因此合并后可能启用 scheduled reminders 及其 UI。

上游 `llm-pi-ai` 仍保留 BackendOS provider 使用的 `apiKeyEnv`、`api`、`baseURL`、`models` 和自定义 input modality 字段。静态 source inspection 没有发现 `backend-os-bridge` 字段立即被移除，但在声称 bridge 可用前仍需运行 provider 或 composition 测试。

## 合并方向影响

### 将上游合并到本地分支

如果保留本地覆盖层和启动器，按照获取到的 [`apps/cli/src/args.ts`](../apps/cli/src/args.ts) 与 [`apps/cli/src/profile-boot.ts`](../apps/cli/src/profile-boot.ts)，`--patch` 仍是可用的最后覆盖层。`session-title-llm`、BackendOS model selection、bridge provider 和三个 preset 的 enable/disable 值应继续覆盖它们所针对的行。

这不代表合并是行为中性的。未被覆盖的上游行仍可能变化，包括 schedule、UI schedule、telemetry、remote access、working-directory tools 和 instruction provider。完整 preset 替换也会使 BackendOS profile 在手动同步前收不到新的上游 preset 行。

### 将本地分支合并到获取的上游

本地分支会重新引入获取 tip 中不存在的 BackendOS 覆盖层与启动器。只有当合并后的 CLI 仍接受相同的 `--patch` 调用，并且合并后的 composition 仍包含目标行 id 时，本地入口才会恢复。它不会自动把本地完整 preset 替换与上游 preset 变化同步起来。

本地分支还包含 package removal 和 generated persistence 变化，而获取的上游已经重新引入或修改相关 package 与 composition。因此整个分支合并的兼容性范围大于 BackendOS overlay 本身，应按 source reconciliation 处理，而不是 docs-only merge。

## 当前 disable/enable policy 的结论

当前 `disable`/`enable` policy 只有在以下两个条件都满足时才会保留：

1. 合并后的 tree 保留 BackendOS 覆盖层文件。
2. BackendOS launcher 仍在普通 profile 与 home 层之后使用 `--patch` 传入该文件。

满足条件时，`session-title-llm`、`llm-pi-ai`、`agent-default-model`、`preset-standard`、`preset-ptc` 和 `preset-cordis` 的显式值仍然有效。平台 shell 开关也是显式值，不会从上游默认值推断。

任一条件失败时，当前 BackendOS policy 不再受保护：bridge provider 和 model selection 会消失，title request 可能恢复，上游 base 与 preset 行会决定 tool、schedule、instruction、telemetry 和平台 integration 是否挂载。

## 决策与限制

暂不合并或 rebase 该本地分支。应将当前覆盖层视为部署拥有的文件，先将其完整 preset plugin list 与获取的上游 preset 比较，决定 BackendOS 接受或关闭哪些上游行，再运行 live composition audit。合并后的 tree 必须在使用前重新检查。

本分析只证明文件存在、patch 顺序、行归属和 source-level schema compatibility。它不证明 BackendOS 正在运行、`BACKEND_OS_API_KEY` 可以解析、端口 `3210` 可访问、OpenAI-compatible bridge 接受当前请求，或合并后的 preset 产生预期的 model-visible tool catalog。

## Cherry-pick 建议

对于当前 BackendOS deployment，安全默认值是不 cherry-pick 上游 runtime-composition commit。本地覆盖层是部署专用 integration，而获取的上游已经大幅移动 shared bundle、preset、schedule、telemetry 和 LLM provider contract。单个 cherry-pick 无法同时保留当前 disable/enable policy 并吸收这些变化。

| 上游变化组 | 建议 | 原因 |
|---|---|---|
| Schedule、time-context 和 reminder 系列 | 当前 BackendOS profile 不要 pick。 | 这些变化会把 Schedule、time context 和 reminder tools 移入 Web 或 preset composition，改变用户可见 tool set 与 reminder behavior。 |
| Telemetry 系列 | 除非明确需要 telemetry，否则不要 pick。 | 这些变化会添加或移动 OTel 行，改变 byte-bounded export、endpoint 和 shutdown handling，并可能引入外部 telemetry side effect。 |
| Gateway RBAC 系列 | 不要为 BackendOS model routing pick。 | 它改变 API capability contract，并需要完整 package/test dependency chain；它不会保留或改善本地 `backend-os-bridge`。 |
| Public application URL 系列 | 当前 loopback deployment 不要 pick。 | 当前 launcher 使用 `127.0.0.1:3080`，BackendOS bridge 使用 `127.0.0.1:3210`。 |
| Working-directory 系列 | 仅在 BackendOS 需要新 workspace contract 时考虑。 | 需要同步 overlay，并运行 persistence/session checks。 |
| Pi-ai provider upgrade 与 catalog/auth fixes | 只能作为完整 provider-upgrade chain 审核后 pick。 | 这些变化会修改 provider catalog、authentication、model discovery 和 protocol handling；必须对本地 OpenAI-compatible gateway 与图片路径做测试。 |
| Title-provider 变化 | overlay 保持 `session-title-llm` disabled 时不需要。 | 没有 overlay 时 title request 可能恢复。 |

后续每个 upstream feature 都应遵循：先纳入完整 dependency chain，再 regenerate affected catalogs，更新 BackendOS overlay 的完整 preset list，检查有效 `--patch` composition，最后运行 focused provider/profile audit。不要直接 cherry-pick `dsh-v0.2.1-rc.1` 或 `dsh-v0.2.1-rc.2` 这类 release merge。

## Pull attempt and rollback

本地 overlay cleanup 后曾在 2026-10-21 执行 `git pull --no-rebase --no-commit origin master`。pull 成功获取了 `origin/master`，但在删除的 `agent-instructions` package 和 snapshots、generated catalogs 与 persistence schema、Web bundle 与 preset patches、workspace-context fixtures、`pnpm-lock.yaml` 及相关 package docs 处停在未提交冲突状态。BackendOS overlay 或 launcher 文件本身没有冲突，但共享 composition 冲突可能改变它们的有效 profile 行为。

随后执行 `git merge --abort`。HEAD 返回本地 overlay cleanup checkpoint，worktree 没有 unmerged paths，`codex/backup/backendos-before-origin-pull-20261021` 保留了 pull 前状态。SHA-1 比较确认 `backend-os.patch.yml`、`start-dsh.ps1` 和 `start-backend-os.bat` 在 rollback 后与 backup branch 一致。remote refs 已获取，但 2,373-commit upstream merge 尚未安装到本地分支。
