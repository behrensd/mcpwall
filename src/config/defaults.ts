/**
 * Default configuration for mcp-firewall
 * Used when no config file exists
 */

import type { Config, SecretPattern } from '../types.js';

/**
 * Built-in secret patterns matching common API keys and tokens
 */
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
 * Default configuration object
 * Provides sensible defaults with no rules (rules come from default.yml)
 */
export const DEFAULT_CONFIG: Config = {
  version: 1,
  settings: {
    log_dir: '~/.mcp-firewall/logs',
    log_level: 'info',
    default_action: 'allow'
  },
  rules: [],
  secrets: {
    patterns: DEFAULT_SECRET_PATTERNS
  }
};
