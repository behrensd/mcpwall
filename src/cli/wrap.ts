/**
 * Wrap a specific MCP server with mcpwall
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface McpConfigFile {
  mcpServers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
}

const CONFIG_PATHS = [
  () => join(homedir(), '.claude.json'),
  () => join(process.cwd(), '.mcp.json'),
];

/**
 * Wrap a specific MCP server by name
 */
export async function runWrap(serverName: string): Promise<void> {
  // Search all config files for the server
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

    // Check if already wrapped
    if (server.command === 'npx' && server.args.includes('mcpwall')) {
      process.stderr.write(`[mcpwall] ${serverName} is already wrapped in ${configPath}\n`);
      return;
    }

    // Wrap it
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

  // Not found
  process.stderr.write(`[mcpwall] Server "${serverName}" not found in any config file.\n`);
  process.stderr.write(`Searched:\n`);
  for (const getPath of CONFIG_PATHS) {
    const p = getPath();
    const exists = existsSync(p) ? '' : ' (not found)';
    process.stderr.write(`  - ${p}${exists}\n`);
  }
  process.exit(1);
}
