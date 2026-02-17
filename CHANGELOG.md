# Changelog

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
