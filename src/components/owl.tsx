"use client";
// Noctua's mascot: a small round monochrome owl. Moods change the eyes, never the colours.
import { useEffect, useRef, useState } from "react";

export type OwlMood = "idle" | "thinking" | "happy" | "alert";

export function Owl({ size = 120, mood = "idle", track = true, className = "" }: { size?: number; mood?: OwlMood; track?: boolean; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!track || mood !== "idle") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const d = Math.max(1, Math.hypot(dx, dy));
        const k = Math.min(1, d / 360);
        setLook({ x: (dx / d) * 6 * k, y: (dy / d) * 5 * k });
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(frame); };
  }, [track, mood]);

  const offset = mood === "thinking" ? { x: 4, y: -6 } : mood === "idle" ? look : { x: 0, y: 0 };
  const pupil = { transform: `translate(${offset.x}px, ${offset.y}px)`, transition: "transform 140ms ease-out" };

  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 200 200" className={`owl owl-${mood} ${className}`} role="img" aria-label={`Noctua, ${mood}`}>
      {/* ear tufts */}
      <path d="M52 58 Q50 30 70 40 L82 52 Z" fill="#2a2a2a" />
      <path d="M148 58 Q150 30 130 40 L118 52 Z" fill="#2a2a2a" />
      {/* body */}
      <ellipse cx="100" cy="112" rx="70" ry="68" fill="#1c1c1c" stroke="#3a3a3a" strokeWidth="1.5" />
      {/* belly */}
      <ellipse cx="100" cy="142" rx="38" ry="30" fill="#262626" />
      <path d="M86 140 q4 4 8 0 q4 4 8 0 q4 4 8 0 M90 152 q4 4 8 0 q4 4 8 0" fill="none" stroke="#3a3a3a" strokeWidth="2" strokeLinecap="round" />
      {/* wings */}
      <path d="M34 110 Q26 140 46 160" fill="none" stroke="#3a3a3a" strokeWidth="3" strokeLinecap="round" />
      <path d="M166 110 Q174 140 154 160" fill="none" stroke="#3a3a3a" strokeWidth="3" strokeLinecap="round" />
      {/* eyes */}
      {[74, 126].map((cx) => (
        <g key={cx}>
          {mood === "happy" ? (
            <path d={`M${cx - 15} 96 Q${cx} 80 ${cx + 15} 96`} fill="none" stroke="#fafafa" strokeWidth="5" strokeLinecap="round" />
          ) : (
            <>
              <circle cx={cx} cy="92" r={mood === "alert" ? 24 : 22} fill="#fafafa" />
              <g style={pupil}>
                <circle cx={cx} cy="92" r={mood === "alert" ? 8 : 11} fill="#0a0a0a" />
                <circle cx={cx + 4} cy="87" r="3.2" fill="#fafafa" />
              </g>
              <rect x={cx - 25} y="67" width="50" height="50" fill="#1c1c1c" className="owl-lid" style={{ transformOrigin: `${cx}px 67px` }} />
            </>
          )}
          {mood === "alert" && <path d={`M${cx - 18} ${cx < 100 ? 60 : 64} L${cx + 18} ${cx < 100 ? 64 : 60}`} stroke="#fafafa" strokeWidth="4" strokeLinecap="round" />}
        </g>
      ))}
      {/* beak */}
      <path d="M94 112 Q100 104 106 112 Q100 124 94 112 Z" fill="#8f8f8f" />
    </svg>
  );
}
