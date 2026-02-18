"use client";

import { useInView } from "react-intersection-observer";

interface FadeUpProps {
  children: React.ReactNode;
  className?: string;
  delay?: string;
}

export default function FadeUp({
  children,
  className = "",
  delay,
}: FadeUpProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: "0px 0px -40px 0px",
  });

  return (
    <div
      ref={ref}
      className={`fade-up ${inView ? "visible" : ""} ${className}`}
      style={delay ? { transitionDelay: delay } : undefined}
    >
      {children}
    </div>
  );
}
