"use client";

import { useEffect, useRef } from "react";

export default function PhaseShift() {
  const shifted = useRef(false);

  useEffect(() => {
    const target = document.getElementById("phase-shift");
    const overlay = document.getElementById("phase-transition");
    if (!target || !overlay) return;

    function check() {
      if (shifted.current) return;
      const rect = target!.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.6) {
        shifted.current = true;
        document.body.classList.add("phase-safe");
        overlay!.classList.add("flash");
        setTimeout(() => overlay!.classList.remove("flash"), 1000);
      }
    }

    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  return (
    <>
      <div className="glow-danger" />
      <div className="glow-safe" />
      <div id="phase-transition" className="phase-transition" />
    </>
  );
}
