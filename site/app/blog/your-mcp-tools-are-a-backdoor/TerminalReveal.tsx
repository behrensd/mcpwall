"use client";

import { useEffect, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";

interface TerminalRevealProps {
  id: string;
  children: React.ReactNode;
  /** Callback fired after last line reveals. Receives total ms elapsed. */
  onComplete?: (totalMs: number) => void;
}

export default function TerminalReveal({
  id,
  children,
  onComplete,
}: TerminalRevealProps) {
  const revealed = useRef(false);
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });

  const reveal = useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;

    const container = document.getElementById(id);
    if (!container) return;

    const lines = container.querySelectorAll<HTMLElement>(".terminal-line");
    let maxDelay = 0;

    lines.forEach((line) => {
      const delay = parseInt(line.dataset.delay ?? "0", 10);
      if (delay > maxDelay) maxDelay = delay;

      setTimeout(() => {
        line.classList.add("revealed");

        // Breach flash: if this line has id="breach-line"
        if (
          line.classList.contains("breach-line") &&
          line.id === "breach-line"
        ) {
          setTimeout(() => {
            container
              .querySelectorAll(".breach-line")
              .forEach((bl) => bl.classList.add("flash"));
          }, 600);
        }
      }, delay);
    });

    if (onComplete) {
      setTimeout(() => onComplete(maxDelay + 500), maxDelay + 500);
    }
  }, [id, onComplete]);

  useEffect(() => {
    if (inView) reveal();
  }, [inView, reveal]);

  return (
    <div ref={ref} id={id}>
      {children}
    </div>
  );
}
