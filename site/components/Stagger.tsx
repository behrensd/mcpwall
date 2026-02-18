"use client";

import { useInView } from "react-intersection-observer";

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
}

export default function Stagger({ children, className = "" }: StaggerProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: "0px 0px -40px 0px",
  });

  return (
    <div ref={ref} className={`stagger ${inView ? "visible" : ""} ${className}`}>
      {children}
    </div>
  );
}
