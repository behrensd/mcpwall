<!-- mcp-name: io.github.behrensd/mcpwall -->
# mcpwall

[![npm version](https://img.shields.io/npm/v/mcpwall)](https://www.npmjs.com/package/mcpwall)
[![CI](https://github.com/behrensd/mcp-firewall/actions/workflows/ci.yml/badge.svg)](https://github.com/behrensd/mcp-firewall/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/node/v/mcpwall)](https://nodejs.org)
[![License: FSL-1.1-ALv2](https://img.shields.io/badge/license-FSL--1.1--ALv2-blue)](./LICENSE)

**iptables for MCP.** Blocks dangerous tool calls, scans for secret leakage, logs everything. No AI, no cloud, pure rules.

Sits between your AI coding tool (Claude Code, Cursor, Windsurf) and MCP servers, intercepting every JSON-RPC message and enforcing YAML-defined policies.

<p align="center">
  <img src="demo/demo.gif" alt="mcpwall demo — blocking SSH key theft, pipe-to-shell, and secret leakage" width="700">
</p>

## Why

MCP servers have full access to your filesystem, shell, databases, and APIs. When an AI agent calls `tools/call`, the server executes whatever the agent asks — reading SSH keys, running `rm -rf`, exfiltrating secrets. There's no built-in policy layer.

mcpwall adds one. It's a transparent stdio proxy that:

- **Blocks sensitive file access** — `.ssh/`, `.env`, credentials, browser data
- **Blocks dangerous commands** — `rm -rf`, pipe-to-shell, reverse shells
- **Scans for secret leakage** — API keys, tokens, private keys (regex + entropy)
- **Logs everything** — JSON Lines audit trail of every tool call
- **Uses zero AI** — deterministic rules, no LLM decisions, no cloud calls

## Install

```bash
npm install -g mcpwall
```

Or use directly with npx:

```bash
npx mcpwall -- npx -y @modelcontextprotocol/server-filesystem /path/to/dir
```

## Quick Start

### Option 1: Docker MCP Toolkit

If you use [Docker MCP Toolkit](https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/) (the most common setup), change your MCP config from:

```json
{
  "mcpServers": {
    "MCP_DOCKER": {
      "command": "docker",
      "args": ["mcp", "gateway", "run"]
    }
  }
}
```

To:

```json
{
  "mcpServers": {
    "MCP_DOCKER": {
      "command": "npx",
      "args": ["-y", "mcpwall", "--", "docker", "mcp", "gateway", "run"]
    }
  }
}
```

That's it. mcpwall now sits in front of all your Docker MCP servers, logging every tool call and blocking dangerous ones. No config file needed — sensible defaults apply automatically.

### Option 2: Interactive setup

```bash
npx mcpwall init
```

This finds your existing MCP servers in `~/.claude.json` or `.mcp.json` and wraps them.

### Option 3: Manual wrapping (any MCP server)

Change your MCP config from:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/projects"]
    }
  }
}
```

To:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y", "mcpwall", "--",
        "npx", "-y", "@modelcontextprotocol/server-filesystem", "/Users/me/projects"
      ]
    }
  }
}
```

### Option 4: Wrap a specific server

```bash
npx mcpwall wrap filesystem
```

## How It Works

```
┌──────────────┐    stdio     ┌──────────────┐    stdio     ┌──────────────┐
│  Claude Code │ ──────────▶  │   mcpwall    │ ──────────▶  │  Real MCP    │
│  (MCP Host)  │ ◀──────────  │   (proxy)    │ ◀──────────  │   Server     │
└──────────────┘              └──────────────┘              └──────────────┘
```

1. Intercepts every JSON-RPC request on stdin
2. Parses `tools/call` requests — extracts tool name and arguments
3. Walks rules top-to-bottom, first match wins
4. **Allow**: forward to real server
5. **Deny**: return JSON-RPC error to host, log, do not forward
6. Responses from server are forwarded back and logged

## Configuration

Config is YAML. mcpwall looks for:

1. `~/.mcpwall/config.yml` (global)
2. `.mcpwall.yml` (project, overrides global)

If neither exists, built-in default rules apply.

### Example config

```yaml
version: 1

settings:
  log_dir: ~/.mcpwall/logs
  log_level: info         # debug | info | warn | error
  default_action: allow   # allow | deny | ask

rules:
  # Block reading SSH keys
  - name: block-ssh-keys
    match:
      method: tools/call
      tool: "*"
      arguments:
        _any_value:
          regex: "(\\.ssh/|id_rsa|id_ed25519)"
    action: deny
    message: "Blocked: access to SSH keys"

  # Block dangerous shell commands
  - name: block-dangerous-commands
    match:
      method: tools/call
      tool: "*"
      arguments:
        _any_value:
          regex: "(rm\\s+-rf|curl.*\\|.*bash)"
    action: deny
    message: "Blocked: dangerous command"

  # Block writes outside project directory
  - name: block-external-writes
    match:
      method: tools/call
      tool: write_file
      arguments:
        path:
          not_under: "${PROJECT_DIR}"
    action: deny

  # Scan all tool calls for leaked secrets
  - name: block-secret-leakage
    match:
      method: tools/call
      tool: "*"
      arguments:
        _any_value:
          secrets: true
    action: deny
    message: "Blocked: detected secret in arguments"

secrets:
  patterns:
    - name: aws-access-key
      regex: "AKIA[0-9A-Z]{16}"
    - name: github-token
      regex: "(gh[ps]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{22,})"
    - name: private-key
      regex: "-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"
    - name: generic-high-entropy
      regex: "[A-Za-z0-9/+=]{40}"
      entropy_threshold: 4.5
```

### Rule matchers

| Matcher | Description |
|---------|-------------|
| `regex` | Regular expression test on the value |
| `pattern` | Glob pattern (uses [minimatch](https://github.com/isaacs/minimatch)) |
| `not_under` | Matches if path is NOT under the given directory. Supports `${HOME}`, `${PROJECT_DIR}` |
| `secrets` | When `true`, runs the secret scanner on the value |

The special key `_any_value` applies the matcher to ALL argument values.

### Built-in rule packs

- `rules/default.yml` — sensible defaults (blocks SSH, .env, credentials, dangerous commands, secrets)
- `rules/strict.yml` — deny-by-default paranoid mode (whitelist only project reads/writes)

Use strict mode:

```bash
mcpwall -c /path/to/strict.yml -- npx -y @some/server
```

## CLI

```
mcpwall [options] -- <command> [args...]   # Proxy mode
mcpwall init                               # Interactive setup
mcpwall wrap <server-name>                 # Wrap specific server
```

Options:
- `-c, --config <path>` — path to config file
- `--log-level <level>` — override log level (debug/info/warn/error)

## Audit Logs

All tool calls are logged by default — both allowed and denied. Logs are written as JSON Lines to `~/.mcpwall/logs/YYYY-MM-DD.jsonl`:

```json
{"ts":"2026-02-16T14:30:00Z","method":"tools/call","tool":"read_file","action":"allow","rule":null}
{"ts":"2026-02-16T14:30:05Z","method":"tools/call","tool":"read_file","args":"[REDACTED]","action":"deny","rule":"block-ssh-keys","message":"Blocked: access to SSH keys"}
```

Denied entries have args redacted to prevent secrets from leaking into logs.

mcpwall also prints color-coded output to stderr so you can see decisions in real time.

## Security Design

- **Fail closed on invalid config**: Bad regex in a rule crashes at startup, never silently passes traffic
- **Args redacted on deny**: Blocked tool call arguments are never written to logs
- **Path traversal defense**: `not_under` matcher uses `path.resolve()` to prevent `../` bypass
- **Pre-compiled regexes**: All patterns compiled once at startup for consistent performance
- **No network**: Zero cloud calls, zero telemetry, runs entirely local
- **Deterministic**: Same input + same rules = same output, every time

## License

[FSL-1.1-ALv2](./LICENSE) — source-available, converts to Apache 2.0 after 2 years.

---

mcpwall is not affiliated with or endorsed by Anthropic or the Model Context Protocol project. MCP is an open protocol maintained by the Agentic AI Foundation under the Linux Foundation.
