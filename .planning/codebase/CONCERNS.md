# Codebase Concerns

**Analysis Date:** 2026-02-27

## Known Limitations (By Design)

**Ask Action Not Interactive:**
- Issue: The `ask` action is defined in the schema and config but not implemented. Rules using `action: 'ask'` silently behave as `allow` with a warning emitted at startup.
- Files: `src/engine/policy.ts` (lines 30-34), `src/proxy.ts` (line 95), `src/config/schema.ts` (line 65)
- Impact: Users may configure rules expecting interactive prompts, but traffic is allowed without user intervention. The warning is printed to stderr only at startup, so it's easily missed if not monitoring logs.
- Fix approach: Either (1) implement true interactive mode in proxy, or (2) change schema to remove `ask` and only support `allow`/`deny` with a clear warning in docs that this is a Phase 2 feature.

## Performance Concerns

**Regex Compilation at Startup:**
- Issue: All secret patterns, argument matchers, and outbound regex patterns are pre-compiled during PolicyEngine/OutboundPolicyEngine initialization. However, no validation occurs that regex patterns don't have exponential backtracking (ReDoS vulnerability).
- Files: `src/engine/policy.ts` (lines 38-49), `src/engine/outbound-policy.ts` (lines 28-36), `src/engine/secrets.ts` (lines 19-25)
- Impact: User-provided regex in config files could cause CPU exhaustion during matching. For example, a pattern like `(a|a)*b` with a non-matching input of `aaaa...` will have catastrophic backtracking.
- Fix approach: Add regex complexity analysis during config validation (e.g., using timeout tests or a ReDoS detection library). Fail config load on suspicious patterns.

**Per-Message Regex Scanning:**
- Issue: In `src/engine/outbound-policy.ts` line 119 and `src/engine/secrets.ts` lines 103-119, regex patterns are executed against every response. For large responses or many patterns, this could be slow.
- Files: `src/engine/outbound-policy.ts` (matchesRule), `src/engine/secrets.ts` (redactSecrets)
- Impact: Response inspection adds latency proportional to response size and number of patterns. No caching of compiled patterns across messages.
- Fix approach: Consider memoizing compiled patterns per rule or using more efficient pattern scanning (e.g., Aho-Corasick for substring matching instead of regex where possible).

**Request-Response Correlation Memory Leak Risk:**
- Issue: `pendingRequests` map in `src/proxy.ts` (lines 32-61) uses request TTL of 60 seconds. If responses arrive out-of-order or are delayed, entries could accumulate before cleanup.
- Files: `src/proxy.ts` (lines 32-61)
- Impact: Long-running proxies with many requests could accumulate stale entries in the map, slowly consuming memory.
- Fix approach: Implement max size cap on pendingRequests (e.g., 10,000 entries), evicting oldest entries if exceeded. Or use a circular buffer with fixed max size.

## Type Safety Issues

**Unsafe Type Casts (`as any`):**
- Issue: Multiple places use `as any` for type safety, reducing type-checking effectiveness:
  - `src/cli/check.ts` line 34: `msg.params as any`
  - `src/config/loader.ts` lines 47, 55: `obj: any` parameters throughout substitution
  - `src/engine/policy.ts` lines 93, 121: `params as any` and `args as any`
  - `src/engine/outbound-policy.ts` line 149: `result as any`
- Files: Multiple files as noted above
- Impact: Potential runtime errors if JSON structure differs from expectations. Type checker cannot catch misuse.
- Fix approach: Create stricter TypeScript types for message structures and use discriminated unions. Use type guards instead of `as any`.

## Edge Cases & Error Handling

**Partial Message Handling in Proxy:**
- Issue: In `src/proxy.ts` (lines 125-200), if a batch message is provided and ALL messages are denied, the proxy sends error responses but still calls `evaluateMessage()` for each. If the outbound path crashes while building these errors, the connection could hang.
- Files: `src/proxy.ts` (lines 156-189)
- Impact: Malformed batch messages could cause partial processing where some errors are sent but others are lost.
- Fix approach: Collect all decisions first, then atomically send responses. Use a transaction-like pattern.

**Silent Passthrough on Parser Error:**
- Issue: In `src/proxy.ts` (lines 191-199), if JSON parsing fails, the raw line is forwarded to stdin without validation. This is intentional (fail-open), but could mask protocol violations.
- Files: `src/proxy.ts` (lines 191-199)
- Impact: Malformed JSON-RPC messages are silently forwarded. If an attacker sends deliberately malformed messages, they bypass policy checking.
- Fix approach: Add strict mode flag to reject malformed messages instead of forwarding. Document fail-open behavior clearly in security docs.

**Request ID Correlation Gaps:**
- Issue: In `src/proxy.ts` (line 47), if a request has `id: null` or `id: undefined`, it's not tracked. These are valid JSON-RPC but cannot be correlated to responses.
- Files: `src/proxy.ts` (lines 36-61)
- Impact: Responses to requests without IDs cannot be attributed to the original request for outbound policy evaluation. Outbound rules won't have toolName context.
- Fix approach: Require IDs in tool call requests (per MCP spec). If missing, log a warning and don't forward.

## Configuration & Secrets

**Home Directory Path Expansion Not Validated:**
- Issue: Path expansion in `src/config/loader.ts` (lines 40-45) and `src/engine/policy.ts` (lines 201-206) uses simple string replacement. If a config file has `${HOME}/../../../etc/passwd`, it bypasses `not_under` checks.
- Files: `src/config/loader.ts`, `src/engine/policy.ts` (expandPath and normalizePath)
- Impact: A malicious or misconfigured rule using symlinks or relative paths could allow file access outside intended directories.
- Fix approach: Resolve all paths immediately after expansion and validate against realpath. The code does this in `normalizePath()` (lines 214-219) but only in policy matching, not during config load.

**Env Var Substitution in Config:**
- Issue: No env var substitution is implemented in `src/config/loader.ts`, only manual `${HOME}` and `${PROJECT_DIR}` replacements. A user might expect `${LOG_DIR}` or `${CONFIG_PROFILE}` to work.
- Files: `src/config/loader.ts` (lines 40-45)
- Impact: Users must hardcode paths or use shell tricks to expand env vars before passing config.
- Fix approach: Document clearly that only `${HOME}` and `${PROJECT_DIR}` are supported. Or add full env var expansion if needed.

## Testing & Coverage

**Limited Outbound Policy Tests:**
- Issue: Outbound policy engine has basic unit tests but limited integration tests for complex scenarios (e.g., batch responses, error responses, oversized responses).
- Files: `src/__tests__/outbound-policy.test.ts` (364 lines) lacks tests for:
  - Batch response messages with mixed allow/deny
  - Response size thresholds near boundary (10KB, 1MB)
  - Responses with deeply nested structures
- Impact: Bugs in response inspection could slip through. Example: if `response_size_exceeds` doesn't count error messages correctly, responses could bypass rules.
- Fix approach: Add property-based testing for response sizes and nested structures. Add tests for JSON-RPC error responses specifically.

**Check Command Input Validation:**
- Issue: `src/cli/check.ts` reads up to 10MB of stdin (line 14: `MAX_INPUT_BYTES`). But the implementation in `readStdin()` (lines 22-30) doesn't actually enforce the limit—it reads all input regardless of size.
- Files: `src/cli/check.ts` (lines 14-30)
- Impact: A malicious input of 100MB could cause high memory usage when testing rules via `mcpwall check`.
- Fix approach: Enforce the MAX_INPUT_BYTES limit in `readStdin()`. Reject with error if size is exceeded.

**No Fuzz Testing:**
- Issue: No fuzz tests for JSON-RPC parser, regex matching, or policy evaluation with malformed inputs.
- Files: `src/parser.ts`, `src/engine/policy.ts`
- Impact: Unexpected input formats could cause crashes or wrong behavior.
- Fix approach: Add property-based tests using fast-check or similar. Generate random JSON-RPC structures and verify parser doesn't crash.

## Security Gaps

**Entropy-Based Secret Detection May Miss Patterns:**
- Issue: `src/engine/secrets.ts` uses Shannon entropy thresholds (line 12: `entropy_threshold`). Low-entropy secrets (e.g., `sk-1111111111111111` or repeated characters) won't be detected if entropy is below threshold.
- Files: `src/engine/secrets.ts` (lines 37-44)
- Impact: Weak API keys or simple tokens could leak through outbound responses if entropy is tuned too high.
- Fix approach: Reduce default entropy thresholds in default config, or use multiple detection methods (fixed patterns + entropy).

**Regex Pattern Injection in Logger:**
- Issue: In `src/logger.ts` (lines 117-131), ANSI color codes are hardcoded. If stderr is piped to a log aggregation system, these codes could cause parsing issues.
- Files: `src/logger.ts` (lines 117-131)
- Impact: Log parsing tools may break on ANSI codes, or expose internal structure.
- Fix approach: Add flag to disable ANSI colors when writing to files. Check if stderr is a TTY before colorizing.

**No Rate Limiting:**
- Issue: The proxy allows unlimited tool calls. A misbehaving MCP server could flood the system with requests.
- Files: `src/proxy.ts` (entire file)
- Impact: DoS vulnerability where a tool call loop exhausts resources. Security policy mentions "rate limiting is a planned feature" in SECURITY.md line 41.
- Fix approach: Add configurable rate limiting per tool or per server. Use token bucket or sliding window algorithm.

## Fragile Areas

**Config Merging Order Dependency:**
- Issue: In `src/config/loader.ts` (lines 67-88), project rules are prepended to global rules (line 75). If both define a rule with the same name, order matters and there's no warning.
- Files: `src/config/loader.ts` (lines 67-88)
- Impact: Users may assume global rules take precedence, but project rules actually match first. Confusing behavior.
- Fix approach: Warn if duplicate rule names exist. Or enforce unique rule names across global + project.

**Logger Close Race Condition:**
- Issue: In `src/logger.ts` (lines 53-58) and `src/proxy.ts` (lines 390-396), `logger.close()` is called in exit handlers. If multiple exit handlers fire, close could be called twice, causing undefined behavior.
- Files: `src/logger.ts`, `src/proxy.ts` (lines 358-369, 390-396)
- Impact: Potential crash or dropped final log entries on process exit.
- Fix approach: Add guard flag in Logger.close() to ensure idempotency.

**WriteStream Error Handling in Logger:**
- Issue: In `src/logger.ts` (lines 70-74), if a write error occurs, the stream is nullified and fallback to `appendFileSync()` (line 81). But if `appendFileSync()` also fails, the error is not caught.
- Files: `src/logger.ts` (lines 70-82)
- Impact: Silent log loss if both stream and sync write fail. Audit trail could have gaps.
- Fix approach: Wrap `appendFileSync()` in try-catch and emit to stderr as last resort.

**Signal Handler Duplicate Escalation:**
- Issue: In `src/proxy.ts` (lines 373-388), if SIGTERM is sent twice rapidly, both handlers could fire, calling `kill('SIGKILL')` twice. The second call on an already-dead process is safe, but the logic could be clearer.
- Files: `src/proxy.ts` (lines 373-388)
- Impact: Edge case, but makes signal handling logic hard to reason about.
- Fix approach: Use once() listeners instead of on() for SIGINT/SIGTERM, or add guard in handleSignal.

## Missing Features

**No Policy Audit/Explain Mode:**
- Issue: There's no way to dump the effective compiled policy (rules + defaults) in a human-readable format.
- Files: N/A
- Impact: Users can't easily verify that their config + defaults produces the expected policy. Especially hard when both global and project configs exist.
- Fix approach: Add `mcpwall explain-policy` or `--explain` flag to dump merged config with all rules.

**No Rule Ordering Validation:**
- Issue: Rules are matched top-to-bottom (first match wins), but there's no warning if rules are unreachable (e.g., if a broad rule shadows a specific rule below it).
- Files: `src/engine/policy.ts` (lines 62-76)
- Impact: User may not realize their specific rules are dead code.
- Fix approach: Add `--validate-rules` flag that checks for shadowing and warns.

**No Built-in Rule Presets Beyond Default:**
- Issue: Only one default rule set (`rules/default.yml`) is shipped. Community rule packs (mentioned in CHANGELOG) are external.
- Files: `src/config/loader.ts` (lines 95-113)
- Impact: Hard for new users to discover security best practices beyond the default.
- Fix approach: Already addressed in v0.3.0 per CHANGELOG—profiles/rule packs are available. No change needed.

---

*Concerns audit: 2026-02-27*
