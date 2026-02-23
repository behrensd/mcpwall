/**
 * mcpwall check — dry-run policy test
 * Tests a JSON-RPC message against the configured rules without running the proxy.
 * Prints ALLOW/DENY/REDACT and the matched rule. Exits 0 for allow, 1 for deny/redact, 2 for input errors.
 */

import { loadConfig } from '../config/loader.js';
import { PolicyEngine } from '../engine/policy.js';
import { OutboundPolicyEngine } from '../engine/outbound-policy.js';
import { parseJsonRpcLineEx } from '../parser.js';
import type { JsonRpcMessage, Decision, OutboundDecision } from '../types.js';

const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10MB

function sanitizeForDisplay(value: unknown): string {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  // Strip ANSI escape codes and non-printable characters to prevent terminal injection
  return raw.replace(/\x1b\[[0-9;]*[mGKHF]/g, '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function printInboundDecision(decision: Decision, msg: JsonRpcMessage): void {
  const method = sanitizeForDisplay(msg.method ?? '(unknown)');
  const params = msg.params as any;
  const toolName = params?.name ? sanitizeForDisplay(params.name) : '';
  const firstArg = params?.arguments
    ? sanitizeForDisplay(Object.values(params.arguments as Record<string, unknown>)[0] ?? '')
    : '';

  const contextStr = [method, toolName, firstArg].filter(Boolean).join('  ');

  if (decision.action === 'allow') {
    process.stdout.write(`\u2713 ALLOW  ${contextStr}\n`);
    if (decision.rule) {
      process.stdout.write(`  Rule: ${sanitizeForDisplay(decision.rule)}\n`);
    } else {
      process.stdout.write(`  No rule matched — default action: allow\n`);
    }
  } else if (decision.action === 'deny') {
    process.stdout.write(`\u2717 DENY   ${contextStr}\n`);
    if (decision.rule) {
      process.stdout.write(`  Rule: ${sanitizeForDisplay(decision.rule)}\n`);
    }
    if (decision.message) {
      process.stdout.write(`  ${sanitizeForDisplay(decision.message)}\n`);
    }
  } else {
    // ask — treated as allow for display
    process.stdout.write(`? ASK    ${contextStr}\n`);
    if (decision.rule) {
      process.stdout.write(`  Rule: ${sanitizeForDisplay(decision.rule)}\n`);
    }
  }
}

function printOutboundDecision(decision: OutboundDecision, _msg: JsonRpcMessage): void {
  if (decision.action === 'allow') {
    process.stdout.write(`\u2713 ALLOW  (response)\n`);
    if (decision.rule) {
      process.stdout.write(`  Rule: ${sanitizeForDisplay(decision.rule)}\n`);
    } else {
      process.stdout.write(`  No rule matched\n`);
    }
  } else if (decision.action === 'deny') {
    process.stdout.write(`\u2717 DENY   (response)\n`);
    if (decision.rule) {
      process.stdout.write(`  Rule: ${sanitizeForDisplay(decision.rule)}\n`);
    }
    if (decision.message) {
      process.stdout.write(`  ${sanitizeForDisplay(decision.message)}\n`);
    }
  } else if (decision.action === 'redact') {
    process.stdout.write(`~ REDACT (response)\n`);
    if (decision.rule) {
      process.stdout.write(`  Rule: ${sanitizeForDisplay(decision.rule)}\n`);
    }
    if (decision.message) {
      process.stdout.write(`  ${sanitizeForDisplay(decision.message)}\n`);
    }
  } else if (decision.action === 'log_only') {
    process.stdout.write(`! LOG    (response)\n`);
    if (decision.rule) {
      process.stdout.write(`  Rule: ${sanitizeForDisplay(decision.rule)}\n`);
    }
    if (decision.message) {
      process.stdout.write(`  ${sanitizeForDisplay(decision.message)}\n`);
    }
  }
}

export async function runCheck(inputStr?: string, configPath?: string): Promise<void> {
  // If no --input and stdin is a TTY, print usage and exit
  if (!inputStr && process.stdin.isTTY) {
    process.stderr.write('Usage: mcpwall check --input \'{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"read_file","arguments":{"path":"/tmp/test.txt"}}}\'\n');
    process.stderr.write('       echo \'{"jsonrpc":"2.0",...}\' | mcpwall check\n');
    process.exit(1);
  }

  // Read input from --input flag or stdin
  const raw = inputStr ?? await readStdin();

  // Size guard
  if (Buffer.byteLength(raw, 'utf-8') > MAX_INPUT_BYTES) {
    process.stderr.write('[mcpwall] Error: input exceeds 10MB limit\n');
    process.exit(2);
  }

  // Parse JSON-RPC
  const trimmed = raw.trim();
  if (!trimmed) {
    process.stderr.write('[mcpwall] Error: empty input\n');
    process.exit(2);
  }

  const parsed = parseJsonRpcLineEx(trimmed);
  if (!parsed) {
    process.stderr.write('[mcpwall] Error: invalid JSON-RPC message (must have jsonrpc: "2.0")\n');
    process.exit(2);
  }

  // Load config (falls back to built-in defaults if no config file)
  let config;
  try {
    config = await loadConfig(configPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[mcpwall] Error loading config: ${message}\n`);
    process.exit(2);
  }

  const inboundEngine = new PolicyEngine(config);
  const outboundEngine = config.outbound_rules?.length
    ? new OutboundPolicyEngine(config)
    : undefined;

  const messages: JsonRpcMessage[] =
    parsed.type === 'batch' ? parsed.messages : [parsed.message];

  let anyDenied = false;

  for (const msg of messages) {
    if (msg.method) {
      // Inbound request
      const decision = inboundEngine.evaluate(msg);
      printInboundDecision(decision, msg);
      if (decision.action === 'deny') {
        anyDenied = true;
      }
    } else if (msg.result !== undefined || msg.error !== undefined) {
      // Outbound response
      if (outboundEngine) {
        const decision = outboundEngine.evaluate(msg);
        printOutboundDecision(decision, msg);
        if (decision.action === 'deny' || decision.action === 'redact') {
          anyDenied = true;
        }
      } else {
        process.stdout.write(`\u2713 ALLOW  (response)\n`);
        process.stdout.write(`  No outbound rules configured\n`);
      }
    } else {
      // Notification or other message with method
      const decision = inboundEngine.evaluate(msg);
      printInboundDecision(decision, msg);
      if (decision.action === 'deny') {
        anyDenied = true;
      }
    }
  }

  if (anyDenied) {
    process.exit(1);
  }
}
