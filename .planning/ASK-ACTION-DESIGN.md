# Remove `ask` Action Design

## Decision

Remove `ask` from mcpwall's active configuration and runtime types. It currently permits traffic while appearing to be an approval boundary, which is unsafe for a security proxy. Interactive approval is deferred until the product has a deliberate host-compatible UX.

## Scope

Configuration accepts only `allow` and `deny` for `rules[].action` and `settings.default_action`. A configuration containing `ask` fails at load time before the proxy starts. The validation message tells users to replace it with `allow` or `deny`.

Runtime handling becomes two-state:

- `PolicyEngine` produces only `allow` or `deny` decisions.
- The proxy forwards only allowed traffic and synthesizes deny errors for blocked requests.
- CLI policy checks and logger formatting remove their compatibility handling for `ask`.

Existing configurations that do not use `ask` remain behaviorally unchanged. Existing configurations that use `ask` become invalid rather than silently allowing traffic.

## Implementation status

Tasks 1 through 3 are implemented and passed task review. Task 4 root-package verification is complete: `npx tsc --noEmit`, root `npm run build`, `npm test` (167 tests), and `git diff --check` passed. `npm --prefix site run build` remains inconclusive/unverified after a prior no-output hang and SIGINT, so full verification is not completely clean.

## Files and Boundaries

- `src/types.ts`: narrow `Rule`, `Decision`, and `Config.settings.default_action` action unions to `allow | deny`.
- `src/config/schema.ts`: reject `ask` with an explicit migration-oriented validation error.
- `src/engine/policy.ts`, `src/proxy.ts`, `src/cli/check.ts`, and `src/logger.ts`: remove obsolete `ask` branches and warnings.
- Relevant unit tests: prove validation rejects `ask`; preserve allow/deny policy and CLI behavior.
- `README.md`, `CHANGELOG.md`, `.planning/ROADMAP.md`, `.planning/MAINTENANCE-PLAN.md`, and `CODEX_HANDOFF.md`: document the removal and mark the design decision resolved.

## Error Handling

An `ask` value produces a startup configuration error, so no unreviewed tool call can be forwarded. The error explicitly directs users to choose `allow` or `deny`; it does not silently migrate policy because either replacement changes security posture.

## Test Strategy

Use TDD:

1. Add parser/config validation tests for rule-level and default-level `ask` values; they must fail before implementation.
2. Narrow schema and types, then remove runtime compatibility code.
3. Run affected unit suites, then `npx tsc --noEmit`, `npm run build`, and `npm test`.

## Git and Release Policy

- Keep one focused conventional commit for the implementation after fresh verification.
- Obtain Dom's explicit approval before every individual release action. This includes version or package metadata changes, release changelog updates, release commits, tag creation, pushes, and npm publication; approval for one action does not authorize another.
- Include this and the already merged hardening work in the next planned `v0.4.0` release. Update `package.json`, `CHANGELOG.md`, and create the `v0.4.0` tag only in the dedicated release step.
