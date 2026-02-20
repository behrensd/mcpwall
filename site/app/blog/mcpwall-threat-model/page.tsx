import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FadeUp from "@/components/FadeUp";
import Stagger from "@/components/Stagger";
import SectionLine from "@/components/SectionLine";
import StderrCallout from "@/components/StderrCallout";
import StatusBadge from "@/components/StatusBadge";
import ProgressBar from "@/components/ProgressBar";
import TableOfContents from "@/components/TableOfContents";

const tocItems = [
  { id: "the-short-version", label: "The Short Version" },
  { id: "whats-covered", label: "What\u2019s Covered" },
  { id: "whats-not-covered", label: "What\u2019s Not Covered" },
  { id: "defense-in-depth", label: "Defense in Depth" },
  { id: "whats-next", label: "What\u2019s Next" },
];

export const metadata: Metadata = {
  title: "What mcpwall Does and Doesn\u2019t Protect Against",
  description:
    "A transparent look at mcpwall\u2019s security coverage: 8 attack classes blocked, 13 known limitations, and the assumptions we make.",
  openGraph: {
    title: "What mcpwall Does and Doesn\u2019t Protect Against",
    description:
      "A transparent look at mcpwall\u2019s security coverage. 8 attack classes blocked, 13 known limitations.",
    type: "article",
    url: "https://mcpwall.dev/blog/mcpwall-threat-model",
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
    title: "What mcpwall Does and Doesn\u2019t Protect Against",
    description:
      "A transparent look at mcpwall\u2019s security coverage. 8 attack classes blocked, 13 known limitations.",
    images: ["https://mcpwall.dev/og/blog-02-threat-model.png"],
  },
  alternates: {
    canonical: "https://mcpwall.dev/blog/mcpwall-threat-model",
  },
  other: {
    "article:published_time": "2026-02-18",
    "article:author": "Dom Behrens",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "What mcpwall Does and Doesn\u2019t Protect Against",
  description:
    "A transparent look at mcpwall\u2019s security coverage: 8 attack classes blocked, 13 known limitations, and the assumptions we make.",
  image: "https://mcpwall.dev/og/blog-02-threat-model.png",
  author: { "@type": "Person", name: "Dom Behrens" },
  publisher: {
    "@type": "Organization",
    name: "mcpwall",
    url: "https://mcpwall.dev",
  },
  datePublished: "2026-02-18",
  mainEntityOfPage: "https://mcpwall.dev/blog/mcpwall-threat-model",
};

const coveredItems = [
  { name: "SSH key theft", detail: "Blocks .ssh/, id_rsa, id_ed25519, id_ecdsa in any argument." },
  { name: ".env file access", detail: "Blocks .env and all variants (.env.local, .env.production)." },
  { name: "Credential files", detail: "AWS credentials, .npmrc, Docker config, kube config, .gnupg." },
  { name: "Browser data", detail: "Chrome, Firefox, Safari profile paths, cookies, login data stores." },
  { name: "Destructive commands", detail: "rm -rf, mkfs, dd if=, format C: and variants." },
  { name: "Pipe-to-shell", detail: "curl/wget/fetch piped to bash/sh/python/node." },
  { name: "Reverse shells", detail: "netcat, /dev/tcp/, bash -i, mkfifo, socat." },
  { name: "Secret / API key leakage", detail: "10 patterns (AWS, GitHub, OpenAI, Stripe, etc.) + Shannon entropy." },
];

const notCovered = [
  { severity: "HIGH" as const, name: "Response-side attacks", detail: "Server responses are now scanned by outbound rules. Secrets are redacted, prompt injection patterns are blocked, and suspicious content is flagged. Shipped in v0.2.0." },
  { severity: "HIGH" as const, name: "Base64 / URL encoding bypass", detail: "Rules match literal strings only. Base64-encoded secrets or URL-encoded commands pass through. Decoding before matching would add latency and complexity." },
  { severity: "HIGH" as const, name: "Rate limiting / DoS", detail: "No throttling on tool call volume. A runaway agent can make unlimited calls.", planned: "v0.4.0" },
  { severity: "MEDIUM" as const, name: "Tool description poisoning / rug pulls", detail: "mcpwall does not inspect tool metadata from tools/list. A server can change descriptions after trust is established.", planned: "v0.3.0" },
  { severity: "MEDIUM" as const, name: "Prompt injection", detail: "mcpwall can\u2019t detect semantic manipulation of the LLM. It sees the resulting tool call, not the manipulation \u2014 but it may still catch the dangerous arguments." },
  { severity: "MEDIUM" as const, name: "Shell metacharacter bypass", detail: "Pipes (|) caught. Semicolons (;), &&, backticks, and $() not covered by default rules. Custom rules can address this." },
  { severity: "MEDIUM" as const, name: "Unicode / DNS exfiltration / env leakage", detail: "Homoglyph attacks, DNS subdomain encoding, and inherited environment variables are out of scope for v0.1.x." },
];

const roadmap = [
  { version: "v0.2.0", feature: "Response inspection \u2014 outbound rules scan responses for secrets, injection, and suspicious content (shipped)" },
  { version: "v0.3.0", feature: "Tool integrity / rug pull detection \u2014 hash descriptions, detect changes" },
  { version: "v0.3-4", feature: "HTTP/SSE proxy mode \u2014 support remote MCP servers" },
  { version: "v0.4.0", feature: "Rate limiting \u2014 throttle excessive tool calls" },
];

export default function ThreatModelBlogPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProgressBar />
      <Nav
        variant="sub-page"
        breadcrumb="blog"
        links={[
          { href: "/", label: "Home" },
          { href: "/threat-model", label: "Full Threat Model" },
        ]}
      />

      <TableOfContents items={tocItems} />

      <article className="relative z-10">
        {/* ========== HERO ========== */}
        <header className="min-h-[70vh] flex flex-col justify-end px-4 sm:px-6 pb-12 sm:pb-16 pt-28 sm:pt-32 max-w-4xl mx-auto">
          <FadeUp>
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 font-mono text-[11px] text-brand-400 tracking-wide">
                THREAT MODEL
              </span>
              <time
                dateTime="2026-02-18"
                className="font-mono text-[11px] text-zinc-600 tracking-wide"
              >
                2026-02-18
              </time>
            </div>
          </FadeUp>

          <FadeUp delay="100ms">
            <h1 className="font-display font-normal text-4xl sm:text-5xl md:text-6xl leading-[1.05] tracking-tight mb-6">
              What mcpwall Does
              <br />
              and Doesn&rsquo;t
              <br />
              Protect Against
            </h1>
          </FadeUp>

          <FadeUp delay="200ms" className="max-w-2xl">
            <StderrCallout variant="info" tag="transparency">
              Security tools that hide their limitations aren&rsquo;t security
              tools. Here&rsquo;s what mcpwall covers, what it doesn&rsquo;t,
              and what we&rsquo;re building next.
            </StderrCallout>
          </FadeUp>

          <FadeUp delay="300ms" className="mt-8">
            <Link
              href="/threat-model"
              className="prose-link font-mono text-sm"
            >
              Read the full threat model reference &rarr;
            </Link>
          </FadeUp>
        </header>

        <SectionLine />

        {/* ========== THE SHORT VERSION ========== */}
        <section id="the-short-version" className="px-4 sm:px-6 py-16 sm:py-20 md:py-28">
          <div className="max-w-4xl mx-auto">
            <div className="with-marginalia">
              <FadeUp>
                <div className="font-mono text-[11px] text-brand-500/60 tracking-widest uppercase mb-4">
                  01 / The Short Version
                </div>
                <h2 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-zinc-100 mb-6">
                  Where mcpwall sits
                </h2>

                <div className="prose-body space-y-4 mb-8 max-w-2xl">
                  <p>
                    mcpwall is a transparent stdio proxy. It intercepts every
                    JSON-RPC message from your AI coding tool to the MCP server.
                    Rules are YAML, evaluated top-to-bottom, first match wins.
                  </p>
                  <p>
                    The key word is <strong>request firewall</strong>. In v0.1.x,
                    mcpwall inspects what your AI agent <em>asks to do</em>. It
                    does not yet inspect what the server <em>sends back</em>.
                  </p>
                </div>

                <div className="arch-box mb-8">
                  <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-3">
                    Inbound &mdash; inspected &amp; filtered
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="arch-node bg-zinc-800 text-zinc-300 text-[12px]">
                      Claude Code
                    </span>
                    <span className="text-zinc-600">&rarr;</span>
                    <span
                      className="arch-node text-brand-300 text-[12px]"
                      style={{
                        background: "rgba(6,182,212,0.12)",
                        border: "1px solid rgba(6,182,212,0.2)",
                      }}
                    >
                      mcpwall
                    </span>
                    <span className="text-zinc-600">&rarr;</span>
                    <span className="arch-node bg-zinc-800 text-zinc-300 text-[12px]">
                      MCP Server
                    </span>
                  </div>
                  <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-3 mt-4">
                    Outbound &mdash; logged, not filtered
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="arch-node bg-zinc-800 text-zinc-300 text-[12px]">
                      Claude Code
                    </span>
                    <span className="text-zinc-600">&larr;</span>
                    <span
                      className="arch-node bg-zinc-800/50 text-zinc-500 text-[12px]"
                      style={{
                        border: "1px dashed rgba(255,255,255,0.08)",
                      }}
                    >
                      mcpwall (passthrough)
                    </span>
                    <span className="text-zinc-600">&larr;</span>
                    <span className="arch-node bg-zinc-800 text-zinc-300 text-[12px]">
                      MCP Server
                    </span>
                  </div>
                </div>
              </FadeUp>

              <aside className="marginalia hidden xl:block mt-2">
                Response inspection shipped in v0.2.0. Outbound rules now scan
                server responses for secrets, prompt injection, and suspicious content.
              </aside>
            </div>
          </div>
        </section>

        <SectionLine variant="brand" />

        {/* ========== WHAT'S COVERED ========== */}
        <section id="whats-covered" className="px-4 sm:px-6 py-16 sm:py-20 md:py-28">
          <div className="max-w-4xl mx-auto">
            <FadeUp>
              <div className="font-mono text-[11px] text-brand-500/60 tracking-widest uppercase mb-4">
                02 / What&rsquo;s Covered
              </div>
              <h2 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-zinc-100 mb-4">
                8 attack classes blocked out of the box
              </h2>
              <p className="prose-body mb-8 max-w-2xl">
                No configuration needed. These default rules apply automatically
                and scan every argument value recursively.
              </p>
            </FadeUp>

            <Stagger className="grid sm:grid-cols-2 gap-3">
              {coveredItems.map((item) => (
                <div key={item.name} className="tm-card">
                  <StatusBadge status="covered" className="mb-3">
                    Covered
                  </StatusBadge>
                  <div className="font-mono text-[13px] text-zinc-200 font-normal mt-2">
                    {item.name}
                  </div>
                  <div className="text-zinc-500 text-sm mt-1">
                    {item.detail}
                  </div>
                </div>
              ))}
            </Stagger>

            <FadeUp className="mt-6">
              <p className="prose-body text-sm">
                Plus: JSON-RPC batch bypass fixed (C1), ReDoS mitigation at
                config load, symlink resolution for path traversal, crash
                protection with fail-open behavior.
              </p>
            </FadeUp>
          </div>
        </section>

        <SectionLine variant="danger" />

        {/* ========== WHAT'S NOT COVERED ========== */}
        <section id="whats-not-covered" className="px-4 sm:px-6 py-16 sm:py-20 md:py-28">
          <div className="max-w-4xl mx-auto">
            <div className="with-marginalia">
              <div>
                <FadeUp>
                  <div className="font-mono text-[11px] text-danger-400/60 tracking-widest uppercase mb-4">
                    03 / What&rsquo;s Not Covered
                  </div>
                  <h2 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-zinc-100 mb-4">
                    Known limitations
                  </h2>
                  <p className="prose-body mb-8 max-w-2xl">
                    These are attack classes that mcpwall v0.1.x does{" "}
                    <strong>not</strong> mitigate. We&rsquo;re publishing them
                    because hiding limitations is worse than having them.
                  </p>
                </FadeUp>

                <Stagger className="space-y-3">
                  {notCovered.map((item) => (
                    <div
                      key={item.name}
                      className="tm-card"
                      style={
                        item.severity === "HIGH"
                          ? { borderColor: "rgba(239,68,68,0.1)" }
                          : undefined
                      }
                    >
                      <div className="flex items-start gap-3">
                        <StatusBadge
                          status={
                            item.severity === "HIGH"
                              ? "not-covered"
                              : "partial"
                          }
                          className="mt-0.5 shrink-0"
                        >
                          {item.severity}
                        </StatusBadge>
                        <div>
                          <div className="font-body text-zinc-200 font-normal">
                            {item.name}
                          </div>
                          <div className="text-zinc-500 text-sm mt-1">
                            {item.detail}
                            {item.planned && (
                              <>
                                {" "}
                                <span className="text-brand-400/80">
                                  Planned: {item.planned}.
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </Stagger>
              </div>

              <aside className="marginalia hidden xl:block mt-12">
                For the complete list with low-severity items, code references,
                and component analysis, see the{" "}
                <Link
                  href="/threat-model"
                  className="prose-link text-[11px]"
                >
                  full threat model
                </Link>
                .
              </aside>
            </div>
          </div>
        </section>

        <SectionLine />

        {/* ========== DEFENSE IN DEPTH ========== */}
        <section id="defense-in-depth" className="px-4 sm:px-6 py-16 sm:py-20 md:py-28">
          <div className="max-w-4xl mx-auto">
            <FadeUp>
              <div className="font-mono text-[11px] text-brand-500/60 tracking-widest uppercase mb-4">
                04 / Defense in Depth
              </div>
              <h2 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-zinc-100 mb-4">
                One layer, not the whole stack
              </h2>
              <p className="prose-body mb-8 max-w-2xl">
                mcpwall is not a complete security solution. It&rsquo;s one layer
                in a defense-in-depth strategy. We recommend combining it with:
              </p>
            </FadeUp>

            <Stagger className="grid sm:grid-cols-3 gap-4">
              <div className="tm-card">
                <div className="font-mono text-[11px] text-zinc-600 tracking-wider mb-2">
                  LAYER 1
                </div>
                <div className="font-body text-zinc-200 font-normal">
                  Install-time scanning
                </div>
                <div className="text-zinc-500 text-sm mt-2">
                  Check tool descriptions for suspicious content before you use
                  a server. (mcp-scan, etc.)
                </div>
              </div>

              <div
                className="tm-card"
                style={{
                  borderColor: "rgba(6,182,212,0.15)",
                  background: "rgba(6,182,212,0.03)",
                }}
              >
                <div className="font-mono text-[11px] text-brand-500/60 tracking-wider mb-2">
                  LAYER 2
                </div>
                <div className="font-body text-brand-300 font-normal">
                  Runtime firewall
                </div>
                <div className="text-zinc-500 text-sm mt-2">
                  Enforce policy on every tool call as it happens. Catch runtime
                  arguments, secrets, dangerous commands. (mcpwall)
                </div>
              </div>

              <div className="tm-card">
                <div className="font-mono text-[11px] text-zinc-600 tracking-wider mb-2">
                  LAYER 3
                </div>
                <div className="font-body text-zinc-200 font-normal">
                  Container isolation
                </div>
                <div className="text-zinc-500 text-sm mt-2">
                  Limit blast radius by running MCP servers in containers or
                  sandboxes.
                </div>
              </div>
            </Stagger>
          </div>
        </section>

        <SectionLine variant="brand" />

        {/* ========== WHAT'S NEXT ========== */}
        <section id="whats-next" className="px-4 sm:px-6 py-16 sm:py-20 md:py-28">
          <div className="max-w-4xl mx-auto">
            <FadeUp>
              <div className="font-mono text-[11px] text-brand-500/60 tracking-widest uppercase mb-4">
                05 / What&rsquo;s Next
              </div>
              <h2 className="font-display font-normal text-2xl md:text-3xl tracking-tight text-zinc-100 mb-4">
                Closing the gaps
              </h2>
              <p className="prose-body mb-8 max-w-2xl">
                Every &ldquo;not covered&rdquo; item above has a plan:
              </p>
            </FadeUp>

            <FadeUp className="space-y-3">
              {roadmap.map((item) => (
                <div
                  key={item.version}
                  className="flex items-center gap-4 py-3 border-b border-white/5"
                >
                  <code className="text-brand-400 text-sm shrink-0">
                    {item.version}
                  </code>
                  <span className="font-body text-zinc-300">
                    {item.feature}
                  </span>
                </div>
              ))}
            </FadeUp>

            <FadeUp className="mt-12">
              <div className="cta-box">
                <div className="font-body text-zinc-300 text-[15px] mb-3">
                  The full threat model includes component-by-component analysis,
                  all default rule details, severity ratings, and the complete
                  list of assumptions.
                </div>
                <Link
                  href="/threat-model"
                  className="inline-flex items-center gap-2 font-mono text-sm text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Read the full threat model &rarr;
                </Link>
              </div>
            </FadeUp>
          </div>
        </section>
      </article>

      <Footer variant="blog" />
    </>
  );
}
