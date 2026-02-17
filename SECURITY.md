# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in mcpwall, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email: **info@behrens-ai.de**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You will receive a response within 48 hours. We will work with you to understand the issue and coordinate disclosure.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Scope

The following are in scope for security reports:

- Policy engine bypasses (rules that should match but don't)
- Secret scanner evasion
- Path traversal bypasses in `not_under` matcher
- Proxy crashes that could cause message loss or silent passthrough
- ReDoS in user-provided regex patterns
- Any way to exfiltrate data through or around the proxy

## Out of Scope

- Vulnerabilities in upstream MCP servers (report to the server maintainer)
- Vulnerabilities in Claude Code, Cursor, or other MCP clients
- Social engineering attacks
- Denial of service through legitimate but excessive tool calls (rate limiting is a planned feature)
