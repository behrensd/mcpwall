/**
 * JSON Lines audit logger
 * Writes to both stderr (for human readability) and daily log files
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { LogEntry } from './types.js';

export interface LoggerOptions {
  logDir: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export class Logger {
  private logDir: string;
  private logLevel: number;
  private currentLogFile: string | null = null;
  private writeStream: fs.WriteStream | null = null;
  private closed = false;
  // Only colorize when stderr is an interactive terminal — piping to a file or
  // log aggregator should yield clean, ANSI-free text.
  private useColor: boolean = process.stderr.isTTY === true;

  constructor(options: LoggerOptions) {
    this.logDir = this.expandPath(options.logDir);
    this.logLevel = LOG_LEVELS[options.logLevel] || LOG_LEVELS.info;

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(entry: LogEntry): void {
    const level = this.getLogLevel(entry.action);
    if (LOG_LEVELS[level] < this.logLevel) {
      return;
    }

    // Add default timestamp
    const fullEntry: LogEntry = {
      ...entry,
      ts: entry.ts || new Date().toISOString()
    };

    this.writeToFile(fullEntry);
    this.writeToStderr(fullEntry);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }

  private writeToFile(entry: LogEntry): void {
    if (this.closed) return;
    const logFile = this.getLogFilePath();

    // Open new file if needed (daily rotation)
    if (logFile !== this.currentLogFile) {
      if (this.writeStream) {
        this.writeStream.end();
      }
      this.currentLogFile = logFile;
      this.writeStream = fs.createWriteStream(logFile, { flags: 'a' });
      this.writeStream.on('error', (err) => {
        process.stderr.write(`[mcpwall] Log write error: ${err.message}\n`);
        // Don't crash — degrade gracefully to stderr-only logging
        this.writeStream = null;
      });
    }

    const line = JSON.stringify(entry) + '\n';
    if (this.writeStream) {
      this.writeStream.write(line);
    } else {
      try {
        fs.appendFileSync(logFile, line);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[mcpwall] Log fallback write error: ${message}\n`);
      }
    }
  }

  private writeToStderr(entry: LogEntry): void {
    const timestamp = new Date(entry.ts).toISOString().substring(11, 19); // HH:MM:SS
    const action = this.formatAction(entry.action);
    const direction = entry.direction === 'outbound' ? 'outbound ' : '';
    const method = entry.method || 'unknown';
    const tool = entry.tool ? ` ${entry.tool}` : '';
    const rule = entry.rule ? ` [${entry.rule}]` : '';
    const message = entry.message ? ` - ${entry.message}` : '';

    const logLine = `[${timestamp}] ${action} ${direction}${method}${tool}${rule}${message}\n`;
    process.stderr.write(logLine);
  }

  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `${date}.jsonl`);
  }

  private getLogLevel(action: string): 'debug' | 'info' | 'warn' | 'error' {
    switch (action) {
      case 'deny':
      case 'redact':
        return 'warn';
      case 'allow':
      case 'log_only':
        return 'info';
      default:
        return 'info';
    }
  }

  private formatAction(action: string): string {
    const c = (code: string, label: string) =>
      this.useColor ? `\x1b[${code}m${label}\x1b[0m` : label;
    switch (action) {
      case 'allow':
        return c('32', 'ALLOW');    // green
      case 'deny':
        return c('31', 'DENY');     // red
      case 'redact':
        return c('36', 'REDACT');   // cyan
      case 'log_only':
        return c('34', 'LOG');      // blue
      default:
        return action.toUpperCase();
    }
  }

  private expandPath(p: string): string {
    if (p.startsWith('~/')) {
      return path.join(process.env.HOME || '', p.slice(2));
    }
    return p;
  }
}
