/**
 * Configuration file discovery and loading
 * Handles global and project-level config files with merging
 */

import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import type { Config } from '../types.js';
import { parseConfig } from './schema.js';
import { DEFAULT_CONFIG } from './defaults.js';

export function resolveConfigPaths(): { global: string; project: string } {
  const home = homedir();
  const cwd = process.cwd();

  return {
    global: join(home, '.mcpwall', 'config.yml'),
    project: join(cwd, '.mcpwall.yml')
  };
}

async function loadConfigFile(path: string): Promise<Config | null> {
  try {
    const contents = await readFile(path, 'utf-8');
    const raw = parseYaml(contents);
    const config = parseConfig(raw);
    return config;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw new Error(`Failed to load config from ${path}: ${error.message}`);
  }
}

function substituteVariables(value: string): string {
  return value
    .replace(/\$\{HOME\}/g, homedir())
    .replace(/\$\{PROJECT_DIR\}/g, process.cwd())
    .replace(/^~\//, join(homedir(), '/'));
}

function substituteInObject(obj: any): any {
  if (typeof obj === 'string') {
    return substituteVariables(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(substituteInObject);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteInObject(value);
    }
    return result;
  }
  return obj;
}

/**
 * Merge two configs: project settings override global, rules concatenate
 */
function mergeConfigs(global: Config, project: Config): Config {
  return {
    version: project.version,
    settings: {
      ...global.settings,
      ...project.settings
    },
    // Project rules first (higher priority), then global rules
    rules: [...project.rules, ...global.rules],
    secrets: {
      patterns: [
        ...(project.secrets?.patterns || []),
        ...(global.secrets?.patterns || [])
      ]
    },
  };
}

/**
 * Load built-in default rules from the rules/ directory shipped with the package
 * Falls back to DEFAULT_CONFIG if the file can't be found
 */
async function loadBuiltinDefaultRules(): Promise<Config> {
  try {
    // import.meta.url points to the current JS file
    // In bundled dist: file:///path/to/mcpwall/dist/index.js
    // Rules are at: /path/to/mcpwall/rules/default.yml
    const thisFile = fileURLToPath(import.meta.url);
    const packageRoot = dirname(dirname(thisFile)); // go up from dist/
    const defaultRulesPath = join(packageRoot, 'rules', 'default.yml');

    const config = await loadConfigFile(defaultRulesPath);
    if (config) {
      return config;
    }
  } catch {
    // Fall through to DEFAULT_CONFIG
  }

  return DEFAULT_CONFIG;
}

/**
 * Load configuration from files or use defaults
 * If configPath is provided, load only that file
 * Otherwise, look for global and project configs and merge them
 */
export async function loadConfig(configPath?: string): Promise<Config> {
  if (configPath) {
    const resolved = resolve(configPath);
    const config = await loadConfigFile(resolved);
    if (!config) {
      throw new Error(`Config file not found: ${resolved}`);
    }
    const substituted = substituteInObject(config);
    return substituted;
  }

  const paths = resolveConfigPaths();
  const [globalConfig, projectConfig] = await Promise.all([
    loadConfigFile(paths.global),
    loadConfigFile(paths.project)
  ]);

  let config: Config;

  if (projectConfig && globalConfig) {
    config = mergeConfigs(globalConfig, projectConfig);
  } else if (projectConfig) {
    config = projectConfig;
  } else if (globalConfig) {
    config = globalConfig;
  } else {
    config = await loadBuiltinDefaultRules();
  }

  const substituted = substituteInObject(config);
  return substituted;
}
