---
plan: quick-1
subsystem: core
tags: [bugfix, types, security, tests]
key-files:
  modified:
    - src/logger.ts
    - src/cli/check.ts
    - src/engine/policy.ts
    - src/engine/outbound-policy.ts
    - src/config/loader.ts
    - src/proxy.ts
    - src/types.ts
  created:
    - src/__tests__/logger.test.ts
decisions:
  - "Kept post-read size check in check.ts as belt-and-suspenders for --input flag path; streaming check is primary"
  - "substituteVariables normalizes absolute paths via resolve() to collapse ../ after env var expansion"
  - "Used as Config cast at substituteInObject call sites — function processes unknown but preserves Config structure"
  - "Pre-existing schema.ts type errors (Zod refine API) are out of scope — not introduced by this task"
metrics:
  completed: "2026-02-27"
  tasks: 5
  files_modified: 7
  files_created: 1
  tests_before: 132
  tests_after: 143
---

# Quick Task 1: Audit and Fix Critical mcpwall Codebase Issues Summary

**One-liner:** Logger close() idempotency + streaming size enforcement + as-any removal with ToolCallParams/McpResult types + null-ID warning + config path normalization.

## Tasks Completed

| Task | Description | Commit |
| ---- | ----------- | ------ |
| 1 | Fix Logger race condition and error handling | 09645ef |
| 2 | Enforce MAX_INPUT_BYTES during streaming in check.ts | 614abed |
| 3 | Remove as-any type casts | 4d8b7f1 |
| 4 | Add null ID correlation warning and config path validation | 2211c97 |
| 5 | Add tests for all fixes | 3bf436b |

## What Was Done

### Task 1 — Logger Race Condition (src/logger.ts)
Added `private closed = false` flag. `close()` now returns early if already closed then sets `closed = true`. `writeToFile()` returns early if `closed`. Wrapped `appendFileSync` fallback in try-catch that logs to stderr — prevents silent data loss on disk full scenarios.

### Task 2 — Streaming Size Enforcement (src/cli/check.ts)
Rewrote `readStdin()` to accumulate `Buffer` chunks and track `byteLength` incrementally. Rejects and destroys the stdin stream immediately when the 10MB limit is exceeded mid-stream. The post-read size check remains as belt-and-suspenders for the `--input` flag code path.

### Task 3 — Remove `as any` (src/types.ts, src/engine/policy.ts, src/engine/outbound-policy.ts, src/cli/check.ts, src/config/loader.ts)
Added three interfaces to types.ts: `ToolCallParams`, `McpContentBlock`, `McpResult`. In policy.ts: `msg.params as ToolCallParams`, `args as Record<string, unknown>`, method signatures changed to `unknown`. In outbound-policy.ts: `msg.result as McpResult`. In check.ts: `msg.params as ToolCallParams`. In loader.ts: `substituteInObject` now `unknown -> unknown` with `as Config` cast at call sites.

### Task 4 — Null ID Warning + Path Normalization (src/proxy.ts, src/config/loader.ts)
In proxy.ts `trackRequest()`: when a `tools/call` has null/undefined id, logs a warning to stderr that the response cannot be correlated for outbound inspection. In loader.ts `substituteVariables()`: after `${HOME}`, `${PROJECT_DIR}`, and `~/` substitution, absolute paths (starting with `/`) are normalized via `resolve()` to collapse any `../` traversal sequences introduced by config variables.

### Task 5 — Tests (src/__tests__/logger.test.ts, check.test.ts, policy.test.ts)
Created logger.test.ts with 6 tests: close() idempotency, double-close safety, post-close log is no-op, multiple rapid closes, stream write error degrades to stderr, closed flag state verification. Added 2 tests to check.test.ts: streaming byte accumulation rejects >10MB, accepts at limit. Added 3 tests to policy.test.ts: ToolCallParams evaluation without as-any, extra unknown fields don't break, ../ path traversal blocked.

## Deviations from Plan

None — plan executed exactly as written. The existing schema.ts type errors (Zod `.refine()` API issue) are pre-existing and out of scope — confirmed by stashing changes and verifying errors exist on the base commit.

## Self-Check: PASSED

Files exist:
- src/logger.ts — modified with closed flag
- src/cli/check.ts — modified with streaming check
- src/engine/policy.ts — modified, no as-any
- src/engine/outbound-policy.ts — modified, no as-any
- src/config/loader.ts — modified, unknown types + path normalization
- src/proxy.ts — modified with null-ID warning
- src/types.ts — added ToolCallParams, McpContentBlock, McpResult
- src/__tests__/logger.test.ts — created

Commits exist: 09645ef 614abed 4d8b7f1 2211c97 3bf436b

Test results: 143 tests passed (was 132, +11 new tests).
