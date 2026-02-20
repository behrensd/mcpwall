/**
 * Zod validation schemas for mcpwall configuration
 */

import { z } from 'zod';
import type { Config } from '../types.js';

/**
 * Detect regexes prone to catastrophic backtracking (ReDoS).
 * Catches common patterns: nested quantifiers like (a+)+, (a*)+, (a+)*, etc.
 * This is a heuristic — not exhaustive — but catches the most dangerous patterns.
 */
function hasReDoSRisk(pattern: string): boolean {
  // Detect nested quantifiers: a quantified group containing a quantifier
  // e.g. (a+)+  (a*)*  (a+)*  (.*)+  (.+)*
  const nestedQuantifier = /\([^)]*[+*][^)]*\)[+*{]/;
  if (nestedQuantifier.test(pattern)) {
    return true;
  }

  // Detect overlapping alternation with quantifiers: (a|a)+
  const quantifiedAlternation = /\([^)]*\|[^)]*\)[+*]{1,2}/;
  if (quantifiedAlternation.test(pattern)) {
    return true;
  }

  return false;
}

/**
 * Validate that a string is a valid regular expression.
 * Invalid regexes in security rules must fail at load time, not silently at runtime.
 * Also rejects regexes with catastrophic backtracking risk (ReDoS).
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

export const secretPatternSchema = z.object({
  name: z.string(),
  regex: validRegex,
  entropy_threshold: z.number().optional()
});

export const argumentMatcherSchema = z.object({
  pattern: z.string().optional(),
  regex: validRegex.optional(),
  not_under: z.string().optional(),
  secrets: z.boolean().optional()
});

export const ruleSchema = z.object({
  name: z.string(),
  match: z.object({
    method: z.string().optional(),
    tool: z.string().optional(),
    arguments: z.record(z.string(), argumentMatcherSchema).optional()
  }),
  action: z.enum(['allow', 'deny', 'ask']),
  message: z.string().optional(),
});

export const outboundMatchSchema = z.object({
  tool: z.string().optional(),
  server: z.string().optional(),
  secrets: z.boolean().optional(),
  response_contains: z.array(z.string()).optional(),
  response_contains_regex: z.array(validRegex).optional(),
  response_size_exceeds: z.number().positive().optional(),
}).refine(
  (match) => Object.values(match).some((v) => v !== undefined),
  { message: 'Outbound rule must have at least one match field' }
);

export const outboundRuleSchema = z.object({
  name: z.string(),
  match: outboundMatchSchema,
  action: z.enum(['allow', 'deny', 'redact', 'log_only']),
  message: z.string().optional(),
});

export const configSchema = z.object({
  version: z.number(),
  settings: z.object({
    log_dir: z.string(),
    log_level: z.enum(['debug', 'info', 'warn', 'error']),
    default_action: z.enum(['allow', 'deny', 'ask']),
    log_args: z.enum(['full', 'none']).optional(),
    outbound_default_action: z.enum(['allow', 'deny', 'redact', 'log_only']).optional(),
    log_redacted: z.enum(['none', 'hash', 'full']).optional(),
  }),
  rules: z.array(ruleSchema),
  outbound_rules: z.array(outboundRuleSchema).optional(),
  secrets: z.object({
    patterns: z.array(secretPatternSchema)
  }).optional(),
});

/**
 * Parse and validate configuration
 * Throws an error if validation fails
 */
export function parseConfig(raw: unknown): Config {
  return configSchema.parse(raw);
}
