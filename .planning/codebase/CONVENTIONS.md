# Coding Conventions

**Analysis Date:** 2026-02-27

## Naming Patterns

**Files:**
- Descriptive names: `parser.ts`, `logger.ts`, `proxy.ts`
- Command/module prefix: `check.ts`, `init.ts`, `wrap.ts` (CLI commands)
- Engine modules: `policy.ts`, `outbound-policy.ts`, `secrets.ts`
- Test files suffix: `.test.ts` (co-located in `__tests__` directory)

**Functions:**
- Verb-based: `parseJsonRpcLine()`, `createProxy()`, `loadConfig()`, `evaluateMessage()`
- Private functions use camelCase with `private` modifier: `matchesRule()`, `writeToFile()`, `deepScanObject()`
- Factory functions: `createLineBuffer()`, `createProxy()`, `compileSecretPatterns()`

**Variables:**
- camelCase throughout: `policyEngine`, `logLevel`, `commandParts`, `pendingRequests`
- Constants: UPPERCASE_SNAKE_CASE: `REQUEST_TTL_MS`, `MAX_LINE_LENGTH`, `LOG_LEVELS`, `CASE_INSENSITIVE_FS`
- Type guards: `isShuttingDown`, `wasRedacted` (boolean flags use "is/was" prefix)

**Types:**
- PascalCase for interfaces and types: `JsonRpcMessage`, `Config`, `Decision`, `PolicyEngine`, `Logger`
- Interface names are descriptive: `LoggerOptions`, `ProxyOptions`, `OutboundMatch`, `RedactionResult`
- No prefix conventions (no `I` prefix for interfaces)

## Code Style

**Formatting:**
- Prettier configured implicitly (ESM module, strict TypeScript)
- Line length: readable without hard wrap enforcer visible in config
- Indentation: 2 spaces (standard for TypeScript/Node.js)

**Linting:**
- TypeScript strict mode enabled: `"strict": true`
- `skipLibCheck: true` for dependencies
- `forceConsistentCasingInFileNames: true`
- No `.eslintrc` file — relies on TypeScript compiler strictness
- Async/await preferred over callbacks: `await readFile()`, async functions common

**Imports:**
- ESM imports: `import { readFile } from 'node:fs/promises'`
- Relative paths with `.js` extension for ESM: `import { PolicyEngine } from './engine/policy.js'`
- Type imports: `import type { Config, JsonRpcMessage } from '../types.js'`
- Node.js modules use `node:` prefix: `import { homedir } from 'node:os'`

## Import Organization

**Order:**
1. Node.js built-in modules (`node:fs`, `node:path`, `node:os`, etc.)
2. Third-party packages (`commander`, `yaml`, `zod`, `minimatch`)
3. Local modules (relative imports using `.js`)
4. Type imports (always separate with `type` keyword)

**Path Aliases:**
- None configured — all relative imports use full paths
- Config files referenced by export from parent: `import { DEFAULT_CONFIG } from '../config/defaults.js'`

**Example from `src/index.ts`:**
```typescript
import { program } from 'commander';
import { createRequire } from 'node:module';
import { loadConfig } from './config/loader.js';
import { PolicyEngine } from './engine/policy.js';
import type { Config } from './types.js';
```

## Error Handling

**Patterns:**
- Always check error type: `err instanceof Error ? err.message : String(err)`
- Never silently fail — always log to stderr: `process.stderr.write('[mcpwall] Error: ...\n')`
- Degrade gracefully on file write errors instead of crashing (`logger.ts` line 70-73)
- Catch all errors in message processing loops, continue rather than crash
- Exit codes: `process.exit(1)` for errors, `process.exit(0)` for success

**Example from `src/proxy.ts`:**
```typescript
try {
  const result = parseJsonRpcLineEx(line);
  // ... process
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[mcpwall] Error processing inbound message: ${message}\n`);
  // Forward raw line to prevent silent connection breaks
  if (child.stdin && !child.stdin.destroyed) {
    child.stdin.write(line + '\n');
  }
}
```

**Config Validation:**
- Zod used for all schema validation: `configSchema.parse(raw)`
- Validation errors throw immediately at load time, never silent failures
- ReDoS detection in regex patterns (`config/schema.ts` lines 13-28)
- Invalid regexes caught at startup with clear error messages

## Logging

**Framework:** `console` not used — custom `Logger` class in `src/logger.ts`

**Patterns:**
- All logging goes through `Logger.log(entry: LogEntry)` method
- Dual output: JSON lines to daily log files + colored stderr for humans
- Log levels: `debug`, `info`, `warn`, `error`
- Filtered by `log_level` config setting
- Action-based levels: `deny`/`redact` → warn, `allow`/`ask`/`log_only` → info

**Colors (ANSI):**
```typescript
allow  → \x1b[32m (green)
deny   → \x1b[31m (red)
ask    → \x1b[33m (yellow)
redact → \x1b[36m (cyan)
log    → \x1b[34m (blue)
```

**Security:**
- Args logged conditionally: `logArgs: 'full' | 'none'` setting
- Secrets redaction: `logRedacted: 'none' | 'hash' | 'full'`
- Stderr format: `[HH:MM:SS] ACTION method tool [rule] - message`

**Example from `src/logger.ts`:**
```typescript
log(entry: LogEntry): void {
  const level = this.getLogLevel(entry.action);
  if (LOG_LEVELS[level] < this.logLevel) {
    return; // Skip if below threshold
  }
  // ...
  this.writeToFile(fullEntry);
  this.writeToStderr(fullEntry);
}
```

## Comments

**When to Comment:**
- Complex algorithms: ReDoS detection pattern in `config/schema.ts`
- Security-critical sections: path traversal validation in `cli/init.ts`
- Non-obvious behavior: request-response correlation in `proxy.ts`
- Warnings about phase limitations: "ask rules not interactive in Phase 1"

**JSDoc/TSDoc:**
- Functions documented with JSDoc blocks: `/***/` above function
- Parameters not individually annotated — types in signature
- Return type documented if non-obvious
- Module-level comments explain purpose

**Example from `src/parser.ts`:**
```typescript
/**
 * Create a line buffer that accumulates chunks and emits complete lines
 * Handles partial lines that arrive across multiple chunks
 */
export function createLineBuffer(onLine: (line: string) => void): LineBuffer {
  // ...
}
```

## Function Design

**Size:**
- Most functions 40-80 lines
- Largest files: `proxy.ts` (400 lines), `policy.ts` (233 lines)
- Rule: break into smaller helpers when logic branches heavily

**Parameters:**
- Use objects for multiple related parameters: `ProxyOptions`, `LoggerOptions`
- Keep parameter lists under 5 items (use config objects otherwise)
- Type parameters always included (no `any` in strict mode)

**Return Values:**
- Explicit return types on all exported functions
- Union types for varied returns: `ParseResult = { type: 'single'; message } | { type: 'batch'; messages } | null`
- Never implicit `undefined` — return explicitly or throw

**Example from `src/parser.ts`:**
```typescript
export type ParseResult =
  | { type: 'single'; message: JsonRpcMessage }
  | { type: 'batch'; messages: JsonRpcMessage[] }
  | null;

export function parseJsonRpcLineEx(line: string): ParseResult {
  // ...
}
```

## Module Design

**Exports:**
- Named exports for functions: `export function parseJsonRpcLine() {}`
- Named exports for types: `export interface JsonRpcMessage {}`
- Default exports: only `createProxy()` function used in `index.ts`
- Single responsibility per module

**Barrel Files:**
- No barrel files — imports specify full paths
- Each module stands alone

**Organization:**
- `src/` entry point: `index.ts` (CLI + proxy launcher)
- `src/engine/` policy logic: `policy.ts`, `outbound-policy.ts`, `secrets.ts`
- `src/config/` configuration: `schema.ts`, `loader.ts`, `defaults.ts`
- `src/cli/` commands: `init.ts`, `check.ts`, `wrap.ts`
- `src/__tests__/` colocated tests
- `src/types.ts` central type definitions
- `src/logger.ts` logging utility
- `src/parser.ts` JSON-RPC parsing

## Security Conventions

**Input Validation:**
- Zod schemas for all external input (`config/schema.ts`)
- ReDoS protection on user-provided regexes
- Path traversal protection: `resolvedProfile.startsWith(resolvedProfiles + '/')` check

**Secrets Handling:**
- Never log unredacted secrets
- Deep scan objects for embedded secrets (`deepScanObject()`)
- Entropy threshold filtering to reduce false positives
- Display sanitization: strip ANSI codes + non-printable chars in CLI output

**Fail-Safe Patterns:**
- Message processing never crashes proxy: all errors caught, raw line forwarded
- File I/O errors degrade to stderr-only logging, don't crash
- EPIPE errors on stdout silently ignored (client disconnected)

---

*Convention analysis: 2026-02-27*
