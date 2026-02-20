/**
 * Secret pattern scanner
 * Detects API keys, tokens, and other secrets using regex patterns and entropy analysis
 */

import type { SecretPattern } from '../types.js';

/** A secret pattern with its regex pre-compiled for performance */
export interface CompiledSecretPattern {
  name: string;
  regex: RegExp;
  entropy_threshold?: number;
}

/**
 * Pre-compile secret patterns. Call once at startup.
 * Throws on invalid regex (should be caught by Zod validation first).
 */
export function compileSecretPatterns(patterns: SecretPattern[]): CompiledSecretPattern[] {
  return patterns.map((p) => ({
    name: p.name,
    regex: new RegExp(p.regex),
    entropy_threshold: p.entropy_threshold,
  }));
}

/**
 * Scan a string value for known secret patterns (using pre-compiled regexes)
 * Returns the name of the matched pattern, or null if no match
 */
export function scanForSecrets(value: string, patterns: CompiledSecretPattern[]): string | null {
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    const match = pattern.regex.exec(value);

    if (match) {
      if (pattern.entropy_threshold !== undefined) {
        const matchedString = match[0];
        const entropy = shannonEntropy(matchedString);

        if (entropy < pattern.entropy_threshold) {
          continue;
        }
      }

      return pattern.name;
    }
  }

  return null;
}

/**
 * Recursively scan all string values in an object or array
 * Returns the name of the first matched pattern, or null
 */
export function deepScanObject(obj: unknown, patterns: CompiledSecretPattern[]): string | null {
  if (typeof obj === 'string') {
    return scanForSecrets(obj, patterns);
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = deepScanObject(item, patterns);
      if (found) {
        return found;
      }
    }
  }

  if (obj && typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      const found = deepScanObject(value, patterns);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/** Result of redacting secrets from an object */
export interface RedactionResult {
  redacted: unknown;
  matches: Array<{ pattern: string; count: number }>;
  wasRedacted: boolean;
}

/**
 * Redact secrets from an object tree, replacing matched values with a marker.
 * Creates new objects (never mutates input).
 */
export function redactSecrets(
  obj: unknown,
  patterns: CompiledSecretPattern[],
  marker = '[REDACTED BY MCPWALL]'
): RedactionResult {
  const matchCounts = new Map<string, number>();

  function redactString(str: string): string {
    let result = str;
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      // Use a fresh regex for global replacement to avoid infinite loops
      const globalRegex = new RegExp(pattern.regex.source, 'g');
      while ((match = globalRegex.exec(result)) !== null) {
        if (pattern.entropy_threshold !== undefined) {
          const entropy = shannonEntropy(match[0]);
          if (entropy < pattern.entropy_threshold) {
            continue;
          }
        }
        matchCounts.set(pattern.name, (matchCounts.get(pattern.name) || 0) + 1);
        result = result.slice(0, match.index) + marker + result.slice(match.index + match[0].length);
        // Adjust the regex lastIndex after replacement
        globalRegex.lastIndex = match.index + marker.length;
      }
    }
    return result;
  }

  function walk(node: unknown): unknown {
    if (typeof node === 'string') {
      return redactString(node);
    }
    if (Array.isArray(node)) {
      return node.map(walk);
    }
    if (node && typeof node === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node)) {
        result[key] = walk(value);
      }
      return result;
    }
    return node;
  }

  const redacted = walk(obj);
  const matches = Array.from(matchCounts.entries()).map(([pattern, count]) => ({ pattern, count }));

  return {
    redacted,
    matches,
    wasRedacted: matches.length > 0,
  };
}

/**
 * Calculate Shannon entropy of a string
 * Returns a value typically between 0 (no randomness) and ~5 (high randomness)
 * Useful for detecting high-entropy secrets like API keys
 */
export function shannonEntropy(str: string): number {
  if (str.length === 0) {
    return 0;
  }

  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  const len = str.length;
  let entropy = 0;

  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}
