/**
 * Interactive setup wizard for mcpwall
 * Wraps existing MCP server configurations with the firewall
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stringify as yamlStringify } from 'yaml';
import { DEFAULT_CONFIG } from '../config/defaults.js';
import type { McpServerConfig, McpConfigFile } from '../types.js';

export async function runInit(): Promise<void> {
  process.stderr.write('\n🔒 mcpwall setup wizard\n\n');

  const rl = createInterface({
    input: process.stdin,
    output: process.stderr
  });

  try {
    const configPaths = [
      { path: join(homedir(), '.claude.json'), name: 'Claude Code global config' },
      { path: join(process.cwd(), '.mcp.json'), name: 'Claude Code project config' }
    ];

    const foundConfigs: Array<{ path: string; name: string; config: McpConfigFile }> = [];

    for (const { path, name } of configPaths) {
      if (existsSync(path)) {
        try {
          const contents = await readFile(path, 'utf-8');
          const config = JSON.parse(contents) as McpConfigFile;
          if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
            foundConfigs.push({ path, name, config });
          }
        } catch (error) {
          process.stderr.write(`[mcpwall] Warning: Could not parse ${path}\n`);
        }
      }
    }

    if (foundConfigs.length === 0) {
      process.stderr.write('No MCP server configurations found.\n');
      process.stderr.write('Looked for:\n');
      process.stderr.write('  - ~/.claude.json\n');
      process.stderr.write('  - ./.mcp.json\n\n');
      process.stderr.write('You can manually configure mcpwall by wrapping your MCP server commands:\n');
      process.stderr.write('  Original: npx -y @some/server\n');
      process.stderr.write('  Wrapped:  npx -y mcpwall -- npx -y @some/server\n\n');
      rl.close();
      return;
    }

    process.stderr.write('Found MCP servers:\n\n');
    const allServers: Array<{ configPath: string; serverName: string; config: McpServerConfig }> = [];

    for (const { path, name, config } of foundConfigs) {
      process.stderr.write(`In ${name} (${path}):\n`);
      for (const [serverName, serverConfig] of Object.entries(config.mcpServers!)) {
        allServers.push({ configPath: path, serverName, config: serverConfig });
        const commandStr = `${serverConfig.command} ${serverConfig.args.join(' ')}`;
        process.stderr.write(`  [${allServers.length}] ${serverName}: ${commandStr}\n`);
      }
      process.stderr.write('\n');
    }

    const answer = await rl.question(
      'Enter server numbers to wrap (comma-separated, or "all" for all): '
    );

    let selectedIndices: number[];
    if (answer.trim().toLowerCase() === 'all') {
      selectedIndices = allServers.map((_, i) => i);
    } else {
      selectedIndices = answer
        .split(',')
        .map((s) => parseInt(s.trim()) - 1)
        .filter((i) => i >= 0 && i < allServers.length);
    }

    if (selectedIndices.length === 0) {
      process.stderr.write('No servers selected. Exiting.\n');
      rl.close();
      return;
    }

    process.stderr.write('\nWrapping servers with mcpwall...\n\n');

    for (const index of selectedIndices) {
      const { configPath, serverName, config } = allServers[index];

      if (config.command === 'npx' && config.args.includes('mcpwall')) {
        process.stderr.write(`  ✓ ${serverName} is already wrapped\n`);
        continue;
      }

      const wrappedConfig: McpServerConfig = {
        command: 'npx',
        args: ['-y', 'mcpwall', '--', config.command, ...config.args],
        env: config.env
      };

      const configContents = await readFile(configPath, 'utf-8');
      const fullConfig = JSON.parse(configContents) as McpConfigFile;
      fullConfig.mcpServers![serverName] = wrappedConfig;

      await writeFile(configPath, JSON.stringify(fullConfig, null, 2), 'utf-8');

      process.stderr.write(`  ✓ Wrapped ${serverName}\n`);
    }

    const firewallConfigDir = join(homedir(), '.mcpwall');
    const firewallConfigPath = join(firewallConfigDir, 'config.yml');

    if (!existsSync(firewallConfigPath)) {
      process.stderr.write('\nCreating default firewall configuration...\n');

      if (!existsSync(firewallConfigDir)) {
        await mkdir(firewallConfigDir, { recursive: true });
      }

      const yamlConfig = yamlStringify(DEFAULT_CONFIG);
      await writeFile(firewallConfigPath, yamlConfig, 'utf-8');

      process.stderr.write(`  ✓ Created ${firewallConfigPath}\n`);
    } else {
      process.stderr.write(`\n  ✓ Config already exists: ${firewallConfigPath}\n`);
    }

    process.stderr.write('\n✅ Setup complete!\n\n');
    process.stderr.write('Your MCP servers are now protected by mcpwall.\n');
    process.stderr.write(`View logs in: ${join(homedir(), '.mcpwall/logs')}\n`);
    process.stderr.write(`Edit rules in: ${firewallConfigPath}\n\n`);
  } finally {
    rl.close();
  }
}
