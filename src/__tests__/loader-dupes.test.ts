/**
 * Tests for warnDuplicateNames — surfaces global/project rule name shadowing
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { warnDuplicateNames } from '../config/loader';

function captureStderr(fn: () => void): string {
  const writes: string[] = [];
  vi.spyOn(process.stderr, 'write').mockImplementation((str) => {
    writes.push(String(str));
    return true;
  });
  fn();
  return writes.join('');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('warnDuplicateNames', () => {
  it('warns when a name appears in both global and project', () => {
    const out = captureStderr(() =>
      warnDuplicateNames('rule', [{ name: 'block-ssh' }], [{ name: 'block-ssh' }])
    );
    expect(out).toMatch(/duplicate rule name "block-ssh"/);
    expect(out).toMatch(/project rule wins/);
  });

  it('does not warn when names are disjoint', () => {
    const out = captureStderr(() =>
      warnDuplicateNames('rule', [{ name: 'a' }], [{ name: 'b' }])
    );
    expect(out).toBe('');
  });

  it('warns once per duplicated name', () => {
    const out = captureStderr(() =>
      warnDuplicateNames(
        'rule',
        [{ name: 'x' }, { name: 'y' }, { name: 'z' }],
        [{ name: 'x' }, { name: 'z' }]
      )
    );
    expect((out.match(/duplicate rule name/g) || []).length).toBe(2);
  });

  it('handles undefined lists (missing outbound_rules / patterns)', () => {
    const out = captureStderr(() => warnDuplicateNames('outbound rule', undefined, undefined));
    expect(out).toBe('');
  });

  it('uses the supplied kind label', () => {
    const out = captureStderr(() =>
      warnDuplicateNames('secret pattern', [{ name: 'aws' }], [{ name: 'aws' }])
    );
    expect(out).toMatch(/duplicate secret pattern name "aws"/);
  });
});
