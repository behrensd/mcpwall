# mcpwall Roadmap

## Current Milestone: v0.4.0 — Hardening & Quality

Status: in progress; Task 4 root-package verification is complete: `npx tsc --noEmit`, root `npm run build`, `npm test` (167 tests), and `git diff --check` passed. `npm --prefix site run build` remains inconclusive/unverified after a prior no-output hang and SIGINT, so full verification is not completely clean.

### Completed
- Typecheck cleanup for Zod v4 config validation.
- More reliable integration test timeouts under local CPU load.
- Bounded pending request correlation memory.
- Non-TTY stderr output without ANSI color codes.
- Duplicate rule-name warnings when project config shadows global config.
- `mcpwall explain-policy` for inspecting merged policy behavior.
- Opt-in per-tool rate limiting via `settings.rate_limit`.
- Opt-in `--strict` mode for rejecting malformed JSON-RPC lines.
- Removed the non-interactive `ask` action because it silently allowed traffic.

### Remaining Design Calls
- Decide whether default secret entropy thresholds should be lowered or paired with more fixed low-entropy token patterns.
- Decide whether the current ReDoS validation is sufficient for user-provided regexes.

### Later
- Native signed or tamper-evident audit logs, if desired, without adopting third-party vendor packages.
- GitHub issue triage for #1 and #2 once Dom wants to touch community/vendor outreach.
