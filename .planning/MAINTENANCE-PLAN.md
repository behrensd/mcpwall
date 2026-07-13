# mcpwall Maintenance Plan — v0.4.0 (Hardening & Quality)

_Drafted 2026-07-13. Source: `.planning/codebase/CONCERNS.md` (2026-02-27), minus the 5 items fixed by quick-1 and the 2 fixed this session._

## Already done in v0.4.0 hardening work
- `src/config/schema.ts` — Zod v4 `.refine()` API → `tsc` clean
- `vitest.config.ts` + `integration.test.ts` — 20s timeout, kills load-induced flakes
- `src/proxy.ts` — cap pending request correlation map at 10,000 entries
- `src/logger.ts` — disable ANSI color codes when stderr is not a TTY
- `src/config/loader.ts` — warn on duplicate global/project rule names
- `src/cli/explain.ts` — add `mcpwall explain-policy`
- `src/engine/rate-limiter.ts` + proxy wiring — add opt-in per-tool rate limiting
- `src/proxy.ts` + CLI wiring — add opt-in `--strict` malformed JSON-RPC rejection

---

## Backlog — remaining CONCERNS items

### Tier 1 — small, self-contained, each testable (recommended first pass)

**A. Cap `pendingRequests` map size** · `src/proxy.ts:33`
- Now: `Map` with 60s TTL, swept only on `resolveRequest`. If responses never arrive (crashed server, notifications), entries accumulate → slow leak.
- Do: add `MAX_PENDING = 10_000`; on insert past cap, evict oldest (first Map key) before adding. Keep TTL sweep.
- Test: insert 10k+1 without resolving → size stays ≤ 10k, oldest gone.

**B. Strip ANSI colors when stderr isn't a TTY** · `src/logger.ts:126`
- Now: `formatAction()` always emits `\x1b[..m` codes. Piped to a file/aggregator → garbled logs.
- Do: gate colors on `process.stderr.isTTY` (compute once in ctor as `this.useColor`). Plain `ALLOW`/`DENY`/… when false.
- Test: mock non-TTY → output has no `\x1b`.

**C. Warn on duplicate rule names across global+project** · `src/config/loader.ts:74`
- Now: `mergeConfigs` concats `[...project.rules, ...global.rules]` — project shadows global silently. Same for `outbound_rules`, secret `patterns`.
- Do: after merge, detect duplicate `name`s; `stderr` warning naming the shadowed rule.
- Test: merge two configs sharing a rule name → warning emitted.

### Tier 2 — medium, more design surface

**D. `mcpwall explain-policy` (or `--explain`)** · new CLI command
- Dump the merged effective policy (rules + defaults, global+project) human-readable. High debugging value, no core-path risk.

**E. Rate limiting** · `src/proxy.ts`
- Token bucket per tool/server. SECURITY.md already promises it. Bigger: config schema + engine + tests.

### Tier 3 — design decisions (need Dom, not just code)
- **`ask` action** silently behaves as `allow` — implement interactive prompt, or remove from schema + document as Phase-2.
- **Entropy thresholds** may miss low-entropy secrets — pair fixed patterns with entropy, or lower defaults.
- **ReDoS validation** — partially covered now (schema.ts rejects nested quantifiers via `hasReDoSRisk`); decide if that's sufficient.

### Housekeeping
- Rewrite/delete stale `.planning/ROADMAP.md` (Phase 1 already done).
- Triage issues #1 / #2 (see below).

---

## GitHub issues assessment

Both #1 and #2 are from **the same author** (`tomjwxf` / "Tom, ScopeBlind"), opened the same day, zero comments, both pitching **the same external product**: `protect-mcp` (npm, MIT) + `@veritasacta/verify` + a personal IETF draft `draft-farley-acta-signed-receipts`.

- **#1** "issuer-blind trust tiers" and **#2** "signed receipts for blocking decisions" are **near-duplicates** — same ask, same links, different framing.
- This is **unsolicited integration/promo outreach**, not a bug or a user-filed feature request.
- ⚠️ **Security lens:** mcpwall is a security tool. Integrating or taking a dependency on an unfamiliar third-party package that "signs" security decisions is a supply-chain and trust surface we did not choose. The signed-receipts *idea* has merit; adopting *their* package/draft to get it does not follow.

**Recommendation:** the underlying idea — signed/tamper-evident audit logs — is a legitimate _own-roadmap_ item (mcpwall already produces JSON logs; adding optional Ed25519 signing is self-contained and dependency-light). Decouple the idea from the vendor:
- Close #2 as duplicate of #1 (polite, points to #1).
- On #1: thank, decline the integration/dependency, note we may explore native signed audit logs independently. No dependency adopted.

---

## Decision needed
Pick the first build target. Default recommendation: **Tier 1 (A+B+C) in one pass** — three real CONCERNS cleared, each with a test, no core-behavior risk. Then revisit D/E and the Tier-3 design calls.
