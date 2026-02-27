# Codebase Structure

**Analysis Date:** 2026-02-27

## Directory Layout

```
mcp-firewall/
├── src/                          # Source code (TypeScript)
│   ├── cli/                      # Command implementations
│   ├── config/                   # Configuration loading and validation
│   ├── engine/                   # Policy evaluation engines
│   ├── __tests__/                # Test files (co-located by feature)
│   ├── index.ts                  # CLI entry point
│   ├── proxy.ts                  # Stdio proxy (core logic)
│   ├── parser.ts                 # JSON-RPC parsing
│   ├── logger.ts                 # Audit logging
│   └── types.ts                  # Central type definitions
├── rules/                        # Built-in rule sets and profiles
│   ├── default.yml               # Default rules (fallback)
│   ├── strict.yml                # Strict rules (high security)
│   ├── profiles/                 # Named security profiles
│   │   ├── local-dev.yaml        # Permissive development profile
│   │   ├── company-laptop.yaml   # Corporate environment profile
│   │   └── strict.yaml           # Restrictive profile
│   └── servers/                  # Server-specific rule sets
│       ├── filesystem-mcp.yaml
│       ├── github-mcp.yaml
│       └── shell-mcp.yaml
├── dist/                         # Compiled JavaScript (generated)
├── .planning/                    # Documentation and planning
├── .github/                      # GitHub workflows and templates
├── site/                         # Marketing website (separate Next.js app)
├── docs/                         # Documentation
├── demo/                         # Demo and example configs
├── package.json                  # Package manifest
├── tsconfig.json                 # TypeScript configuration
├── tsup.config.ts                # Build configuration
└── README.md                     # User documentation
```

## Directory Purposes

**src/**
- Purpose: All TypeScript source code
- Contains: Policy engines, CLI commands, utilities, types
- Key files: `index.ts` (entry), `proxy.ts` (core), `types.ts` (contracts)

**src/cli/**
- Purpose: Command-line interface commands
- Contains: `init.ts` (setup wizard), `check.ts` (rule testing), `wrap.ts` (server config)
- Pattern: Each command is a standalone function, exports run[Command]()

**src/config/**
- Purpose: Configuration file loading, validation, merging
- Contains: Zod schemas, file discovery, variable substitution, defaults
- Key files: `schema.ts` (validation), `loader.ts` (discovery + merge), `defaults.ts` (hardcoded fallback)

**src/engine/**
- Purpose: Core policy evaluation logic
- Contains: `policy.ts` (inbound rules), `outbound-policy.ts` (response rules), `secrets.ts` (detection/redaction)
- Pattern: Classes with evaluate() methods, pre-compiled matchers for performance

**src/__tests__/**
- Purpose: Test files for all modules
- Contains: Test suites for policy, parser, secrets, profiles, integration
- Pattern: One test file per module, uses Vitest with describe/it

**rules/**
- Purpose: Built-in and user-facing rule sets
- Contains: YAML files defining tool call filters and response policies
- Key files: `default.yml` (ships with package), profiles for presets, servers for specific tools

**dist/**
- Purpose: Compiled JavaScript output
- Generated: Yes (from tsup build)
- Committed: No (gitignored)

**site/**
- Purpose: Marketing website and threat model docs
- Contains: Next.js app with blog posts, documentation
- Separate: Has own package.json, independent of core mcpwall

## Key File Locations

**Entry Points:**
- `src/index.ts`: CLI router, creates policy/outbound engines, spawns proxy
- `src/proxy.ts`: Main proxy logic, stdio interception, both inbound/outbound paths

**Configuration:**
- `src/config/schema.ts`: Zod validation schemas (rules, secrets, settings)
- `src/config/loader.ts`: File discovery (~/.mcpwall/config.yml, .mcpwall.yml), merging
- `src/config/defaults.ts`: Fallback config with hardcoded safe rules

**Core Logic:**
- `src/engine/policy.ts`: PolicyEngine — matches inbound tool calls
- `src/engine/outbound-policy.ts`: OutboundPolicyEngine — matches responses
- `src/engine/secrets.ts`: Secret detection and redaction (regex + entropy)

**Utilities:**
- `src/parser.ts`: JSON-RPC parsing, line buffering
- `src/logger.ts`: Dual-output audit logging (stderr + JSONL)
- `src/types.ts`: Interfaces (JsonRpcMessage, Rule, Config, Decision, etc.)

**Testing:**
- `src/__tests__/policy.test.ts`: PolicyEngine evaluation tests
- `src/__tests__/outbound-policy.test.ts`: OutboundPolicyEngine tests
- `src/__tests__/parser.test.ts`: JSON-RPC parsing tests
- `src/__tests__/secrets.test.ts`: Secret detection and redaction tests
- `src/__tests__/check.test.ts`: Check command functionality

## Naming Conventions

**Files:**
- CLI commands: `{command}.ts` (e.g., `init.ts`, `check.ts`)
- Engines: `{engine-name}.ts` (e.g., `policy.ts`, `outbound-policy.ts`)
- Tests: `{module}.test.ts` (co-located with source, same directory)
- Utilities: Descriptive names (`parser.ts`, `logger.ts`, `types.ts`)

**Directories:**
- Lowercase, kebab-case: `src/cli/`, `src/config/`, `src/engine/`, `src/__tests__/`
- Special: `__tests__/` (convention for test directories)

**Exports:**
- Classes: PascalCase (e.g., `PolicyEngine`, `Logger`, `OutboundPolicyEngine`)
- Functions: camelCase (e.g., `createProxy()`, `parseJsonRpcLine()`, `loadConfig()`)
- Types/Interfaces: PascalCase (e.g., `Config`, `Rule`, `Decision`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_CONFIG`, `MAX_LINE_LENGTH`)

## Where to Add New Code

**New Policy Feature:**
- Implementation: `src/engine/policy.ts` — add matching logic to `matchesRule()`
- Tests: `src/__tests__/policy.test.ts` — add test case
- Config: Update schema in `src/config/schema.ts` if new config fields needed
- Types: Update interfaces in `src/types.ts` if new structures needed

**New CLI Command:**
- Implementation: `src/cli/{command}.ts` — export `run{Command}()` async function
- Entry router: Add command handler to `src/index.ts` via Commander
- Tests: `src/__tests__/{command}.test.ts`

**New Secret Pattern:**
- Implementation: Add regex to `DEFAULT_SECRET_PATTERNS` in `src/config/defaults.ts`
- Tests: Test in `src/__tests__/secrets.test.ts`
- Rules file: Add to `rules/default.yml` if rule-level action needed

**New Outbound Rule Type:**
- Implementation: Add field to `OutboundMatch` in `src/types.ts`
- Engine: Add matching logic to `OutboundPolicyEngine.matchesRule()` in `src/engine/outbound-policy.ts`
- Schema: Update `outboundMatchSchema` in `src/config/schema.ts`
- Tests: Add test case to `src/__tests__/outbound-policy.test.ts`

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents
- Generated: By GSD mapper agents
- Committed: Yes (version control for analysis)

**`dist/`:**
- Purpose: Compiled JavaScript output
- Generated: Yes (npm run build)
- Committed: No (.gitignored)

**`rules/`:**
- Purpose: User-facing rule definitions
- Generated: No (hand-written YAML)
- Committed: Yes (ships with package, provides defaults)

**`site/out/`:**
- Purpose: Static site build output
- Generated: Yes (Next.js export)
- Committed: No (.gitignored)

## Build and Distribution

**Build Process:**
- Tool: `tsup` (see `tsup.config.ts`)
- Input: `src/**/*.ts` (TypeScript files)
- Output: `dist/` (compiled JavaScript)
- Entry: Compiled `dist/index.js` is executable (shebang present)

**Package Distribution:**
- Files included: `dist/`, `rules/`
- Executables: `bin.mcpwall` points to `dist/index.js`
- Node requirement: Node.js >= 20

**Test Running:**
- Tool: Vitest
- Command: `npm test` (runs all `__tests__/**/*.test.ts`)
- Watch mode: `npm run dev` (also runs tests in watch)

---

*Structure analysis: 2026-02-27*
