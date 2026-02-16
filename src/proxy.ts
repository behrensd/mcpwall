/**
 * Stdio proxy for mcpwall
 * Intercepts JSON-RPC messages between MCP host and server
 */

import { spawn, type ChildProcess } from 'node:child_process';
import type { JsonRpcMessage, Decision } from './types.js';
import { parseJsonRpcLine, createLineBuffer } from './parser.js';
import type { Logger } from './logger.js';

export interface ProxyOptions {
  command: string;
  args: string[];
  policyEngine: {
    evaluate(msg: JsonRpcMessage): Decision;
  };
  logger: Logger;
}

/**
 * Create and start the transparent stdio proxy
 * Returns the child process for lifecycle management
 */
export function createProxy(options: ProxyOptions): ChildProcess {
  const { command, args, policyEngine, logger } = options;

  // Spawn the real MCP server
  // inherit stderr so server's debug output goes to stderr
  const child = spawn(command, args, {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: { ...process.env }
  });

  let isShuttingDown = false;

  // Handle spawn errors (e.g., command not found)
  child.on('error', (err) => {
    process.stderr.write(`[mcpwall] Error spawning ${command}: ${err.message}\n`);
    process.exit(1);
  });

  // === INBOUND PATH: Claude → Firewall → MCP Server ===
  const inboundBuffer = createLineBuffer((line) => {
    const msg = parseJsonRpcLine(line);

    // Not valid JSON-RPC, forward as-is (pass-through)
    if (!msg) {
      if (child.stdin && !child.stdin.destroyed) {
        child.stdin.write(line + '\n');
      }
      return;
    }

    // Evaluate policy
    const decision = policyEngine.evaluate(msg);

    // Extract tool name for logging (tools/call messages)
    let toolName: string | undefined;
    if (msg.method === 'tools/call' && msg.params && typeof msg.params === 'object') {
      toolName = (msg.params as { name?: string }).name;
    }

    if (decision.action === 'deny') {
      // Only send error response for requests (messages with an id).
      // Notifications (no id) must not receive responses per JSON-RPC 2.0 spec.
      if (msg.id !== undefined && msg.id !== null) {
        const errorResponse = {
          jsonrpc: '2.0' as const,
          id: msg.id,
          error: {
            code: -32600,
            message: `[mcpwall] ${decision.message || 'Blocked by policy'}`
          }
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }

      // Log the denial — redact args to avoid leaking secrets into logs
      logger.log({
        ts: new Date().toISOString(),
        method: msg.method,
        tool: toolName,
        args: '[REDACTED]',
        action: 'deny',
        rule: decision.rule,
        message: decision.message
      });

      return; // Do NOT forward to child
    }

    // Allow or ask (ask = allow in Phase 1)
    if (child.stdin && !child.stdin.destroyed) {
      child.stdin.write(line + '\n');
    }

    // Log the action
    logger.log({
      ts: new Date().toISOString(),
      method: msg.method,
      tool: toolName,
      args: msg.method === 'tools/call' ? (msg.params as { arguments?: unknown })?.arguments : undefined,
      action: decision.action,
      rule: decision.rule,
      message: decision.message
    });
  });

  process.stdin.on('data', (chunk: Buffer) => {
    inboundBuffer.push(chunk.toString());
  });

  process.stdin.on('end', () => {
    // Process any remaining buffered data before closing
    inboundBuffer.flush();
    if (child.stdin && !child.stdin.destroyed) {
      child.stdin.end();
    }
  });

  // === OUTBOUND PATH: MCP Server → Firewall → Claude ===
  const outboundBuffer = createLineBuffer((line) => {
    // Phase 1: forward all responses without filtering
    // Phase 2: scan responses for secrets before forwarding
    process.stdout.write(line + '\n');

    // Optional: parse and log at debug level
    const msg = parseJsonRpcLine(line);
    if (msg && (msg.result !== undefined || msg.error !== undefined)) {
      // This is a response message
      logger.log({
        ts: new Date().toISOString(),
        method: 'response',
        action: 'allow',
        rule: null,
        message: msg.error ? `Error: ${msg.error.message}` : undefined
      });
    }
  });

  if (child.stdout) {
    child.stdout.on('data', (chunk: Buffer) => {
      outboundBuffer.push(chunk.toString());
    });
    child.stdout.on('end', () => {
      outboundBuffer.flush();
    });
  }

  // === LIFECYCLE MANAGEMENT ===

  // When child exits, exit with same code
  child.on('exit', (code, signal) => {
    if (!isShuttingDown) {
      isShuttingDown = true;
      logger.close();

      if (signal) {
        process.stderr.write(`[mcpwall] Child process killed by signal ${signal}\n`);
        process.exit(1);
      } else {
        process.exit(code ?? 0);
      }
    }
  });

  // Forward signals to child
  process.on('SIGINT', () => {
    if (!isShuttingDown && child && !child.killed) {
      isShuttingDown = true;
      child.kill('SIGINT');
    }
  });

  process.on('SIGTERM', () => {
    if (!isShuttingDown && child && !child.killed) {
      isShuttingDown = true;
      child.kill('SIGTERM');
    }
  });

  // Handle parent process exit
  process.on('exit', () => {
    if (!isShuttingDown) {
      logger.close();
      if (child && !child.killed) {
        child.kill();
      }
    }
  });

  return child;
}
