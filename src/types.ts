/**
 * Shared TypeScript types for mcpwall
 */

// JSON-RPC 2.0 message types
export interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: string | number | null;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// Policy engine types
export interface Rule {
  name: string;
  match: {
    method?: string;
    tool?: string;
    arguments?: Record<string, ArgumentMatcher>;
  };
  action: 'allow' | 'deny' | 'ask';
  message?: string;
  rate_limit?: {
    max: number;
    window: number;
  };
}

export interface ArgumentMatcher {
  pattern?: string;
  regex?: string;
  not_under?: string;
  secrets?: boolean;
}

export interface Decision {
  action: 'allow' | 'deny' | 'ask';
  rule: string | null;
  message?: string;
}

// Configuration types
export interface Config {
  version: number;
  settings: {
    log_dir: string;
    log_level: 'debug' | 'info' | 'warn' | 'error';
    default_action: 'allow' | 'deny' | 'ask';
  };
  rules: Rule[];
  secrets?: {
    patterns: SecretPattern[];
  };
  integrity?: {
    enabled: boolean;
    hash_file: string;
    on_change: 'allow' | 'deny' | 'ask';
  };
}

export interface SecretPattern {
  name: string;
  regex: string;
  entropy_threshold?: number;
}

// Audit log types
export interface LogEntry {
  ts: string;
  server?: string;
  method?: string;
  tool?: string;
  args?: unknown;
  action: 'allow' | 'deny' | 'ask';
  rule: string | null;
  message?: string;
}

// Line buffer utility interface
export interface LineBuffer {
  push(chunk: string): void;
  flush(): void;
}
