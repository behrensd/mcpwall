/**
 * mcpwall explain-policy — dump the effective merged policy
 * Loads global + project config, merges them, and prints the resulting rules,
 * outbound rules, secret patterns, and settings in match order. Rules are
 * first-match-wins top-to-bottom, so order is shown explicitly. Read-only.
 */

import { loadConfig } from '../config/loader.js';
import type { Config, Rule, OutboundRule, ArgumentMatcher } from '../types.js';

function describeArg(name: string, m: ArgumentMatcher): string {
  const parts: string[] = [];
  if (m.pattern !== undefined) parts.push(`glob ${m.pattern}`);
  if (m.regex !== undefined) parts.push(`regex ${m.regex}`);
  if (m.not_under !== undefined) parts.push(`not under ${m.not_under}`);
  if (m.secrets) parts.push('contains secrets');
  return `      arg ${name}: ${parts.join(', ') || '(any)'}`;
}

function describeRule(r: Rule, i: number): string {
  const lines: string[] = [];
  const match: string[] = [];
  if (r.match.method) match.push(`method=${r.match.method}`);
  if (r.match.tool) match.push(`tool=${r.match.tool}`);
  const matchStr = match.length ? match.join(' ') : '(any request)';
  lines.push(`  ${i + 1}. [${r.action.toUpperCase()}] ${r.name} — ${matchStr}`);
  if (r.match.arguments) {
    for (const [name, m] of Object.entries(r.match.arguments)) {
      lines.push(describeArg(name, m));
    }
  }
  if (r.message) lines.push(`      message: ${r.message}`);
  return lines.join('\n');
}

function describeOutboundRule(r: OutboundRule, i: number): string {
  const lines: string[] = [];
  const match: string[] = [];
  if (r.match.tool) match.push(`tool=${r.match.tool}`);
  if (r.match.server) match.push(`server=${r.match.server}`);
  if (r.match.secrets) match.push('secrets');
  if (r.match.response_contains?.length) match.push(`contains ${r.match.response_contains.length} string(s)`);
  if (r.match.response_contains_regex?.length) match.push(`matches ${r.match.response_contains_regex.length} regex(es)`);
  if (r.match.response_size_exceeds !== undefined) match.push(`size > ${r.match.response_size_exceeds}B`);
  const matchStr = match.length ? match.join(' ') : '(any response)';
  lines.push(`  ${i + 1}. [${r.action.toUpperCase()}] ${r.name} — ${matchStr}`);
  if (r.message) lines.push(`      message: ${r.message}`);
  return lines.join('\n');
}

/**
 * Render the effective merged policy as human-readable text. Pure — no I/O.
 */
export function formatPolicy(config: Config): string {
  const out: string[] = [];
  const s = config.settings;

  out.push('=== mcpwall effective policy ===');
  out.push('');
  out.push('Settings:');
  out.push(`  default_action:          ${s.default_action}`);
  out.push(`  outbound_default_action: ${s.outbound_default_action ?? '(none — outbound disabled)'}`);
  out.push(`  log_dir:                 ${s.log_dir}`);
  out.push(`  log_level:               ${s.log_level}`);
  out.push(`  log_args:                ${s.log_args ?? 'none'}`);
  out.push(`  log_redacted:            ${s.log_redacted ?? 'none'}`);
  out.push(`  rate_limit:              ${s.rate_limit ? `${s.rate_limit.max_calls} calls / ${s.rate_limit.window_seconds}s per tool` : '(disabled)'}`);
  out.push('');

  out.push(`Inbound rules (${config.rules.length}, first match wins, top to bottom):`);
  if (config.rules.length === 0) {
    out.push('  (none — every request falls through to default_action)');
  } else {
    for (let i = 0; i < config.rules.length; i++) out.push(describeRule(config.rules[i], i));
  }
  out.push(`  → fallthrough: ${s.default_action.toUpperCase()}`);
  out.push('');

  const outbound = config.outbound_rules ?? [];
  out.push(`Outbound rules (${outbound.length}, first match wins):`);
  if (outbound.length === 0) {
    out.push('  (none)');
  } else {
    for (let i = 0; i < outbound.length; i++) out.push(describeOutboundRule(outbound[i], i));
    out.push(`  → fallthrough: ${(s.outbound_default_action ?? 'allow').toUpperCase()}`);
  }
  out.push('');

  const patterns = config.secrets?.patterns ?? [];
  out.push(`Secret patterns (${patterns.length}):`);
  if (patterns.length === 0) {
    out.push('  (none)');
  } else {
    for (const p of patterns) {
      const entropy = p.entropy_threshold !== undefined ? ` (entropy ≥ ${p.entropy_threshold})` : '';
      out.push(`  - ${p.name}: ${p.regex}${entropy}`);
    }
  }

  return out.join('\n');
}

/**
 * Load the effective config and print it to stdout.
 */
export async function runExplain(configPath?: string): Promise<void> {
  const config = await loadConfig(configPath);
  process.stdout.write(formatPolicy(config) + '\n');
}
