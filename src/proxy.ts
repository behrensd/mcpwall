/**
 * Stdio proxy for mcpwall
 * Intercepts JSON-RPC messages between MCP host and server
 */

import { spawn, type ChildProcess } from 'node:child_process';
import type { JsonRpcMessage, Decision } from './types.js';
import { parseJsonRpcLineEx, createLineBuffer } from './parser.js';
import type { Logger } from './logger.js';

export interface ProxyOptions {
  command: string;
  args: string[];
  policyEngine: {
    evaluate(msg: JsonRpcMessage): Decision;
  };
  logger: Logger;
  logArgs?: 'full' | 'none';
}

/**
 * Create and start the transparent stdio proxy
 * Returns the child process for lifecycle management
 */
export function createProxy(options: ProxyOptions): ChildProcess {
  const { command, args, policyEngine, logger, logArgs = 'none' } = options;

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

  /**
   * Evaluate a single JSON-RPC message against the policy engine.
   * Returns the decision and handles deny response/logging.
   * Returns true if allowed, false if denied.
   */
  function evaluateMessage(msg: JsonRpcMessage): boolean {
    const decision = policyEngine.evaluate(msg);

    // Extract tool name for logging
    let toolName: string | undefined;
    if (msg.method === 'tools/call' && msg.params && typeof msg.params === 'object') {
      toolName = (msg.params as { name?: string }).name;
    }

    if (decision.action === 'deny') {
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
      return false;
    }

    // Allow or ask (ask = allow in Phase 1)
    // M6 fix: only log full args when explicitly configured
    const loggedArgs = logArgs === 'full' && msg.method === 'tools/call'
      ? (msg.params as { arguments?: unknown })?.arguments
      : undefined;

    logger.log({
      ts: new Date().toISOString(),
      method: msg.method,
      tool: toolName,
      args: loggedArgs,
      action: decision.action,
      rule: decision.rule,
      message: decision.message
    });
    return true;
  }

  /**
   * Build a JSON-RPC error response for a denied request
   */
  function buildDenyError(msg: JsonRpcMessage, decision: Decision): object {
    return {
      jsonrpc: '2.0' as const,
      id: msg.id,
      error: {
        code: -32600,
        message: `[mcpwall] ${decision.message || 'Blocked by policy'}`
      }
    };
  }

  // === INBOUND PATH: Claude → Firewall → MCP Server ===
  const inboundBuffer = createLineBuffer((line) => {
    try {
      const result = parseJsonRpcLineEx(line);

      // Not valid JSON-RPC — forward as-is
      if (!result) {
        if (child.stdin && !child.stdin.destroyed) {
          child.stdin.write(line + '\n');
        }
        return;
      }

      // Single message
      if (result.type === 'single') {
        const msg = result.message;
        const decision = policyEngine.evaluate(msg);

        if (decision.action === 'deny') {
          // Only send error for requests (messages with an id)
          if (msg.id !== undefined && msg.id !== null) {
            process.stdout.write(JSON.stringify(buildDenyError(msg, decision)) + '\n');
          }
          evaluateMessage(msg); // logs the deny
          return;
        }

        evaluateMessage(msg); // logs the allow
        if (child.stdin && !child.stdin.destroyed) {
          child.stdin.write(line + '\n');
        }
        return;
      }

      // Batch message (C1 fix): evaluate each element individually
      if (result.type === 'batch') {
        const forwarded: object[] = [];
        const errors: object[] = [];

        for (const msg of result.messages) {
          const decision = policyEngine.evaluate(msg);

          if (decision.action === 'deny') {
            evaluateMessage(msg); // logs the deny
            // Build error response for requests (not notifications)
            if (msg.id !== undefined && msg.id !== null) {
              errors.push(buildDenyError(msg, decision));
            }
          } else {
            evaluateMessage(msg); // logs the allow
            forwarded.push(msg);
          }
        }

        // Send deny errors back to client
        if (errors.length === 1) {
          process.stdout.write(JSON.stringify(errors[0]) + '\n');
        } else if (errors.length > 1) {
          process.stdout.write(JSON.stringify(errors) + '\n');
        }

        // Forward allowed messages to server
        if (forwarded.length > 0 && child.stdin && !child.stdin.destroyed) {
          if (forwarded.length === 1) {
            child.stdin.write(JSON.stringify(forwarded[0]) + '\n');
          } else {
            child.stdin.write(JSON.stringify(forwarded) + '\n');
          }
        }
        return;
      }
    } catch (err: any) {
      // H1 fix: never crash from a single bad message
      process.stderr.write(`[mcpwall] Error processing inbound message: ${err.message}\n`);
      // Forward the raw line so the connection isn't silently broken
      if (child.stdin && !child.stdin.destroyed) {
        child.stdin.write(line + '\n');
      }
    }
  });

  process.stdin.on('data', (chunk: Buffer) => {
    inboundBuffer.push(chunk.toString());
  });

  process.stdin.on('end', () => {
    inboundBuffer.flush();
    if (child.stdin && !child.stdin.destroyed) {
      child.stdin.end();
    }
  });

  // === OUTBOUND PATH: MCP Server → Firewall → Claude ===
  const outboundBuffer = createLineBuffer((line) => {
    try {
      // Phase 1: forward all responses without filtering
      process.stdout.write(line + '\n');

      // Optional: parse and log at debug level
      const result = parseJsonRpcLineEx(line);
      if (result?.type === 'single') {
        const msg = result.message;
        if (msg.result !== undefined || msg.error !== undefined) {
          logger.log({
            ts: new Date().toISOString(),
            method: 'response',
            action: 'allow',
            rule: null,
            message: msg.error ? `Error: ${msg.error.message}` : undefined
          });
        }
      }
    } catch (err: any) {
      // Never crash from outbound parsing errors
      process.stderr.write(`[mcpwall] Error processing outbound message: ${err.message}\n`);
      try { process.stdout.write(line + '\n'); } catch { /* EPIPE — client disconnected */ }
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

  // Forward signals to child with escalation (M5 fix)
  function handleSignal(sig: NodeJS.Signals) {
    if (!isShuttingDown && child && !child.killed) {
      isShuttingDown = true;
      child.kill(sig);
      // Escalate to SIGKILL after 5 seconds if child doesn't exit
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
        }
      }, 5000).unref();
    }
  }

  process.on('SIGINT', () => handleSignal('SIGINT'));
  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGHUP', () => handleSignal('SIGHUP'));

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
