# Testing Patterns

**Analysis Date:** 2026-02-27

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `package.json` only (no separate vitest.config.ts)
- Run: `npm run test` (vitest run)
- Watch mode: `npm run dev` (tsup --watch, for building)

**Assertion Library:**
- Vitest built-in: `expect()` from Vitest
- No additional assertion libraries

**Run Commands:**
```bash
npm run test              # Run all tests once
npm run build             # Compile TypeScript
npm run dev               # Watch mode for development
```

## Test File Organization

**Location:**
- Colocated in `src/__tests__/` directory (not paired with individual files)
- Single directory containing all test suites
- Mirrors source structure by naming: `parser.test.ts` tests `src/parser.ts`

**Naming:**
- `.test.ts` suffix: `parser.test.ts`, `policy.test.ts`, `secrets.test.ts`
- Matches tested module name for clarity

**Structure:**
```
src/__tests__/
├── parser.test.ts           # Tests for src/parser.ts
├── policy.test.ts           # Tests for src/engine/policy.ts
├── outbound-policy.test.ts  # Tests for src/engine/outbound-policy.ts
├── secrets.test.ts          # Tests for src/engine/secrets.ts
├── redact-secrets.test.ts   # Tests for redaction functionality
├── integration.test.ts      # End-to-end tests with mock MCP server
├── check.test.ts            # Tests for src/cli/check.ts
├── profile-validation.test.ts
├── profiles-valid.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '../engine/policy';
import type { Config, JsonRpcMessage } from '../types';

describe('PolicyEngine', () => {
  it('first-match-wins: two rules match, first rule action is used', () => {
    const config: Config = { /* ... */ };
    const engine = new PolicyEngine(config);
    const msg: JsonRpcMessage = { /* ... */ };

    const decision = engine.evaluate(msg);
    expect(decision.action).toBe('deny');
    expect(decision.rule).toBe('deny-all-tools');
  });
});
```

**Patterns:**
- Use `describe()` for grouping related test cases
- Use `it()` for individual assertions
- Descriptive test names that read like documentation: "first-match-wins: two rules match, first rule action is used"
- Setup objects inline within test (no complex beforeEach for most tests)
- Arrange-Act-Assert implicit (object setup, function call, expect)

## Mocking

**Framework:** Node.js built-in (no vitest mocks needed for most tests)

**Patterns:**

**1. Mock servers (for integration tests):**
```typescript
// From integration.test.ts
const ECHO_SERVER_SCRIPT = `
process.stdin.setEncoding('utf-8');
let buffer = '';
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\\n');
  buffer = lines.pop() || '';
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.method === 'initialize') {
        // Send response
      } else if (msg.method === 'tools/list') {
        // Send tool list
      } else if (msg.method === 'tools/call') {
        // Echo or return test data
      }
    } catch (e) {}
  }
});
`;
```

**2. Test configuration factories:**
```typescript
function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    version: 1,
    settings: {
      log_dir: '/tmp/test',
      log_level: 'debug',
      default_action: 'allow',
      ...overrides.settings,
    },
    rules: [],
    outbound_rules: overrides.outbound_rules || [],
    secrets: overrides.secrets || { patterns: [...] },
  };
}

function makeResponse(result: unknown, id: number = 1): JsonRpcMessage {
  return { jsonrpc: '2.0', id, result };
}

function makeMcpResponse(text: string, id: number = 1): JsonRpcMessage {
  return makeResponse({
    content: [{ type: 'text', text }],
  }, id);
}
```

**What to Mock:**
- External server responses (in integration tests)
- Configuration objects (use factory functions)
- File system operations (use real fs for most, mock for edge cases)

**What NOT to Mock:**
- Core engine logic (PolicyEngine, OutboundPolicyEngine, secrets scanner)
- JSON parsing (uses real `JSON.parse()`)
- Type validation (uses real Zod validation)

## Fixtures and Factories

**Test Data:**

**Secret patterns (from `secrets.test.ts`):**
```typescript
const patterns = compileSecretPatterns([
  { name: 'AWS Access Key', regex: 'AKIA[0-9A-Z]{16}' },
  { name: 'GitHub Token', regex: 'ghp_[A-Za-z0-9_]{36,}' },
  { name: 'Private Key Header', regex: '-----BEGIN (RSA |EC )?PRIVATE KEY-----' }
]);
```

**Config builders (from `outbound-policy.test.ts`):**
```typescript
function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    version: 1,
    settings: {
      log_dir: '/tmp/test',
      log_level: 'debug',
      default_action: 'allow',
      ...overrides.settings,
    },
    rules: [],
    outbound_rules: overrides.outbound_rules || [],
    secrets: overrides.secrets || { /* patterns */ },
  };
}
```

**Location:**
- Test factories defined at top of test file
- Patterns replicated across test files (DRY pattern not enforced)
- Mock MCP server script defined as string literal in `integration.test.ts`

## Coverage

**Requirements:** Not enforced (no coverage config in package.json)

**View Coverage:** Not configured

**Implicit Coverage Areas (based on test files):**
- Parser: line parsing, batch messages, partial buffers, edge cases
- Policy engine: rule matching, glob patterns, default actions, argument matching
- Outbound policy: secret detection, response filtering, redaction
- Secrets: regex matching, entropy thresholds, deep object scanning
- Integration: end-to-end with mock MCP server
- CLI: check command interactive mode, profile loading

## Test Types

**Unit Tests:**
- `parser.test.ts`: Tests JSON-RPC parsing (single responsibility)
- `policy.test.ts`: Tests rule matching engine (PolicyEngine isolation)
- `secrets.test.ts`: Tests secret pattern detection
- `redact-secrets.test.ts`: Tests secret redaction logic
- `outbound-policy.test.ts`: Tests response filtering and redaction

**Scope:** Each test file focuses on one module/feature
**Approach:** Arrange-act-assert with inline setup, descriptive test names

**Integration Tests:**
- `integration.test.ts`: Full proxy flow with mock MCP server
- `check.test.ts`: CLI check command with real config loading
- `profile-validation.test.ts`: YAML profile parsing and validation

**Approach:**
- Spawns real child processes to test stdio proxy
- Creates temporary config files and logs
- Tests error handling and edge cases end-to-end

**E2E Tests:**
- Not automated (not detected in test suite)
- Manual testing approach documented in README

## Common Patterns

**Setup Pattern:**

Most tests use inline object construction, no beforeEach:
```typescript
it('AWS key pattern matches AKIA1234567890ABCDEF', () => {
  const patterns = compileSecretPatterns([
    { name: 'AWS Access Key', regex: 'AKIA[0-9A-Z]{16}' }
  ]);

  const result = scanForSecrets('AWS_KEY=AKIA1234567890ABCDEF', patterns);
  expect(result).toBe('AWS Access Key');
});
```

Integration tests use `beforeAll` for setup:
```typescript
beforeAll(async () => {
  // Create temporary echo server script
  await writeFile(echoServerPath, ECHO_SERVER_SCRIPT);
  await writeFile(configPath, TEST_CONFIG);
});

afterAll(async () => {
  // Cleanup
  await unlink(echoServerPath);
  await unlink(configPath);
});
```

**Teardown Pattern:**

Minimal (no global mocks to reset). Integration tests clean up files:
```typescript
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

// ... create temp files in beforeAll
// ... use them in tests
// ... delete in afterAll
await unlink(echoServerPath);
await unlink(configPath);
```

**Assertion Pattern:**

```typescript
// Simple property checks
expect(result).toBe('AWS Access Key');
expect(decision.action).toBe('deny');
expect(decision.rule).toBeNull();

// Object structure validation
expect(result.wasRedacted).toBe(true);
expect(result.matches).toHaveLength(1);
expect(result.matches[0].pattern).toBe('aws-access-key');

// Negative assertions
expect(redacted).not.toContain('AKIA');
expect(lines).toEqual(['line1', 'line2']);

// Property existence
expect(result).not.toBeNull();
expect(decision.rule).toBeDefined();

// Array length checks
expect(lines).toHaveLength(2);
```

## Async Testing

**Pattern:**
```typescript
it('reads stdin and processes input', async () => {
  const result = await readStdin();
  expect(result).toBeDefined();
});

describe('with async setup', () => {
  beforeAll(async () => {
    await writeFile(echoServerPath, ECHO_SERVER_SCRIPT);
  });

  afterAll(async () => {
    await unlink(echoServerPath);
  });

  it('spawns process and handles responses', async () => {
    // Spawn command, send input, read output
    const result = await someAsyncOperation();
    expect(result).toBeTruthy();
  });
});
```

**Promise handling:** Using `async/await` throughout, no promise chaining

## Error Testing

**Pattern:**
```typescript
// Negative cases (invalid input)
it('invalid regex throws on parse', () => {
  const schema = z.string().refine(
    (val) => { try { new RegExp(val); return true; } catch { return false; } }
  );
  expect(() => schema.parse('(?<invalid')).toThrow();
});

// ReDoS detection
it('rejects nested quantifiers', () => {
  const hasReDoSRisk = (pattern: string): boolean => {
    return /\([^)]*[+*][^)]*\)[+*{]/.test(pattern);
  };

  expect(hasReDoSRisk('(a+)+')).toBe(true);
  expect(hasReDoSRisk('(a*)*')).toBe(true);
  expect(hasReDoSRisk('a+')).toBe(false);
});

// Config loading errors
it('throws on invalid config file', async () => {
  const mockConfig = { /* invalid */ };
  expect(() => parseConfig(mockConfig)).toThrow();
});

// Runtime errors in message processing
// Errors caught and logged, not thrown (see proxy.ts)
```

**Coverage:**
- Edge cases: empty strings, null values, missing fields
- Invalid input: malformed JSON, invalid regexes
- Boundary conditions: size limits, entropy thresholds
- Integration failure modes: process crashes, missing files

## Test Naming Convention

Tests follow descriptive pattern with colons for context:

```typescript
// Pattern: "feature: specific behavior being tested"
it('first-match-wins: two rules match, first rule action is used', () => {});
it('default action: no rule matches, config default_action applies', () => {});
it('method matching: rule with method only matches that method', () => {});
it('tool name glob: tool: "*" matches any tool', () => {});
it('AWS key pattern matches AKIA1234567890ABCDEF', () => {});
it('returns null for non-matching string', () => {});
it('entropy threshold filters low-entropy matches', () => {});
```

---

*Testing analysis: 2026-02-27*
