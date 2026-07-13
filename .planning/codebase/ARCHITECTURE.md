# Architecture

**Analysis Date:** 2026-02-27

## Pattern Overview

**Overall:** Transparent stdio proxy with layered policy evaluation

**Key Characteristics:**
- Deterministic rule-based filtering (no AI, no cloud, pure logic)
- Request-response correlation for bidirectional policy enforcement
- Fail-open design: forwards raw messages on parse errors
- In-process secret detection and redaction using compiled regex patterns
- Daily rotating audit logs with dual output (stderr + JSON Lines files)

## Layers

**CLI Entry Layer:**
- Purpose: Parse commands, initialize engines, hand off to proxy or setup wizards
- Location: `src/index.ts`, `src/cli/`
- Contains: Command routing (init, check, wrap), argument parsing via Commander
- Depends on: Configuration loader, Policy/Outbound engines, Logger
- Used by: Node.js entry point (mcpwall bin)

**Configuration Layer:**
- Purpose: Load, validate, and merge YAML/JSON configs from global and project locations
- Location: `src/config/`
- Contains: Schema validation (Zod), file discovery, variable substitution, defaults
- Depends on: `types.ts`, yaml parser
- Used by: CLI entry, policy engines

**Policy Evaluation Layer:**
- Purpose: Rule-based matching for inbound tool calls and outbound responses
- Location: `src/engine/`
- Contains: `PolicyEngine` (inbound), `OutboundPolicyEngine` (outbound), secret scanning
- Depends on: Compiled regex patterns, minimatch for glob matching
- Used by: Proxy for decision-making

**Proxy/Stdio Layer:**
- Purpose: Intercept JSON-RPC messages, route through engines, forward or block
- Location: `src/proxy.ts`
- Contains: Child process spawning, line buffering, inbound/outbound paths, lifecycle
- Depends on: Policy engines, logger, JSON-RPC parser
- Used by: CLI entry point

**Utility Layers:**
- Parser: `src/parser.ts` — JSON-RPC line parsing, batch message handling
- Logger: `src/logger.ts` — Dual-output audit logging (stderr + daily JSONL files)
- Types: `src/types.ts` — Central type definitions for all layers

## Data Flow

**Inbound Path (Claude → Firewall → MCP Server):**

1. `process.stdin` receives JSON-RPC message as newline-delimited JSON
2. `LineBuffer` accumulates chunks, emits complete lines
3. `parseJsonRpcLineEx()` parses as single or batch message
4. `PolicyEngine.evaluate()` matches rules top-to-bottom (first match wins)
5. If `deny`: build error response, write to stdout, log
6. If `allow`: track request context (id → tool name), forward to child stdin
7. Child process (MCP server) receives forwarded message

**Outbound Path (MCP Server → Firewall → Claude):**

1. Child stdout emits JSON-RPC response message
2. `LineBuffer` accumulates chunks
3. `parseJsonRpcLineEx()` parses message
4. Correlate response id with tracked request to recover tool name
5. `OutboundPolicyEngine.evaluate()` matches outbound rules
6. Action taken:
   - `allow`: forward unchanged
   - `deny`: replace result with error message
   - `redact`: redact secrets using compiled patterns
   - `log_only`: forward unchanged but log the action
7. Write to `process.stdout` (back to Claude)
8. Log decision with context

**State Management:**
- Inbound tracking: `Map<id, RequestContext>` with TTL cleanup (60s)
- Policy state: Pre-compiled regex matchers and secret patterns (loaded at startup)
- Logger state: Dual write streams (stderr + file) with daily rotation

## Key Abstractions

**PolicyEngine:**
- Purpose: Match JSON-RPC requests against rules, return decision
- Examples: `src/engine/policy.ts`
- Pattern: Rule evaluation via `matchesRule()` private methods, caching of compiled matchers

**OutboundPolicyEngine:**
- Purpose: Evaluate responses, extract text, check against outbound rules, optionally redact
- Examples: `src/engine/outbound-policy.ts`
- Pattern: Same as PolicyEngine but with additional actions (redact, log_only)

**Secret Detection:**
- Purpose: Identify and redact known secret patterns (API keys, tokens, credentials)
- Examples: `src/engine/secrets.ts`
- Pattern: Compiled regex patterns with optional entropy thresholds

**Configuration Merging:**
- Purpose: Combine global (~/.mcpwall/config.yml) and project (.mcpwall.yml) settings
- Pattern: Project rules + settings override global; rules concatenate (project first)

## Entry Points

**CLI Entry (Proxy Mode):**
- Location: `src/index.ts` (-- separator path)
- Triggers: `mcpwall [options] -- <command> [args...]`
- Responsibilities: Parse options, load config, create engines, spawn proxy

**CLI Commands (Setup/Debug):**
- `init`: Interactive setup wizard, wraps MCP servers in config
- `check`: Test a tool call against rules (interactive or --input flag)
- `wrap`: Configure a specific server from ~/.mcp/servers.json

**Log Output:**
- Stderr: Human-readable colored summary (timestamp, action, method, tool, rule)
- Files: Daily JSONL audit log at `~/.mcpwall/logs/YYYY-MM-DD.jsonl`

## Error Handling

**Strategy:** Fail-open with graceful degradation

**Patterns:**
- Invalid JSON-RPC lines: Log error, forward raw line unchanged
- Invalid regexes in config: Caught at startup by Zod validation, prevents execution
- ReDoS patterns: Heuristic detection in `hasReDoSRisk()` blocks dangerous patterns
- Missing config file: Falls back to `DEFAULT_CONFIG` with hardcoded safe rules
- EPIPE on stdout: Caught silently (client disconnected), allows graceful shutdown
- Config substitution failures: Use values as-is if variable expansion fails

## Cross-Cutting Concerns

**Logging:**
- Dual output: stderr (human) + daily JSONL files (machine-readable)
- Levels: debug < info < warn < error
- Action mapping: deny/redact → warn, allow/log_only → info

**Validation:**
- Config: Zod schemas with regex validation, ReDoS detection
- Rules: require at least one match field (outbound rules)
- Paths: normalization, symlink resolution, case-insensitive filesystem handling

**Authentication:**
- Not in scope — mcpwall is a proxy layer
- Tool auth handled by MCP servers
- Secret patterns for redaction are regex-based, not crypto-verified

**Performance Optimization:**
- Regex matchers pre-compiled at startup (one-time cost)
- Secret patterns compiled once, reused per evaluation
- Line buffering (10MB max) prevents OOM from streaming
- Request context cleanup (TTL) prevents memory leaks

---

*Architecture analysis: 2026-02-27*
