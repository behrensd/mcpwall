import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '../engine/policy';
import { configSchema } from '../config/schema';
import type { Config, JsonRpcMessage } from '../types';

describe('PolicyEngine', () => {
  it('first-match-wins: two rules match, first rule action is used', () => {
    const config: Config = {
      version: 1,
      settings: { log_dir: '/tmp/test-logs', log_level: 'debug', default_action: 'allow' },
      rules: [
        {
          name: 'deny-all-tools',
          match: { method: 'tools/call' },
          action: 'deny',
          message: 'All tools denied'
        },
        {
          name: 'allow-all-tools',
          match: { method: 'tools/call' },
          action: 'allow',
          message: 'All tools allowed'
        }
      ]
    };

    const engine = new PolicyEngine(config);
    const msg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'test_tool', arguments: {} }
    };

    const decision = engine.evaluate(msg);
    expect(decision.action).toBe('deny');
    expect(decision.rule).toBe('deny-all-tools');
    expect(decision.message).toBe('All tools denied');
  });

  it('default action: no rule matches, config default_action applies', () => {
    const config: Config = {
      version: 1,
      settings: { log_dir: '/tmp/test-logs', log_level: 'debug', default_action: 'deny' },
      rules: [
        {
          name: 'allow-specific-tool',
          match: { method: 'tools/call', tool: 'specific_tool' },
          action: 'allow'
        }
      ]
    };

    const engine = new PolicyEngine(config);
    const msg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'other_tool', arguments: {} }
    };

    const decision = engine.evaluate(msg);
    expect(decision.action).toBe('deny');
    expect(decision.rule).toBeNull();
  });

  it('method matching: rule with method: tools/call only matches tools/call messages', () => {
    const config: Config = {
      version: 1,
      settings: { log_dir: '/tmp/test-logs', log_level: 'debug', default_action: 'allow' },
      rules: [
        {
          name: 'deny-tool-calls',
          match: { method: 'tools/call' },
          action: 'deny'
        }
      ]
    };

    const engine = new PolicyEngine(config);

    const toolCallMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'test_tool', arguments: {} }
    };

    const otherMethodMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };

    expect(engine.evaluate(toolCallMsg).action).toBe('deny');
    expect(engine.evaluate(otherMethodMsg).action).toBe('allow');
  });

  it('tool name glob: tool: "*" matches any tool, tool: "read_*" matches read_file', () => {
    const config: Config = {
      version: 1,
      settings: { log_dir: '/tmp/test-logs', log_level: 'debug', default_action: 'allow' },
      rules: [
        {
          name: 'block-read-tools',
          match: { method: 'tools/call', tool: 'read_*' },
          action: 'deny'
        },
        {
          name: 'allow-all-tools',
          match: { method: 'tools/call', tool: '*' },
          action: 'allow'
        }
      ]
    };

    const engine = new PolicyEngine(config);

    const readFileMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'read_file', arguments: {} }
    };

    const writeFileMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'write_file', arguments: {} }
    };

    expect(engine.evaluate(readFileMsg).action).toBe('deny');
    expect(engine.evaluate(readFileMsg).rule).toBe('block-read-tools');
    expect(engine.evaluate(writeFileMsg).action).toBe('allow');
    expect(engine.evaluate(writeFileMsg).rule).toBe('allow-all-tools');
  });

  it('regex matcher: rule regex \\.ssh/ matches path /home/.ssh/id_rsa', () => {
    const config: Config = {
      version: 1,
      settings: { log_dir: '/tmp/test-logs', log_level: 'debug', default_action: 'allow' },
      rules: [
        {
          name: 'block-ssh-access',
          match: {
            method: 'tools/call',
            tool: '*',
            arguments: { path: { regex: '\\.ssh/' } }
          },
          action: 'deny',
          message: 'SSH directory access denied'
        }
      ]
    };

    const engine = new PolicyEngine(config);

    const sshPathMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'read_file',
        arguments: { path: '/home/user/.ssh/id_rsa' }
      }
    };

    const normalPathMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'read_file',
        arguments: { path: '/home/user/document.txt' }
      }
    };

    expect(engine.evaluate(sshPathMsg).action).toBe('deny');
    expect(engine.evaluate(sshPathMsg).message).toBe('SSH directory access denied');
    expect(engine.evaluate(normalPathMsg).action).toBe('allow');
  });

  it('pattern matcher (glob): pattern: "**/.env*" matches /app/.env.local', () => {
    const config: Config = {
      version: 1,
      settings: { log_dir: '/tmp/test-logs', log_level: 'debug', default_action: 'allow' },
      rules: [
        {
          name: 'block-env-files',
          match: {
            method: 'tools/call',
            tool: '*',
            arguments: { path: { pattern: '**/.env*' } }
          },
          action: 'deny',
          message: 'Environment file access denied'
        }
      ]
    };

    const engine = new PolicyEngine(config);

    const envMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'read_file',
        arguments: { path: '/app/.env.local' }
      }
    };

    const normalMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'read_file',
        arguments: { path: '/app/config.json' }
      }
    };

    expect(engine.evaluate(envMsg).action).toBe('deny');
    expect(engine.evaluate(normalMsg).action).toBe('allow');
  });

  it('not_under matcher: path outside ${PROJECT_DIR} triggers, path inside does not', () => {
    const config: Config = {
      version: 1,
      settings: { log_dir: '/tmp/test-logs', log_level: 'debug', default_action: 'allow' },
      rules: [
        {
          name: 'block-outside-project',
          match: {
            method: 'tools/call',
            tool: '*',
            arguments: { path: { not_under: '${PROJECT_DIR}' } }
          },
          action: 'deny',
          message: 'Access outside project directory denied'
        }
      ]
    };

    const engine = new PolicyEngine(config);
    const projectDir = process.cwd();

    const outsideMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'read_file',
        arguments: { path: '/etc/passwd' }
      }
    };

    const insideMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'read_file',
        arguments: { path: `${projectDir}/src/index.ts` }
      }
    };

    expect(engine.evaluate(outsideMsg).action).toBe('deny');
    expect(engine.evaluate(insideMsg).action).toBe('allow');
  });

  it('not_under traversal defense: path with /../ is resolved and correctly detected as outside', () => {
    const config: Config = {
      version: 1,
      settings: { log_dir: '/tmp/test-logs', log_level: 'debug', default_action: 'allow' },
      rules: [
        {
          name: 'block-outside-project',
          match: {
            method: 'tools/call',
            tool: '*',
            arguments: { path: { not_under: '${PROJECT_DIR}' } }
          },
          action: 'deny',
          message: 'Path traversal blocked'
        }
      ]
    };

    const engine = new PolicyEngine(config);
    const projectDir = process.cwd();

    const traversalMsg: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'read_file',
        arguments: { path: `${projectDir}/src/../../etc/passwd` }
      }
    };

    expect(engine.evaluate(traversalMsg).action).toBe('deny');
    expect(engine.evaluate(traversalMsg).message).toBe('Path traversal blocked');
  });

  it('_any_value: regex applied to ALL argument values, matches if any value matches', () => {
    const config: Config = {
      version: 1,
      settings: { log_dir: '/tmp/test-logs', log_level: 'debug', default_action: 'allow' },
      rules: [
        {
          name: 'block-passwd-in-any-arg',
          match: {
            method: 'tools/call',
            tool: '*',
            arguments: { _any_value: { regex: '/etc/passwd' } }
          },
          action: 'deny',
          message: '/etc/passwd detected in arguments'
        }
      ]
    };

    const engine = new PolicyEngine(config);

    const matchInPath: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'read_file',
        arguments: { path: '/etc/passwd' }
      }
    };

    const matchInContent: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'write_file',
        arguments: { path: '/tmp/test.txt', content: 'Reading /etc/passwd is bad' }
      }
    };

    const noMatch: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'read_file',
        arguments: { path: '/home/user/doc.txt' }
      }
    };

    expect(engine.evaluate(matchInPath).action).toBe('deny');
    expect(engine.evaluate(matchInContent).action).toBe('deny');
    expect(engine.evaluate(noMatch).action).toBe('allow');
  });

  it('secrets matcher: tool call with argument containing AKIA1234567890ABCDEF triggers secret scanner', () => {
    const config: Config = {
      version: 1,
      settings: { log_dir: '/tmp/test-logs', log_level: 'debug', default_action: 'allow' },
      rules: [
        {
          name: 'block-secrets',
          match: {
            method: 'tools/call',
            tool: '*',
            arguments: { _any_value: { secrets: true } }
          },
          action: 'deny',
          message: 'Secret detected in arguments'
        }
      ],
      secrets: {
        patterns: [
          {
            name: 'AWS Access Key',
            regex: 'AKIA[0-9A-Z]{16}'
          }
        ]
      }
    };

    const engine = new PolicyEngine(config);

    const withSecret: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'write_file',
        arguments: { path: '/tmp/config', content: 'AWS_KEY=AKIA1234567890ABCDEF' }
      }
    };

    const withoutSecret: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'write_file',
        arguments: { path: '/tmp/config', content: 'SAFE_VALUE=abc123' }
      }
    };

    expect(engine.evaluate(withSecret).action).toBe('deny');
    expect(engine.evaluate(withSecret).message).toBe('Secret detected in arguments');
    expect(engine.evaluate(withoutSecret).action).toBe('allow');
  });

  it('entropy threshold: secret pattern with entropy_threshold only matches high-entropy strings', () => {
    const config: Config = {
      version: 1,
      settings: { log_dir: '/tmp/test-logs', log_level: 'debug', default_action: 'allow' },
      rules: [
        {
          name: 'block-high-entropy-secrets',
          match: {
            method: 'tools/call',
            tool: '*',
            arguments: { _any_value: { secrets: true } }
          },
          action: 'deny',
          message: 'High-entropy secret detected'
        }
      ],
      secrets: {
        patterns: [
          {
            name: 'Generic Secret',
            regex: '[A-Za-z0-9]{20,}',
            entropy_threshold: 3.5
          }
        ]
      }
    };

    const engine = new PolicyEngine(config);

    const lowEntropy: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'write_file',
        arguments: { content: 'aaaaaaaaaaaaaaaaaaaa' } // Low entropy
      }
    };

    const highEntropy: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'write_file',
        arguments: { content: 'A9kX3mZ8pQ2wL5vR7nT1' } // High entropy
      }
    };

    expect(engine.evaluate(lowEntropy).action).toBe('allow');
    expect(engine.evaluate(highEntropy).action).toBe('deny');
  });

  it('response passthrough: messages without method (responses) always get action: allow', () => {
    const config: Config = {
      version: 1,
      settings: { log_dir: '/tmp/test-logs', log_level: 'debug', default_action: 'deny' },
      rules: [
        {
          name: 'deny-all',
          match: { method: 'tools/call' },
          action: 'deny'
        }
      ]
    };

    const engine = new PolicyEngine(config);

    const response: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      result: { success: true }
    };

    const decision = engine.evaluate(response);
    expect(decision.action).toBe('allow');
    expect(decision.rule).toBeNull();
  });

  it('_any_value recursive: regex matches values nested inside objects and arrays', () => {
    const config: Config = {
      version: 1,
      settings: { log_dir: '/tmp/test-logs', log_level: 'debug', default_action: 'allow' },
      rules: [
        {
          name: 'block-ssh-anywhere',
          match: {
            method: 'tools/call',
            tool: '*',
            arguments: { _any_value: { regex: '\\.ssh/' } }
          },
          action: 'deny',
          message: 'SSH access blocked'
        }
      ]
    };

    const engine = new PolicyEngine(config);

    // Nested inside an object
    const nestedObj: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'run_command',
        arguments: { options: { target: { path: '/home/user/.ssh/id_rsa' } } }
      }
    };

    // Nested inside an array
    const nestedArr: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'run_command',
        arguments: { files: ['readme.md', '/home/user/.ssh/authorized_keys'] }
      }
    };

    expect(engine.evaluate(nestedObj).action).toBe('deny');
    expect(engine.evaluate(nestedArr).action).toBe('deny');
  });

  it('missing params: tools/call with no params does not crash, returns no match', () => {
    const config: Config = {
      version: 1,
      settings: { log_dir: '/tmp/test-logs', log_level: 'debug', default_action: 'allow' },
      rules: [
        {
          name: 'check-tool',
          match: { method: 'tools/call', tool: 'some_tool' },
          action: 'deny'
        }
      ]
    };

    const engine = new PolicyEngine(config);

    const noParams: JsonRpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call'
    };

    const decision = engine.evaluate(noParams);
    expect(decision.action).toBe('allow'); // Falls through to default action
    expect(decision.rule).toBeNull();
  });
});

describe('ReDoS protection', () => {
  const baseConfig = {
    version: 1,
    settings: { log_dir: '/tmp', log_level: 'info', default_action: 'allow' },
    rules: [] as any[],
  };

  it('rejects regex with nested quantifiers like (a+)+', () => {
    const config = {
      ...baseConfig,
      rules: [{
        name: 'bad-rule',
        match: { tool: '*', arguments: { _any_value: { regex: '(a+)+' } } },
        action: 'deny',
      }],
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects regex with (.*)+', () => {
    const config = {
      ...baseConfig,
      rules: [{
        name: 'bad-rule',
        match: { tool: '*', arguments: { _any_value: { regex: '(.*)+$' } } },
        action: 'deny',
      }],
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('accepts safe regex patterns', () => {
    const config = {
      ...baseConfig,
      rules: [{
        name: 'safe-rule',
        match: { tool: '*', arguments: { _any_value: { regex: '\\.ssh/|id_rsa' } } },
        action: 'deny',
      }],
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('rejects ReDoS in secret patterns too', () => {
    const config = {
      ...baseConfig,
      secrets: {
        patterns: [{
          name: 'bad-secret',
          regex: '([a-z]+)+@',
        }],
      },
    };
    const result = configSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
