/**
 * Integration tests for mcp-firewall proxy
 * Spawns the built CLI with an echo MCP server and verifies end-to-end behavior
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');
const distEntry = join(projectRoot, 'dist', 'index.js');

// Simple echo MCP server that responds to tools/call with echoed params
const ECHO_SERVER_SCRIPT = `
process.stdin.setEncoding('utf-8');
let buffer = '';
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\\n');
  buffer = lines.pop() || '';
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.method === 'initialize') {
        const resp = {
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'echo-server', version: '1.0.0' }
          }
        };
        process.stdout.write(JSON.stringify(resp) + '\\n');
      } else if (msg.method === 'tools/list') {
        const resp = {
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            tools: [
              { name: 'read_file', description: 'Read a file', inputSchema: { type: 'object', properties: { path: { type: 'string' } } } },
              { name: 'run_command', description: 'Run a command', inputSchema: { type: 'object', properties: { command: { type: 'string' } } } }
            ]
          }
        };
        process.stdout.write(JSON.stringify(resp) + '\\n');
      } else if (msg.method === 'tools/call') {
        const resp = {
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{ type: 'text', text: 'ECHO:' + JSON.stringify(msg.params) }]
          }
        };
        process.stdout.write(JSON.stringify(resp) + '\\n');
      } else if (msg.method === 'notifications/initialized') {
        // Notification, no response needed
      } else if (msg.id !== undefined) {
        const resp = {
          jsonrpc: '2.0',
          id: msg.id,
          result: {}
        };
        process.stdout.write(JSON.stringify(resp) + '\\n');
      }
    } catch (e) {
      // ignore parse errors
    }
  }
});
`;

const echoServerPath = join(projectRoot, '.test-echo-server.mjs');

// Custom config that blocks SSH keys and dangerous commands
const TEST_CONFIG = `
version: 1
settings:
  log_dir: /tmp/mcp-firewall-test-logs
  log_level: debug
  default_action: allow
rules:
  - name: block-ssh-keys
    match:
      method: tools/call
      tool: "*"
      arguments:
        _any_value:
          regex: "(\\\\.ssh/|id_rsa|id_ed25519)"
    action: deny
    message: "Blocked: access to SSH keys"
  - name: block-dangerous-commands
    match:
      method: tools/call
      tool: "*"
      arguments:
        _any_value:
          regex: "(rm\\\\s+-rf|curl.*\\\\|.*bash)"
    action: deny
    message: "Blocked: dangerous command"
secrets:
  patterns: []
`;

const testConfigPath = join(projectRoot, '.test-firewall-config.yml');

/**
 * Helper to send JSON-RPC messages to a process and collect responses
 */
function sendAndCollect(
  proc: ReturnType<typeof spawn>,
  messages: object[],
  expectedCount: number,
  timeoutMs = 5000
): Promise<object[]> {
  return new Promise((resolve, reject) => {
    const responses: object[] = [];
    let buffer = '';
    const timer = setTimeout(() => {
      resolve(responses); // resolve with what we have on timeout
    }, timeoutMs);

    proc.stdout!.setEncoding('utf-8');
    proc.stdout!.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          responses.push(JSON.parse(line));
          if (responses.length >= expectedCount) {
            clearTimeout(timer);
            resolve(responses);
          }
        } catch {
          // ignore non-JSON lines
        }
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    // Send all messages
    for (const msg of messages) {
      proc.stdin!.write(JSON.stringify(msg) + '\n');
    }
  });
}

describe('Integration: proxy end-to-end', () => {
  beforeAll(async () => {
    // Ensure dist exists
    if (!existsSync(distEntry)) {
      throw new Error('dist/index.js not found — run npm run build first');
    }

    // Write temp echo server and config
    await writeFile(echoServerPath, ECHO_SERVER_SCRIPT, 'utf-8');
    await writeFile(testConfigPath, TEST_CONFIG, 'utf-8');
    await mkdir('/tmp/mcp-firewall-test-logs', { recursive: true });

    return async () => {
      // Cleanup
      await unlink(echoServerPath).catch(() => {});
      await unlink(testConfigPath).catch(() => {});
    };
  });

  it('forwards safe tool calls through to the server', async () => {
    const proc = spawn('node', [distEntry, '-c', testConfigPath, '--', 'node', echoServerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    try {
      const responses = await sendAndCollect(proc, [
        { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } } },
        { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'read_file', arguments: { path: '/tmp/safe-file.txt' } } },
      ], 2);

      expect(responses).toHaveLength(2);

      // First response: initialize
      const initResp = responses[0] as any;
      expect(initResp.id).toBe(1);
      expect(initResp.result.serverInfo.name).toBe('echo-server');

      // Second response: tool call echoed back (not blocked)
      const toolResp = responses[1] as any;
      expect(toolResp.id).toBe(2);
      expect(toolResp.result.content[0].text).toContain('ECHO:');
      expect(toolResp.result.content[0].text).toContain('safe-file.txt');
    } finally {
      proc.kill();
    }
  });

  it('blocks tool calls matching deny rules and returns JSON-RPC error', async () => {
    const proc = spawn('node', [distEntry, '-c', testConfigPath, '--', 'node', echoServerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    try {
      const responses = await sendAndCollect(proc, [
        { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'read_file', arguments: { path: '/home/user/.ssh/id_rsa' } } },
      ], 1);

      expect(responses).toHaveLength(1);
      const resp = responses[0] as any;
      expect(resp.id).toBe(1);
      expect(resp.error).toBeDefined();
      expect(resp.error.code).toBe(-32600);
      expect(resp.error.message).toContain('Blocked');
      expect(resp.error.message).toContain('SSH');
    } finally {
      proc.kill();
    }
  });

  it('blocks dangerous commands', async () => {
    const proc = spawn('node', [distEntry, '-c', testConfigPath, '--', 'node', echoServerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    try {
      const responses = await sendAndCollect(proc, [
        { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'run_command', arguments: { command: 'rm -rf /' } } },
      ], 1);

      expect(responses).toHaveLength(1);
      const resp = responses[0] as any;
      expect(resp.error).toBeDefined();
      expect(resp.error.message).toContain('Blocked');
      expect(resp.error.message).toContain('dangerous');
    } finally {
      proc.kill();
    }
  });

  it('allows and denies in the same session correctly', async () => {
    const proc = spawn('node', [distEntry, '-c', testConfigPath, '--', 'node', echoServerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    try {
      const responses = await sendAndCollect(proc, [
        // This should pass through
        { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'read_file', arguments: { path: '/tmp/ok.txt' } } },
        // This should be blocked
        { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'read_file', arguments: { path: '/home/user/.ssh/id_ed25519' } } },
        // This should also pass through
        { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'read_file', arguments: { path: '/tmp/also-ok.txt' } } },
      ], 3);

      expect(responses).toHaveLength(3);

      // Responses may arrive out of order — deny is instant, allows go through echo server
      // Find each by id
      const r1 = responses.find((r: any) => r.id === 1) as any;
      const r2 = responses.find((r: any) => r.id === 2) as any;
      const r3 = responses.find((r: any) => r.id === 3) as any;

      expect(r1).toBeDefined();
      expect(r2).toBeDefined();
      expect(r3).toBeDefined();

      // Response 1: allowed (echoed back)
      expect(r1.result).toBeDefined();
      expect(r1.result.content[0].text).toContain('ok.txt');

      // Response 2: denied
      expect(r2.error).toBeDefined();
      expect(r2.error.message).toContain('SSH');

      // Response 3: allowed (echoed back)
      expect(r3.result).toBeDefined();
      expect(r3.result.content[0].text).toContain('also-ok.txt');
    } finally {
      proc.kill();
    }
  });

  it('handles notifications without sending error responses', async () => {
    const proc = spawn('node', [distEntry, '-c', testConfigPath, '--', 'node', echoServerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    try {
      // Send a notification (no id) that would match a deny rule,
      // then send a normal request. Only the request should get a response.
      const responses = await sendAndCollect(proc, [
        // Notification with SSH path — should NOT produce a response
        { jsonrpc: '2.0', method: 'tools/call', params: { name: 'read_file', arguments: { path: '.ssh/id_rsa' } } },
        // Normal request — should get echoed back
        { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'read_file', arguments: { path: '/tmp/safe.txt' } } },
      ], 1, 3000);

      expect(responses).toHaveLength(1);
      const resp = responses[0] as any;
      expect(resp.id).toBe(1);
      expect(resp.result).toBeDefined();
    } finally {
      proc.kill();
    }
  });

  it('passes tools/list through unblocked', async () => {
    const proc = spawn('node', [distEntry, '-c', testConfigPath, '--', 'node', echoServerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    try {
      const responses = await sendAndCollect(proc, [
        { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
      ], 1);

      expect(responses).toHaveLength(1);
      const resp = responses[0] as any;
      expect(resp.id).toBe(1);
      expect(resp.result.tools).toBeDefined();
      expect(resp.result.tools.length).toBe(2);
    } finally {
      proc.kill();
    }
  });
});
