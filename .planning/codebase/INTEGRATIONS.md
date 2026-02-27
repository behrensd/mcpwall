# External Integrations

**Analysis Date:** 2026-02-27

## APIs & External Services

**None Detected**

mcpwall does not integrate with external APIs or cloud services. It operates as a self-contained security proxy with no outbound connections to third-party services.

## Data Storage

**Databases:**
- None - application is stateless

**File Storage:**
- Local filesystem only
  - Config: `~/.mcpwall/config.yml` (optional, with fallback to defaults)
  - Logs: `~/.mcpwall/logs/YYYY-MM-DD.jsonl` (daily rotation, JSON Lines format)
  - Rules: Shipped with package in `rules/` directory

**Caching:**
- None - all policies evaluated fresh on each request

## Authentication & Identity

**Auth Provider:**
- Custom/None - mcpwall evaluates rules without authentication
- MCP servers handle their own auth; mcpwall operates transparently at the protocol level
- Configuration validated via Zod schema on startup (no runtime auth)

## Monitoring & Observability

**Error Tracking:**
- None - no external error reporting

**Logs:**
- Local JSON Lines files in `~/.mcpwall/logs/`
  - Format: One JSON object per line, rotated daily (YYYY-MM-DD.jsonl)
  - Fields: `ts`, `server`, `method`, `tool`, `args`, `action`, `rule`, `message`, `direction`, `redacted_patterns`
  - Also written to stderr with colored ANSI output (human-readable)
  - No log aggregation, no external services

## Monitoring the MCP Server

**Subprocess Management:**
- Node's `child_process.spawn()` to launch wrapped MCP server
- Stdio inheritance for server stderr debug output
- Signal forwarding to child (SIGINT, SIGTERM, SIGHUP)
- No external monitoring or health checks

## CI/CD & Deployment

**Hosting:**
- npm registry (published package)
- Vercel (site/ for documentation static export)
- GitHub (source repository)

**CI Pipeline:**
- GitHub Actions (`.github/workflows/ci.yml`)
  - Runs on push to main and pull requests
  - Tests on Node 20 and 22
  - Steps: checkout, setup-node, npm ci, npm build, npm test

**Package Publishing:**
- Manual trigger (prepublishOnly hook runs build + chmod)
- Binary executable: `dist/index.js` with shebang

## Environment Configuration

**Required env vars:**
- None required at runtime

**Optional env vars:**
- `HOME` - Used for config/log path expansion (e.g., `~/.mcpwall`)
- `NODE_ENV` - Not used by application

**Secrets location:**
- No external secrets management
- YAML configs are unencrypted plain text (user responsibility)
- Application supports redacting detected secrets from logs (built-in patterns)

## Built-in Secret Detection

**Patterns Detected** (from `src/config/defaults.ts`):
- AWS Access Keys: `AKIA[0-9A-Z]{16}`
- AWS Secret Keys: `[A-Za-z0-9/+=]{40}` (with entropy check)
- GitHub Tokens: `gh[ps]_*`, `github_pat_*`
- OpenAI Keys: `sk-[A-Za-z0-9]{20,}`
- Anthropic Keys: `sk-ant-[A-Za-z0-9-]{20,}`
- Stripe Keys: `(sk|pk|rk)_(test|live)_*`
- Private Key Headers: `-----BEGIN ... PRIVATE KEY-----`
- JWT Tokens: `eyJ...[header.payload.signature]`
- Slack Tokens: `xox[bpoas]-*`
- Database URLs: `(postgres|mysql|mongodb|redis)://[^\s]+`

**Redaction Actions:**
- Log only (hash): Hash the secret in logs
- Redact from responses: Remove secrets detected in MCP server responses
- Deny requests: Block tool calls with detected secrets in arguments

## Webhooks & Callbacks

**Incoming:**
- None - mcpwall is not a server, operates as stdio proxy

**Outgoing:**
- None - no external notifications or callbacks

## MCP Protocol

**Implementation:**
- JSON-RPC 2.0 bidirectional stdio communication
- Intercepts and evaluates requests between Claude/LLM host and MCP servers
- Supports:
  - Single messages
  - Batch messages
  - Request-response correlation via JSON-RPC id
  - Notifications (id-less messages, passed through)

**Transparent Proxy:**
- No modification of message schema
- Inbound: Claude → mcpwall → MCP Server
- Outbound: MCP Server → mcpwall → Claude
- Errors sent as proper JSON-RPC error objects when blocked

---

*Integration audit: 2026-02-27*
