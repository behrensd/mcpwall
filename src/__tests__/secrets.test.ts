/**
 * Unit tests for secret pattern scanner
 */

import { describe, it, expect } from 'vitest';
import {
  scanForSecrets,
  deepScanObject,
  shannonEntropy,
  compileSecretPatterns
} from '../engine/secrets';
import type { SecretPattern } from '../types';

describe('scanForSecrets', () => {
  it('AWS key pattern matches AKIA1234567890ABCDEF', () => {
    const patterns = compileSecretPatterns([
      {
        name: 'AWS Access Key',
        regex: 'AKIA[0-9A-Z]{16}'
      }
    ]);

    const result = scanForSecrets('AWS_KEY=AKIA1234567890ABCDEF', patterns);
    expect(result).toBe('AWS Access Key');
  });

  it('returns null for non-matching string', () => {
    const patterns = compileSecretPatterns([
      {
        name: 'AWS Access Key',
        regex: 'AKIA[0-9A-Z]{16}'
      }
    ]);

    const result = scanForSecrets('SAFE_VALUE=abc123', patterns);
    expect(result).toBeNull();
  });

  it('entropy threshold filters low-entropy matches', () => {
    const patterns = compileSecretPatterns([
      {
        name: 'Generic Secret',
        regex: '[A-Z]{20,}',
        entropy_threshold: 3.5
      }
    ]);

    // Low entropy (all same character)
    const lowResult = scanForSecrets('AAAAAAAAAAAAAAAAAAAA', patterns);
    expect(lowResult).toBeNull();

    // High entropy (mixed characters)
    const highResult = scanForSecrets('AKXMZPQWLVRNTUYBGHSJ', patterns);
    expect(highResult).toBe('Generic Secret');
  });

  it('matches multiple patterns, returns first match', () => {
    const patterns = compileSecretPatterns([
      {
        name: 'AWS Access Key',
        regex: 'AKIA[0-9A-Z]{16}'
      },
      {
        name: 'GitHub Token',
        regex: 'ghp_[A-Za-z0-9]{36}'
      }
    ]);

    const awsResult = scanForSecrets('AKIA1234567890ABCDEF', patterns);
    expect(awsResult).toBe('AWS Access Key');

    const ghResult = scanForSecrets('ghp_abcdefghijklmnopqrstuvwxyz1234567890', patterns);
    expect(ghResult).toBe('GitHub Token');
  });

  it('handles regex with capture groups', () => {
    const patterns = compileSecretPatterns([
      {
        name: 'API Key',
        regex: 'api[_-]?key[=:]["\']?([A-Za-z0-9]+)'
      }
    ]);

    const result = scanForSecrets('api_key="sk_test_123456"', patterns);
    expect(result).toBe('API Key');
  });
});

describe('deepScanObject', () => {
  const patterns = compileSecretPatterns([
    {
      name: 'AWS Access Key',
      regex: 'AKIA[0-9A-Z]{16}'
    }
  ]);

  it('finds secret in nested object { a: { b: "AKIA..." } }', () => {
    const obj = {
      a: {
        b: 'AKIA1234567890ABCDEF'
      }
    };

    const result = deepScanObject(obj, patterns);
    expect(result).toBe('AWS Access Key');
  });

  it('finds secret in array ["safe", "AKIA..."]', () => {
    const arr = ['safe', 'AKIA1234567890ABCDEF'];

    const result = deepScanObject(arr, patterns);
    expect(result).toBe('AWS Access Key');
  });

  it('returns null for safe object', () => {
    const obj = {
      key1: 'safe_value',
      key2: {
        nested: 'also_safe'
      },
      key3: ['array', 'values']
    };

    const result = deepScanObject(obj, patterns);
    expect(result).toBeNull();
  });

  it('scans string directly', () => {
    const result = deepScanObject('AKIA1234567890ABCDEF', patterns);
    expect(result).toBe('AWS Access Key');
  });

  it('handles deeply nested structures', () => {
    const obj = {
      level1: {
        level2: {
          level3: {
            level4: ['item1', { key: 'AKIA1234567890ABCDEF' }]
          }
        }
      }
    };

    const result = deepScanObject(obj, patterns);
    expect(result).toBe('AWS Access Key');
  });

  it('returns null for non-object types', () => {
    expect(deepScanObject(null, patterns)).toBeNull();
    expect(deepScanObject(undefined, patterns)).toBeNull();
    expect(deepScanObject(123, patterns)).toBeNull();
    expect(deepScanObject(true, patterns)).toBeNull();
  });

  it('handles mixed array with objects', () => {
    const arr = [
      'string',
      123,
      { nested: 'AKIA1234567890ABCDEF' },
      null
    ];

    const result = deepScanObject(arr, patterns);
    expect(result).toBe('AWS Access Key');
  });

  it('stops at first match', () => {
    const obj = {
      key1: 'AKIA1111111111111111',
      key2: 'AKIA2222222222222222'
    };

    const result = deepScanObject(obj, patterns);
    expect(result).toBe('AWS Access Key');
    // Should find one, not enumerate all
  });
});

describe('shannonEntropy', () => {
  it('empty string returns 0', () => {
    const result = shannonEntropy('');
    expect(result).toBe(0);
  });

  it('"aaaa" has low entropy', () => {
    const result = shannonEntropy('aaaa');
    expect(result).toBe(0); // All same character = 0 entropy
  });

  it('random string has high entropy', () => {
    const lowEntropy = shannonEntropy('aaaaaaaa');
    const highEntropy = shannonEntropy('a1B2c3D4');

    expect(lowEntropy).toBeLessThan(highEntropy);
    expect(highEntropy).toBeGreaterThan(2); // Reasonably high
  });

  it('single character has zero entropy', () => {
    const result = shannonEntropy('a');
    expect(result).toBe(0);
  });

  it('two different characters', () => {
    const result = shannonEntropy('ab');
    expect(result).toBe(1); // Perfect 50/50 split = 1 bit
  });

  it('balanced distribution has higher entropy', () => {
    const unbalanced = shannonEntropy('aaab'); // 3:1 ratio
    const balanced = shannonEntropy('aabb'); // 2:2 ratio

    expect(balanced).toBeGreaterThan(unbalanced);
  });

  it('realistic AWS key has high entropy', () => {
    const awsKey = 'AKIAIOSFODNN7EXAMPLE';
    const entropy = shannonEntropy(awsKey);

    expect(entropy).toBeGreaterThan(3);
  });

  it('realistic low-entropy string', () => {
    const lowEntropy = shannonEntropy('111111111111111111');
    expect(lowEntropy).toBe(0);
  });
});

describe('compileSecretPatterns', () => {
  it('compiles valid patterns, returns CompiledSecretPattern[]', () => {
    const patterns: SecretPattern[] = [
      {
        name: 'AWS Access Key',
        regex: 'AKIA[0-9A-Z]{16}'
      },
      {
        name: 'Generic Secret',
        regex: '[A-Za-z0-9]{32}',
        entropy_threshold: 4.0
      }
    ];

    const compiled = compileSecretPatterns(patterns);

    expect(compiled).toHaveLength(2);
    expect(compiled[0].name).toBe('AWS Access Key');
    expect(compiled[0].regex).toBeInstanceOf(RegExp);
    expect(compiled[0].entropy_threshold).toBeUndefined();

    expect(compiled[1].name).toBe('Generic Secret');
    expect(compiled[1].regex).toBeInstanceOf(RegExp);
    expect(compiled[1].entropy_threshold).toBe(4.0);
  });

  it('handles empty array', () => {
    const compiled = compileSecretPatterns([]);
    expect(compiled).toEqual([]);
  });

  it('compiled regex can be reused', () => {
    const patterns: SecretPattern[] = [
      {
        name: 'Test Pattern',
        regex: 'test[0-9]+'
      }
    ];

    const compiled = compileSecretPatterns(patterns);
    const regex = compiled[0].regex;

    expect(regex.test('test123')).toBe(true);
    expect(regex.test('test456')).toBe(true);
    expect(regex.test('notest')).toBe(false);
  });

  it('throws on invalid regex', () => {
    const patterns: SecretPattern[] = [
      {
        name: 'Invalid Pattern',
        regex: '[invalid('
      }
    ];

    expect(() => compileSecretPatterns(patterns)).toThrow();
  });
});
