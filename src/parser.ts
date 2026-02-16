/**
 * JSON-RPC line parser for MCP protocol
 * Messages are newline-delimited JSON over stdio
 */

import type { JsonRpcMessage, LineBuffer } from './types.js';

/**
 * Parse a single line as JSON-RPC message
 * Returns null if the line is empty or not valid JSON
 */
export function parseJsonRpcLine(line: string): JsonRpcMessage | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);

    // Validate that it has at least the jsonrpc field
    if (!parsed || typeof parsed !== 'object' || parsed.jsonrpc !== '2.0') {
      return null;
    }

    return parsed as JsonRpcMessage;
  } catch {
    // Not valid JSON
    return null;
  }
}

/**
 * Create a line buffer that accumulates chunks and emits complete lines
 * Handles partial lines that arrive across multiple chunks
 */
export function createLineBuffer(onLine: (line: string) => void): LineBuffer {
  let buffer = '';

  return {
    push(chunk: string): void {
      buffer += chunk;
      const lines = buffer.split('\n');

      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() || '';

      // Process all complete lines
      for (const line of lines) {
        if (line) {
          onLine(line);
        }
      }
    },
    /** Process any remaining buffered content (call on stream end) */
    flush(): void {
      if (buffer.trim()) {
        onLine(buffer);
        buffer = '';
      }
    }
  };
}
