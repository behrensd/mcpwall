# Changelog

## 0.3.0 (2026-02-28)

### `mcpwall check` — dry-run policy tester

Test any JSON-RPC tool call against your rules without running the proxy:

```bash
mcpwall check --input '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"read_file","arguments":{"path":"/home/user/.ssh/id_rsa"}}}'
# ✗ DENY   tools/call  read_file  /home/user/.ssh/id_rsa
#   Rule: block-ssh-keys
#   Blocked: access to SSH keys
```

- Exit code `0` = allowed, `1` = denied/redacted, `2` = input/config error
- Reads from `--input` flag or stdin (pipe-friendly)
- Works with both inbound requests and outbound responses
- ANSI terminal output injection prevented via sanitized display

### Named security profiles

Pick a security baseline when running `mcpwall init`:

```bash
mcpwall init --profile local-dev       # default rules (same as before)
mcpwall init --profile company-laptop  # adds GCP, Azure, package manager credential blocks
mcpwall init --profile strict          # deny-by-default whitelist mode
```

Profile names are validated before the interactive wizard runs. Path traversal in profile names is blocked.

### Community rule packs

Six new YAML files bundled in the npm package:

- `rules/profiles/local-dev.yaml` — sensible defaults, good starting point
- `rules/profiles/company-laptop.yaml` — managed machine additions (11 rules)
- `rules/profiles/strict.yaml` — deny-by-default (21 rules)
- `rules/servers/filesystem-mcp.yaml` — restricts reads/writes/listings to `${PROJECT_DIR}`
- `rules/servers/github-mcp.yaml` — logs file reads, blocks private repo enumeration
- `rules/servers/shell-mcp.yaml` — adds network command + package install blocks

### Stats

- 127 tests (31 new)
- 52 KB bundle

---

## 0.2.0 (2026-02-20)

### Response Inspection (Outbound Scanning)

- **Bidirectional scanning**: mcpwall now evaluates server responses before forwarding to the client, not just inbound requests
- **Secret redaction**: Responses containing API keys, tokens, or private keys are surgically redacted (`[REDACTED BY MCPWALL]`) while preserving JSON-RPC structure
- **Prompt injection detection**: Known injection phrases (e.g., "ignore previous instructions") in responses trigger a deny action, replacing the response with a blocked message
- **Zero-width character detection**: Flags invisible Unicode characters (U+200B, U+200C, etc.) used in CyberArk's ATPA attack technique
- **Response size monitoring**: Flag or block suspiciously large responses that may indicate data dumps
- **Request-response correlation**: Outbound rules can target specific tools (e.g., only scan `github_search` responses) via in-memory correlation with 60s TTL

### New Outbound Rule Actions

- `redact`: Surgically replace matched secrets, forward modified response
- `deny`: Replace entire response with blocked message
- `log_only`: Forward unchanged, log the match
- `allow`: Forward unchanged (explicit pass)

### IDE Support

- `mcpwall init` and `mcpwall wrap` now search Cursor, Windsurf, and VS Code configs in addition to Claude Code

### Rule Packs

- `rules/default.yml`: Added outbound rules for secret redaction and large response flagging
- `rules/strict.yml`: Added outbound rules for prompt injection blocking, shell pattern detection, zero-width char detection, and tighter size limits

### Stats

- 96 tests (30 new for outbound scanning)
- 43.83 KB bundle

## 0.1.2 (2026-02-17)

### Registry & Discovery

- Add `server.json` for official MCP Registry (`registry.modelcontextprotocol.io`)
- Add `glama.json` for Glama directory claim
- Add `mcpName` field to `package.json` (required by MCP Registry)
- Add badges to README (npm version, CI, Node.js, license)
- Update homepage to `mcpwall.dev`

## 0.1.1 (2026-02-17)

### Bug Fixes

- **Fix silent audit log**: Allowed tool calls were mapped to `debug` log level but the default level is `info`, so nothing was ever written to `~/.mcpwall/logs/`. All actions (allow, deny, ask) now log at `info` level by default, giving a complete audit trail out of the box.

### Documentation

- Add Docker MCP Toolkit as the primary Quick Start option in README
- Fix diagram label from "MCP Firewall" to "mcpwall"
- Clarify that all tool calls are logged by default

## 0.1.0 (2026-02-17)

Initial release.

- Transparent stdio proxy for MCP tool calls
- YAML-based policy engine with top-to-bottom rule evaluation
- Built-in rules: block SSH keys, .env files, credentials, browser data, destructive commands, pipe-to-shell, reverse shells, secret leakage
- Secret scanner with regex + Shannon entropy detection
- JSON Lines audit logging with daily rotation
- Interactive setup (`mcpwall init`) and single-server wrapping (`mcpwall wrap`)
- Default and strict rule packs included
- 66 tests, 32KB bundle
