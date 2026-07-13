# Handoff — mcpwall maintenance session

_Written 2026-07-13 by a Claude Code session, for whichever agent picks this up next (Codex or otherwise). Read this end to end before touching anything — it's meant to be self-contained._

## What this repo is

**mcpwall** — "iptables for MCP." A transparent stdio proxy that sits between an AI coding tool (Claude Code, Cursor, Windsurf) and an MCP server, intercepting every JSON-RPC message and enforcing YAML-defined policies. No AI, no cloud — pure deterministic rules. Blocks dangerous tool calls (SSH keys, `rm -rf`, etc.), scans for secret leakage, redacts secrets from server responses, logs everything.

- **Local path:** `/Users/dom/Documents/oso-mcp/mcp-firewall`
- **GitHub:** `behrensd/mcpwall` (https://github.com/behrensd/mcpwall), default branch `main`
- **Published:** npm package `mcpwall`, currently `0.3.1` in `package.json` (not yet bumped for this session's work)
- **Owner:** Dom Behrens (GitHub: behrensd). Night-owl schedule, reads responses on phone — keep replies concise. No emojis unless asked. **Always ask before pushing to remote, committing, sending emails, or closing issues** — this session committed locally only on explicit "go on" instructions each time; nothing has been pushed.

## Architecture at a glance

```
src/index.ts           CLI entry (commander) — dispatches to proxy or subcommands
src/proxy.ts           Core stdio proxy — the actual firewall logic
src/parser.ts          JSON-RPC line parsing (single + batch messages)
src/logger.ts          JSON-Lines audit logger, writes stderr + daily log files
src/types.ts           Shared types (Config, Rule, Decision, etc.)
src/config/
  loader.ts            Loads + merges global (~/.mcpwall/config.yml) and project (.mcpwall.yml) config
  schema.ts             Zod validation schema for config
src/engine/
  policy.ts             Inbound rule matching (tools/call requests)
  outbound-policy.ts    Outbound rule matching (server responses)
  secrets.ts            Secret detection (regex + entropy)
  rate-limiter.ts        NEW this session — token-bucket rate limiter
src/cli/
  check.ts              `mcpwall check` — dry-run a tool call against rules
  init.ts                `mcpwall init` — setup wizard
  wrap.ts                `mcpwall wrap <server>` — wrap a specific MCP server
  explain.ts             NEW this session — `mcpwall explain-policy`
rules/default.yml       Built-in default rule set shipped with the package
src/__tests__/          Vitest tests, including integration.test.ts which spawns
                        real `node dist/index.js` subprocesses against a fake
                        echo MCP server over stdio
```

Rules are first-match-wins, evaluated top-to-bottom. Project config rules are prepended before global rules (project wins on collision — now warned about, see below).

## Environment gotchas — read before running anything

1. **`npm run build` / `npm test` may fail with `Cannot find module @rollup/rollup-darwin-arm64`.** This is the known npm optional-deps bug (npm/cli#4828), not a code problem. Fix:
   ```
   npm i @rollup/rollup-darwin-arm64 --no-save
   ```
2. **macOS has no `timeout` command** (that's GNU coreutils). Don't rely on it in shell one-liners here; use background execution + polling instead, or `gtimeout` if coreutils is installed.
3. **The full test suite can spuriously fail under heavy concurrent CPU load** (e.g. running `tsc` and `vitest` at the same time). `integration.test.ts` spawns real subprocesses over stdio with timeouts — if the machine is busy, it can genuinely take longer than the timeout. This session raised the timeouts (see below) but if you see integration tests time out, re-run in isolation first before assuming a regression:
   ```
   npx vitest run src/__tests__/integration.test.ts
   ```
4. **Secrets in the repo directory are gitignored, not tracked** — confirmed safe: `.env.local`, `.mcpregistry_github_token`, `.mcpregistry_registry_token`. Don't `git add -A` blindly; always check `git status` before staging.

## Current verified state

Continuation update after `1a5ca4e`:

- Added opt-in `--strict` proxy mode. Malformed inbound JSON-RPC now returns a JSON-RPC parse/invalid-request error and is not forwarded when strict mode is enabled. Default behavior remains fail-open for compatibility.
- Updated `README.md`, `SECURITY.md`, `CHANGELOG.md`, `.planning/MAINTENANCE-PLAN.md`, and rewrote `.planning/ROADMAP.md`.
- `npx tsc --noEmit` → **clean, 0 errors**
- `npm run build` → **succeeds**
- `npx vitest run` → **164/164 tests pass**
- Manual strict-mode check against `dist/index.js` returned `-32700` for invalid JSON and logged `strict_json_rpc`.

Prior verified state as of `0c98ec3`:

- `npx tsc --noEmit` → **clean, 0 errors**
- `npm run build` → **succeeds** (esbuild via tsup, ~63KB output, does NOT typecheck — that's why tsc errors can slip through a green build)
- `npx vitest run` → **163/163 tests pass**, ~2s runtime when the machine isn't under load
- Working tree then: clean except two **uncommitted, untracked** planning docs (see Housekeeping below)

## Session work log (chronological, all commits on `main`, nothing pushed)

Starting point: `88b9ba2` (a prior "quick-1" audit task had already fixed 5 items from `.planning/codebase/CONCERNS.md`: logger close() race, streaming size enforcement in `check.ts`, `as any` removal, null-ID warning, config path normalization — 132→143 tests).

This session's commits, in order:

1. **`62d801e` fix: migrate schema.ts refine() to Zod v4 error API**
   `src/config/schema.ts` used Zod v3's `(val) => ({message})` refine signature, which Zod v4 (already installed, `^4.3.6`) silently doesn't support the same way — `tsc` was red but `build`/`test` stayed green because esbuild doesn't typecheck and runtime behavior was unaffected. Switched to `{ error: (iss) => string }`.

2. **`fb582ea` test: raise integration test timeout to prevent load-induced flakes**
   Added `vitest.config.ts` (`testTimeout: 20000`); raised the `sendAndCollect()` helper's internal collector timeout in `integration.test.ts` from 5s→15s. The full suite was flaking under CPU load because the vitest-level 5s default timeout raced the helper's own 5s timeout.

3. **`93089a9` fix: bound pendingRequests map to prevent slow memory leak**
   `src/proxy.ts` — the JSON-RPC id→context correlation map (`pendingRequests`) only got swept when `resolveRequest()` was called on a matching response. If responses never arrive (crashed server, dropped notifications), entries accumulate indefinitely. Added `evictOldestIfFull()` (exported helper, generic over any `Map`) with a 10,000-entry cap, evict-oldest-first.

4. **`e5c216c` fix: disable ANSI colors when stderr is not a TTY**
   `src/logger.ts` — `formatAction()` always emitted `\x1b[..m` color codes, garbling output when piped to a file or log aggregator. Added `useColor = process.stderr.isTTY === true`, computed once in the constructor.

5. **`465f12a` fix: warn on duplicate rule names across global and project config**
   `src/config/loader.ts` — project rules are prepended before global rules and win on first-match, silently shadowing a global rule of the same name. Added `warnDuplicateNames()` (exported for testing), called for rules, outbound_rules, and secret patterns during merge; emits a stderr warning naming the shadowed rule.

6. **`1fc1ee0` feat: add explain-policy command**
   New `mcpwall explain-policy` CLI command (`src/cli/explain.ts`, wired in `src/index.ts`). Dumps the effective merged policy (settings, inbound rules in match order + fallthrough, outbound rules, secret patterns) in human-readable form, read-only, no proxy started. Core logic is a pure `formatPolicy(config): string` function, unit tested. **Manually verified against the real shipped default rules** — output confirmed correct (see commit for full sample).

7. **`0c98ec3` feat: add opt-in per-tool rate limiting**
   New `src/engine/rate-limiter.ts` — a deterministic token-bucket `RateLimiter` class, keyed per tool name (so one misbehaving tool loop can't starve rate budget for other tools). Config: `settings.rate_limit: { max_calls, window_seconds }`, optional, **disabled unless explicitly configured** (no surprise behavior change for existing users). Wired into `proxy.ts`'s inbound path (both single-message and batch-message code paths) — a rate-limited call produces a synthetic `Decision` with `rule: 'rate_limit'` that flows through the exact same deny path as a policy-rule denial (same JSON-RPC error shape, same logging). Updated `SECURITY.md` (previously said "rate limiting is a planned feature" under Out of Scope — now describes the mitigation) and `README.md` (config example). **Verified with a real end-to-end integration test** that spawns the proxy against a fake echo server and confirms: 2 allowed calls to `read_file`, 3rd denied with "Rate limit exceeded... read_file", a 4th call to a *different* tool (`write_file`) unaffected (separate bucket). Also manually ran `explain-policy` against a config with `rate_limit` set to confirm it renders (`50 calls / 60s per tool`).

Test count progression this session: 143 → 153 (Tier 1: A/B/C) → 158 (+explain-policy) → 163 (+rate limiter).

## What's NOT done — remaining backlog

Full detail lives in **`.planning/MAINTENANCE-PLAN.md`** (untracked — see Housekeeping). Summary:

### Tier 3 — design decisions needed, not mechanical fixes
These need a product/security judgment call from Dom, not just code:
- **`ask` action is a stub.** Rules with `action: ask` silently behave as `allow` (with a startup warning). Either implement real interactive prompting in the proxy, or remove `ask` from the schema/types and document it as a future phase. Touches `src/engine/policy.ts`, `src/proxy.ts`, `src/config/schema.ts`, `src/types.ts`.
- **Entropy-based secret detection may miss low-entropy secrets** (e.g. `sk-1111111111111111`). `src/engine/secrets.ts` — consider lowering default entropy thresholds or layering more fixed patterns.

### Housekeeping — explicit user decisions still pending
- **`.planning/ROADMAP.md`** has been rewritten as a current v0.4.0 roadmap and is still untracked until Dom asks to commit.
- **`.planning/MAINTENANCE-PLAN.md`** is tracked and now reflects completed v0.4.0 hardening work, including `--strict`.
- **GitHub issues #1 and #2** — explicitly left untouched this session per Dom's decision ("leave them for now"). Assessment for whoever revisits: both are from the same author (`tomjwxf` / "Tom, ScopeBlind"), opened the same day, zero comments, both pitching integration with the author's own npm package `protect-mcp` + a personal IETF draft (`draft-farley-acta-signed-receipts`) for Ed25519-signed audit receipts. They are near-duplicates of each other (#2 essentially restates #1). This is unsolicited vendor outreach, not a bug report or a mcpwall-user-filed feature request. Recommendation if/when revisited: **don't take the dependency** — mcpwall is a security tool, and adopting an unfamiliar third-party package to "sign" your security decisions is an unvetted supply-chain/trust surface. The underlying idea (tamper-evident/signed audit logs) is legitimate and could be built natively (mcpwall already emits JSON logs; native Ed25519 signing would be a small, dependency-light addition) — but that's a "build our own" roadmap item, not "integrate their package." If closing: close #2 as duplicate of #1, decline the integration on #1 with thanks.

## Conventions this repo/session followed (keep following them)

- Conventional commit messages (`fix:`, `feat:`, `test:`, `docs:`), each commit ends with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` (adjust the co-author line to match whichever agent/model is actually doing the work).
- **Never commit or push without being explicitly asked.** This session asked before every commit round; commits happened only after "go on" / "yes go on" instructions.
- Every change was verified with the same three-step loop before being called done: `npx tsc --noEmit` → `npm run build` → `npx vitest run`, plus at least one **real manual exercise** of new CLI behavior (not just unit tests) — e.g. actually running `explain-policy` against the shipped default rules, actually spawning the proxy for the rate-limit test.
- Small, single-purpose commits — one concern per commit, not squashed together.
- No comments explaining *what* code does; comments only where there's a non-obvious *why* (e.g. why `evictOldestIfFull` evicts oldest-first, why rate limiting is keyed per-tool not global).

## Suggested next step

Pick one of the remaining Tier 3 design items above and bring it to Dom as a question before implementing — `ask` semantics and entropy thresholds are product/security tradeoffs, not mechanical fixes. Alternatively, revisit GitHub issues #1/#2 per the recommendation above when Dom wants community/vendor outreach handled.
