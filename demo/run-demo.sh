#!/bin/bash
# mcpwall v0.2.0 demo — shows bidirectional scanning
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER="$DIR/echo-server.mjs"
CONFIG="$DIR/demo-rules.yml"

G='\033[32m'  # green
R='\033[31m'  # red
C='\033[36m'  # cyan
Y='\033[33m'  # yellow
D='\033[2m'   # dim
B='\033[1m'   # bold
N='\033[0m'   # reset

send() {
  printf '%s\n' "$1" | mcpwall --config "$CONFIG" -- node "$SERVER" 2>&1 \
    | grep -v '^{' \
    | grep -v 'ALLOW.*outbound' \
    | sed 's/^\[[0-9:]*\] /  /' \
    | sed 's/ - Blocked: /  /' \
    | sed 's/ - Secret detected in server response and redacted/  secret redacted/' \
    | sed 's/ - Prompt injection pattern detected in response/  injection blocked/' \
    | sed 's/detected secret\/API key in tool arguments/secret\/API key detected/' \
    | sed 's/outbound response/response/'
}

echo ""
echo -e "  ${B}${C}mcpwall${N} v0.2.0 ${D}— iptables for MCP${N}"
echo -e "  ${D}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
echo ""
sleep 0.8

# === INBOUND SCANNING ===
echo -e "  ${D}INBOUND — scanning tool call arguments${N}"
echo ""
sleep 0.5

# 1. Safe read (ALLOW)
echo -e "  ${D}▸ tools/call → read_file${N}"
echo -e "    ${D}path: \"/home/user/project/src/index.ts\"${N}"
send '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"read_file","arguments":{"path":"/home/user/project/src/index.ts"}}}'
echo ""
sleep 1.5

# 2. SSH key theft (DENY — inbound rule)
echo -e "  ${D}▸ tools/call → read_file${N}"
echo -e "    ${D}path: \"/home/user/.ssh/id_rsa\"${N}"
send '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"read_file","arguments":{"path":"/home/user/.ssh/id_rsa"}}}'
echo ""
sleep 1.5

# === OUTBOUND SCANNING ===
echo -e "  ${D}OUTBOUND — scanning server responses${N}"
echo ""
sleep 0.5

# 3. Tool returns leaked secret (REDACT — outbound rule)
echo -e "  ${D}▸ tools/call → get_config${N}"
echo -e "    ${D}(server response contains AWS key)${N}"
send '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_config","arguments":{"key":"database"}}}'
echo ""
sleep 1.5

# 4. Tool returns prompt injection (DENY — outbound rule)
echo -e "  ${D}▸ tools/call → fetch_docs${N}"
echo -e "    ${D}(server response contains injection)${N}"
send '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"fetch_docs","arguments":{"url":"https://docs.example.com"}}}'
echo ""
sleep 1.5

# Summary
echo -e "  ${D}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
echo -e "  ${G}1 allowed${N}  ${R}2 blocked${N}  ${C}1 redacted${N}  ${D}0 config needed${N}"
echo ""
echo -e "  ${C}npm install -g mcpwall${N}"
echo -e "  ${D}github.com/behrensd/mcp-firewall${N}"
echo ""
