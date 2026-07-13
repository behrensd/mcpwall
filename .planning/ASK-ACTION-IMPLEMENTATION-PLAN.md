# Remove `ask` Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the unsafe, non-interactive `ask` policy action so configurations have only explicit allow or deny outcomes.

**Architecture:** Narrow the inbound action contract at the configuration boundary, then let TypeScript identify every obsolete runtime branch. Existing allow/deny policy semantics remain unchanged; any legacy `ask` value aborts configuration loading before proxy startup.

**Tech Stack:** Node.js 20+, TypeScript 5.9 strict mode, Zod 4, Vitest 4, tsup.

## Global Constraints

- Maintain modern ESM and strict TypeScript; do not introduce `any`.
- Use TDD: every production behavior change begins with a failing test.
- Preserve existing allow/deny behavior and reject legacy `ask` values with migration guidance.
- Keep source, documentation, and planning records aligned.
- Use conventional commits only after fresh typecheck, build, and full-test evidence.
- Obtain Dom's explicit approval before each release action, including version or package metadata changes, release commits, tag creation, pushes, and npm publication.
- The next dedicated release is `v0.4.0`; it includes this and the accumulated hardening commits.

---

## File Structure

- `src/config/schema.ts`: defines the accepted inbound action values and configuration error text.
- `src/types.ts`: exposes the two-state inbound action contract to the compiler.
- `src/engine/policy.ts`, `src/proxy.ts`, `src/cli/check.ts`, `src/logger.ts`: remove paths that previously treated `ask` as allow.
- `src/__tests__/policy.test.ts`: proves rule and default action validation reject `ask`.
- `README.md`, `CHANGELOG.md`, `site/app/threat-model/page.tsx`, `.planning/ROADMAP.md`, `.planning/MAINTENANCE-PLAN.md`, `CODEX_HANDOFF.md`: describe the breaking policy-config change and close the decision record.
- `.planning/codebase/CONCERNS.md`, `.planning/codebase/CONVENTIONS.md`: retain pre-v0.4.0 `ask` evidence with dated resolved-status notes that supersede it.

### Task 1: Reject Legacy `ask` Configuration

**Files:**
- Modify: `src/__tests__/policy.test.ts`
- Modify: `src/config/schema.ts`

**Interfaces:**
- Consumes: `configSchema.safeParse(raw: unknown)` from `src/config/schema.ts`.
- Produces: configuration validation that accepts only `allow | deny` for `rules[].action` and `settings.default_action`.

- [x] **Step 1: Write the failing tests**

Add this test near the existing `configSchema` coverage in `src/__tests__/policy.test.ts`:

```ts
it('rejects ask actions with migration guidance', () => {
  const ruleResult = configSchema.safeParse({
    version: 1,
    settings: { log_dir: '/tmp', log_level: 'info', default_action: 'allow' },
    rules: [{ name: 'review-write', match: { method: 'tools/call' }, action: 'ask' }],
  });
  const defaultResult = configSchema.safeParse({
    version: 1,
    settings: { log_dir: '/tmp', log_level: 'info', default_action: 'ask' },
    rules: [],
  });

  expect(ruleResult.success).toBe(false);
  expect(defaultResult.success).toBe(false);
  if (!ruleResult.success) {
    expect(ruleResult.error.issues[0]?.message).toContain('replace it with "allow" or "deny"');
  }
  if (!defaultResult.success) {
    expect(defaultResult.error.issues[0]?.message).toContain('replace it with "allow" or "deny"');
  }
});
```

- [x] **Step 2: Run the focused test to verify red**

Run: `npx vitest run src/__tests__/policy.test.ts -t 'rejects ask actions'`

Expected: FAIL because the current Zod schemas accept `ask`.

- [x] **Step 3: Implement the minimal schema**

In `src/config/schema.ts`, define the shared schema before `ruleSchema`:

```ts
const inboundActionSchema = z.enum(['allow', 'deny'], {
  error: 'Action must be "allow" or "deny". "ask" is not supported; replace it with "allow" or "deny".',
});
```

Replace both inbound action declarations:

```ts
action: inboundActionSchema,
```

in `ruleSchema`, and:

```ts
default_action: inboundActionSchema,
```

in `configSchema.settings`.

- [x] **Step 4: Run the focused test to verify green**

Run: `npx vitest run src/__tests__/policy.test.ts -t 'rejects ask actions'`

Expected: PASS with both invalid configurations reporting the migration text.

### Task 2: Remove the Runtime Compatibility Paths

**Files:**
- Modify: `src/types.ts`
- Modify: `src/engine/policy.ts`
- Modify: `src/proxy.ts`
- Modify: `src/cli/check.ts`
- Modify: `src/logger.ts`
- Test: `src/__tests__/policy.test.ts`

**Interfaces:**
- Consumes: `inboundActionSchema` from Task 1.
- Produces: `Rule.action`, `Decision.action`, and `Config.settings.default_action` all have the exact type `'allow' | 'deny'`.

- [x] **Step 1: Narrow the inbound action types**

In `src/types.ts`, replace each inbound action union with:

```ts
action: 'allow' | 'deny';
```

for `Rule` and `Decision`, and:

```ts
default_action: 'allow' | 'deny';
```

for `Config.settings`.

- [x] **Step 2: Remove obsolete policy and proxy behavior**

In `src/engine/policy.ts`, delete the constructor block that scans `askRules` and writes the startup warning. Update the `evaluate` JSDoc to say it returns an allow or deny decision.

In `src/proxy.ts`, replace the comment:

```ts
// Allow or ask (ask = allow in Phase 1)
```

with:

```ts
// Allowed traffic is logged before forwarding.
```

- [x] **Step 3: Remove obsolete CLI and logger branches**

In `src/cli/check.ts`, change `printInboundDecision` to an allow branch followed by the existing deny output, without the `ASK` branch.

In `src/logger.ts`, remove `case 'ask'` from `getLogLevel` and `formatAction`. Keep the existing generic default because outbound/action logs are still represented as strings.

- [x] **Step 4: Run focused runtime checks**

Run: `npx tsc --noEmit && npx vitest run src/__tests__/policy.test.ts src/__tests__/check.test.ts src/__tests__/logger.test.ts`

Expected: exit 0. Any missed `ask` branch is exposed by the narrowed type contract or by the affected suites.

### Task 3: Align Public and Project Records

**Files:**
- Modify: `.planning/codebase/ARCHITECTURE.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `.planning/ROADMAP.md`
- Modify: `.planning/MAINTENANCE-PLAN.md`
- Modify: `CODEX_HANDOFF.md`
- Modify: `.planning/ASK-ACTION-DESIGN.md`
- Modify: `site/app/threat-model/page.tsx`
- Modify: `.planning/codebase/CONCERNS.md`
- Modify: `.planning/codebase/CONVENTIONS.md`

**Interfaces:**
- Consumes: the behavior from Tasks 1 and 2.
- Produces: active documentation that tells configuration authors `ask` is invalid, dated historical records that preserve and supersede the pre-v0.4.0 behavior, and a `v0.4.0` release plan.

- [x] **Step 1: Update public configuration documentation**

In `README.md`, change the example comment to:

```yaml
default_action: allow   # allow | deny
```

Add one sentence immediately after the configuration example: `mcpwall does not support an interactive ask action; choose allow or deny explicitly.`

In the Unreleased section of `CHANGELOG.md`, add a `### Breaking changes` heading with: `Remove the non-interactive ask action. Configurations using ask now fail validation and must use allow or deny.`

- [x] **Step 2: Close the planning decision**

Move the `ask` item from the remaining-design sections of `.planning/ROADMAP.md`, `.planning/MAINTENANCE-PLAN.md`, and `CODEX_HANDOFF.md` into their completed work records. State that `ask` was removed because it silently allowed traffic.

Add an `Implementation status` section to `.planning/ASK-ACTION-DESIGN.md` stating that the configured behavior is implemented only after Tasks 1 and 2 pass; do not claim completion until verification has actually run.

Update `site/app/threat-model/page.tsx` to list only `allow` and `deny` as actions and state that interactive approval is unsupported. Add dated resolved-status notes to `.planning/codebase/CONCERNS.md` and `.planning/codebase/CONVENTIONS.md`; retain their original pre-v0.4.0 `ask` analysis as historical/audit evidence.

- [x] **Step 3: Run documentation consistency check**

Run: `rg -n "\\bask\\b" README.md CHANGELOG.md CODEX_HANDOFF.md .planning src rules site/app`

Expected: classify every match as intentionally historical, migration guidance, regression-test coverage, or planning/implementation-record text; no active configuration, runtime, or current architecture behavior may present `ask` as supported.

### Task 4: Verify and Prepare the Maintenance Commit

**Files:**
- Verify: all files changed in Tasks 1 through 3.

**Interfaces:**
- Consumes: completed code, tests, documentation, and planning records.
- Produces: a verified, reviewable working tree for one focused conventional commit.

- [x] **Step 1: Run full verification**

Run:

```sh
npx tsc --noEmit
npm run build
npm test
git diff --check
```

Outcome: typecheck exit 0, root build exit 0, 167 Vitest tests pass, and no whitespace errors. `npm --prefix site run build` remains inconclusive/unverified after a prior no-output hang and SIGINT, so this is not completely clean full verification.

- [x] **Step 2: Review the final diff**

Run: `git diff -- src/types.ts src/config/schema.ts src/engine/policy.ts src/proxy.ts src/cli/check.ts src/logger.ts src/__tests__/policy.test.ts README.md CHANGELOG.md .planning/ROADMAP.md .planning/MAINTENANCE-PLAN.md CODEX_HANDOFF.md .planning/ASK-ACTION-DESIGN.md`

Expected: only the two-state action contract, its regression test, and aligned documentation/planning changes.

- [ ] **Step 3: Request commit authorization**

Ask Dom before staging and committing. On approval, stage only the reviewed files and use:

```sh
git commit -m "fix: remove unsafe ask policy action"
```

- [ ] **Step 4: Keep release separate**

Do not change `package.json` version, create a Git tag, or push a release. A request for `v0.4.0` does not authorize every release operation: request explicit approval before version/package metadata changes, the release commit, tag creation, tag push, and npm publication. The tag push triggers `.github/workflows/release.yml` to publish to npm.

## Plan Self-Review

- Spec coverage: Tasks 1 and 2 implement fail-fast configuration and remove every active runtime compatibility branch. Task 3 aligns the declared documentation and planning records. Task 4 enforces verification and separates publishing from feature work.
- Placeholder scan: no incomplete implementation markers or vague test steps remain.
- Type consistency: `inboundActionSchema`, `Rule.action`, `Decision.action`, and `Config.settings.default_action` all use exactly `'allow' | 'deny'`.
