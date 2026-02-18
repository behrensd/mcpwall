"use client";

import { useState, useEffect, useCallback } from "react";

interface TocItem {
  id: string;
  label: string;
}

interface TableOfContentsProps {
  items: TocItem[];
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(item.id);
          }
        },
        { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [items]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    },
    []
  );

  return (
    <div
      className="hidden min-[1440px]:block fixed top-20 z-40"
      style={{
        left: "max(1rem, calc(50vw - 42rem))",
        width: "9rem",
      }}
    >
      <nav className="space-y-0.5">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => handleClick(e, item.id)}
            className={`block font-mono text-[11px] leading-relaxed py-1 pl-3 border-l-2 transition-colors duration-200 ${
              activeId === item.id
                ? "text-brand-400 border-brand-400"
                : "text-zinc-600 border-transparent hover:text-zinc-400 hover:border-zinc-700"
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
