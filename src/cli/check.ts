/**
 * mcpwall check — dry-run policy test
 * Tests a JSON-RPC message against the configured rules without running the proxy.
 * Prints ALLOW/DENY/REDACT and the matched rule. Exits 0 for allow, 1 for deny/redact, 2 for input errors.
 */

import { createInterface } from 'node:readline/promises';
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

async function runInteractiveCheck(configPath?: string): Promise<void> {
  let config;
  try {
    config = await loadConfig(configPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[mcpwall] Error loading config: ${message}\n`);
    process.exit(2);
  }

  const inboundEngine = new PolicyEngine(config);

  const rl = createInterface({ input: process.stdin, output: process.stderr });

  process.stderr.write('\nmcpwall check — interactive mode\n');
  process.stderr.write('Test tool calls against your rules.\n\n');

  let keepGoing = true;
  let anyDenied = false;

  while (keepGoing) {
    const toolName = (await rl.question('Tool name: ')).trim();
    if (!toolName) {
      process.stderr.write('No tool name provided.\n');
      continue;
    }

    const args: Record<string, string> = {};
    while (true) {
      const kv = (await rl.question('  arg key=value (enter to finish): ')).trim();
      if (!kv) break;
      const eqIndex = kv.indexOf('=');
      if (eqIndex === -1) {
        process.stderr.write('  Invalid format. Use key=value\n');
        continue;
      }
      args[kv.slice(0, eqIndex)] = kv.slice(eqIndex + 1);
    }

    const msg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    };

    process.stderr.write('\n');
    const decision = inboundEngine.evaluate(msg);
    printInboundDecision(decision, msg);
    if (decision.action === 'deny') anyDenied = true;
    process.stderr.write('\n');

    const again = (await rl.question('Check another? (y/n) ')).trim().toLowerCase();
    if (again !== 'y' && again !== 'yes') {
      keepGoing = false;
    }
    process.stderr.write('\n');
  }

  rl.close();
  if (anyDenied) process.exit(1);
}

function buildJsonRpcFromShorthand(toolName: string, kvArgs: string[]): string {
  const args: Record<string, string> = {};
  for (const kv of kvArgs) {
    const eqIndex = kv.indexOf('=');
    if (eqIndex === -1) {
      process.stderr.write(`[mcpwall] Error: invalid argument "${kv}" — expected key=value\n`);
      process.exit(2);
    }
    args[kv.slice(0, eqIndex)] = kv.slice(eqIndex + 1);
  }
  return JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: toolName, arguments: args },
  });
}

export async function runCheck(inputStr?: string, configPath?: string, toolName?: string, toolArgs?: string[]): Promise<void> {
  // Shorthand mode: mcpwall check <tool_name> [key=value ...]
  if (toolName) {
    inputStr = buildJsonRpcFromShorthand(toolName, toolArgs ?? []);
  }

  // Interactive wizard when no input provided and stdin is a TTY
  if (!inputStr && process.stdin.isTTY) {
    await runInteractiveCheck(configPath);
    return;
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
