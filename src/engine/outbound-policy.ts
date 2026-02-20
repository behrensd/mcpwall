/**
 * Outbound policy engine for response inspection
 * Evaluates MCP server responses against outbound rules before forwarding to client
 */

import { minimatch } from 'minimatch';
import type { Config, JsonRpcMessage, OutboundRule, OutboundDecision, OutboundAction } from '../types.js';
import { compileSecretPatterns, redactSecrets, type CompiledSecretPattern, type RedactionResult } from './secrets.js';

/** Pre-compiled regex for response_contains_regex patterns */
interface CompiledOutboundRegex {
  source: string;
  regex: RegExp;
}

export class OutboundPolicyEngine {
  private rules: OutboundRule[];
  private defaultAction: OutboundAction;
  private compiledSecrets: CompiledSecretPattern[];
  private compiledRegexes: Map<string, CompiledOutboundRegex[]> = new Map();

  constructor(config: Config) {
    this.rules = config.outbound_rules || [];
    this.defaultAction = config.settings.outbound_default_action || 'allow';
    this.compiledSecrets = compileSecretPatterns(config.secrets?.patterns || []);

    // Pre-compile response_contains_regex patterns per rule
    for (const rule of this.rules) {
      if (rule.match.response_contains_regex) {
        const compiled = rule.match.response_contains_regex.map((pattern) => ({
          source: pattern,
          regex: new RegExp(pattern, 'i'),
        }));
        this.compiledRegexes.set(rule.name, compiled);
      }
    }
  }

  /**
   * Evaluate a response message against outbound rules.
   * Returns the decision (action + matched rule).
   */
  evaluate(msg: JsonRpcMessage, toolName?: string, serverName?: string): OutboundDecision {
    for (const rule of this.rules) {
      if (this.matchesRule(msg, rule, toolName, serverName)) {
        return {
          action: rule.action,
          rule: rule.name,
          message: rule.message,
        };
      }
    }

    return {
      action: this.defaultAction,
      rule: null,
    };
  }

  /**
   * Redact secrets from a response message.
   * Returns the redacted message and match details.
   */
  redactResponse(msg: JsonRpcMessage): { message: JsonRpcMessage; result: RedactionResult } {
    const redactionResult = redactSecrets(msg.result, this.compiledSecrets);
    const redactedMsg: JsonRpcMessage = {
      ...msg,
      result: redactionResult.redacted,
    };
    return { message: redactedMsg, result: redactionResult };
  }

  private matchesRule(
    msg: JsonRpcMessage,
    rule: OutboundRule,
    toolName?: string,
    serverName?: string
  ): boolean {
    const match = rule.match;

    // Tool glob matching (requires correlation)
    if (match.tool) {
      if (!toolName || !minimatch(toolName, match.tool, { dot: true })) {
        return false;
      }
    }

    // Server name matching
    if (match.server) {
      if (!serverName || !minimatch(serverName, match.server, { dot: true })) {
        return false;
      }
    }

    // Secret scanning
    if (match.secrets) {
      const text = this.extractResponseText(msg);
      if (!text) return false;
      // Use the compiled secret patterns to check for matches
      const hasSecrets = redactSecrets(msg.result, this.compiledSecrets).wasRedacted;
      if (!hasSecrets) return false;
    }

    // response_contains: case-insensitive substring matching
    if (match.response_contains) {
      const text = this.extractResponseText(msg);
      if (!text) return false;
      const lower = text.toLowerCase();
      const found = match.response_contains.some((phrase) => lower.includes(phrase.toLowerCase()));
      if (!found) return false;
    }

    // response_contains_regex: case-insensitive regex matching
    if (match.response_contains_regex) {
      const text = this.extractResponseText(msg);
      if (!text) return false;
      const compiled = this.compiledRegexes.get(rule.name) || [];
      const found = compiled.some((c) => {
        c.regex.lastIndex = 0;
        return c.regex.test(text);
      });
      if (!found) return false;
    }

    // response_size_exceeds: byte size check
    if (match.response_size_exceeds !== undefined) {
      const serialized = JSON.stringify(msg.result ?? msg.error ?? '');
      const byteSize = Buffer.byteLength(serialized, 'utf-8');
      if (byteSize <= match.response_size_exceeds) return false;
    }

    return true;
  }

  /**
   * Extract text content from an MCP response message.
   * Handles MCP standard content array format: { content: [{ type: "text", text: "..." }] }
   * Falls back to JSON.stringify for non-standard formats.
   */
  private extractResponseText(msg: JsonRpcMessage): string | null {
    if (msg.result === undefined && msg.error === undefined) {
      return null;
    }

    if (msg.error) {
      return msg.error.message || JSON.stringify(msg.error);
    }

    const result = msg.result as any;

    // MCP standard: result.content is an array of content blocks
    if (result && Array.isArray(result.content)) {
      const texts: string[] = [];
      for (const block of result.content) {
        if (block && typeof block === 'object' && typeof block.text === 'string') {
          texts.push(block.text);
        }
      }
      if (texts.length > 0) {
        return texts.join('\n');
      }
    }

    // Fallback: stringify the entire result
    return JSON.stringify(result);
  }
}
