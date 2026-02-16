/**
 * Zod validation schemas for mcpwall configuration
 */

import { z } from 'zod';
import type { Config, SecretPattern, ArgumentMatcher, Rule } from '../types.js';

/**
 * Detect regexes prone to catastrophic backtracking (ReDoS).
 * Catches common patterns: nested quantifiers like (a+)+, (a*)+, (a+)*, etc.
 * This is a heuristic — not exhaustive — but catches the most dangerous patterns.
 */
function hasReDoSRisk(pattern: string): boolean {
  // Detect nested quantifiers: a quantified group containing a quantifier
  // e.g. (a+)+  (a*)*  (a+)*  (.*)+  (.+)*
  // Pattern: open-paren ... quantifier ... close-paren quantifier
  const nestedQuantifier = /\([^)]*[+*][^)]*\)[+*{]/;
  if (nestedQuantifier.test(pattern)) {
    return true;
  }

  // Detect overlapping alternation with quantifiers: (a|a)+
  // Simplified check: alternation inside a quantified group where alternatives
  // can match the same character class
  const quantifiedAlternation = /\([^)]*\|[^)]*\)[+*]{1,2}/;
  if (quantifiedAlternation.test(pattern)) {
    // Not all alternations are dangerous, but flag for review
    return true;
  }

  return false;
}

/**
 * Validate that a string is a valid regular expression.
 * Invalid regexes in security rules must fail at load time, not silently at runtime.
 * M2 fix: also rejects regexes with catastrophic backtracking risk (ReDoS).
 */
const validRegex = z.string().refine(
  (val) => {
    try { new RegExp(val); return true; } catch { return false; }
  },
  (val) => ({ message: `Invalid regex: "${val}"` })
).refine(
  (val) => !hasReDoSRisk(val),
  (val) => ({ message: `Potentially unsafe regex (ReDoS risk): "${val}" — avoid nested quantifiers like (a+)+` })
);

/**
 * Schema for secret pattern definitions
 */
export const secretPatternSchema = z.object({
  name: z.string(),
  regex: validRegex,
  entropy_threshold: z.number().optional()
});

/**
 * Schema for argument matchers in rules
 */
export const argumentMatcherSchema = z.object({
  pattern: z.string().optional(),
  regex: validRegex.optional(),
  not_under: z.string().optional(),
  secrets: z.boolean().optional()
});

/**
 * Schema for individual policy rules
 */
export const ruleSchema = z.object({
  name: z.string(),
  match: z.object({
    method: z.string().optional(),
    tool: z.string().optional(),
    arguments: z.record(z.string(), argumentMatcherSchema).optional()
  }),
  action: z.enum(['allow', 'deny', 'ask']),
  message: z.string().optional(),
  rate_limit: z.object({
    max: z.number(),
    window: z.number()
  }).optional()
});

/**
 * Schema for the full configuration file
 */
export const configSchema = z.object({
  version: z.number(),
  settings: z.object({
    log_dir: z.string(),
    log_level: z.enum(['debug', 'info', 'warn', 'error']),
    default_action: z.enum(['allow', 'deny', 'ask']),
    log_args: z.enum(['full', 'none']).optional()
  }),
  rules: z.array(ruleSchema),
  secrets: z.object({
    patterns: z.array(secretPatternSchema)
  }).optional(),
  integrity: z.object({
    enabled: z.boolean(),
    hash_file: z.string(),
    on_change: z.enum(['allow', 'deny', 'ask'])
  }).optional()
});

/**
 * Parse and validate configuration
 * Throws an error if validation fails
 */
export function parseConfig(raw: unknown): Config {
  return configSchema.parse(raw);
}
