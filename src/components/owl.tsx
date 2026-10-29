"use client";
// Noctua's mascot. Pure SVG + CSS: eyes follow the pointer, blinks, and reflects agent state.
import { useEffect, useRef, useState } from "react";

export type OwlMood = "idle" | "thinking" | "happy" | "alert";

const IRIS: Record<OwlMood, string> = { idle: "#6ee7b7", thinking: "#93c5fd", happy: "#6ee7b7", alert: "#f87171" };

export function Owl({ size = 160, mood = "idle", track = true, className = "" }: { size?: number; mood?: OwlMood; track?: boolean; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!track || mood === "thinking") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height * 0.45);
        const d = Math.max(1, Math.hypot(dx, dy));
        const k = Math.min(1, d / 400);
        setLook({ x: (dx / d) * 5.5 * k, y: (dy / d) * 4.5 * k });
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(frame); };
  }, [track, mood]);

  const iris = IRIS[mood];
  const pupil = mood === "thinking" ? undefined : { transform: `translate(${look.x}px, ${look.y}px)`, transition: "transform 120ms ease-out" };

  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 200 200" className={`owl owl-${mood} ${className}`} role="img" aria-label={`Noctua owl, ${mood}`}>
      <defs>
        <radialGradient id="owl-body" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#2a2a31" />
          <stop offset="100%" stopColor="#0d0d10" />
        </radialGradient>
        <radialGradient id="owl-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={iris} stopOpacity="0.55" />
          <stop offset="100%" stopColor={iris} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="104" rx="92" ry="88" fill="url(#owl-glow)" className="owl-aura" />
      {/* body + ear tufts */}
      <path d="M44 62 L58 22 L80 52 Q100 44 120 52 L142 22 L156 62 Q176 92 168 134 Q156 182 100 186 Q44 182 32 134 Q24 92 44 62 Z" fill="url(#owl-body)" stroke="#3a3a43" strokeWidth="1.5" />
      {/* belly feathers */}
      <path d="M78 150 q6 6 12 0 q6 6 12 0 q6 6 12 0 M84 164 q6 6 12 0 q6 6 12 0" fill="none" stroke="#34343c" strokeWidth="2" strokeLinecap="round" />
      {/* facial discs */}
      <circle cx="74" cy="96" r="31" fill="#17171c" stroke="#2e2e36" />
      <circle cx="126" cy="96" r="31" fill="#17171c" stroke="#2e2e36" />
      {/* eyes */}
      {[74, 126].map((cx) => (
        <g key={cx} className="owl-eye">
          <circle cx={cx} cy="96" r="21" fill="#f5f5f6" />
          <g style={pupil} className={mood === "thinking" ? "owl-scan" : undefined}>
            <circle cx={cx} cy="96" r="12" fill={iris} />
            <circle cx={cx} cy="96" r="6.5" fill="#050506" />
            <circle cx={cx + 3.5} cy="92" r="2.4" fill="#fff" />
          </g>
          <rect x={cx - 23} y="73" width="46" height="46" fill="#17171c" className="owl-lid" style={{ transformOrigin: `${cx}px 73px` }} />
        </g>
      ))}
      {/* beak */}
      <path d="M93 116 L107 116 L100 131 Z" fill="#fbbf24" />
    </svg>
  );
}
