/**
 * Policy engine for rule-based tool call filtering
 * Evaluates JSON-RPC messages against user-defined rules
 */

import { minimatch } from 'minimatch';
import type { Config, JsonRpcMessage, Decision, Rule, ArgumentMatcher } from '../types.js';
import { deepScanObject, compileSecretPatterns, type CompiledSecretPattern } from './secrets.js';
import { homedir, platform } from 'node:os';
import { resolve as resolvePath } from 'node:path';
import { realpathSync } from 'node:fs';

/** macOS and Windows have case-insensitive filesystems by default */
const CASE_INSENSITIVE_FS = platform() === 'darwin' || platform() === 'win32';

/** Pre-compiled regex for an argument matcher */
interface CompiledMatcher {
  regex?: RegExp;
}

export class PolicyEngine {
  private config: Config;
  private compiledSecrets: CompiledSecretPattern[];
  /** Pre-compiled regexes keyed by "ruleIndex:argKey" */
  private compiledMatchers: Map<string, CompiledMatcher> = new Map();

  constructor(config: Config) {
    this.config = config;

    // Warn about ask rules — not interactive in Phase 1
    const askRules = config.rules.filter(r => r.action === 'ask');
    if (askRules.length > 0) {
      process.stderr.write(`[mcpwall] Warning: ${askRules.length} rule(s) use action "ask" which is not yet interactive — these will ALLOW traffic (logged). Rules: ${askRules.map(r => r.name).join(', ')}\n`);
    }

    this.compiledSecrets = compileSecretPatterns(config.secrets?.patterns || []);

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

    return {
      action: this.config.settings.default_action,
      rule: null
    };
  }

  private matchesRule(msg: JsonRpcMessage, rule: Rule, ruleIndex: number): boolean {
    if (rule.match.method && rule.match.method !== msg.method) {
      return false;
    }

    // If rule has tool/arguments matchers but no explicit method,
    // it implicitly requires method === 'tools/call'
    if (!rule.match.method && (rule.match.tool || rule.match.arguments)) {
      if (msg.method !== 'tools/call') {
        return false;
      }
    }

    if (msg.method === 'tools/call') {
      const params = msg.params as any;
      if (!params || typeof params !== 'object') {
        return false;
      }

      if (rule.match.tool) {
        const toolName = params.name;
        if (!toolName || typeof toolName !== 'string') {
          return false;
        }
        if (!minimatch(toolName, rule.match.tool, { dot: true })) {
          return false;
        }
      }

      if (rule.match.arguments) {
        const args = params.arguments;
        if (!args || typeof args !== 'object') {
          return false;
        }

        for (const [key, matcher] of Object.entries(rule.match.arguments)) {
          const compiled = this.compiledMatchers.get(`${ruleIndex}:${key}`);
          if (key === '_any_value') {
            if (!this.matchesAnyValue(args, matcher, compiled)) {
              return false;
            }
          } else {
            const value = (args as any)[key];
            if (!this.matchesArgumentValue(value, matcher, compiled)) {
              return false;
            }
          }
        }
      }
    }

    return true;
  }

  private matchesAnyValue(args: any, matcher: ArgumentMatcher, compiled?: CompiledMatcher): boolean {
    if (matcher.secrets) {
      return deepScanObject(args, this.compiledSecrets) !== null;
    }

    // Recursively scan all values, not just top-level
    return this.deepMatchAny(args, matcher, compiled);
  }

  private deepMatchAny(obj: any, matcher: ArgumentMatcher, compiled?: CompiledMatcher): boolean {
    if (obj === null || obj === undefined) return false;

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return this.matchesArgumentValue(obj, matcher, compiled);
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (this.deepMatchAny(item, matcher, compiled)) return true;
      }
      return false;
    }

    if (typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        if (this.deepMatchAny(value, matcher, compiled)) return true;
      }
      return false;
    }

    return false;
  }

  private matchesArgumentValue(value: any, matcher: ArgumentMatcher, compiled?: CompiledMatcher): boolean {
    const strValue = typeof value === 'string' ? value : JSON.stringify(value);

    if (matcher.pattern) {
      if (minimatch(strValue, matcher.pattern)) {
        return true;
      }
    }

    if (matcher.regex && compiled?.regex) {
      compiled.regex.lastIndex = 0;
      if (compiled.regex.test(strValue)) {
        return true;
      }
    }

    // not_under: value must NOT be under the specified path
    // Match = value is OUTSIDE the allowed directory (triggers the rule)
    if (matcher.not_under) {
      const allowedPath = this.expandPath(matcher.not_under);
      const normalizedAllowed = this.normalizePath(allowedPath);
      const normalizedValue = this.normalizePath(strValue);

      if (!normalizedValue.startsWith(normalizedAllowed)) {
        return true;
      }
    }

    if (matcher.secrets) {
      return deepScanObject(value, this.compiledSecrets) !== null;
    }

    return false;
  }

  private expandPath(path: string): string {
    return path
      .replace(/\$\{HOME\}/g, homedir())
      .replace(/\$\{PROJECT_DIR\}/g, process.cwd())
      .replace(/^~\//, homedir() + '/');
  }

  private normalizePath(p: string): string {
    let normalized = p.replace(/^["']|["']$/g, '');

    // Resolve to absolute path to prevent ../ traversal bypass
    normalized = resolvePath(normalized);

    // Resolve symlinks when path exists on disk
    try {
      normalized = realpathSync(normalized);
    } catch {
      // Path doesn't exist yet — use the resolved path as-is
    }

    // On case-insensitive filesystems, lowercase for comparison
    if (CASE_INSENSITIVE_FS) {
      normalized = normalized.toLowerCase();
    }

    // Add trailing slash for directory prefix comparison
    if (!normalized.endsWith('/')) {
      normalized += '/';
    }

    return normalized;
  }
}
