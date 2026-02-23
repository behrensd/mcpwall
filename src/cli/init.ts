/**
 * Interactive setup wizard for mcpwall
 * Wraps existing MCP server configurations with the firewall
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stringify as yamlStringify } from 'yaml';
import { DEFAULT_CONFIG } from '../config/defaults.js';
import type { McpServerConfig, McpConfigFile } from '../types.js';

/**
 * Resolve the rules/profiles directory relative to this compiled file.
 * Same pattern as config/loader.ts loadBuiltinDefaultRules().
 */
function getProfilesDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  const packageRoot = dirname(dirname(thisFile)); // up from dist/
  return join(packageRoot, 'rules', 'profiles');
}

/**
 * List available profile names by scanning the profiles directory.
 */
async function listAvailableProfiles(): Promise<string[]> {
  const profilesDir = getProfilesDir();
  try {
    const entries = await readdir(profilesDir);
    return entries
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => f.replace(/\.yaml$/, ''));
  } catch {
    return [];
  }
}

/**
 * Validate a profile name and load its YAML content.
 * Throws if the profile name is invalid or the file is not found.
 */
async function loadProfile(profile: string): Promise<string> {
  // Strict name validation: lowercase letters, numbers, hyphens only
  if (!/^[a-z0-9-]+$/.test(profile)) {
    const available = await listAvailableProfiles();
    process.stderr.write(`[mcpwall] Invalid profile name "${profile}". Names must be lowercase letters, numbers, and hyphens only.\n`);
    if (available.length > 0) {
      process.stderr.write(`  Available profiles: ${available.join(', ')}\n`);
    }
    process.exit(1);
  }

  const profilesDir = getProfilesDir();
  const profilePath = join(profilesDir, `${profile}.yaml`);

  // Belt-and-suspenders: verify resolved path stays inside profiles dir
  const resolvedProfiles = resolve(profilesDir);
  const resolvedProfile = resolve(profilePath);
  if (!resolvedProfile.startsWith(resolvedProfiles + '/') && resolvedProfile !== resolvedProfiles) {
    process.stderr.write(`[mcpwall] Invalid profile name "${profile}".\n`);
    process.exit(1);
  }

  try {
    return await readFile(profilePath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      const available = await listAvailableProfiles();
      const profileList = available.length > 0 ? available.join(', ') : '(none found)';
      process.stderr.write(`[mcpwall] Unknown profile "${profile}". Available profiles: ${profileList}\n`);
      process.exit(1);
    }
    throw err;
  }
}

export async function runInit(profile?: string): Promise<void> {
  // Validate profile name eagerly before any interactive prompts
  if (profile) {
    if (!/^[a-z0-9-]+$/.test(profile)) {
      const available = await listAvailableProfiles();
      process.stderr.write(`[mcpwall] Invalid profile name "${profile}". Names must be lowercase letters, numbers, and hyphens only.\n`);
      if (available.length > 0) {
        process.stderr.write(`  Available profiles: ${available.join(', ')}\n`);
      }
      process.exit(1);
    }
    // Check the profile file actually exists before running the wizard
    const available = await listAvailableProfiles();
    if (!available.includes(profile)) {
      const profileList = available.length > 0 ? available.join(', ') : '(none found)';
      process.stderr.write(`[mcpwall] Unknown profile "${profile}". Available profiles: ${profileList}\n`);
      process.exit(1);
    }
  }

  process.stderr.write('\n🔒 mcpwall setup wizard\n\n');

  const rl = createInterface({
    input: process.stdin,
    output: process.stderr
  });

  try {
    const configPaths = [
      { path: join(homedir(), '.claude.json'), name: 'Claude Code global config' },
      { path: join(process.cwd(), '.mcp.json'), name: 'Claude Code project config' },
      { path: join(homedir(), '.cursor', 'mcp.json'), name: 'Cursor global config' },
      { path: join(process.cwd(), '.cursor', 'mcp.json'), name: 'Cursor project config' },
      { path: join(homedir(), '.config', 'windsurf', 'mcp.json'), name: 'Windsurf config' },
      { path: join(homedir(), '.vscode', 'mcp.json'), name: 'VS Code global config' },
      { path: join(process.cwd(), '.vscode', 'mcp.json'), name: 'VS Code project config' },
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
      for (const { path, name } of configPaths) {
        process.stderr.write(`  - ${path} (${name})\n`);
      }
      process.stderr.write('\n');
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

    if (!existsSync(firewallConfigDir)) {
      await mkdir(firewallConfigDir, { recursive: true });
    }

    if (profile) {
      // Load named profile
      const profileContent = await loadProfile(profile);

      if (existsSync(firewallConfigPath)) {
        const overwrite = await rl.question(
          `\n  Config already exists: ${firewallConfigPath}\n  Overwrite with "${profile}" profile? (y/n): `
        );
        if (overwrite.trim().toLowerCase() !== 'y') {
          process.stderr.write('  Keeping existing config.\n');
        } else {
          await writeFile(firewallConfigPath, profileContent, 'utf-8');
          process.stderr.write(`\n  ✓ Applied "${profile}" profile to ${firewallConfigPath}\n`);
          process.stderr.write(`  Edit ${firewallConfigPath} to customize.\n`);
        }
      } else {
        process.stderr.write(`\nCreating firewall configuration from "${profile}" profile...\n`);
        await writeFile(firewallConfigPath, profileContent, 'utf-8');
        process.stderr.write(`  ✓ Created ${firewallConfigPath} using "${profile}" profile\n`);
        process.stderr.write(`  Edit ${firewallConfigPath} to customize.\n`);
      }
    } else if (!existsSync(firewallConfigPath)) {
      process.stderr.write('\nCreating default firewall configuration...\n');
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
