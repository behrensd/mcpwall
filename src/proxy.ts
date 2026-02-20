/**
 * Stdio proxy for mcpwall
 * Intercepts JSON-RPC messages between MCP host and server
 */

import { spawn, type ChildProcess } from 'node:child_process';
import type { JsonRpcMessage, Decision, OutboundDecision, RequestContext } from './types.js';
import { parseJsonRpcLineEx, createLineBuffer } from './parser.js';
import type { Logger } from './logger.js';
import type { OutboundPolicyEngine } from './engine/outbound-policy.js';

export interface ProxyOptions {
  command: string;
  args: string[];
  policyEngine: {
    evaluate(msg: JsonRpcMessage): Decision;
  };
  logger: Logger;
  logArgs?: 'full' | 'none';
  outboundPolicyEngine?: OutboundPolicyEngine;
  logRedacted?: 'none' | 'hash' | 'full';
  serverName?: string;
}

/**
 * Create and start the transparent stdio proxy
 * Returns the child process for lifecycle management
 */
export function createProxy(options: ProxyOptions): ChildProcess {
  const { command, args, policyEngine, logger, logArgs = 'none', outboundPolicyEngine, logRedacted = 'none', serverName } = options;

  // Request-response correlation: maps JSON-RPC id to request context
  const pendingRequests = new Map<string | number, RequestContext>();
  const REQUEST_TTL_MS = 60_000;

  function trackRequest(msg: JsonRpcMessage): void {
    if (msg.id !== undefined && msg.id !== null && msg.method === 'tools/call') {
      const params = msg.params as { name?: string } | undefined;
      pendingRequests.set(msg.id, {
        tool: params?.name,
        method: msg.method,
        ts: Date.now(),
      });
    }
  }

  function resolveRequest(id: string | number | null | undefined): RequestContext | undefined {
    if (id === undefined || id === null) return undefined;
    const ctx = pendingRequests.get(id);
    if (ctx) {
      pendingRequests.delete(id);
    }
    // Clean stale entries
    const now = Date.now();
    for (const [key, val] of pendingRequests) {
      if (now - val.ts > REQUEST_TTL_MS) {
        pendingRequests.delete(key);
      }
    }
    return ctx;
  }

  // inherit stderr so server's debug output goes to stderr
  const child = spawn(command, args, {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  let isShuttingDown = false;

  child.on('error', (err) => {
    process.stderr.write(`[mcpwall] Error spawning ${command}: ${err.message}\n`);
    process.exit(1);
  });

  function evaluateMessage(msg: JsonRpcMessage, decision: Decision): boolean {
    let toolName: string | undefined;
    if (msg.method === 'tools/call' && msg.params && typeof msg.params === 'object') {
      toolName = (msg.params as { name?: string }).name;
    }

    if (decision.action === 'deny') {
      // Redact args to avoid leaking secrets into logs
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
    // Only log full args when explicitly configured
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

      if (!result) {
        if (child.stdin && !child.stdin.destroyed) {
          child.stdin.write(line + '\n');
        }
        return;
      }

      if (result.type === 'single') {
        const msg = result.message;
        const decision = policyEngine.evaluate(msg);

        if (decision.action === 'deny') {
          if (msg.id !== undefined && msg.id !== null) {
            process.stdout.write(JSON.stringify(buildDenyError(msg, decision)) + '\n');
          }
          evaluateMessage(msg, decision);
          return;
        }

        evaluateMessage(msg, decision);
        trackRequest(msg);
        if (child.stdin && !child.stdin.destroyed) {
          child.stdin.write(line + '\n');
        }
        return;
      }

      // Batch message: evaluate each element individually
      if (result.type === 'batch') {
        const forwarded: object[] = [];
        const errors: object[] = [];

        for (const msg of result.messages) {
          const decision = policyEngine.evaluate(msg);

          if (decision.action === 'deny') {
            evaluateMessage(msg, decision);
            if (msg.id !== undefined && msg.id !== null) {
              errors.push(buildDenyError(msg, decision));
            }
          } else {
            evaluateMessage(msg, decision);
            trackRequest(msg);
            forwarded.push(msg);
          }
        }

        if (errors.length === 1) {
          process.stdout.write(JSON.stringify(errors[0]) + '\n');
        } else if (errors.length > 1) {
          process.stdout.write(JSON.stringify(errors) + '\n');
        }

        if (forwarded.length > 0 && child.stdin && !child.stdin.destroyed) {
          if (forwarded.length === 1) {
            child.stdin.write(JSON.stringify(forwarded[0]) + '\n');
          } else {
            child.stdin.write(JSON.stringify(forwarded) + '\n');
          }
        }
        return;
      }
    } catch (err) {
      // Never crash from a single bad message
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[mcpwall] Error processing inbound message: ${message}\n`);
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

  function evaluateOutbound(msg: JsonRpcMessage): void {
    // No outbound engine: passthrough with basic logging
    if (!outboundPolicyEngine) {
      process.stdout.write(JSON.stringify(msg) + '\n');
      if (msg.result !== undefined || msg.error !== undefined) {
        logger.log({
          ts: new Date().toISOString(),
          method: 'response',
          tool: undefined,
          action: 'allow',
          rule: null,
          direction: 'outbound',
          message: msg.error ? `Error: ${msg.error.message}` : undefined,
        });
      }
      return;
    }

    // Correlate with original request
    const ctx = resolveRequest(msg.id);
    const toolName = ctx?.tool;

    // Only evaluate responses (messages with result or error)
    if (msg.result === undefined && msg.error === undefined) {
      // Not a response (e.g., a server notification), pass through
      process.stdout.write(JSON.stringify(msg) + '\n');
      return;
    }

    const decision: OutboundDecision = outboundPolicyEngine.evaluate(msg, toolName, serverName);

    switch (decision.action) {
      case 'allow': {
        process.stdout.write(JSON.stringify(msg) + '\n');
        logger.log({
          ts: new Date().toISOString(),
          method: 'response',
          tool: toolName,
          action: 'allow',
          rule: decision.rule,
          direction: 'outbound',
          message: msg.error ? `Error: ${msg.error.message}` : undefined,
        });
        break;
      }

      case 'deny': {
        const blocked: JsonRpcMessage = {
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{
              type: 'text',
              text: `[BLOCKED BY MCPWALL] ${decision.message || 'Response blocked by outbound policy'}`,
            }],
          },
        };
        process.stdout.write(JSON.stringify(blocked) + '\n');
        logger.log({
          ts: new Date().toISOString(),
          method: 'response',
          tool: toolName,
          action: 'deny',
          rule: decision.rule,
          direction: 'outbound',
          message: decision.message,
        });
        break;
      }

      case 'redact': {
        const { message: redactedMsg, result: redactionResult } = outboundPolicyEngine.redactResponse(msg);
        process.stdout.write(JSON.stringify(redactedMsg) + '\n');
        const patternNames = redactionResult.matches.map((m) => m.pattern);
        logger.log({
          ts: new Date().toISOString(),
          method: 'response',
          tool: toolName,
          action: 'redact',
          rule: decision.rule,
          direction: 'outbound',
          message: decision.message,
          redacted_patterns: patternNames.length > 0 ? patternNames : undefined,
        });
        break;
      }

      case 'log_only': {
        process.stdout.write(JSON.stringify(msg) + '\n');
        logger.log({
          ts: new Date().toISOString(),
          method: 'response',
          tool: toolName,
          action: 'log_only',
          rule: decision.rule,
          direction: 'outbound',
          message: decision.message,
        });
        break;
      }
    }
  }

  const outboundBuffer = createLineBuffer((line) => {
    try {
      const result = parseJsonRpcLineEx(line);

      if (!result) {
        // Not valid JSON-RPC, pass through raw
        process.stdout.write(line + '\n');
        return;
      }

      if (result.type === 'single') {
        evaluateOutbound(result.message);
        return;
      }

      if (result.type === 'batch') {
        for (const msg of result.messages) {
          evaluateOutbound(msg);
        }
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[mcpwall] Error processing outbound message: ${message}\n`);
      // Fail-open: forward raw line on error
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

  // Forward signals to child with escalation
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
