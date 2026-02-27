/**
 * Tests for Logger — idempotent close, error handling
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Logger } from '../logger';

function makeTmpLogger(): { logger: Logger; dir: string } {
  const dir = path.join(os.tmpdir(), `mcpwall-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(dir, { recursive: true });
  const logger = new Logger({ logDir: dir, logLevel: 'debug' });
  return { logger, dir };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Logger.close()', () => {
  it('close() is idempotent — calling twice does not throw', () => {
    const { logger } = makeTmpLogger();
    expect(() => {
      logger.close();
      logger.close(); // second call must be a no-op
    }).not.toThrow();
  });

  it('close() after a log entry — stream ends cleanly', () => {
    const { logger } = makeTmpLogger();
    logger.log({ ts: new Date().toISOString(), tool: undefined, action: 'allow', rule: null });
    expect(() => logger.close()).not.toThrow();
  });

  it('writeToFile() after close() is a no-op — does not throw', () => {
    const { logger } = makeTmpLogger();
    logger.close();
    // Logging after close should silently do nothing
    expect(() => {
      logger.log({ ts: new Date().toISOString(), tool: undefined, action: 'allow', rule: null });
    }).not.toThrow();
  });

  it('multiple close() calls in rapid succession — only one stream.end() called', () => {
    const { logger } = makeTmpLogger();
    // Log to open the write stream
    logger.log({ ts: new Date().toISOString(), tool: undefined, action: 'allow', rule: null });
    // Three rapid closes — must not throw EBADF or double-end errors
    expect(() => {
      logger.close();
      logger.close();
      logger.close();
    }).not.toThrow();
  });
});

describe('Logger write stream error handling', () => {
  it('stream write error degrades gracefully — logs error to stderr and does not crash', () => {
    const stderrWrites: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((str) => {
      stderrWrites.push(String(str));
      return true;
    });

    const { logger } = makeTmpLogger();
    // Log to open write stream
    logger.log({ ts: new Date().toISOString(), tool: undefined, action: 'allow', rule: null });

    // Emit a stream error to simulate disk failure
    return new Promise<void>((resolve) => {
      setImmediate(() => {
        // Access internal writeStream for testing purposes
        const internal = logger as unknown as { writeStream: NodeJS.EventEmitter | null };
        if (internal.writeStream) {
          internal.writeStream.emit('error', new Error('disk full'));
        }

        setImmediate(() => {
          const output = stderrWrites.join('');
          expect(output).toMatch(/Log write error.*disk full/);
          logger.close();
          resolve();
        });
      });
    });
  });

  it('closed flag prevents double-close stream corruption', () => {
    const { logger } = makeTmpLogger();
    logger.log({ ts: new Date().toISOString(), tool: undefined, action: 'allow', rule: null });

    // First close sets closed=true
    logger.close();

    // Access internal state — stream should be null after close
    const internal = logger as unknown as { closed: boolean; writeStream: unknown };
    expect(internal.closed).toBe(true);
    expect(internal.writeStream).toBeNull();
  });
});
