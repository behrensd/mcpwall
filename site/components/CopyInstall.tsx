"use client";

import { useState, useCallback } from "react";

interface CopyInstallProps {
  command: string;
  className?: string;
}

export default function CopyInstall({ command, className = "" }: CopyInstallProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [command]);

  return (
    <div
      className={`install-box ${copied ? "copied" : ""} ${className}`}
      onClick={handleCopy}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleCopy()}
    >
      <span>
        <span className="text-zinc-500">$</span> {command}
      </span>
      <span
        className="text-xs"
        style={{ color: copied ? "#22c55e" : undefined }}
      >
        {copied ? "copied!" : "click to copy"}
      </span>
    </div>
  );
}
