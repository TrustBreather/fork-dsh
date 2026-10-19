# Contributing to DeepSeek Harness

English | [中文](contributing.zh.md)

How to contribute code, documentation, and bug reports to the DeepSeek Harness project. The [root CONTRIBUTING.md](../CONTRIBUTING.md) covers the overall process; this document adds harness-specific technical guidance.

## Repository setup

Follow the [Development guide](development.md) to set up your environment. Ensure `pnpm install` completes successfully and `pnpm run typecheck` passes.

## Contribution workflow

1. **Find an issue** — look for `good first issue` or `help wanted` labels.
2. **Fork and branch** — create a branch from `main`.
3. **Implement** with tests and documentation.
4. **Run checks** locally:
   ```bash
   pnpm run typecheck
   pnpm run lint
   pnpm run test:coverage  # must pass 100% per file
   pnpm run doc-sync
   ```
5. **Submit a PR** — fill in the pull request template and link the issue.

## Code style

- TypeScript: strict mode (`noImplicitAny`, `strictNullChecks`).
- All exports must have JSDoc (`verify-export-jsdoc` enforces).
- Use `const` over `let`; avoid `var`.
- Prefer `async/await` over raw promises.
- Follow the [defensive patterns](defensive-patterns.md) for lifecycle and concurrency.

## Testing requirements

- **Unit tests**: For every new feature or bug fix, add or update tests in the owning package.
- **Coverage**: 100% per file is required for CI. An uncovered line often indicates dead code—delete it or add a test.
- **Snapshot tests**: For model-visible or human-visible output changes, add or update snapshot scenarios.
- **Real-API e2e**: For changes that affect the model interaction, run `pnpm run test:e2e` with a valid `DEEPSEEK_API_KEY`.

See [Testing policy](testing.md) for details.

## Documentation contribution

- Update affected READMEs and JSDoc together.
- Use [dsh-prose-standard](../.agents/skills/dsh-prose-standard/SKILL.md) for writing: direct, concrete, no metaphors.
- Every document has a one-home policy: place a fact in its tier and link elsewhere.
- Run `pnpm run doc-sync` to validate links and type-equiv fences.

## Pull request guidelines

- **One change per PR** — split independent changes.
- **Include an Agent Note** for non-trivial changes (see [.agents/notes/README.md](../.agents/notes/README.md)).
- **Label** with `kind/*` and `area/*` according to the [taxonomy](../.agents/notes/implemented/process/2026-08-08-unified-github-label-taxonomy.md).
- **Pass all CI checks** before merging.

## Code review process

- At least one maintainer approval required.
- Reviewers check: test coverage, JSDoc, logic correctness, and no hidden coupling.
- Address feedback promptly; use `git commit --amend` and `git push --force-with-lease` for clean history.

## License

All contributions are subject to the project's license (see [LICENSE](../LICENSE)).

## Questions?

- Open a discussion on GitHub.
- Join the internal DeepSeek developer channel.
