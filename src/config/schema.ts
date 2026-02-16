/**
 * Zod validation schemas for mcpwall configuration
 */

import { z } from 'zod';
import type { Config, SecretPattern, ArgumentMatcher, Rule } from '../types.js';

/**
 * Validate that a string is a valid regular expression.
 * Invalid regexes in security rules must fail at load time, not silently at runtime.
 */
const validRegex = z.string().refine(
  (val) => {
    try { new RegExp(val); return true; } catch { return false; }
  },
  (val) => ({ message: `Invalid regex: "${val}"` })
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
    default_action: z.enum(['allow', 'deny', 'ask'])
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
