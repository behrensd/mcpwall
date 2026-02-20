import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FadeUp from "@/components/FadeUp";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Security research and technical writing on MCP tool call security, AI agent threats, and runtime policy enforcement.",
  openGraph: {
    title: "Blog — mcpwall",
    description:
      "Security research and technical writing on MCP tool call security.",
    type: "website",
    url: "https://mcpwall.dev/blog",
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
    title: "Blog — mcpwall",
    description:
      "Security research and technical writing on MCP tool call security.",
    images: ["https://mcpwall.dev/og/blog-01-backdoor.png"],
  },
  alternates: {
    canonical: "https://mcpwall.dev/blog",
  },
};

const posts = [
  {
    slug: "owasp-mcp-top-10",
    title: "How mcpwall Maps to the OWASP MCP Top 10",
    description:
      "A line-by-line mapping of the OWASP MCP Top 10 security threats against mcpwall\u2019s default rules. 2 blocked, 3 partially mitigated, 5 out of scope.",
    date: "2026-02-18",
    tag: "OWASP",
    tagColor: "brand",
  },
  {
    slug: "your-mcp-tools-are-a-backdoor",
    title: "Your MCP Tools Are a Backdoor",
    description:
      "I let Claude Code install an MCP server. Three seconds later, it read my SSH private key. No warning, no prompt, no log entry.",
    date: "2026-02-17",
    tag: "attack research",
    tagColor: "danger",
  },
  {
    slug: "mcpwall-threat-model",
    title: "What mcpwall Does and Doesn\u2019t Protect Against",
    description:
      "A transparent look at mcpwall\u2019s security coverage: 8 attack classes blocked, 13 known limitations, and the assumptions we make.",
    date: "2026-02-18",
    tag: "threat model",
    tagColor: "brand",
  },
];

export default function BlogPage() {
  return (
    <>
      <Nav
        variant="sub-page"
        breadcrumb="blog"
        links={[
          { href: "/", label: "Home" },
          { href: "/threat-model", label: "Threat Model" },
        ]}
      />

      <main className="pt-28 sm:pt-32 pb-20 sm:pb-24 px-4 sm:px-6 md:px-12 max-w-4xl mx-auto">
        <FadeUp className="mb-16">
          <span className="font-mono text-xs text-brand-500 tracking-widest uppercase mb-4 block">
            Research &amp; Writing
          </span>
          <h1 className="font-display font-normal text-3xl sm:text-4xl md:text-5xl text-zinc-100 mb-4">
            Blog
          </h1>
          <p className="font-body text-zinc-500 text-lg max-w-xl">
            MCP security research, attack analysis, and runtime policy
            enforcement.
          </p>
        </FadeUp>

        <FadeUp delay="150ms" className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="post-card block rounded-xl p-6 md:p-8 no-underline"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono ${
                        post.tagColor === "danger"
                          ? "bg-danger-500/10 text-danger-400 border border-danger-500/20"
                          : "bg-brand-500/10 text-brand-400 border border-brand-500/20"
                      }`}
                    >
                      {post.tagColor === "danger" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-danger-400" />
                      )}
                      {post.tag}
                    </span>
                    <time
                      dateTime={post.date}
                      className="font-mono text-xs text-zinc-600"
                    >
                      {post.date}
                    </time>
                  </div>
                  <h2 className="font-display font-normal text-xl md:text-2xl text-zinc-100 mb-2">
                    {post.title}
                  </h2>
                  <p className="font-body text-zinc-500 text-sm md:text-base leading-relaxed">
                    {post.description}
                  </p>
                </div>
                <div className="flex-shrink-0 text-zinc-600 md:pt-8">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </FadeUp>
      </main>

      <Footer variant="blog" />
    </>
  );
}
