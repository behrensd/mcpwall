import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FadeUp from "@/components/FadeUp";
import SectionLine from "@/components/SectionLine";
import StatusBadge from "@/components/StatusBadge";
import ProgressBar from "@/components/ProgressBar";
import StickyToc from "./StickyToc";

export const metadata: Metadata = {
  title: "Threat Model",
  description:
    "What mcpwall protects against, what it doesn\u2019t, and the assumptions it makes. A transparent security analysis of mcpwall v0.2.0.",
  openGraph: {
    title: "mcpwall Threat Model",
    description:
      "What mcpwall protects against, what it doesn\u2019t, and the assumptions it makes. Full transparency.",
    type: "article",
    url: "https://mcpwall.dev/threat-model",
    siteName: "mcpwall",
    images: [
      {
        url: "https://mcpwall.dev/og/blog-02-threat-model.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "mcpwall Threat Model",
    description:
      "What mcpwall protects against, what it doesn\u2019t, and the assumptions it makes.",
    images: ["https://mcpwall.dev/og/blog-02-threat-model.png"],
  },
  alternates: {
    canonical: "https://mcpwall.dev/threat-model",
  },
};

const tocItems = [
  { id: "scope", label: "Scope" },
  { id: "trust-boundaries", label: "Trust Boundaries" },
  { id: "covered", label: "What\u2019s Covered" },
  { id: "not-covered", label: "What\u2019s Not Covered" },
  { id: "default-rules", label: "Default Rules" },
  { id: "assumptions", label: "Assumptions" },
  { id: "components", label: "Component Analysis" },
  { id: "defense-in-depth", label: "Defense in Depth" },
  { id: "roadmap", label: "Planned Mitigations" },
  { id: "reporting", label: "Security Reporting" },
];

export default function ThreatModelPage() {
  return (
    <>
      <ProgressBar />
      <Nav
        variant="sub-page"
        breadcrumb="threat-model"
        links={[
          { href: "/", label: "Home" },
          { href: "/blog", label: "Blog" },
        ]}
      />

      <main className="relative z-10 pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="doc-layout">
            <div>
              {/* ========== HEADER ========== */}
              <header className="mb-20">
                <div className="hero-glow-brand" />
                <div className="flex items-center gap-3 mb-6">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 font-mono text-[11px] text-brand-400 tracking-wide">
                    SECURITY REFERENCE
                  </span>
                  <span className="font-mono text-[11px] text-zinc-600 tracking-wide">
                    v0.2.0 / 2026-02-20
                  </span>
                </div>

                <h1 className="font-display font-normal text-4xl sm:text-5xl md:text-6xl leading-[1.1] tracking-tight mb-6">
                  Threat Model
                </h1>

                <p className="prose-body max-w-2xl text-lg">
                  What mcpwall protects against, what it doesn&rsquo;t, and the
                  assumptions it makes. This document is intentionally
                  transparent. Security tools that hide
                  their limitations aren&rsquo;t security tools.
                </p>
              </header>

              <SectionLine />
              <div className="mb-16" />

              {/* ========== SCOPE ========== */}
              <section id="scope" className="mb-20">
                <div className="font-mono text-[11px] text-brand-500/60 tracking-widest uppercase mb-4">
                  01 / Scope
                </div>
                <h2 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-zinc-100 mb-6">
                  What mcpwall is
                </h2>

                <div className="prose-body space-y-4 max-w-2xl mb-8">
                  <p>
                    mcpwall is a{" "}
                    <strong>rule-based request firewall</strong> for MCP tool
                    calls. It sits as a transparent stdio proxy between your AI
                    coding tool (Claude Code, Cursor, etc.) and the MCP server.
                    Every JSON-RPC message from the client passes through the
                    policy engine before reaching the server.
                  </p>
                  <p>
                    Rules are YAML, evaluated top-to-bottom, first match wins.
                    Actions are <code>allow</code>, <code>deny</code>, or{" "}
                    <code>ask</code>. No AI, no cloud, no network calls.
                    Deterministic: same input + same rules = same output.
                  </p>
                </div>

                <div className="arch-diagram mb-8">
                  <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-4">
                    Data flow
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="arch-node bg-zinc-800 text-zinc-300">
                      Claude Code
                    </span>
                    <span className="text-zinc-600 mx-2">&rarr; stdin &rarr;</span>
                    <span
                      className="arch-node text-brand-300"
                      style={{
                        background: "rgba(6,182,212,0.12)",
                        border: "1px solid rgba(6,182,212,0.2)",
                      }}
                    >
                      mcpwall
                    </span>
                    <span className="text-zinc-600 mx-2">&rarr; stdin &rarr;</span>
                    <span className="arch-node bg-zinc-800 text-zinc-300">
                      MCP Server
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="arch-node bg-zinc-800 text-zinc-300">
                      Claude Code
                    </span>
                    <span className="text-zinc-600 mx-2">&larr; stdout &larr;</span>
                    <span
                      className="arch-node text-zinc-400"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      mcpwall{" "}
                      <span className="text-zinc-600">(log only)</span>
                    </span>
                    <span className="text-zinc-600 mx-2">&larr; stdout &larr;</span>
                    <span className="arch-node bg-zinc-800 text-zinc-300">
                      MCP Server
                    </span>
                  </div>
                  <div className="mt-4 text-zinc-600 text-[11px]">
                    Inbound: every request inspected &amp; filtered &nbsp;|&nbsp;
                    Outbound: responses inspected, secrets redacted, injection blocked (v0.2.0)
                  </div>
                </div>

                <div className="prose-body max-w-2xl">
                  <p>
                    <strong>Bidirectional scanning:</strong> mcpwall inspects
                    both <strong>requests</strong> (client &rarr; server) and{" "}
                    <strong>responses</strong> (server &rarr; client). Outbound
                    rules can redact leaked secrets, block prompt injection
                    patterns, and flag suspicious content.
                  </p>
                </div>
              </section>

              <SectionLine />
              <div className="mb-16" />

              {/* ========== TRUST BOUNDARIES ========== */}
              <section id="trust-boundaries" className="mb-20">
                <div className="font-mono text-[11px] text-brand-500/60 tracking-widest uppercase mb-4">
                  02 / Trust Boundaries
                </div>
                <h2 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-zinc-100 mb-6">
                  What mcpwall inspects
                </h2>

                <div className="table-scroll">
                  <table className="tm-table">
                    <thead>
                      <tr>
                        <th>Boundary</th>
                        <th>Inspected?</th>
                        <th>Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="name-col">Client &rarr; Server (stdin)</td>
                        <td><StatusBadge status="covered">Inspected</StatusBadge></td>
                        <td>Every JSON-RPC message evaluated against policy rules</td>
                      </tr>
                      <tr>
                        <td className="name-col">Server &rarr; Client (stdout)</td>
                        <td><StatusBadge status="covered">Inspected</StatusBadge></td>
                        <td>Responses evaluated against outbound rules. Secrets redacted, injection blocked. (v0.2.0)</td>
                      </tr>
                      <tr>
                        <td className="name-col">Server stderr</td>
                        <td><StatusBadge status="not-covered">Not inspected</StatusBadge></td>
                        <td>Inherited by child process; passes through to parent stderr</td>
                      </tr>
                      <tr>
                        <td className="name-col">Environment variables</td>
                        <td><StatusBadge status="not-covered">Not inspected</StatusBadge></td>
                        <td>Inherited from parent process; spawned server receives full env</td>
                      </tr>
                      <tr>
                        <td className="name-col">Server side effects</td>
                        <td><StatusBadge status="not-covered">Not inspected</StatusBadge></td>
                        <td>File I/O, network calls, and other actions by the server process itself</td>
                      </tr>
                      <tr>
                        <td className="name-col">Config files</td>
                        <td><StatusBadge status="partial">At load time</StatusBadge></td>
                        <td>Validated with Zod at startup; not re-verified during execution</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <SectionLine />
              <div className="mb-16" />

              {/* ========== COVERED ========== */}
              <section id="covered" className="mb-20">
                <div className="font-mono text-[11px] text-brand-500/60 tracking-widest uppercase mb-4">
                  03 / What mcpwall covers
                </div>
                <h2 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-zinc-100 mb-6">
                  Attack classes mitigated
                </h2>
                <p className="prose-body max-w-2xl mb-8">
                  The 8 default deny rules and supporting engine features cover
                  these attack classes out of the box. Custom rules can extend
                  coverage further.
                </p>

                <div className="table-scroll">
                  <table className="tm-table">
                    <thead>
                      <tr>
                        <th>Attack class</th>
                        <th>Status</th>
                        <th>Default rule</th>
                        <th className="hide-mobile">Mechanism</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: "SSH key theft", status: "covered" as const, rule: "block-ssh-keys", mechanism: "Regex on all argument values: \\.ssh/, id_rsa, id_ed25519, id_ecdsa" },
                        { name: ".env file access", status: "covered" as const, rule: "block-env-files", mechanism: "Regex: /\\.env($|\\.)" },
                        { name: "Credential file access", status: "covered" as const, rule: "block-credentials", mechanism: "Regex: AWS credentials, .npmrc, Docker config, kube config, .gnupg" },
                        { name: "Browser data theft", status: "covered" as const, rule: "block-browser-data", mechanism: "Regex: Chrome/Firefox/Safari profile paths, Cookies, Login Data" },
                        { name: "Destructive commands", status: "covered" as const, rule: "block-destructive-commands", mechanism: "Regex: rm -rf, mkfs, dd if=, format C:" },
                        { name: "Pipe-to-shell (curl|bash)", status: "covered" as const, rule: "block-pipe-to-shell", mechanism: "Regex: curl/wget/fetch piped to bash/sh/zsh/python/node" },
                        { name: "Reverse shells", status: "covered" as const, rule: "block-reverse-shells", mechanism: "Regex: netcat, /dev/tcp/, bash -i, mkfifo, socat" },
                        { name: "Secret/API key leakage", status: "covered" as const, rule: "block-secret-leakage", mechanism: "10 secret patterns (AWS, GitHub, OpenAI, Stripe, etc.) + Shannon entropy threshold" },
                        { name: "JSON-RPC batch bypass", status: "mitigated" as const, rule: "n/a", mechanism: "Each message in a batch is individually evaluated (C1 fix, v0.1.1)" },
                        { name: "ReDoS in config", status: "mitigated" as const, rule: "\u2014", mechanism: "Heuristic detection of nested quantifiers at config load time" },
                        { name: "Symlink path traversal", status: "mitigated" as const, rule: "\u2014", mechanism: "realpathSync resolves symlinks for not_under matcher (existing paths only)" },
                        { name: "Process crash on bad input", status: "mitigated" as const, rule: "\u2014", mechanism: "try-catch in proxy hot path; fails open (forwards raw line, stays alive)" },
                      ].map((row) => (
                        <tr key={row.name}>
                          <td className="name-col">{row.name}</td>
                          <td>
                            <StatusBadge status={row.status}>
                              {row.status === "covered" ? "Covered" : row.status === "mitigated" ? "Mitigated" : "Fixed"}
                            </StatusBadge>
                          </td>
                          <td><code>{row.rule}</code></td>
                          <td className="hide-mobile">{row.mechanism}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <SectionLine />
              <div className="mb-16" />

              {/* ========== NOT COVERED ========== */}
              <section id="not-covered" className="mb-20">
                <div className="font-mono text-[11px] text-danger-400/60 tracking-widest uppercase mb-4">
                  04 / What mcpwall does NOT cover
                </div>
                <h2 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-zinc-100 mb-6">
                  Known limitations
                </h2>
                <p className="prose-body max-w-2xl mb-8">
                  These are attack classes that mcpwall does{" "}
                  <strong>not</strong> yet mitigate. Some are planned for future
                  versions; others are out of scope by design.
                </p>

                <div className="table-scroll">
                  <table className="tm-table">
                    <thead>
                      <tr>
                        <th>Attack class</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th className="hide-mobile">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: "Response-side attacks", sev: "HIGH", sevClass: "sev-high", status: "covered" as const, statusLabel: "Covered", detail: "Server responses scanned for secrets (redacted) and prompt injection patterns (blocked). Zero-width characters and large responses flagged. Added in v0.2.0." },
                        { name: "Base64/URL encoding bypass", sev: "HIGH", sevClass: "sev-high", status: "not-covered" as const, statusLabel: "Not covered", detail: "Secret patterns and command regexes only match literal strings. Base64-encoded secrets or URL-encoded commands bypass rules." },
                        { name: "Rate limiting / DoS", sev: "HIGH", sevClass: "sev-high", status: "not-covered" as const, statusLabel: "Not covered", detail: "No throttling on tool call volume. A runaway agent can make unlimited calls. Planned for v0.4.0." },
                        { name: "Tool description poisoning", sev: "MEDIUM", sevClass: "sev-medium", status: "not-covered" as const, statusLabel: "Not covered", detail: "mcpwall does not inspect or validate tool metadata from tools/list responses. Rug pull detection planned for v0.3.0." },
                        { name: "Prompt injection", sev: "MEDIUM", sevClass: "sev-medium", status: "not-covered" as const, statusLabel: "Not covered", detail: "Semantic attacks that manipulate the LLM into making dangerous tool calls. mcpwall sees the resulting call, not the manipulation \u2014 it may still catch the dangerous arguments." },
                        { name: "Unicode/homograph tricks", sev: "MEDIUM", sevClass: "sev-medium", status: "not-covered" as const, statusLabel: "Not covered", detail: "Zero-width characters, combining characters, or homoglyph substitutions may bypass regex patterns." },
                        { name: "Shell metacharacter bypass", sev: "MEDIUM", sevClass: "sev-medium", status: "partial" as const, statusLabel: "Partial", detail: "Pipe (|) detected in rule 6. Semicolons (;), &&, ||, backticks, and $() not explicitly covered by default rules." },
                        { name: "DNS exfiltration", sev: "MEDIUM", sevClass: "sev-medium", status: "not-covered" as const, statusLabel: "Not covered", detail: "Secrets encoded in DNS subdomains (e.g., exfil-data.attacker.com) are not detected. No DNS-level inspection." },
                        { name: "Environment variable leakage", sev: "MEDIUM", sevClass: "sev-medium", status: "not-covered" as const, statusLabel: "Out of scope", detail: "Spawned server inherits the full environment from mcpwall\u2019s process. Env sanitization is the user\u2019s responsibility." },
                        { name: "Deep nesting stack overflow", sev: "LOW", sevClass: "sev-low", status: "partial" as const, statusLabel: "Partial", detail: "Recursive argument scanning has no max-depth limit. Deeply nested objects could exhaust the stack. 10MB line buffer limits total size." },
                        { name: "Config tampering (TOCTOU)", sev: "LOW", sevClass: "sev-low", status: "not-covered" as const, statusLabel: "Not covered", detail: "Config loaded once at startup, not re-verified. Filesystem permissions are the user\u2019s responsibility." },
                        { name: "Log tampering", sev: "LOW", sevClass: "sev-low", status: "not-covered" as const, statusLabel: "Not covered", detail: "JSONL audit logs have no signing or integrity verification. An attacker with filesystem access can modify them." },
                        { name: "Timing side-channels", sev: "LOW", sevClass: "sev-low", status: "not-covered" as const, statusLabel: "Not covered", detail: "Rule evaluation is not constant-time. An attacker could theoretically infer rule matches from response latency. Low practical risk." },
                      ].map((row) => (
                        <tr key={row.name}>
                          <td className="name-col">{row.name}</td>
                          <td><span className={`sev ${row.sevClass}`}>{row.sev}</span></td>
                          <td><StatusBadge status={row.status}>{row.statusLabel}</StatusBadge></td>
                          <td className="hide-mobile">{row.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <SectionLine />
              <div className="mb-16" />

              {/* ========== DEFAULT RULES ========== */}
              <section id="default-rules" className="mb-20">
                <div className="font-mono text-[11px] text-brand-500/60 tracking-widest uppercase mb-4">
                  05 / Default Rules
                </div>
                <h2 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-zinc-100 mb-6">
                  The 8 built-in deny rules
                </h2>
                <p className="prose-body max-w-2xl mb-8">
                  These rules ship with mcpwall and apply automatically. No
                  configuration needed. They match against{" "}
                  <code>tools/call</code> requests and scan all argument values
                  recursively using the <code>_any_value</code> matcher.
                </p>

                <div className="space-y-4">
                  {[
                    { name: "block-ssh-keys", desc: "Blocks any tool call where an argument value matches \\.ssh/, id_rsa, id_ed25519, or id_ecdsa." },
                    { name: "block-env-files", desc: "Blocks access to .env files and variants (.env.local, .env.production, etc.)." },
                    { name: "block-credentials", desc: "Blocks access to .aws/credentials, .npmrc, .docker/config.json, .kube/config, and .gnupg/." },
                    { name: "block-browser-data", desc: "Blocks access to Chrome, Firefox, and Safari profile directories, cookies, and login data stores." },
                    { name: "block-destructive-commands", desc: "Blocks rm -rf, rm -f, rmdir /, mkfs, dd if=, and format [drive]: patterns." },
                    { name: "block-pipe-to-shell", desc: "Blocks curl/wget/fetch piped to bash/sh/zsh/python/node." },
                    { name: "block-reverse-shells", desc: "Blocks netcat listeners, /dev/tcp/, bash -i redirects, mkfifo, and socat patterns." },
                    { name: "block-secret-leakage", desc: "Scans all argument values for 10 secret patterns: AWS keys, GitHub tokens, OpenAI/Anthropic/Stripe keys, private key headers, JWTs, Slack tokens, and database URLs. Uses Shannon entropy thresholds to reduce false positives." },
                  ].map((rule) => (
                    <div key={rule.name} className="assumption-card">
                      <div className="flex items-start gap-4">
                        <StatusBadge status="not-covered" className="mt-0.5 shrink-0">
                          DENY
                        </StatusBadge>
                        <div>
                          <div className="font-mono text-[13px] text-zinc-200 font-normal mb-1">
                            {rule.name}
                          </div>
                          <div className="prose-body text-sm">{rule.desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <SectionLine />
              <div className="mb-16" />

              {/* ========== ASSUMPTIONS ========== */}
              <section id="assumptions" className="mb-20">
                <div className="font-mono text-[11px] text-brand-500/60 tracking-widest uppercase mb-4">
                  06 / Assumptions
                </div>
                <h2 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-zinc-100 mb-6">
                  What must be true
                </h2>
                <p className="prose-body max-w-2xl mb-8">
                  mcpwall&rsquo;s security guarantees depend on these assumptions
                  holding. If any are violated, the threat model changes.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { cat: "RUNTIME", title: "Node.js is trusted", desc: "mcpwall runs on Node.js. If the runtime has exploitable vulnerabilities, all bets are off." },
                    { cat: "FILESYSTEM", title: "Config files are user-owned", desc: "YAML config and rules files must be owned and readable only by the user. mcpwall does not verify file permissions." },
                    { cat: "TRANSPORT", title: "stdio carries valid JSON-RPC", desc: "Messages are newline-delimited JSON-RPC 2.0 over stdin/stdout. Non-stdio transports (HTTP/SSE) are not yet supported." },
                    { cat: "PROCESS", title: "Server is the intended binary", desc: "mcpwall spawns whatever command you configure. If the command has been replaced with an attacker-controlled binary, mcpwall cannot detect this." },
                    { cat: "CONFIG", title: "Config not modified during run", desc: "Rules are loaded once at startup. Config changes require a restart. There is no hot-reload or runtime integrity check." },
                    { cat: "PATTERNS", title: "User regexes are safe", desc: "Custom regex patterns in user config are validated for basic ReDoS risk but not exhaustively analyzed. Users are responsible for their own patterns." },
                  ].map((item) => (
                    <div key={item.title} className="assumption-card">
                      <div className="font-mono text-[11px] text-brand-500/40 tracking-wider mb-2">
                        {item.cat}
                      </div>
                      <div className="font-body text-zinc-200 text-[15px] font-normal mb-1">
                        {item.title}
                      </div>
                      <div className="prose-body text-sm">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </section>

              <SectionLine />
              <div className="mb-16" />

              {/* ========== COMPONENTS ========== */}
              <section id="components" className="mb-20">
                <div className="font-mono text-[11px] text-brand-500/60 tracking-widest uppercase mb-4">
                  07 / Component Analysis
                </div>
                <h2 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-zinc-100 mb-6">
                  Module-by-module
                </h2>

                <div className="space-y-6">
                  {[
                    {
                      name: "policy.ts \u2014 Policy Engine",
                      desc: "Evaluates rules top-to-bottom, first match wins. Supports glob, regex, not_under, and _any_value matchers. Recursive scanning walks all argument values including arrays and nested objects.",
                      limitation: "Recursive scanning (deepMatchAny) has no max-depth limit. Extremely deep nesting could cause a stack overflow. The 10MB line buffer limits total message size but not depth.",
                    },
                    {
                      name: "secrets.ts \u2014 Secret Scanner",
                      desc: "10 built-in patterns (AWS, GitHub, OpenAI, Anthropic, Stripe, private keys, JWT, Slack, database URLs). Pre-compiled regexes with optional Shannon entropy threshold to reduce false positives.",
                      limitation: "Pattern-based only. Custom API key formats not matching built-in patterns will not be detected unless added by the user. No base64/URL decoding before matching.",
                    },
                    {
                      name: "parser.ts \u2014 JSON-RPC Parser",
                      desc: "Line-buffered parser with 10MB max line limit. Handles both single messages and JSON-RPC batch arrays. Each batch item validated individually (jsonrpc: \"2.0\" check).",
                      limitation: "Oversized lines are discarded with a stderr warning. Incomplete JSON is silently forwarded (tolerant of non-JSON-RPC traffic).",
                    },
                    {
                      name: "proxy.ts \u2014 Stdio Proxy",
                      desc: "Spawns the MCP server as a child process. Inbound path: evaluate each message, deny or forward. Outbound path: log and forward (no filtering). Batch handling evaluates each message individually; denied messages return JSON-RPC errors.",
                      limitation: "On parsing/evaluation errors, the raw line is forwarded to maintain the connection. Signal handling forwards SIGINT/SIGTERM to child with SIGKILL escalation after 5 seconds.",
                    },
                    {
                      name: "logger.ts \u2014 Audit Logger",
                      desc: "Writes structured JSONL entries to daily-rotated files + stderr. Arguments for denied calls are redacted ([REDACTED]) to prevent secret leakage in logs.",
                      limitation: "No log signing or integrity verification. No size-based rotation (daily only). Write errors degrade gracefully to stderr-only logging.",
                    },
                    {
                      name: "config/loader.ts \u2014 Config Loader",
                      desc: "Loads YAML config with Zod validation. Merges project config over global config (project rules take priority). Variable substitution for ${HOME}, ${PROJECT_DIR}, ~/.",
                      limitation: "Falls back to hardcoded default rules if files not found. ReDoS detection applied to all regex patterns at load time. Variable substitution is simple text replacement (no eval).",
                    },
                  ].map((comp) => (
                    <div key={comp.name} className="assumption-card">
                      <div className="font-mono text-[13px] text-brand-400 font-normal mb-2">
                        {comp.name}
                      </div>
                      <div className="prose-body text-sm space-y-2">
                        <p>{comp.desc}</p>
                        <p>
                          <strong>
                            {comp.name.includes("Logger") || comp.name.includes("Config")
                              ? "Safeguard:"
                              : "Limitation:"}
                          </strong>{" "}
                          {comp.limitation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <SectionLine />
              <div className="mb-16" />

              {/* ========== DEFENSE IN DEPTH ========== */}
              <section id="defense-in-depth" className="mb-20">
                <div className="font-mono text-[11px] text-brand-500/60 tracking-widest uppercase mb-4">
                  08 / Defense in Depth
                </div>
                <h2 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-zinc-100 mb-6">
                  Where mcpwall fits
                </h2>

                <div className="prose-body max-w-2xl space-y-4 mb-8">
                  <p>
                    mcpwall is <strong>one layer</strong> in a defense-in-depth
                    strategy. It is not a complete security solution on its own.
                    We recommend combining it with:
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="assumption-card">
                    <div className="font-mono text-[11px] text-zinc-500 tracking-wider mb-2">
                      LAYER 1
                    </div>
                    <div className="font-body text-zinc-200 text-[15px] font-normal mb-1">
                      Install-time scanning
                    </div>
                    <div className="prose-body text-sm">
                      Tools like mcp-scan check tool descriptions for suspicious
                      content before you use a server.
                    </div>
                  </div>

                  <div
                    className="assumption-card"
                    style={{
                      borderColor: "rgba(6,182,212,0.15)",
                      background: "rgba(6,182,212,0.03)",
                    }}
                  >
                    <div className="font-mono text-[11px] text-brand-500/60 tracking-wider mb-2">
                      LAYER 2
                    </div>
                    <div className="font-body text-brand-300 text-[15px] font-normal mb-1">
                      Runtime firewall (mcpwall)
                    </div>
                    <div className="prose-body text-sm">
                      Enforces policy on every tool call as it happens. Catches
                      what scanners miss: runtime arguments, secrets in
                      transit, dangerous commands.
                    </div>
                  </div>

                  <div className="assumption-card">
                    <div className="font-mono text-[11px] text-zinc-500 tracking-wider mb-2">
                      LAYER 3
                    </div>
                    <div className="font-body text-zinc-200 text-[15px] font-normal mb-1">
                      Container isolation
                    </div>
                    <div className="prose-body text-sm">
                      Run MCP servers in containers or sandboxes to limit blast
                      radius if a server is compromised.
                    </div>
                  </div>
                </div>
              </section>

              <SectionLine />
              <div className="mb-16" />

              {/* ========== ROADMAP ========== */}
              <section id="roadmap" className="mb-20">
                <div className="font-mono text-[11px] text-brand-500/60 tracking-widest uppercase mb-4">
                  09 / Planned Mitigations
                </div>
                <h2 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-zinc-100 mb-6">
                  What&rsquo;s coming
                </h2>

                <div className="table-scroll">
                  <table className="tm-table">
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th>Version</th>
                        <th>Addresses</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="name-col">Response inspection <StatusBadge status="covered">Shipped</StatusBadge></td>
                        <td><code>v0.2.0</code></td>
                        <td>Outbound rules scan responses for secrets (redact), prompt injection (block), zero-width chars, and large payloads (flag)</td>
                      </tr>
                      <tr>
                        <td className="name-col">Tool integrity / rug pull detection</td>
                        <td><code>v0.3.0</code></td>
                        <td>Hash tool descriptions at first use, detect changes on subsequent calls</td>
                      </tr>
                      <tr>
                        <td className="name-col">HTTP/SSE proxy mode</td>
                        <td><code>v0.3-0.4</code></td>
                        <td>Support remote MCP servers over HTTP/SSE, not just stdio</td>
                      </tr>
                      <tr>
                        <td className="name-col">Rate limiting</td>
                        <td><code>v0.4.0</code></td>
                        <td>Throttle excessive tool calls within configurable time windows</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <SectionLine />
              <div className="mb-16" />

              {/* ========== REPORTING ========== */}
              <section id="reporting" className="mb-8">
                <div className="font-mono text-[11px] text-brand-500/60 tracking-widest uppercase mb-4">
                  10 / Security Reporting
                </div>
                <h2 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-zinc-100 mb-6">
                  Found something?
                </h2>

                <div className="prose-body max-w-2xl space-y-4">
                  <p>
                    If you find a security vulnerability in mcpwall, please report
                    it responsibly. Email{" "}
                    <a href="mailto:info@behrens-ai.de" className="prose-link">
                      info@behrens-ai.de
                    </a>{" "}
                    or open a security advisory on{" "}
                    <a
                      href="https://github.com/behrensd/mcpwall/security/advisories"
                      className="prose-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      GitHub
                    </a>
                    .
                  </p>
                  <p>
                    This threat model is maintained alongside the codebase and
                    updated with each release. The source is at{" "}
                    <a
                      href="https://github.com/behrensd/mcpwall"
                      className="prose-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      github.com/behrensd/mcpwall
                    </a>
                    .
                  </p>
                </div>
              </section>
            </div>

            {/* Sidebar TOC (wide screens) */}
            <aside className="hidden xl:block">
              <StickyToc items={tocItems} />
            </aside>
          </div>
        </div>
      </main>

      <Footer variant="blog" />
    </>
  );
}
