/**
 * Tests for formatPolicy — the explain-policy renderer
 */

import { describe, it, expect } from 'vitest';
import { formatPolicy } from '../cli/explain';
import type { Config } from '../types';

const baseConfig: Config = {
  version: 1,
  settings: {
    log_dir: '/tmp/logs',
    log_level: 'info',
    default_action: 'allow',
  },
  rules: [
    {
      name: 'block-ssh',
      match: { method: 'tools/call', tool: 'read_file', arguments: { path: { not_under: '~/.ssh' } } },
      action: 'deny',
      message: 'SSH keys are off-limits',
    },
    {
      name: 'allow-reads',
      match: { tool: 'read_file' },
      action: 'allow',
    },
  ],
};

describe('formatPolicy', () => {
  it('renders settings, rules in order, and fallthrough', () => {
    const out = formatPolicy(baseConfig);
    expect(out).toMatch(/default_action:\s+allow/);
    expect(out).toMatch(/Inbound rules \(2, first match wins/);
    // Order preserved and numbered
    expect(out).toMatch(/1\. \[DENY\] block-ssh/);
    expect(out).toMatch(/2\. \[ALLOW\] allow-reads/);
    expect(out).toMatch(/→ fallthrough: ALLOW/);
  });

  it('describes argument matchers', () => {
    const out = formatPolicy(baseConfig);
    expect(out).toMatch(/arg path: not under ~\/\.ssh/);
  });

  it('surfaces rule messages', () => {
    const out = formatPolicy(baseConfig);
    expect(out).toMatch(/message: SSH keys are off-limits/);
  });

  it('handles empty policy gracefully', () => {
    const empty: Config = {
      version: 1,
      settings: { log_dir: '/tmp', log_level: 'info', default_action: 'deny' },
      rules: [],
    };
    const out = formatPolicy(empty);
    expect(out).toMatch(/every request falls through to default_action/);
    expect(out).toMatch(/→ fallthrough: DENY/);
    expect(out).toMatch(/Outbound rules \(0/);
    expect(out).toMatch(/Secret patterns \(0/);
  });

  it('renders outbound rules and secret patterns when present', () => {
    const cfg: Config = {
      ...baseConfig,
      settings: { ...baseConfig.settings, outbound_default_action: 'allow' },
      outbound_rules: [
        { name: 'redact-secrets', match: { secrets: true }, action: 'redact' },
        { name: 'block-big', match: { response_size_exceeds: 1000000 }, action: 'deny' },
      ],
      secrets: { patterns: [{ name: 'aws-key', regex: 'AKIA[0-9A-Z]{16}', entropy_threshold: 3.5 }] },
    };
    const out = formatPolicy(cfg);
    expect(out).toMatch(/Outbound rules \(2/);
    expect(out).toMatch(/1\. \[REDACT\] redact-secrets — secrets/);
    expect(out).toMatch(/2\. \[DENY\] block-big — size > 1000000B/);
    expect(out).toMatch(/aws-key: AKIA\[0-9A-Z\]\{16\} \(entropy ≥ 3.5\)/);
  });
});
