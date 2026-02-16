/**
 * Policy engine for rule-based tool call filtering
 * Evaluates JSON-RPC messages against user-defined rules
 */

import { minimatch } from 'minimatch';
import type { Config, JsonRpcMessage, Decision, Rule, ArgumentMatcher } from '../types.js';
import { scanForSecrets, deepScanObject, compileSecretPatterns, type CompiledSecretPattern } from './secrets.js';
import { homedir } from 'node:os';
import { resolve as resolvePath } from 'node:path';

/** Pre-compiled regex for an argument matcher */
interface CompiledMatcher {
  regex?: RegExp;
}

/**
 * Policy engine that evaluates messages against configured rules
 */
export class PolicyEngine {
  private config: Config;
  private compiledSecrets: CompiledSecretPattern[];
  /** Pre-compiled regexes keyed by "ruleIndex:argKey" */
  private compiledMatchers: Map<string, CompiledMatcher> = new Map();

  constructor(config: Config) {
    this.config = config;

    // Pre-compile secret patterns once
    this.compiledSecrets = compileSecretPatterns(config.secrets?.patterns || []);

    // Pre-compile all rule argument matcher regexes
    for (let i = 0; i < config.rules.length; i++) {
      const rule = config.rules[i];
      if (rule.match.arguments) {
        for (const [key, matcher] of Object.entries(rule.match.arguments)) {
          if (matcher.regex) {
            this.compiledMatchers.set(`${i}:${key}`, {
              regex: new RegExp(matcher.regex),
            });
          }
        }
      }
    }
  }

  /**
   * Evaluate a JSON-RPC message against all rules
   * Returns the action to take (allow/deny/ask) and the matched rule
   */
  evaluate(msg: JsonRpcMessage): Decision {
    // If message has no method, it's a response - allow it through
    if (!msg.method) {
      return { action: 'allow', rule: null };
    }

    // Walk rules top-to-bottom, first match wins
    for (let i = 0; i < this.config.rules.length; i++) {
      const rule = this.config.rules[i];
      if (this.matchesRule(msg, rule, i)) {
        return {
          action: rule.action,
          rule: rule.name,
          message: rule.message
        };
      }
    }

    // No rule matched, use default action
    return {
      action: this.config.settings.default_action,
      rule: null
    };
  }

  /**
   * Check if a message matches a specific rule
   */
  private matchesRule(msg: JsonRpcMessage, rule: Rule, ruleIndex: number): boolean {
    // Check method match
    if (rule.match.method && rule.match.method !== msg.method) {
      return false;
    }

    // For tools/call, check tool name and arguments
    if (msg.method === 'tools/call') {
      // Extract params safely
      const params = msg.params as any;
      if (!params || typeof params !== 'object') {
        return false;
      }

      // Check tool name match
      if (rule.match.tool) {
        const toolName = params.name;
        if (!toolName || typeof toolName !== 'string') {
          return false;
        }
        // Use minimatch for glob matching, "*" matches any tool
        if (!minimatch(toolName, rule.match.tool)) {
          return false;
        }
      }

      // Check argument matchers
      if (rule.match.arguments) {
        const args = params.arguments;
        if (!args || typeof args !== 'object') {
          // Rule expects arguments but none present
          return false;
        }

        // Check each argument matcher
        for (const [key, matcher] of Object.entries(rule.match.arguments)) {
          const compiled = this.compiledMatchers.get(`${ruleIndex}:${key}`);
          if (key === '_any_value') {
            // Special key: match against ALL values in arguments
            if (!this.matchesAnyValue(args, matcher, compiled)) {
              return false;
            }
          } else {
            // Match specific argument key
            const value = (args as any)[key];
            if (!this.matchesArgumentValue(value, matcher, compiled)) {
              return false;
            }
          }
        }
      }
    }

    // All checks passed
    return true;
  }

  /**
   * Check if ANY value in the arguments object matches the matcher
   * Used for _any_value special key
   */
  private matchesAnyValue(args: any, matcher: ArgumentMatcher, compiled?: CompiledMatcher): boolean {
    // For secrets matcher, use deep scan on entire object
    if (matcher.secrets) {
      return deepScanObject(args, this.compiledSecrets) !== null;
    }

    // For other matchers, check each value individually
    for (const value of Object.values(args)) {
      if (this.matchesArgumentValue(value, matcher, compiled)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a specific argument value matches the matcher
   */
  private matchesArgumentValue(value: any, matcher: ArgumentMatcher, compiled?: CompiledMatcher): boolean {
    // Convert value to string for pattern matching
    const strValue = typeof value === 'string' ? value : JSON.stringify(value);

    // Pattern matcher (glob)
    if (matcher.pattern) {
      if (minimatch(strValue, matcher.pattern)) {
        return true;
      }
    }

    // Regex matcher — use pre-compiled regex
    if (matcher.regex && compiled?.regex) {
      compiled.regex.lastIndex = 0;
      if (compiled.regex.test(strValue)) {
        return true;
      }
    }

    // not_under matcher: value must NOT be under the specified path
    // Match = value is OUTSIDE the allowed directory (triggers the rule)
    if (matcher.not_under) {
      const allowedPath = this.expandPath(matcher.not_under);
      const normalizedAllowed = this.normalizePath(allowedPath);
      const normalizedValue = this.normalizePath(strValue);

      if (!normalizedValue.startsWith(normalizedAllowed)) {
        return true;
      }
    }

    // Secrets matcher
    if (matcher.secrets) {
      return deepScanObject(value, this.compiledSecrets) !== null;
    }

    return false;
  }

  /**
   * Expand variables in paths (${HOME}, ${PROJECT_DIR})
   */
  private expandPath(path: string): string {
    return path
      .replace(/\$\{HOME\}/g, homedir())
      .replace(/\$\{PROJECT_DIR\}/g, process.cwd())
      .replace(/^~\//, homedir() + '/');
  }

  /**
   * Normalize a path for comparison — resolves `..` traversal attacks
   */
  private normalizePath(p: string): string {
    // Remove quotes if present
    let normalized = p.replace(/^["']|["']$/g, '');

    // Resolve to absolute path to prevent ../ traversal bypass
    normalized = resolvePath(normalized);

    // Ensure trailing slash for directory prefix comparison
    if (!normalized.endsWith('/')) {
      normalized += '/';
    }

    return normalized;
  }
}
