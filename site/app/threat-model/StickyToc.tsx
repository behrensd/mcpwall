"use client";

import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  label: string;
}

interface StickyTocProps {
  items: TocItem[];
}

export default function StickyToc({ items }: StickyTocProps) {
  const [active, setActive] = useState("");

  useEffect(() => {
    function update() {
      let current = "";
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.4) {
            current = item.id;
          }
        }
      }
      setActive(current);
    }

    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [items]);

  return (
    <div className="sticky-toc">
      <div className="font-mono text-[10px] text-zinc-600 tracking-widest uppercase mb-4">
        On this page
      </div>
      <nav>
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`toc-link ${active === item.id ? "active" : ""}`}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
