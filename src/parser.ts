/**
 * JSON-RPC line parser for MCP protocol
 * Messages are newline-delimited JSON over stdio
 */

import type { JsonRpcMessage, LineBuffer } from './types.js';

export type ParseResult =
  | { type: 'single'; message: JsonRpcMessage }
  | { type: 'batch'; messages: JsonRpcMessage[] }
  | null;

/**
 * Parse a single line as JSON-RPC message or batch
 * Returns null if the line is empty or not valid JSON-RPC
 */
export function parseJsonRpcLine(line: string): JsonRpcMessage | null {
  const result = parseJsonRpcLineEx(line);
  if (result?.type === 'single') return result.message;
  return null;
}

/**
 * Extended parser that also detects JSON-RPC batch arrays.
 * The MCP spec (2025-03-26) allows batch messages: arrays of JSON-RPC objects.
 */
export function parseJsonRpcLineEx(line: string): ParseResult {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);

    // Batch message: JSON array of JSON-RPC objects
    if (Array.isArray(parsed)) {
      const messages: JsonRpcMessage[] = [];
      for (const item of parsed) {
        if (item && typeof item === 'object' && item.jsonrpc === '2.0') {
          messages.push(item as JsonRpcMessage);
        }
      }
      if (messages.length > 0) {
        return { type: 'batch', messages };
      }
      return null;
    }

    if (!parsed || typeof parsed !== 'object' || parsed.jsonrpc !== '2.0') {
      return null;
    }

    return { type: 'single', message: parsed as JsonRpcMessage };
  } catch {
    return null;
  }
}

/**
 * Create a line buffer that accumulates chunks and emits complete lines
 * Handles partial lines that arrive across multiple chunks
 */
const MAX_LINE_LENGTH = 10 * 1024 * 1024; // 10MB — reject lines larger than this

export function createLineBuffer(onLine: (line: string) => void): LineBuffer {
  let buffer = '';

  return {
    push(chunk: string): void {
      buffer += chunk;

      // Prevent OOM from missing newlines
      if (buffer.length > MAX_LINE_LENGTH && !buffer.includes('\n')) {
        process.stderr.write(`[mcpwall] Warning: discarding oversized message (${buffer.length} bytes)\n`);
        buffer = '';
        return;
      }
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line) {
          onLine(line);
        }
      }
    },
    flush(): void {
      if (buffer.trim()) {
        onLine(buffer);
        buffer = '';
      }
    }
  };
}
