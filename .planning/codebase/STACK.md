# Technology Stack

**Analysis Date:** 2026-02-27

## Languages

**Primary:**
- TypeScript 5.9.3 - Core application, CLI, policies, and proxy logic
- JavaScript (ES2022) - Build output and browser runtime

**Secondary:**
- YAML - Configuration files for rules and settings

## Runtime

**Environment:**
- Node.js 20+ (required), tested on 20 and 22
- ESM (ECMAScript Modules) - Native ES modules only

**Package Manager:**
- npm (with package-lock.json) - Production
- npm (site/) - Documentation site

## Frameworks

**Core CLI/Application:**
- commander ^14.0.3 - CLI argument parsing and command definition
- node:child_process - Subprocess spawning for MCP server wrapping

**Data Handling:**
- zod ^4.3.6 - Schema validation for configuration files
- yaml ^2.8.2 - YAML config parsing
- minimatch ^10.2.0 - Glob pattern matching for tool/method filtering

**Build/Development:**
- tsup ^8.5.1 - TypeScript bundler for fast builds to ESM
- typescript ^5.9.3 - TypeScript compiler with strict mode
- vitest ^4.0.18 - Fast unit testing framework

**Documentation Site:**
- Next.js ^15.1.0 - Static marketing site
- React ^19.0.0 - React components
- Tailwind CSS ^4.0.0 - Styling (with @tailwindcss/postcss)

## Key Dependencies

**Critical:**
- commander - Enables CLI interface with subcommands (init, check, wrap)
- zod - Runtime validation prevents malformed security rules from loading silently
- yaml - Parses YAML config files into typed objects
- minimatch - Enables glob patterns in rules (e.g., `database.*` tool matching)

**Infrastructure:**
- node:fs, node:path, node:os - File system operations for config loading and logging
- node:readline/promises - Interactive CLI prompts for init/check wizards
- ANSI escape codes (inline) - Colored terminal output in logs

## Configuration

**Environment:**
- No external environment variables required by default
- Logs written to: `~/.mcpwall/logs/` (expandable with `${HOME}`, `${PROJECT_DIR}`, `~/`)
- Config locations:
  - Global: `~/.mcpwall/config.yml`
  - Project: `.mcpwall.yml`

**Build:**
- `tsup.config.ts` - Bundles `src/index.ts` to `dist/index.js` with Node shebang
- `tsconfig.json` - Strict mode, ES2022 target, declaration files
- Post-build: chmod +x on dist/index.js to make executable CLI

## Platform Requirements

**Development:**
- Node.js 20 or 22
- npm (or compatible lockfile)
- Git (for version from package.json)

**Production:**
- Node.js >=20 (latest LTS or newer)
- No external services required
- Runs as stdio proxy between MCP host and server
- Logs to local filesystem only

**Deployment:**
- npm package: `mcpwall` (published to npm registry)
- Binary entry point: `dist/index.js` (executable)
- Site deployed to Vercel (static export to Next.js)

## Testing Configuration

**Framework:** vitest ^4.0.18

**Run Commands:**
```bash
npm run build      # TypeScript to dist/
npm run dev        # Watch mode rebuilds
npm test           # Run all .test.ts files
```

**Test Files Location:** `src/__tests__/` (co-located with source)

---

*Stack analysis: 2026-02-27*
