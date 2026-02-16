/**
 * Secret pattern scanner
 * Detects API keys, tokens, and other secrets using regex patterns and entropy analysis
 */

import type { SecretPattern } from '../types.js';

/**
 * Scan a string value for known secret patterns
 * Returns the name of the matched pattern, or null if no match
 */
export function scanForSecrets(value: string, patterns: SecretPattern[]): string | null {
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern.regex);
      const match = regex.exec(value);

      if (match) {
        // If entropy threshold is set, check the matched portion
        if (pattern.entropy_threshold !== undefined) {
          const matchedString = match[0];
          const entropy = shannonEntropy(matchedString);

          if (entropy < pattern.entropy_threshold) {
            // Matched the pattern but entropy too low (likely a false positive)
            continue;
          }
        }

        // Pattern matched (and passed entropy check if applicable)
        return pattern.name;
      }
    } catch (error) {
      // Invalid regex - skip this pattern
      process.stderr.write(`[mcp-firewall] Warning: Invalid regex in pattern "${pattern.name}": ${error}\n`);
      continue;
    }
  }

  return null;
}

/**
 * Recursively scan all string values in an object or array
 * Returns the name of the first matched pattern, or null
 */
export function deepScanObject(obj: unknown, patterns: SecretPattern[]): string | null {
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
