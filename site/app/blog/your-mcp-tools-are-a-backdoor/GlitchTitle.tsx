"use client";

import { useEffect, useRef } from "react";

interface GlitchTitleProps {
  text: string;
  className?: string;
}

export default function GlitchTitle({ text, className = "" }: GlitchTitleProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const t1 = setTimeout(() => {
      el.classList.add("glitching");
      setTimeout(() => el.classList.remove("glitching"), 300);
    }, 800);

    const t2 = setTimeout(() => {
      el.classList.add("glitching");
      setTimeout(() => el.classList.remove("glitching"), 200);
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <h1
      ref={ref}
      className={`glitch-title ${className}`}
      data-text={text}
      dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, "<br>") }}
    />
  );
}
