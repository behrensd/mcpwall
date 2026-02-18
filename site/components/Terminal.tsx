interface TerminalProps {
  title?: string;
  variant?: "default" | "danger" | "safe";
  children: React.ReactNode;
  className?: string;
}

export default function Terminal({
  title,
  variant = "default",
  children,
  className = "",
}: TerminalProps) {
  const variantClass =
    variant === "danger"
      ? "terminal-danger"
      : variant === "safe"
        ? "terminal-safe"
        : "";

  return (
    <div className={`terminal ${variantClass} ${className}`}>
      <div className="terminal-bar">
        <div className="terminal-dot" style={{ background: "#ff5f57" }} />
        <div className="terminal-dot" style={{ background: "#febc2e" }} />
        <div className="terminal-dot" style={{ background: "#28c840" }} />
        {title && (
          <span
            className={`text-xs font-mono ml-2 ${
              variant === "danger"
                ? "text-danger-400/60"
                : variant === "safe"
                  ? "text-brand-500/60"
                  : "text-zinc-500"
            }`}
          >
            {title}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
