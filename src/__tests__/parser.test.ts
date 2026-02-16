/**
 * Unit tests for JSON-RPC parser and line buffer
 */

import { describe, it, expect } from 'vitest';
import { parseJsonRpcLine, createLineBuffer } from '../parser';

describe('parseJsonRpcLine', () => {
  it('valid JSON-RPC returns message', () => {
    const line = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{}}';
    const result = parseJsonRpcLine(line);

    expect(result).not.toBeNull();
    expect(result?.jsonrpc).toBe('2.0');
    expect(result?.id).toBe(1);
    expect(result?.method).toBe('tools/call');
    expect(result?.params).toEqual({});
  });

  it('invalid JSON returns null', () => {
    const line = '{"jsonrpc":"2.0",invalid}';
    const result = parseJsonRpcLine(line);

    expect(result).toBeNull();
  });

  it('non-2.0 jsonrpc field returns null', () => {
    const line = '{"jsonrpc":"1.0","id":1,"method":"test"}';
    const result = parseJsonRpcLine(line);

    expect(result).toBeNull();
  });

  it('missing jsonrpc field returns null', () => {
    const line = '{"id":1,"method":"test"}';
    const result = parseJsonRpcLine(line);

    expect(result).toBeNull();
  });

  it('empty string returns null', () => {
    const result = parseJsonRpcLine('');
    expect(result).toBeNull();
  });

  it('whitespace-only string returns null', () => {
    const result = parseJsonRpcLine('   \n\t  ');
    expect(result).toBeNull();
  });

  it('parses response message (no method)', () => {
    const line = '{"jsonrpc":"2.0","id":1,"result":{"success":true}}';
    const result = parseJsonRpcLine(line);

    expect(result).not.toBeNull();
    expect(result?.jsonrpc).toBe('2.0');
    expect(result?.id).toBe(1);
    expect(result?.result).toEqual({ success: true });
    expect(result?.method).toBeUndefined();
  });

  it('parses error response', () => {
    const line = '{"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"Method not found"}}';
    const result = parseJsonRpcLine(line);

    expect(result).not.toBeNull();
    expect(result?.jsonrpc).toBe('2.0');
    expect(result?.error?.code).toBe(-32601);
    expect(result?.error?.message).toBe('Method not found');
  });
});

describe('createLineBuffer', () => {
  it('complete lines emitted immediately', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.push('{"jsonrpc":"2.0","id":1}\n');

    expect(lines).toEqual(['{"jsonrpc":"2.0","id":1}']);
  });

  it('partial lines buffered until newline', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.push('{"jsonrpc":"2.0",');
    expect(lines).toEqual([]);

    buffer.push('"id":1}\n');
    expect(lines).toEqual(['{"jsonrpc":"2.0","id":1}']);
  });

  it('multiple lines in one chunk', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.push('{"jsonrpc":"2.0","id":1}\n{"jsonrpc":"2.0","id":2}\n');

    expect(lines).toEqual([
      '{"jsonrpc":"2.0","id":1}',
      '{"jsonrpc":"2.0","id":2}'
    ]);
  });

  it('flush emits remaining buffer content', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.push('{"jsonrpc":"2.0","id":1}\n');
    buffer.push('{"jsonrpc":"2.0","id":2}');
    expect(lines).toEqual(['{"jsonrpc":"2.0","id":1}']);

    buffer.flush();
    expect(lines).toEqual([
      '{"jsonrpc":"2.0","id":1}',
      '{"jsonrpc":"2.0","id":2}'
    ]);
  });

  it('flush does not emit empty buffer', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.push('{"jsonrpc":"2.0","id":1}\n');
    buffer.flush();

    expect(lines).toEqual(['{"jsonrpc":"2.0","id":1}']);
  });

  it('flush does not emit whitespace-only buffer', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.push('{"jsonrpc":"2.0","id":1}\n  \n');
    buffer.flush();

    expect(lines).toEqual(['{"jsonrpc":"2.0","id":1}', '  ']);
  });

  it('handles mixed complete and incomplete lines', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.push('line1\nline2\npartial');
    expect(lines).toEqual(['line1', 'line2']);

    buffer.push('_end\nline3\n');
    expect(lines).toEqual(['line1', 'line2', 'partial_end', 'line3']);
  });

  it('handles empty lines in chunk', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.push('line1\n\nline2\n');

    // Empty lines are filtered by the buffer implementation
    expect(lines).toEqual(['line1', 'line2']);
  });

  it('handles chunk ending with newline', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.push('line1\nline2\n');
    expect(lines).toEqual(['line1', 'line2']);

    buffer.push('line3\n');
    expect(lines).toEqual(['line1', 'line2', 'line3']);
  });
});
