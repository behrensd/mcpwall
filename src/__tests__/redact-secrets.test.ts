import { describe, it, expect } from 'vitest';
import { redactSecrets, compileSecretPatterns } from '../engine/secrets.js';
import type { SecretPattern } from '../types.js';

const TEST_PATTERNS: SecretPattern[] = [
  { name: 'aws-access-key', regex: 'AKIA[0-9A-Z]{16}' },
  { name: 'github-token', regex: 'gh[ps]_[A-Za-z0-9_]{36,}' },
  { name: 'generic-high-entropy', regex: '[A-Za-z0-9/+=]{40}', entropy_threshold: 4.5 },
  { name: 'private-key-header', regex: '-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----' },
];

const compiled = compileSecretPatterns(TEST_PATTERNS);

describe('redactSecrets', () => {
  it('replaces a single secret in a string', () => {
    const input = 'My key is AKIAIOSFODNN7EXAMPLE and more text';
    const result = redactSecrets(input, compiled);

    expect(result.wasRedacted).toBe(true);
    expect(result.redacted).toBe('My key is [REDACTED BY MCPWALL] and more text');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].pattern).toBe('aws-access-key');
    expect(result.matches[0].count).toBe(1);
  });

  it('replaces multiple different secrets', () => {
    const input = 'AWS: AKIAIOSFODNN7EXAMPLE, GH: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij';
    const result = redactSecrets(input, compiled);

    expect(result.wasRedacted).toBe(true);
    expect(result.redacted).not.toContain('AKIA');
    expect(result.redacted).not.toContain('ghp_');
    expect(result.matches.length).toBeGreaterThanOrEqual(2);
  });

  it('redacts secrets in nested objects', () => {
    const input = {
      content: [{
        type: 'text',
        text: 'Found key: AKIAIOSFODNN7EXAMPLE',
      }],
      metadata: {
        deep: {
          value: 'Also has ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij',
        },
      },
    };

    const result = redactSecrets(input, compiled);
    expect(result.wasRedacted).toBe(true);

    const redacted = result.redacted as any;
    expect(redacted.content[0].text).toContain('[REDACTED BY MCPWALL]');
    expect(redacted.content[0].text).not.toContain('AKIA');
    expect(redacted.metadata.deep.value).toContain('[REDACTED BY MCPWALL]');
    expect(redacted.metadata.deep.value).not.toContain('ghp_');
  });

  it('redacts secrets in arrays', () => {
    const input = ['safe text', 'AKIAIOSFODNN7EXAMPLE is here', 'more safe text'];
    const result = redactSecrets(input, compiled);

    expect(result.wasRedacted).toBe(true);
    const redacted = result.redacted as string[];
    expect(redacted[0]).toBe('safe text');
    expect(redacted[1]).toContain('[REDACTED BY MCPWALL]');
    expect(redacted[2]).toBe('more safe text');
  });

  it('returns wasRedacted=false when no secrets found', () => {
    const input = { text: 'Hello world, no secrets here', count: 42 };
    const result = redactSecrets(input, compiled);

    expect(result.wasRedacted).toBe(false);
    expect(result.matches).toHaveLength(0);
    expect(result.redacted).toEqual(input);
  });

  it('respects entropy threshold — skips low entropy matches', () => {
    // "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" is 40 chars matching generic pattern
    // but has very low entropy (all same char)
    const lowEntropy = 'token: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const result = redactSecrets(lowEntropy, compiled);

    // Should not be redacted since entropy is below threshold
    expect(result.redacted).toBe(lowEntropy);
    expect(result.wasRedacted).toBe(false);
  });

  it('passes through non-string values unchanged', () => {
    const input = { count: 42, active: true, data: null };
    const result = redactSecrets(input, compiled);

    expect(result.redacted).toEqual({ count: 42, active: true, data: null });
    expect(result.wasRedacted).toBe(false);
  });

  it('never mutates the input object', () => {
    const input = { text: 'AKIAIOSFODNN7EXAMPLE' };
    const original = JSON.parse(JSON.stringify(input));
    redactSecrets(input, compiled);

    expect(input).toEqual(original);
  });

  it('uses custom marker when provided', () => {
    const input = 'Key: AKIAIOSFODNN7EXAMPLE';
    const result = redactSecrets(input, compiled, '***');

    expect(result.redacted).toBe('Key: ***');
  });
});
