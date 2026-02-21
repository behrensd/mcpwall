interface FooterProps {
  variant?: "landing" | "blog";
}

export default function Footer({ variant = "landing" }: FooterProps) {
  if (variant === "blog") {
    return (
      <footer className="px-6 py-16 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <div className="font-body text-zinc-500 text-sm">
                <span className="text-zinc-400 font-normal">Dom Behrens</span>{" "}
                builds security tools for AI development workflows.
              </div>
              <div className="flex items-center gap-6 mt-4">
                <a
                  href="https://github.com/behrensd/mcpwall"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors font-mono"
                >
                  GitHub
                </a>
                <a
                  href="https://www.npmjs.com/package/mcpwall"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors font-mono"
                >
                  npm
                </a>
                <a
                  href="https://mcpwall.dev"
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors font-mono"
                >
                  mcpwall.dev
                </a>
              </div>
            </div>
            <div className="text-xs text-zinc-700 font-body leading-relaxed text-right">
              Apache-2.0
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="px-6 py-12 border-t border-white/5">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <span className="font-display font-normal text-sm text-zinc-500">
            mcpwall
          </span>
          <a
            href="https://github.com/behrensd/mcpwall"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/mcpwall"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            npm
          </a>
        </div>
        <div className="text-xs text-zinc-600 font-body text-center md:text-right leading-relaxed">
          Apache-2.0
          <br />
          mcpwall is not affiliated with or endorsed by Anthropic. MCP is
          maintained by the Agentic AI Foundation under the Linux Foundation.
        </div>
      </div>
    </footer>
  );
}
