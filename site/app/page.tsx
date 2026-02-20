import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FadeUp from "@/components/FadeUp";
import Stagger from "@/components/Stagger";
import CopyInstall from "@/components/CopyInstall";
import Terminal from "@/components/Terminal";
import CodeBlock from "@/components/CodeBlock";
import SectionLine from "@/components/SectionLine";
import Badge from "@/components/Badge";
import FlowDiagram from "@/components/FlowDiagram";
import ThreatCard from "@/components/ThreatCard";
import FeatureCard from "@/components/FeatureCard";

export const metadata: Metadata = {
  title: "mcpwall — Firewall for MCP Tool Calls",
  description:
    "Deterministic security proxy for MCP tool calls. Blocks dangerous requests, scans for secrets, logs everything. Works with Claude Code, Cursor, and any MCP client. No cloud, no AI, pure rules.",
  openGraph: {
    title: "mcpwall — Firewall for MCP Tool Calls",
    description:
      "iptables for MCP. Blocks dangerous tool calls, scans for secret leakage, logs everything. No AI, no cloud, pure rules.",
    type: "website",
    url: "https://mcpwall.dev",
    siteName: "mcpwall",
    images: [
      {
        url: "https://mcpwall.dev/og/blog-01-backdoor.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "mcpwall — Firewall for MCP Tool Calls",
    description:
      "iptables for MCP. Blocks dangerous tool calls, scans for secret leakage, logs everything. No AI, no cloud, pure rules.",
    images: ["https://mcpwall.dev/og/blog-01-backdoor.png"],
  },
};

export default function HomePage() {
  return (
    <>
      <Nav variant="landing" />

      {/* ===================== HERO ===================== */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 pt-20 pb-28">
        <div className="hero-glow" />
        <div className="hero-glow-red" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <FadeUp className="mb-8">
            <Badge className="bg-red-500/10 text-red-400 border border-red-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              CVE-2025-6514 &mdash; 437K+ MCP installs affected
            </Badge>
          </FadeUp>

          <FadeUp delay="100ms">
            <h1 className="font-display font-normal text-3xl sm:text-5xl md:text-7xl leading-[1.05] tracking-tight mb-6">
              Your MCP tools have
              <br />
              full access to your machine.
              <br />
              <span className="text-brand-400">Now they have a firewall.</span>
            </h1>
          </FadeUp>

          <FadeUp delay="200ms">
            <p className="font-body text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              mcpwall is a transparent stdio proxy that scans both directions.
              Block dangerous requests, redact secrets from responses, catch
              prompt injection. No AI, no cloud, pure rules.
            </p>
          </FadeUp>

          <FadeUp delay="300ms" className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <CopyInstall command="npm install -g mcpwall" />
          </FadeUp>

          <FadeUp delay="400ms">
            <Terminal title="mcpwall demo" className="max-w-2xl mx-auto text-left">
              <div style={{ background: "#09090b" }}>
                <img
                  src="/demo.gif"
                  alt="mcpwall v0.2.0: inbound blocking (SSH keys), outbound secret redaction, and prompt injection denial"
                  style={{
                    width: "100%",
                    display: "block",
                    borderRadius: "0 0 12px 12px",
                  }}
                />
              </div>
            </Terminal>
          </FadeUp>
        </div>
      </section>

      <SectionLine />

      {/* ===================== PROBLEM ===================== */}
      <section className="px-4 sm:px-6 py-16 sm:py-28 max-w-5xl mx-auto">
        <FadeUp className="text-center mb-16">
          <h2 className="font-display font-normal text-2xl sm:text-3xl md:text-4xl tracking-tight mb-4">
            MCP servers can read your SSH keys, delete
            <br className="hidden md:block" /> your files, and exfiltrate your
            secrets.
          </h2>
          <p className="text-zinc-400 font-body text-lg max-w-2xl mx-auto">
            And there&rsquo;s no open, programmable way to stop them.
          </p>
        </FadeUp>

        <Stagger className="grid md:grid-cols-3 gap-5">
          <ThreatCard>
            <div className="text-red-400 font-mono text-sm font-normal mb-3 tracking-wide">
              NO PROGRAMMABLE POLICY
            </div>
            <p className="text-zinc-300 font-body leading-relaxed text-[15px]">
              MCP servers execute whatever the AI asks.{" "}
              <span className="text-zinc-100 font-normal">
                read_file ~/.ssh/id_rsa
              </span>
              ? Done.{" "}
              <span className="text-zinc-100 font-normal">rm -rf /</span>? Done.
              IDE guardrails are ad-hoc and closed. There&rsquo;s no way to say
              &ldquo;allow reads, block writes outside my project.&rdquo;
            </p>
          </ThreatCard>

          <ThreatCard>
            <div className="text-red-400 font-mono text-sm font-normal mb-3 tracking-wide">
              SCANNERS AREN&rsquo;T ENOUGH
            </div>
            <p className="text-zinc-300 font-body leading-relaxed text-[15px]">
              In one academic study, mcp-scan detected{" "}
              <span className="text-zinc-100 font-normal">
                only 4 of 120 poisoned servers
              </span>{" "}
              (
              <a
                href="https://arxiv.org/abs/2509.24272"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 underline decoration-zinc-600 hover:decoration-zinc-400"
              >
                arXiv:2509.24272
              </a>
              ). Scanners check at install time. You need runtime enforcement
              too.
            </p>
          </ThreatCard>

          <ThreatCard>
            <div className="text-red-400 font-mono text-sm font-normal mb-3 tracking-wide">
              CLOUD ADDS RISK
            </div>
            <p className="text-zinc-300 font-body leading-relaxed text-[15px]">
              Some security tools route tool calls through cloud APIs for
              screening. Your code, secrets, and data{" "}
              <span className="text-zinc-100 font-normal">
                leave your machine
              </span>
              . For privacy-sensitive work, local-only enforcement is the safer
              default.
            </p>
          </ThreatCard>
        </Stagger>
      </section>

      <SectionLine />

      {/* ===================== HOW IT WORKS ===================== */}
      <section id="how-it-works" className="px-4 sm:px-6 py-16 sm:py-28 max-w-5xl mx-auto">
        <FadeUp className="text-center mb-16">
          <h2 className="font-display font-normal text-2xl sm:text-3xl md:text-4xl tracking-tight mb-4">
            One line change. Full protection.
          </h2>
          <p className="text-zinc-400 font-body text-lg">
            Wrap any MCP server in your config. Everything else stays the same.
          </p>
        </FadeUp>

        <FadeUp className="mb-16">
          <FlowDiagram />
        </FadeUp>

        <FadeUp className="grid md:grid-cols-2 gap-5">
          <div>
            <div className="text-xs font-mono text-zinc-500 mb-3 tracking-wider uppercase">
              Before
            </div>
            <CodeBlock>
              <div className="text-zinc-500">{"// .mcp.json"}</div>
              <div>{"{"}</div>
              <div className="ml-4">
                <span className="text-zinc-400">&quot;command&quot;</span>:{" "}
                <span className="text-amber-300">&quot;npx&quot;</span>,
              </div>
              <div className="ml-4">
                <span className="text-zinc-400">&quot;args&quot;</span>: [
                <span className="text-amber-300">&quot;-y&quot;</span>,
              </div>
              <div className="ml-8">
                <span className="text-amber-300">
                  &quot;@modelcontextprotocol/server-filesystem&quot;
                </span>
                ,
              </div>
              <div className="ml-8">
                <span className="text-amber-300">
                  &quot;/Users/me/projects&quot;
                </span>
                ]
              </div>
              <div>{"}"}</div>
            </CodeBlock>
          </div>
          <div>
            <div className="text-xs font-mono text-brand-400 mb-3 tracking-wider uppercase flex items-center gap-2">
              After
              <span className="text-[10px] text-brand-500/80 font-normal normal-case">
                &mdash; just add mcpwall
              </span>
            </div>
            <CodeBlock borderColor="rgba(6, 182, 212, 0.12)">
              <div className="text-zinc-500">{"// .mcp.json"}</div>
              <div>{"{"}</div>
              <div className="ml-4">
                <span className="text-zinc-400">&quot;command&quot;</span>:{" "}
                <span className="text-amber-300">&quot;npx&quot;</span>,
              </div>
              <div className="ml-4">
                <span className="text-zinc-400">&quot;args&quot;</span>: [
                <span className="text-amber-300">&quot;-y&quot;</span>,{" "}
                <span className="text-brand-300">&quot;mcpwall&quot;</span>,{" "}
                <span className="text-brand-300">&quot;--&quot;</span>,
              </div>
              <div className="ml-8">
                <span className="text-amber-300">&quot;npx&quot;</span>,{" "}
                <span className="text-amber-300">&quot;-y&quot;</span>,
              </div>
              <div className="ml-8">
                <span className="text-amber-300">
                  &quot;@modelcontextprotocol/server-filesystem&quot;
                </span>
                ,
              </div>
              <div className="ml-8">
                <span className="text-amber-300">
                  &quot;/Users/me/projects&quot;
                </span>
                ]
              </div>
              <div>{"}"}</div>
            </CodeBlock>
          </div>
        </FadeUp>

        <Stagger className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 font-mono text-sm mb-4">
              1
            </div>
            <div className="text-zinc-200 font-body font-normal mb-2">
              Intercept
            </div>
            <p className="text-zinc-400 text-sm font-body">
              Every JSON-RPC message is captured on stdin/stdout. Nothing gets
              through unchecked.
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 font-mono text-sm mb-4">
              2
            </div>
            <div className="text-zinc-200 font-body font-normal mb-2">
              Evaluate
            </div>
            <p className="text-zinc-400 text-sm font-body">
              Rules are checked top-to-bottom, first match wins. Regex, glob,
              path checks, secret scanning.
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 font-mono text-sm mb-4">
              3
            </div>
            <div className="text-zinc-200 font-body font-normal mb-2">
              Enforce
            </div>
            <p className="text-zinc-400 text-sm font-body">
              Requests: allow or deny. Responses: allow, deny, or redact
              secrets. Both directions logged.
            </p>
          </div>
        </Stagger>
      </section>

      <SectionLine />

      {/* ===================== WHAT IT BLOCKS ===================== */}
      <section className="px-4 sm:px-6 py-16 sm:py-28 max-w-5xl mx-auto">
        <FadeUp className="text-center mb-16">
          <h2 className="font-display font-normal text-2xl sm:text-3xl md:text-4xl tracking-tight mb-4">
            What it blocks out of the box
          </h2>
          <p className="text-zinc-400 font-body text-lg">
            8 default deny rules. Zero config required.
          </p>
        </FadeUp>

        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "SSH Keys", detail: ".ssh/id_rsa, id_ed25519" },
            { name: "Environment Files", detail: ".env, .env.local, .env.prod" },
            { name: "Credentials", detail: ".aws/, .npmrc, .kube/config" },
            { name: "Browser Data", detail: "Chrome cookies, login data" },
            { name: "Destructive Cmds", detail: "rm -rf, mkfs, dd if=" },
            { name: "Pipe to Shell", detail: "curl ... | bash" },
            { name: "Reverse Shells", detail: "nc -e, /dev/tcp/, socat" },
            { name: "Secret Leakage", detail: "API keys, tokens, JWTs" },
          ].map((item) => (
            <ThreatCard key={item.name} className="group">
              <div className="text-red-400/70 text-xs font-mono mb-2">DENY</div>
              <div className="text-zinc-200 font-body font-normal text-sm mb-1">
                {item.name}
              </div>
              <div className="text-zinc-500 font-mono text-xs">
                {item.detail}
              </div>
            </ThreatCard>
          ))}
        </Stagger>
      </section>

      <SectionLine />

      {/* ===================== FEATURES ===================== */}
      <section id="features" className="px-4 sm:px-6 py-16 sm:py-28 max-w-5xl mx-auto">
        <FadeUp className="text-center mb-16">
          <h2 className="font-display font-normal text-2xl sm:text-3xl md:text-4xl tracking-tight mb-4">
            Deterministic security. Zero cloud.
          </h2>
        </FadeUp>

        <Stagger className="grid md:grid-cols-2 gap-5">
          <FeatureCard>
            <div className="text-brand-400 font-mono text-sm font-normal mb-3 tracking-wide">
              YAML POLICY ENGINE
            </div>
            <p className="text-zinc-300 font-body leading-relaxed text-[15px] mb-4">
              Define rules in plain YAML. Glob patterns, regex, path
              restrictions, secret scanning. First-match-wins, just like
              iptables. Version-control your security policy.
            </p>
            <CodeBlock className="text-xs">
              <div>
                <span className="text-zinc-500">- name:</span>{" "}
                <span className="text-brand-300">block-ssh-keys</span>
              </div>
              <div>
                &nbsp; <span className="text-zinc-500">match:</span>
              </div>
              <div>
                &nbsp;&nbsp;&nbsp;{" "}
                <span className="text-zinc-500">tool:</span>{" "}
                <span className="text-amber-300">&quot;*&quot;</span>
              </div>
              <div>
                &nbsp;&nbsp;&nbsp;{" "}
                <span className="text-zinc-500">arguments:</span>
              </div>
              <div>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{" "}
                <span className="text-zinc-500">_any_value:</span>
              </div>
              <div>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{" "}
                <span className="text-zinc-500">regex:</span>{" "}
                <span className="text-amber-300">&quot;\.ssh/&quot;</span>
              </div>
              <div>
                &nbsp; <span className="text-zinc-500">action:</span>{" "}
                <span className="text-red-400">deny</span>
              </div>
            </CodeBlock>
          </FeatureCard>

          <FeatureCard>
            <div className="text-brand-400 font-mono text-sm font-normal mb-3 tracking-wide">
              SECRET SCANNER
            </div>
            <p className="text-zinc-300 font-body leading-relaxed text-[15px] mb-4">
              Regex patterns + Shannon entropy analysis detect AWS keys, GitHub
              tokens, Stripe keys, JWTs, private keys, database URLs, and more.
              Catches high-entropy strings that static patterns miss.
            </p>
            <CodeBlock className="text-xs">
              <div>
                <span className="text-zinc-500">secrets:</span>
              </div>
              <div>
                &nbsp; <span className="text-zinc-500">patterns:</span>
              </div>
              <div>
                &nbsp;&nbsp;&nbsp;{" "}
                <span className="text-zinc-500">- name:</span>{" "}
                <span className="text-brand-300">aws-access-key</span>
              </div>
              <div>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{" "}
                <span className="text-zinc-500">regex:</span>{" "}
                <span className="text-amber-300">
                  &quot;AKIA[0-9A-Z]&#123;16&#125;&quot;
                </span>
              </div>
              <div>
                &nbsp;&nbsp;&nbsp;{" "}
                <span className="text-zinc-500">- name:</span>{" "}
                <span className="text-brand-300">generic-secret</span>
              </div>
              <div>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{" "}
                <span className="text-zinc-500">regex:</span>{" "}
                <span className="text-amber-300">
                  &quot;[A-Za-z0-9]&#123;40&#125;&quot;
                </span>
              </div>
              <div>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{" "}
                <span className="text-zinc-500">entropy_threshold:</span>{" "}
                <span className="text-amber-300">4.5</span>
              </div>
            </CodeBlock>
          </FeatureCard>

          <FeatureCard>
            <div className="text-brand-400 font-mono text-sm font-normal mb-3 tracking-wide">
              AUDIT LOGGING
            </div>
            <p className="text-zinc-300 font-body leading-relaxed text-[15px] mb-4">
              Every tool call logged as JSON Lines. See exactly what your MCP
              servers are doing. Denied calls have arguments redacted to prevent
              secrets leaking into logs.
            </p>
            <CodeBlock className="text-xs">
              <div>
                <span className="text-zinc-500">
                  {"{"}
                  &quot;ts&quot;:
                </span>
                <span className="text-amber-300">
                  &quot;2026-02-17T14:30:00Z&quot;
                </span>
                ,
              </div>
              <div>
                &nbsp;
                <span className="text-zinc-500">&quot;tool&quot;:</span>
                <span className="text-amber-300">&quot;read_file&quot;</span>,
              </div>
              <div>
                &nbsp;
                <span className="text-zinc-500">&quot;action&quot;:</span>
                <span className="text-red-400">&quot;deny&quot;</span>,
              </div>
              <div>
                &nbsp;
                <span className="text-zinc-500">&quot;rule&quot;:</span>
                <span className="text-brand-300">
                  &quot;block-ssh-keys&quot;
                </span>
                ,
              </div>
              <div>
                &nbsp;
                <span className="text-zinc-500">&quot;args&quot;:</span>
                <span className="text-zinc-500">
                  &quot;[REDACTED]&quot;
                </span>
                {"}"}
              </div>
            </CodeBlock>
          </FeatureCard>

          <FeatureCard>
            <div className="text-brand-400 font-mono text-sm font-normal mb-3 tracking-wide">
              RESPONSE INSPECTION
            </div>
            <p className="text-zinc-300 font-body leading-relaxed text-[15px] mb-4">
              v0.2.0 scans both directions. Server responses are inspected
              before reaching your AI client. Leaked secrets are surgically
              redacted. Prompt injection patterns are blocked.
            </p>
            <div className="mt-2 space-y-2">
              {[
                "Secret redaction (API keys, tokens, JWTs)",
                "Prompt injection blocking",
                "Zero-width character detection",
                "Response size monitoring",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-sm text-zinc-400 font-body"
                >
                  <span className="text-brand-400">&#10003;</span> {item}
                </div>
              ))}
            </div>
          </FeatureCard>

          <FeatureCard>
            <div className="text-brand-400 font-mono text-sm font-normal mb-3 tracking-wide">
              ZERO CLOUD DEPENDENCY
            </div>
            <p className="text-zinc-300 font-body leading-relaxed text-[15px] mb-4">
              Runs entirely on your machine. No API calls, no telemetry, no
              accounts, no cloud. Your code and secrets never leave your
              environment. Same input + same rules = same output, every time.
            </p>
            <div className="mt-6 space-y-3">
              {[
                "No network required",
                "No telemetry or tracking",
                "GDPR / DSGVO compliant by design",
                "Works offline",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-sm text-zinc-400 font-body"
                >
                  <span className="text-green-400">&#10003;</span> {item}
                </div>
              ))}
            </div>
          </FeatureCard>
        </Stagger>
      </section>

      <SectionLine />

      {/* ===================== EU COMPLIANCE ===================== */}
      <section className="px-4 sm:px-6 py-16 sm:py-28 max-w-4xl mx-auto">
        <FadeUp>
          <FeatureCard
            style={{
              borderColor: "rgba(6, 182, 212, 0.12)",
              background: "rgba(6, 182, 212, 0.03)",
            }}
          >
            <div className="flex flex-col md:flex-row md:items-start gap-8">
              <div className="flex-1">
                <Badge className="bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-4">
                  EU AI Act &mdash; Aug 2, 2026
                </Badge>
                <h3 className="font-display font-normal text-2xl tracking-tight mb-3">
                  Built for European compliance
                </h3>
                <p className="text-zinc-400 font-body leading-relaxed text-[15px]">
                  mcpwall&rsquo;s local-first architecture helps satisfy GDPR
                  (DSGVO) and EU AI Act obligations. No tool call data leaves
                  your infrastructure. Audit logs provide accountability
                  evidence. Policy enforcement serves as a technical security
                  measure (TOM) under Art. 32.
                </p>
              </div>
              <div className="flex-shrink-0 space-y-2 text-sm font-body">
                <div className="text-zinc-400">
                  <span className="text-brand-400 font-mono text-xs">
                    Art. 25
                  </span>{" "}
                  &mdash; Data protection by design
                </div>
                <div className="text-zinc-400">
                  <span className="text-brand-400 font-mono text-xs">
                    Art. 5(2)
                  </span>{" "}
                  &mdash; Accountability &amp; evidence
                </div>
                <div className="text-zinc-400">
                  <span className="text-brand-400 font-mono text-xs">
                    Art. 32
                  </span>{" "}
                  &mdash; Security of processing
                </div>
                <div className="text-zinc-400">
                  <span className="text-brand-400 font-mono text-xs">
                    AI Act
                  </span>{" "}
                  &mdash; Supports oversight principles
                </div>
                <div className="text-zinc-400">
                  <span className="text-brand-400 font-mono text-xs">
                    Schrems II
                  </span>{" "}
                  &mdash; No data leaves your machine
                </div>
              </div>
            </div>
          </FeatureCard>
        </FadeUp>
      </section>

      <SectionLine />

      {/* ===================== INSTALL CTA ===================== */}
      <section className="px-4 sm:px-6 py-16 sm:py-28 max-w-3xl mx-auto text-center">
        <FadeUp>
          <h2 className="font-display font-normal text-2xl sm:text-3xl md:text-4xl tracking-tight mb-4">
            Secure your MCP servers
            <br />
            in 60 seconds
          </h2>
          <p className="text-zinc-400 font-body text-lg mb-10">
            Install globally, then wrap any server with one command.
          </p>

          <div className="space-y-4 max-w-md mx-auto text-left">
            <CodeBlock>
              <div>
                <span className="text-zinc-500">$</span>{" "}
                <span className="text-brand-300">npm install -g mcpwall</span>
              </div>
            </CodeBlock>
            <CodeBlock>
              <div>
                <span className="text-zinc-500">$</span>{" "}
                <span className="text-brand-300">mcpwall init</span>
              </div>
              <div className="text-zinc-500 mt-1">
                {"  "}Found 3 MCP servers in ~/.claude.json
              </div>
              <div className="text-zinc-500">
                {"  "}Wrapped: filesystem, github, postgres
              </div>
              <div className="text-green-400 mt-1">
                {"  "}&#10003; Config written to ~/.mcpwall/config.yml
              </div>
            </CodeBlock>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <a
              href="https://github.com/behrensd/mcp-firewall"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-body font-normal rounded-lg transition-colors text-sm"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              View on GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/mcpwall"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-body font-normal rounded-lg transition-colors text-sm border border-zinc-700"
            >
              npm package &rarr;
            </a>
          </div>
        </FadeUp>
      </section>

      <Footer variant="landing" />
    </>
  );
}
