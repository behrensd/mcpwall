"use client";

import { useEffect, useState } from "react";

interface ProgressBarProps {
  gradient?: string;
}

export default function ProgressBar({ gradient }: ProgressBarProps) {
  const [width, setWidth] = useState(0);
  const [bgPos, setBgPos] = useState("100% 0");

  useEffect(() => {
    function update() {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setWidth(progress);
      if (gradient) {
        setBgPos(`${100 - progress}% 0`);
      }
    }
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [gradient]);

  return (
    <div
      className="progress-bar"
      style={{
        width: `${width}%`,
        background: gradient || "#06b6d4",
        backgroundSize: gradient ? "250% 100%" : undefined,
        backgroundPosition: gradient ? bgPos : undefined,
      }}
    />
  );
}
