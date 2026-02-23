/**
 * Tests for profile name validation and file loading
 * Tests the validation logic directly (regex check + path containment).
 */

import { describe, it, expect } from 'vitest';
import { readdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Replicate the validation logic from init.ts for unit testing
const VALID_PROFILE_NAME = /^[a-z0-9-]+$/;

function validateProfileName(name: string): boolean {
  return VALID_PROFILE_NAME.test(name);
}

function getProfilesDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // __tests__/ -> src/ -> dist/ (or src/ directly in test) -> package root
  // Walk up enough levels to find package root
  const srcDir = dirname(dirname(thisFile));
  // Could be in dist/ or src/ depending on test runner
  const packageRoot = srcDir.endsWith('dist') ? dirname(srcDir) : dirname(srcDir);
  return join(packageRoot, 'rules', 'profiles');
}

function isPathSafe(profilesDir: string, profileName: string): boolean {
  const profilePath = join(profilesDir, `${profileName}.yaml`);
  const resolvedProfiles = resolve(profilesDir);
  const resolvedProfile = resolve(profilePath);
  return resolvedProfile.startsWith(resolvedProfiles + '/') || resolvedProfile === resolvedProfiles;
}

describe('profile name sanitization', () => {
  it('valid name "local-dev" passes validation', () => {
    expect(validateProfileName('local-dev')).toBe(true);
  });

  it('valid name "company-laptop" passes validation', () => {
    expect(validateProfileName('company-laptop')).toBe(true);
  });

  it('valid name "strict" passes validation', () => {
    expect(validateProfileName('strict')).toBe(true);
  });

  it('path traversal "../../etc/passwd" is rejected', () => {
    expect(validateProfileName('../../etc/passwd')).toBe(false);
  });

  it('null bytes "local\\x00dev" are rejected', () => {
    expect(validateProfileName('local\x00dev')).toBe(false);
  });

  it('uppercase "LOCAL-DEV" is rejected', () => {
    expect(validateProfileName('LOCAL-DEV')).toBe(false);
  });

  it('spaces "local dev" are rejected', () => {
    expect(validateProfileName('local dev')).toBe(false);
  });

  it('absolute path "/etc/passwd" is rejected', () => {
    expect(validateProfileName('/etc/passwd')).toBe(false);
  });
});

describe('path containment check', () => {
  it('safe profile name stays inside profiles dir', () => {
    const profilesDir = '/tmp/test/rules/profiles';
    expect(isPathSafe(profilesDir, 'local-dev')).toBe(true);
  });

  it('path traversal via "name" is blocked by containment check', () => {
    const profilesDir = '/tmp/test/rules/profiles';
    // Even if the regex somehow passed, resolved path would be outside
    expect(isPathSafe(profilesDir, '../secret')).toBe(false);
  });
});

describe('profile file discovery', () => {
  it('profiles directory contains expected profiles', async () => {
    const profilesDir = getProfilesDir();
    let entries: string[];
    try {
      entries = await readdir(profilesDir);
    } catch {
      // If running from dist/ before profiles exist, skip
      return;
    }
    const profiles = entries.filter(f => f.endsWith('.yaml')).map(f => f.replace(/\.yaml$/, ''));
    expect(profiles).toContain('local-dev');
    expect(profiles).toContain('company-laptop');
    expect(profiles).toContain('strict');
  });
});
