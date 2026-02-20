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

export interface Rule {
  name: string;
  match: {
    method?: string;
    tool?: string;
    arguments?: Record<string, ArgumentMatcher>;
  };
  action: 'allow' | 'deny' | 'ask';
  message?: string;
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

export interface Config {
  version: number;
  settings: {
    log_dir: string;
    log_level: 'debug' | 'info' | 'warn' | 'error';
    default_action: 'allow' | 'deny' | 'ask';
    log_args?: 'full' | 'none';
    outbound_default_action?: OutboundAction;
    log_redacted?: 'none' | 'hash' | 'full';
  };
  rules: Rule[];
  outbound_rules?: OutboundRule[];
  secrets?: {
    patterns: SecretPattern[];
  };
}

export interface SecretPattern {
  name: string;
  regex: string;
  entropy_threshold?: number;
}

export interface LogEntry {
  ts: string;
  server?: string;
  method?: string;
  tool: string | undefined;
  args?: unknown;
  action: string;
  rule: string | null;
  message?: string;
  direction?: 'inbound' | 'outbound';
  redacted_patterns?: string[];
}

export interface LineBuffer {
  push(chunk: string): void;
  flush(): void;
}

export interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface McpConfigFile {
  mcpServers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
}

// === Outbound (Response Inspection) Types ===

export type OutboundAction = 'allow' | 'deny' | 'redact' | 'log_only';

export interface OutboundMatch {
  tool?: string;
  server?: string;
  secrets?: boolean;
  response_contains?: string[];
  response_contains_regex?: string[];
  response_size_exceeds?: number;
}

export interface OutboundRule {
  name: string;
  match: OutboundMatch;
  action: OutboundAction;
  message?: string;
}

export interface OutboundDecision {
  action: OutboundAction;
  rule: string | null;
  message?: string;
  matches?: Array<{ pattern: string; count: number }>;
}

export interface RequestContext {
  tool?: string;
  method?: string;
  ts: number;
}
