/**
 * CLI entry point for mcpwall
 * Handles command parsing and launches proxy or setup wizard
 */

import { program } from 'commander';
import { createRequire } from 'node:module';
import { loadConfig } from './config/loader.js';
import { PolicyEngine } from './engine/policy.js';
import { OutboundPolicyEngine } from './engine/outbound-policy.js';
import { Logger } from './logger.js';
import { createProxy } from './proxy.js';
import { runInit } from './cli/init.js';
import { runWrap } from './cli/wrap.js';
import { runCheck } from './cli/check.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

// Parse command line arguments, special handling for -- separator
const dashDashIndex = process.argv.indexOf('--');

if (dashDashIndex !== -1) {
  // Found --, split into options and proxied command
  const optionsArgs = process.argv.slice(0, dashDashIndex);
  const commandParts = process.argv.slice(dashDashIndex + 1);

  program
    .name('mcpwall')
    .description('Deterministic security proxy for MCP tool calls')
    .version(version)
    .option('-c, --config <path>', 'Path to config file')
    .option('--log-level <level>', 'Log level', 'info')
    .parse(optionsArgs);

  const options = program.opts();

  (async () => {
    try {
      if (commandParts.length === 0) {
        process.stderr.write('[mcpwall] Error: No command provided after --\n');
        process.stderr.write('Usage: mcpwall [options] -- <command> [args...]\n');
        process.exit(1);
      }

      const [command, ...args] = commandParts;

      const config = await loadConfig(options.config);

      if (options.logLevel) {
        config.settings.log_level = options.logLevel as 'debug' | 'info' | 'warn' | 'error';
      }

      const policyEngine = new PolicyEngine(config);
      const outboundPolicyEngine = config.outbound_rules?.length
        ? new OutboundPolicyEngine(config)
        : undefined;
      const logger = new Logger({
        logDir: config.settings.log_dir,
        logLevel: config.settings.log_level
      });

      createProxy({
        command,
        args,
        policyEngine,
        logger,
        logArgs: config.settings.log_args,
        outboundPolicyEngine,
        logRedacted: config.settings.log_redacted,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[mcpwall] Error: ${message}\n`);
      process.exit(1);
    }
  })();
} else {
  program
    .name('mcpwall')
    .description('Deterministic security proxy for MCP tool calls')
    .version(version);

  program
    .command('init')
    .description('Interactive setup wizard to wrap existing MCP servers')
    .option('--profile <name>', 'use a named security profile (local-dev, company-laptop, strict)')
    .action(async (options) => {
      try {
        await runInit(options.profile);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[mcpwall] Error: ${message}\n`);
        process.exit(1);
      }
    });

  program
    .command('check')
    .description('dry-run: test a JSON-RPC message against your rules without running the proxy')
    .option('--input <json>', 'JSON-RPC message as a string (reads from stdin if not provided)')
    .action(async (options) => {
      const globalOptions = program.opts();
      try {
        await runCheck(options.input, globalOptions.config);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[mcpwall] Error: ${message}\n`);
        process.exit(1);
      }
    });

  program
    .command('wrap <server-name>')
    .description('Wrap a specific MCP server with mcpwall')
    .action(async (serverName: string) => {
      try {
        await runWrap(serverName);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[mcpwall] Error: ${message}\n`);
        process.exit(1);
      }
    });

  program
    .option('-c, --config <path>', 'Path to config file')
    .option('--log-level <level>', 'Log level', 'info')
    .argument('[command...]', 'MCP server command to proxy (use -- before command)')
    .action(() => {
      program.help();
    });

  program.parse();
}
