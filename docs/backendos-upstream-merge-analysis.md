# BackendOS upstream merge analysis

This repository-only analysis records whether the current BackendOS overlay remains effective when the local branch is compared with the fetched official remote. It is a static merge-impact analysis, not evidence that BackendOS or the DSH Web profile was started successfully.

## Summary

Merging upstream can affect the current BackendOS configuration. The risk is not the `--patch` mechanism itself: the fetched upstream still supports ordered `--patch` overlays. The high-risk change is that `origin/master` does not contain the local BackendOS overlay or its launchers, while its shared bundles and preset definitions have changed substantially.

If [`backend-os.patch.yml`](../backend-os.patch.yml) remains present and [`start-dsh.ps1`](../start-dsh.ps1) continues to pass it after the profile and home layers, the overlay's explicit `disabled` and platform-selection values remain the last values for the rows it replaces. If the local launcher and overlay are dropped during the merge, BackendOS will not receive the local bridge provider or the explicit preset policy; the ordinary upstream profile defaults will apply instead.

The current local branch must not be merged as a clean configuration-only change. It is one local commit ahead of its old `origin/master` and 2,373 commits behind the fetched `origin/master`; the local BackendOS files are absent from the fetched tip. Reconcile the overlay against the new composition before using a merged tree.

## Comparison baseline

The comparison used the local `HEAD` `7a15e0b13a5841129ef849fd57c7b0e59d38cc7a` and the fetched official `origin/master` `687f282e86`. No remote named `upstream` is configured, so `git fetch upstream` failed with Git's “does not appear to be a git repository” error. `git fetch origin` completed successfully from the configured official repository remote and updated `origin/master`.

The fetched upstream does not contain `backend-os.patch.yml`, `start-backend-os.bat`, `start-dsh-build.bat`, `start-dsh-no-build.bat`, `start-dsh.ps1`, `scripts/audit-backendos-tool-catalog.mjs`, or `scripts/audit-live-dsh-composition.spec.ts`. The local files therefore represent a local deployment integration, not a configuration file that upstream currently owns.

## Current BackendOS overlay

[`start-dsh.ps1`](../start-dsh.ps1) reads the BackendOS token from the external BackendOS `.env`, exports it as `BACKEND_OS_API_KEY`, and launches the Web profile with `--patch .\backend-os.patch.yml`. It also verifies that the expected BackendOS overlay exists before starting DSH.

The overlay currently defines these top-level policies in [`backend-os.patch.yml`](../backend-os.patch.yml):

| Row | Current local value | Effect if the overlay remains last |
|---|---|---|
| `session-title-llm` | `disabled: true` | Suppresses the auxiliary title request. An upstream change to title-provider defaults does not re-enable it. |
| `llm-pi-ai` | Adds `backend-os-bridge` at `http://127.0.0.1:3210/v1` with `openai-completions`, `BACKEND_OS_API_KEY`, and the `backend-os-browser` model. | Routes the primary model call to BackendOS and advertises text plus image input. |
| `agent-default-model` | Selects `backend-os-bridge` and `backend-os-browser`. | Keeps the default Agent model on the BackendOS bridge. |
| `preset-standard` | Replaces the complete preset config and explicitly disables Windows Bash, non-Windows PowerShell, compaction auto-run, Codex/Claude subagents, Ralph, and plugin-manager tools. | These explicit values win over the upstream `preset-standard` row. |
| `preset-ptc` | Replaces the complete PTC preset config and keeps workflow/PTC rows disabled while preserving the local tool and platform toggles. | These explicit values win over the upstream `preset-ptc` row. |
| `preset-cordis` | Replaces the complete Cordis preset config and keeps the local Cordis composition. | These explicit values win over the upstream `preset-cordis` row. |

The shell selection is platform-dependent rather than a fixed enablement: `tool-bash` is disabled on Windows and `tool-pwsh` is disabled on non-Windows platforms in all three local preset replacements.

## Upstream changes that affect the overlay

The fetched upstream changes the shared base in [`packages/bundle/base/cordis.patch.yml`](../packages/bundle/base/cordis.patch.yml). Relevant changes include new `remote-access`, `working-directory`, `tool-working-directory`, and `otel` rows; a `session-title-llm.maxOutputTokens` increase from `64` to `4096`; a changed telemetry endpoint and batching configuration; and a reintroduced `agent-instructions` row. The local BackendOS overlay does not replace these base rows, so they can enter the effective BackendOS profile when the upstream base is merged and the required packages are available.

The upstream shipped presets in [`packages/bundle/web-app/presets/standard.patch.yml`](../packages/bundle/web-app/presets/standard.patch.yml), [`packages/bundle/web-app/presets/ptc.patch.yml`](../packages/bundle/web-app/presets/ptc.patch.yml), and [`packages/bundle/web-app/presets/cordis.patch.yml`](../packages/bundle/web-app/presets/cordis.patch.yml) add or remove preset-owned rows such as `agent-instructions`, `time-context`, `tool-schedule`, and `tool-plugin-market`, and change persona and delegation details. The BackendOS overlay replaces each complete preset config, so it will mask those upstream changes instead of inheriting them. This is the main stale-overlay risk: the local patch can boot with an older plugin roster while the shared bundle expects a newer roster.

The upstream Web bundle in [`packages/bundle/web-app/cordis.patch.yml`](../packages/bundle/web-app/cordis.patch.yml) changes host behavior and removes the local `disabled: true` values for `schedule` and `ui-schedule`. The BackendOS overlay does not target those rows, so a merged tree can enable scheduled reminders and their UI even though the local BackendOS overlay explicitly controls the three agent presets. This is a direct behavior change outside the overlay's current target list.

The upstream `llm-pi-ai` configuration still exposes the fields used by the BackendOS provider profile — `apiKeyEnv`, `api`, `baseURL`, `models`, and custom model input modalities — in its current schema. Its adapter, catalog, authentication, image, and conversation behavior also changed. Static source inspection therefore finds no immediate field-name removal for `backend-os-bridge`, but a live provider or composition test is still required before claiming the bridge works after the merge.

## Merge-direction impact

### Merge upstream into the local branch

If the local overlay and launcher are kept, `--patch` remains an applicable final layer according to the fetched [`apps/cli/src/args.ts`](../apps/cli/src/args.ts) and [`apps/cli/src/profile-boot.ts`](../apps/cli/src/profile-boot.ts). The current `session-title-llm` disablement, BackendOS model selection, bridge provider, and preset-level enable/disable values should continue to win for the rows they target.

That does not make the merge behavior-neutral. Untargeted upstream rows can change, including schedule/UI schedule, telemetry, remote access, working-directory tools, and any reintroduced instruction provider. The full preset replacement also prevents the BackendOS profile from receiving new upstream preset rows until the overlay is manually reconciled.

### Merge the local branch into the fetched upstream

The local branch would reintroduce the BackendOS overlay and launcher files that are absent from the fetched tip. This would restore a local entry path only if the merged CLI still accepts the same `--patch` invocation and the merged composition still contains the target row ids. It would not automatically reconcile the local full preset replacements with the upstream preset changes.

The local branch also carries the package-removal and generated persistence changes from its current history, while the fetched upstream has since reintroduced or changed several related package and composition surfaces. A whole-branch merge therefore has a wider compatibility scope than the BackendOS overlay alone and should be treated as a source reconciliation, not as a docs-only merge.

## Answer for the current disable/enable policy

The current `disable`/`enable` policy is preserved only when both conditions hold:

1. The BackendOS overlay file remains in the merged tree.
2. The BackendOS launcher still passes that file with `--patch` after the normal profile and home layers.

When those conditions hold, the explicit values in the overlay remain authoritative for `session-title-llm`, `llm-pi-ai`, `agent-default-model`, `preset-standard`, `preset-ptc`, and `preset-cordis`. The platform shell toggles also remain explicit and are not inferred from upstream defaults.

When either condition fails, the current BackendOS policy is not preserved: the bridge provider and model selection disappear, the title request can return, and the upstream preset/base rows determine which tools, schedule services, instruction loading, telemetry, and platform integrations are mounted.

## Decision and limits

Do not merge or rebase this local branch yet. Preserve the current overlay as a deployment-owned file, compare its complete preset plugin lists against the fetched upstream presets, decide which upstream rows BackendOS should accept or disable, and then run the live composition audit before using the merged tree.

This analysis proves file presence, patch ordering, row ownership, and source-level schema compatibility only. It does not prove that BackendOS is running, that `BACKEND_OS_API_KEY` resolves, that port `3210` is reachable, that the OpenAI-compatible bridge accepts the current request, or that the merged preset produces the intended model-visible tool catalog.

## Cherry-pick recommendation

For the current BackendOS deployment, the safe default is to cherry-pick no upstream runtime-composition commit. The local overlay is a deployment-specific integration, while the fetched upstream has moved the shared bundle, preset, schedule, telemetry, and LLM-provider contracts far beyond the local commit. A single cherry-pick cannot preserve the existing disable/enable policy and also absorb those changes correctly.

| Upstream commit or group | Recommendation | Reason |
|---|---|---|
| `e896737840`, `c6dd905972`, `6c1a590a4c`, `699f1a8dc1`, `1b1b09e1fb` | Do not pick for the current BackendOS profile. | This schedule series moves Schedule, time context, and reminder tools into the Web or preset compositions. The local BackendOS setup currently keeps the related rows disabled or outside its preset roster. Picking it changes the user-visible tool set and reminder behavior. |
| `7b8c7dfff2`, `3dd52bfd9b`, `9d36f9c1fc`, and related telemetry merges | Do not pick unless telemetry behavior is explicitly requested. | These commits add or relocate OTel rows, change byte-bounded export behavior, endpoints, and shutdown handling. They are not needed for the local bridge request and can introduce an external telemetry side effect. |
| `d7bd68ee7a` | Do not pick for BackendOS model routing. | It adds Gateway RBAC and non-owner access policy. It changes the API capability contract and needs its package/test dependency chain; it does not preserve or improve the local `backend-os-bridge` path. |
| `a7c3ad99bc` | Do not pick for the current loopback deployment. | It adds public application URL behavior for deployments behind a public address. The current launcher starts DSH on `127.0.0.1:3080` and the BackendOS bridge on `127.0.0.1:3210`. |
| `79bd3d8da7` | Conditional only. | It centralizes working-directory and directory-context ownership and is the likely source of the upstream `working-directory` rows. Pick it only if BackendOS needs that new workspace contract, then update the overlay and run persistence/session checks. |
| `f1f18bce98`, `21fe89affe`, `d79f13a4d4`, plus the related `llm-pi-ai` catalog/auth fixes | Pick only as one reviewed provider-upgrade chain. | These commits upgrade pi-ai and change provider catalog, authentication, model discovery, and protocol handling. The local `backend-os-bridge` fields still exist in the fetched schema, but a provider upgrade must be tested against the local OpenAI-compatible gateway and image path; do not cherry-pick one provider fix in isolation. |
| `3562e14f28`, `fabd805bfe`, `6ec995d49b` | Not needed while the overlay keeps `session-title-llm` disabled. | These commits change the title output cap or title parsing. They have no active effect while the local overlay disables the title provider; picking them without the overlay is unsafe because the title request can return. |

The first safe integration step is therefore not a cherry-pick. Create a comparison branch from the fetched upstream, copy the deployment-owned BackendOS overlay into that branch, reapply only the required rows, and inspect the composed result with the CLI config dump before starting either process. Preserve the current values for `session-title-llm`, `llm-pi-ai`, `agent-default-model`, and the three preset rows unless the BackendOS contract explicitly changes.

For each later upstream feature, use this order: cherry-pick its complete dependency chain, regenerate affected catalogs, update the BackendOS overlay's full preset lists, inspect the effective `--patch` composition, then run the focused provider/profile audit. Do not cherry-pick release merges such as `d1b9c04067` or `687f282e86`; they contain the accumulated upstream composition and release changes rather than one isolated BackendOS-compatible fix.
