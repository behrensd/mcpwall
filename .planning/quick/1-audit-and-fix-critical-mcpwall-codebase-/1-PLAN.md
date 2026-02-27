# Quick Task 1: Audit and Fix Critical mcpwall Codebase Issues

## Task Description
Fix all critical and high-severity issues identified in .planning/codebase/CONCERNS.md.

## Validated Concerns (Triage)

### Already Addressed (No Action Needed)
- **ReDoS validation**: `hasReDoSRisk()` in schema.ts validates inbound regex, outbound `response_contains_regex`, and secret patterns
- **Path traversal in matching**: `normalizePath()` uses `resolvePath()` + `realpathSync()` — existing test confirms `/../` traversal is caught

### Critical/High Fixes Required

## Plan

### Task 1: Fix Logger Race Condition and Error Handling
**Files:** `src/logger.ts`
**Action:**
1. Add `private closed = false` flag to Logger class
2. In `close()`, check `if (this.closed) return` before doing work, set `this.closed = true`
3. In `writeToFile()`, wrap `appendFileSync` fallback (line 81) in try-catch with stderr fallback
4. In `writeToFile()`, check `this.closed` early return
**Verify:** Run `npx vitest run src/__tests__/` — no regressions
**Done:** Logger.close() is idempotent, appendFileSync failures caught

### Task 2: Enforce MAX_INPUT_BYTES During Streaming in check.ts
**Files:** `src/cli/check.ts`
**Action:**
1. Rewrite `readStdin()` to enforce byte limit during reading, not after
2. Track accumulated bytes, reject with error when threshold exceeded
3. Remove post-read size check (now redundant — enforcement is streaming)
**Verify:** Run existing check tests
**Done:** readStdin() rejects over-limit input during streaming

### Task 3: Remove `as any` Type Casts
**Files:** `src/engine/policy.ts`, `src/engine/outbound-policy.ts`, `src/cli/check.ts`, `src/config/loader.ts`
**Action:**
1. Define `ToolCallParams` interface in types.ts: `{ name?: string; arguments?: Record<string, unknown> }`
2. Define `McpResult` interface in types.ts for response content
3. In policy.ts: replace `params as any` with proper type guard function `isToolCallParams()`
4. In outbound-policy.ts: replace `result as any` with `McpResult` type
5. In check.ts line 34: replace `msg.params as any` with typed access
6. In loader.ts: replace `obj: any` with `unknown` and add runtime type checks
**Verify:** Run `npx tsc --noEmit` — zero errors
**Done:** Zero `as any` in engine, check, and loader files

### Task 4: Add Null ID Correlation Warning and Config Path Validation
**Files:** `src/proxy.ts`, `src/config/loader.ts`
**Action:**
1. In proxy.ts `trackRequest()`: when id is null/undefined on a tools/call, log warning via logger about missing correlation
2. In loader.ts `substituteVariables()`: normalize paths after substitution using `resolve()` to prevent `${HOME}/../../../etc/passwd`
**Verify:** Run tests
**Done:** Null ID tools/call logged with warning, config paths normalized

### Task 5: Add Tests for All Fixes
**Files:** `src/__tests__/logger.test.ts` (new), `src/__tests__/check.test.ts`, `src/__tests__/policy.test.ts`
**Action:**
1. Create `logger.test.ts` with tests:
   - Logger.close() called twice does not throw
   - Logger handles write errors gracefully (mock writeStream error)
2. Add to `check.test.ts`:
   - readStdin with oversized input rejects early (test the streaming limit)
3. Add to `policy.test.ts`:
   - Test that typed params work correctly (no any casts)
   - Test null ID in proxy request tracking (unit test trackRequest behavior)
4. Add to existing test files:
   - Config path normalization prevents traversal in not_under values
**Verify:** Run full test suite: `npx vitest run`
**Done:** All fixes have test coverage
