/**
 * Wrap a specific MCP server with mcpwall
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { McpServerConfig, McpConfigFile } from '../types.js';

const CONFIG_PATHS = [
  () => join(homedir(), '.claude.json'),
  () => join(process.cwd(), '.mcp.json'),
];

export async function runWrap(serverName: string): Promise<void> {
  for (const getPath of CONFIG_PATHS) {
    const configPath = getPath();
    if (!existsSync(configPath)) continue;

    let raw: string;
    let config: McpConfigFile;
    try {
      raw = await readFile(configPath, 'utf-8');
      config = JSON.parse(raw);
    } catch {
      continue;
    }

    if (!config.mcpServers?.[serverName]) continue;

    const server = config.mcpServers[serverName];

    if (server.command === 'npx' && server.args.includes('mcpwall')) {
      process.stderr.write(`[mcpwall] ${serverName} is already wrapped in ${configPath}\n`);
      return;
    }

    config.mcpServers[serverName] = {
      command: 'npx',
      args: ['-y', 'mcpwall', '--', server.command, ...server.args],
      env: server.env,
    };

    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    process.stderr.write(`[mcpwall] Wrapped ${serverName} in ${configPath}\n`);
    process.stderr.write(`  ${server.command} ${server.args.join(' ')}\n`);
    process.stderr.write(`  -> npx -y mcpwall -- ${server.command} ${server.args.join(' ')}\n`);
    return;
  }

  process.stderr.write(`[mcpwall] Server "${serverName}" not found in any config file.\n`);
  process.stderr.write(`Searched:\n`);
  for (const getPath of CONFIG_PATHS) {
    const p = getPath();
    const exists = existsSync(p) ? '' : ' (not found)';
    process.stderr.write(`  - ${p}${exists}\n`);
  }
  process.exit(1);
}
