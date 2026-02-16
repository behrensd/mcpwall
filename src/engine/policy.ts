/**
 * Policy engine for rule-based tool call filtering
 * Evaluates JSON-RPC messages against user-defined rules
 */

import { minimatch } from 'minimatch';
import type { Config, JsonRpcMessage, Decision, Rule, ArgumentMatcher } from '../types.js';
import { scanForSecrets, deepScanObject } from './secrets.js';
import { homedir } from 'node:os';

/**
 * Policy engine that evaluates messages against configured rules
 */
export class PolicyEngine {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
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
    for (const rule of this.config.rules) {
      if (this.matchesRule(msg, rule)) {
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
  private matchesRule(msg: JsonRpcMessage, rule: Rule): boolean {
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
          if (key === '_any_value') {
            // Special key: match against ALL values in arguments
            if (!this.matchesAnyValue(args, matcher)) {
              return false;
            }
          } else {
            // Match specific argument key
            const value = (args as any)[key];
            if (!this.matchesArgumentValue(value, matcher)) {
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
  private matchesAnyValue(args: any, matcher: ArgumentMatcher): boolean {
    // For secrets matcher, use deep scan on entire object
    if (matcher.secrets) {
      const patterns = this.config.secrets?.patterns || [];
      const found = deepScanObject(args, patterns);
      return found !== null;
    }

    // For other matchers, check each value individually
    for (const value of Object.values(args)) {
      if (this.matchesArgumentValue(value, matcher)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a specific argument value matches the matcher
   */
  private matchesArgumentValue(value: any, matcher: ArgumentMatcher): boolean {
    // Convert value to string for pattern matching
    const strValue = typeof value === 'string' ? value : JSON.stringify(value);

    // Pattern matcher (glob)
    if (matcher.pattern) {
      if (minimatch(strValue, matcher.pattern)) {
        return true;
      }
    }

    // Regex matcher
    if (matcher.regex) {
      try {
        const regex = new RegExp(matcher.regex);
        if (regex.test(strValue)) {
          return true;
        }
      } catch (error) {
        process.stderr.write(`[mcp-firewall] Warning: Invalid regex in matcher: ${matcher.regex}\n`);
      }
    }

    // not_under matcher: value must NOT be under the specified path
    // Match = value is OUTSIDE the allowed directory (triggers the rule)
    if (matcher.not_under) {
      const allowedPath = this.expandPath(matcher.not_under);
      const normalizedAllowed = this.normalizePath(allowedPath);
      const normalizedValue = this.normalizePath(strValue);

      // If value does NOT start with the allowed path, it matches (is outside)
      if (!normalizedValue.startsWith(normalizedAllowed)) {
        return true;
      }
    }

    // Secrets matcher
    if (matcher.secrets) {
      const patterns = this.config.secrets?.patterns || [];
      const found = deepScanObject(value, patterns);
      if (found !== null) {
        return true;
      }
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
   * Normalize a path for comparison (resolve, remove trailing slash)
   */
  private normalizePath(path: string): string {
    // Remove quotes if present
    let normalized = path.replace(/^["']|["']$/g, '');

    // Ensure trailing slash for directory comparison
    if (!normalized.endsWith('/')) {
      normalized += '/';
    }

    return normalized;
  }
}
