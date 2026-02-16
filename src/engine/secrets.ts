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
    // Reset lastIndex in case regex has global flag
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
  // Base case: scan strings
  if (typeof obj === 'string') {
    return scanForSecrets(obj, patterns);
  }

  // Recursive case: arrays
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = deepScanObject(item, patterns);
      if (found) {
        return found;
      }
    }
  }

  // Recursive case: objects
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

/**
 * Calculate Shannon entropy of a string
 * Returns a value typically between 0 (no randomness) and ~5 (high randomness)
 * Useful for detecting high-entropy secrets like API keys
 */
export function shannonEntropy(str: string): number {
  if (str.length === 0) {
    return 0;
  }

  // Count character frequencies
  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  // Calculate entropy: -Σ(p * log2(p))
  const len = str.length;
  let entropy = 0;

  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}
