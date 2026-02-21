"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MobileNavProps {
  links: { href: string; label: string }[];
}

export default function MobileNav({ links }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const close = useCallback(() => setOpen(false), []);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  return (
    <>
      {/* Hamburger / X toggle */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="sm:hidden flex flex-col justify-center items-center w-8 h-8 relative"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        <span
          className="block w-5 h-0.5 bg-zinc-400 transition-all duration-300 absolute"
          style={{
            transform: open
              ? "rotate(45deg)"
              : "translateY(-4px)",
          }}
        />
        <span
          className="block w-5 h-0.5 bg-zinc-400 transition-all duration-300 absolute"
          style={{
            opacity: open ? 0 : 1,
            transform: open ? "scaleX(0)" : "scaleX(1)",
          }}
        />
        <span
          className="block w-5 h-0.5 bg-zinc-400 transition-all duration-300 absolute"
          style={{
            transform: open
              ? "rotate(-45deg)"
              : "translateY(4px)",
          }}
        />
      </button>

      {/* Slide menu - positioned relative to the <nav> parent */}
      {open && (
        <div
          className="sm:hidden fixed left-0 right-0 border-t border-white/5 z-50"
          style={{
            top: "57px",
            background: "rgba(9,9,11,0.95)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="px-6 py-4 flex flex-col gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors font-body py-1"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://github.com/behrensd/mcpwall"
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors font-body py-1"
            >
              GitHub
            </a>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="sm:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={close}
        />
      )}
    </>
  );
}
