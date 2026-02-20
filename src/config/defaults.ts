/**
 * Default configuration for mcpwall
 * Used when no config file exists
 */

import type { Config, SecretPattern, Rule, OutboundRule } from '../types.js';

/** Built-in secret patterns matching common API keys and tokens */
export const DEFAULT_SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'aws-access-key',
    regex: 'AKIA[0-9A-Z]{16}'
  },
  {
    name: 'aws-secret-key',
    regex: '[A-Za-z0-9/+=]{40}',
    entropy_threshold: 4.5
  },
  {
    name: 'github-token',
    regex: '(gh[ps]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{22,})'
  },
  {
    name: 'openai-key',
    regex: 'sk-[A-Za-z0-9]{20,}'
  },
  {
    name: 'anthropic-key',
    regex: 'sk-ant-[A-Za-z0-9-]{20,}'
  },
  {
    name: 'stripe-key',
    regex: '(sk|pk|rk)_(test|live)_[A-Za-z0-9]{24,}'
  },
  {
    name: 'private-key-header',
    regex: '-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----'
  },
  {
    name: 'jwt-token',
    regex: 'eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}'
  },
  {
    name: 'slack-token',
    regex: 'xox[bpoas]-[A-Za-z0-9-]+'
  },
  {
    name: 'database-url',
    regex: '(postgres|mysql|mongodb|redis)://[^\\s]+'
  }
];

/**
 * Hardcoded fallback rules — used when rules/default.yml can't be loaded.
 * These ensure minimum protection even without a config file.
 */
export const DEFAULT_RULES: Rule[] = [
  {
    name: 'block-ssh-keys',
    match: { method: 'tools/call', tool: '*', arguments: { _any_value: { regex: '(\\.ssh/|id_rsa|id_ed25519)' } } },
    action: 'deny',
    message: 'Blocked: access to SSH keys'
  },
  {
    name: 'block-env-files',
    match: { method: 'tools/call', tool: '*', arguments: { _any_value: { regex: '(\\.env(\\.local|\\.prod|\\.dev)?$|\\.env/)' } } },
    action: 'deny',
    message: 'Blocked: access to .env files'
  },
  {
    name: 'block-destructive-commands',
    match: { method: 'tools/call', tool: '*', arguments: { _any_value: { regex: '(rm\\s+-rf|rm\\s+-r\\s+/|mkfs\\.|dd\\s+if=)' } } },
    action: 'deny',
    message: 'Blocked: dangerous command'
  },
  {
    name: 'block-secret-leakage',
    match: { method: 'tools/call', tool: '*', arguments: { _any_value: { secrets: true } } },
    action: 'deny',
    message: 'Blocked: detected secret in arguments'
  }
];

/** Built-in outbound rules for response inspection */
export const DEFAULT_OUTBOUND_RULES: OutboundRule[] = [
  {
    name: 'redact-secrets-in-responses',
    match: { secrets: true },
    action: 'redact',
    message: 'Secret detected in server response and redacted',
  },
  {
    name: 'flag-large-responses',
    match: { response_size_exceeds: 102400 },
    action: 'log_only',
    message: 'Response exceeds 100KB',
  },
];

/**
 * Default configuration object
 * Provides sensible defaults with essential built-in rules as fallback.
 */
export const DEFAULT_CONFIG: Config = {
  version: 1,
  settings: {
    log_dir: '~/.mcpwall/logs',
    log_level: 'info',
    default_action: 'allow'
  },
  rules: DEFAULT_RULES,
  outbound_rules: DEFAULT_OUTBOUND_RULES,
  secrets: {
    patterns: DEFAULT_SECRET_PATTERNS
  }
};
