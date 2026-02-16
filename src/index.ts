/**
 * CLI entry point for mcpwall
 * Handles command parsing and launches proxy or setup wizard
 */

import { program } from 'commander';
import { loadConfig } from './config/loader.js';
import { PolicyEngine } from './engine/policy.js';
import { Logger } from './logger.js';
import { createProxy } from './proxy.js';
import { runInit } from './cli/init.js';
import { runWrap } from './cli/wrap.js';

// Parse command line arguments, special handling for -- separator
const dashDashIndex = process.argv.indexOf('--');

if (dashDashIndex !== -1) {
  // Found --, split into options and proxied command
  const optionsArgs = process.argv.slice(0, dashDashIndex);
  const commandParts = process.argv.slice(dashDashIndex + 1);

  program
    .name('mcpwall')
    .description('Deterministic security proxy for MCP tool calls')
    .version('0.1.0')
    .option('-c, --config <path>', 'Path to config file')
    .option('--log-level <level>', 'Log level', 'info')
    .parse(optionsArgs);

  const options = program.opts();

  // Launch proxy mode
  (async () => {
    try {
      if (commandParts.length === 0) {
        process.stderr.write('[mcpwall] Error: No command provided after --\n');
        process.stderr.write('Usage: mcpwall [options] -- <command> [args...]\n');
        process.exit(1);
      }

      const [command, ...args] = commandParts;

      // Load configuration
      const config = await loadConfig(options.config);

      // Override log level if provided
      if (options.logLevel) {
        config.settings.log_level = options.logLevel as 'debug' | 'info' | 'warn' | 'error';
      }

      // Create policy engine and logger
      const policyEngine = new PolicyEngine(config);
      const logger = new Logger({
        logDir: config.settings.log_dir,
        logLevel: config.settings.log_level
      });

      // Start the proxy
      createProxy({
        command,
        args,
        policyEngine,
        logger,
        logArgs: config.settings.log_args
      });
    } catch (error: any) {
      process.stderr.write(`[mcpwall] Error: ${error.message}\n`);
      process.exit(1);
    }
  })();
} else {
  // No -- separator, parse subcommands normally
  program
    .name('mcpwall')
    .description('Deterministic security proxy for MCP tool calls')
    .version('0.1.0');

  program
    .command('init')
    .description('Interactive setup wizard to wrap existing MCP servers')
    .action(async () => {
      try {
        await runInit();
      } catch (error: any) {
        process.stderr.write(`[mcpwall] Error: ${error.message}\n`);
        process.exit(1);
      }
    });

  program
    .command('wrap <server-name>')
    .description('Wrap a specific MCP server with mcpwall')
    .action(async (serverName: string) => {
      try {
        await runWrap(serverName);
      } catch (error: any) {
        process.stderr.write(`[mcpwall] Error: ${error.message}\n`);
        process.exit(1);
      }
    });

  program
    .option('-c, --config <path>', 'Path to config file')
    .option('--log-level <level>', 'Log level', 'info')
    .argument('[command...]', 'MCP server command to proxy (use -- before command)')
    .action(() => {
      // If user tried to pass command without --, show help
      program.help();
    });

  program.parse();
}
