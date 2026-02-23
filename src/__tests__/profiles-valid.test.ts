/**
 * Tests that all profile and server YAML files parse correctly against configSchema
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { configSchema } from '../config/schema';

function getPackageRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  const srcDir = dirname(dirname(thisFile));
  return srcDir.endsWith('dist') ? dirname(srcDir) : dirname(srcDir);
}

async function loadAndValidate(relPath: string): Promise<{ success: boolean; error?: string }> {
  const fullPath = join(getPackageRoot(), relPath);
  try {
    const content = await readFile(fullPath, 'utf-8');
    const parsed = parseYaml(content);
    const result = configSchema.safeParse(parsed);
    if (result.success) {
      return { success: true };
    }
    return { success: false, error: JSON.stringify(result.error.issues, null, 2) };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

describe('all profile YAML files are valid', () => {
  it('rules/profiles/local-dev.yaml passes configSchema', async () => {
    const result = await loadAndValidate('rules/profiles/local-dev.yaml');
    expect(result.success, result.error).toBe(true);
  });

  it('rules/profiles/company-laptop.yaml passes configSchema', async () => {
    const result = await loadAndValidate('rules/profiles/company-laptop.yaml');
    expect(result.success, result.error).toBe(true);
  });

  it('rules/profiles/strict.yaml passes configSchema', async () => {
    const result = await loadAndValidate('rules/profiles/strict.yaml');
    expect(result.success, result.error).toBe(true);
  });
});

describe('all server recipe YAML files are valid', () => {
  it('rules/servers/filesystem-mcp.yaml passes configSchema', async () => {
    const result = await loadAndValidate('rules/servers/filesystem-mcp.yaml');
    expect(result.success, result.error).toBe(true);
  });

  it('rules/servers/github-mcp.yaml passes configSchema', async () => {
    const result = await loadAndValidate('rules/servers/github-mcp.yaml');
    expect(result.success, result.error).toBe(true);
  });

  it('rules/servers/shell-mcp.yaml passes configSchema', async () => {
    const result = await loadAndValidate('rules/servers/shell-mcp.yaml');
    expect(result.success, result.error).toBe(true);
  });
});
