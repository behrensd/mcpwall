# mcpwall Roadmap

## Current Milestone: v0.4.0 — Hardening & Quality

Status: in progress.

### Completed
- Typecheck cleanup for Zod v4 config validation.
- More reliable integration test timeouts under local CPU load.
- Bounded pending request correlation memory.
- Non-TTY stderr output without ANSI color codes.
- Duplicate rule-name warnings when project config shadows global config.
- `mcpwall explain-policy` for inspecting merged policy behavior.
- Opt-in per-tool rate limiting via `settings.rate_limit`.
- Opt-in `--strict` mode for rejecting malformed JSON-RPC lines.

### Remaining Design Calls
- Decide whether `action: ask` should become a real interactive flow or be removed from the active schema until it is ready.
- Decide whether default secret entropy thresholds should be lowered or paired with more fixed low-entropy token patterns.
- Decide whether the current ReDoS validation is sufficient for user-provided regexes.

### Later
- Native signed or tamper-evident audit logs, if desired, without adopting third-party vendor packages.
- GitHub issue triage for #1 and #2 once Dom wants to touch community/vendor outreach.
