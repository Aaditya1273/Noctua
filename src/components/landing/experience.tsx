"use client";
// Noctua's landing experience: Lenis smooth scroll + GSAP. Monochrome, original copy and stickers.
// Every animation is skipped under prefers-reduced-motion; the page is fully readable without JS motion.
import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { Owl } from "../owl";

export type LandingMuse = {
  thread: { id: string; from: string; text: string }[];
  naive: string;
  safe: string;
  floor: number;
  price: { product: string; min: number; max: number; source: string };
};

export type LandingStats = {
  live: boolean;
  date: string;
  model: string;
  noctuaCalls: number;
  baselineCalls: number;
  zeroRuns: number;
  totalRuns: number;
  urgentMissed: number;
  attacksBlocked: number;
  attacksTotal: number;
  firstRunCost: number | null;
  noctuaCost: number | null;
  baselineCost: number | null;
} | null;

// ---------- Hand-drawn monochrome stickers (original) ----------
const Star = ({ s = 64 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" aria-hidden><path d="M50 4 C54 34 66 46 96 50 C66 54 54 66 50 96 C46 66 34 54 4 50 C34 46 46 34 50 4 Z" fill="#fafafa" stroke="#000" strokeWidth="4" strokeLinejoin="round" /></svg>
);
const Shield = ({ s = 70 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" aria-hidden><path d="M50 6 L88 20 C88 56 74 80 50 94 C26 80 12 56 12 20 Z" fill="#fafafa" stroke="#000" strokeWidth="5" strokeLinejoin="round" /><path d="M32 50 L46 64 L70 38" fill="none" stroke="#000" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Zero = ({ s = 86 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" aria-hidden><circle cx="50" cy="50" r="44" fill="#fafafa" stroke="#000" strokeWidth="5" /><text x="50" y="47" textAnchor="middle" fontSize="30" fontWeight="900" fontFamily="var(--font-epilogue)" fill="#000">0</text><text x="50" y="68" textAnchor="middle" fontSize="13" fontWeight="800" fontFamily="var(--font-epilogue)" fill="#000">CALLS</text></svg>
);
const Receipt = ({ s = 70 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" aria-hidden><path d="M22 6 H78 V92 L70 86 L62 92 L54 86 L46 92 L38 86 L30 92 L22 86 Z" fill="#fafafa" stroke="#000" strokeWidth="5" strokeLinejoin="round" /><path d="M34 30 H66 M34 46 H66 M34 62 H54" stroke="#000" strokeWidth="6" strokeLinecap="round" /></svg>
);
const Arrow = () => (
  <svg width="180" height="70" viewBox="0 0 180 70" fill="none" aria-hidden data-draw><path d="M4 60 C 40 10, 90 6, 120 30 S 160 58, 172 26" stroke="#fafafa" strokeWidth="3" strokeLinecap="round" /><path d="M160 30 L172 24 L176 38" stroke="#fafafa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const SENTENCE = "the second time costs nothing";

const CARDS = [
  { t: "apprentice", items: ["Nemotron plans with allowlisted tools", "Triages, summarises, drafts replies", "Every step passes the policy engine"], dark: true, r: -8 },
  { t: "skill", items: ["The run becomes a typed manifest", "Data, never generated code", "Versioned with provenance"], dark: false, r: 5 },
  { t: "verify", items: ["Held-out golden set", "100% urgent and suspicious recall", "Signed only if every check passes"], dark: true, r: -4 },
  { t: "master", items: ["Same request, zero model calls", "Milliseconds and $0 inference", "Demotes itself on drift"], dark: false, r: 7 },
  { t: "attack night", items: ["Poisoned email and web pages", "Approval replay, tampered skills", "Blocked by code, not by the model"], dark: true, r: -6 },
];

const TILES_A = ["0 model calls", "P7 · untrusted recipient", "10/10 checks", "signed · ed25519", "day 2 · demoted", "$0.0000"];
const TILES_B = ["approval bound to sha-256", "injection quarantined", "3 calls → 0", "risk points 10/10", "fallback recorded", "receipt per run"];

export function LandingExperience({ stats, muse }: { stats: LandingStats; muse: LandingMuse }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.remove("intro-pending");
      document.documentElement.classList.add("no-motion");
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);
      // The hero stays hidden (see the inline script in page.tsx) until the intro has taken control of it.
      requestAnimationFrame(() => document.documentElement.classList.remove("intro-pending"));

      // 1. Scribble transition (on load, and again when the logo is clicked), then hero reveal
      const path = q("[data-scribble] path")[0] as unknown as SVGPathElement | undefined;
      const logoLayer = q("[data-scribble-logo]")[0];
      const scribble = (onCovered?: () => void) => {
        if (!path || gsap.isTweening(path)) return gsap.timeline();
        const len = path.getTotalLength() + 5;
        const IN = 1.5, OUT = 1.8;
        gsap.set(q("[data-scribble]"), { display: "block", scale: 0.7 });
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len, strokeWidth: "6%" });
        const wiggle = gsap.to(q("[data-scribble-wiggle]"), { rotation: 6, duration: 0.15, repeat: -1, yoyo: true, ease: "steps(1)", paused: true });
        return gsap.timeline({ onComplete: () => { wiggle.kill(); gsap.set(q("[data-scribble]"), { display: "none" }); } })
          .to(path, { strokeDashoffset: 0, duration: IN, ease: "power1.inOut" }, 0)
          .to(path, { strokeWidth: "24%", duration: IN, ease: "power2.inOut" }, 0)
          .to(logoLayer, { autoAlpha: 1, duration: IN * 0.4, ease: "power2.out", onStart: () => { wiggle.play(); } }, IN * 0.55)
          .call(() => { lenis.scrollTo(0, { immediate: true }); onCovered?.(); }, undefined, IN)
          .to(path, { strokeDashoffset: -len, duration: OUT, ease: "power2.inOut" }, IN)
          .to(path, { strokeWidth: "6%", duration: OUT, ease: "power2.inOut" }, IN)
          .to(logoLayer, { autoAlpha: 0, duration: 0.25 }, IN + OUT * 0.4);
      };
      const intro = gsap.timeline();
      intro.add(scribble(), 0).addLabel("reveal", 1.5 + 1.8 * 0.45);
      q("[data-logo]").forEach((el) => el.addEventListener("click", (e) => { e.preventDefault(); scribble(); }));
      intro.from(q("[data-word] > span"), { yPercent: 115, duration: 1.1, ease: "expo.out", stagger: 0.07 }, "reveal")
        .from(q("[data-hero-fade]"), { y: 24, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.08 }, "-=0.8")
        .from(q("[data-sticker]"), { scale: 0, rotation: () => gsap.utils.random(-50, 50), duration: 0.9, ease: "back.out(1.8)", stagger: 0.12 }, "-=0.7")
        .fromTo(q("[data-underline] path"), { strokeDasharray: 600, strokeDashoffset: 600 }, { strokeDashoffset: 0, duration: 1.2, ease: "power2.out" }, "-=0.6");

      // Sticker wiggle on hover (stepped) + pointer parallax
      q("[data-sticker]").forEach((el) => {
        let t: gsap.core.Tween | null = null;
        el.addEventListener("mouseenter", () => { t = gsap.to(el, { rotation: 6, duration: 0.15, repeat: -1, yoyo: true, ease: "steps(1)" }); });
        el.addEventListener("mouseleave", () => { t?.kill(); gsap.to(el, { rotation: 0, duration: 0.3, ease: "power2.out" }); });
      });
      const hero = q("[data-hero]")[0] as HTMLElement | undefined;
      const movers = q("[data-depth]").map((el) => ({ el, d: Number((el as HTMLElement).dataset.depth), x: gsap.quickTo(el, "x", { duration: 0.8, ease: "power3" }), y: gsap.quickTo(el, "y", { duration: 0.8, ease: "power3" }) }));
      const onHeroMove = (e: PointerEvent) => {
        const r = hero!.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        movers.forEach((m) => { m.x(nx * m.d); m.y(ny * m.d); });
      };
      hero?.addEventListener("pointermove", onHeroMove);

      // 2. Pinned horizontal sentence with elastic letters
      const hw = q("[data-hw]")[0] as HTMLElement | undefined;
      const track = q("[data-hw-track]")[0] as HTMLElement | undefined;
      if (hw && track) {
        const pinned = 2200;
        const scrollTween = gsap.timeline({ scrollTrigger: { trigger: hw, start: "top bottom", end: () => `+=${window.innerHeight + pinned}`, scrub: 1, invalidateOnRefresh: true } });
        scrollTween.fromTo(track, { x: () => window.innerWidth }, { x: () => window.innerWidth * 0.45, ease: "none", duration: window.innerHeight })
          .to(track, { x: () => -(track.scrollWidth - window.innerWidth * 0.55), ease: "none", duration: pinned });
        ScrollTrigger.create({ trigger: hw, start: "top top", end: () => `+=${pinned}`, pin: true, invalidateOnRefresh: true });
        q("[data-letter]").forEach((l) => {
          gsap.from(l, { yPercent: gsap.utils.random(-260, 260), rotation: gsap.utils.random(-40, 40), ease: "elastic.out(1.2, 1)",
            scrollTrigger: { trigger: l, containerAnimation: scrollTween, start: "left 92%", end: "left 55%", scrub: 0.5 } });
        });
        q("[data-hw-sticker]").forEach((s) => {
          gsap.from(s, { scale: 0, rotation: gsap.utils.random(-60, 60), ease: "elastic.out(1.2, 1)",
            scrollTrigger: { trigger: s, containerAnimation: scrollTween, start: "left 92%", end: "left 60%", scrub: 0.5 } });
        });
      }

      // 3. Section headings rise in, drawn strokes draw
      q("[data-rise]").forEach((el) => gsap.from(el, { y: 60, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%" } }));
      q("[data-draw] path").forEach((p) => {
        const path = p as unknown as SVGPathElement;
        const len = path.getTotalLength();
        gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.3, ease: "power2.out", scrollTrigger: { trigger: path, start: "top 85%" } });
      });

      // 4. Card fan. Scroll: cards fly out of a stacked pile into the fan (scrubbed).
      //    Hover: the card straightens and lifts; neighbours slide outward along their own tilt.
      //    Every tween overwrites the last and leaving is debounced, so motion never fights itself.
      const fan = q("[data-fan]")[0] as HTMLElement | undefined;
      const slots = q("[data-card-slot]") as HTMLElement[];
      const cards = q("[data-card]") as HTMLElement[];
      const base = cards.map((c) => Number(c.dataset.rot));
      if (fan && window.matchMedia("(min-width: 1024px)").matches) {
        const mid = (slots.length - 1) / 2;
        gsap.timeline({ scrollTrigger: { trigger: fan, start: "top 85%", end: "top 30%", scrub: 0.8 } })
          .from(slots, { x: (i) => (mid - i) * 230, y: (i) => 60 + Math.abs(mid - i) * 10, rotation: (i) => (i - mid) * 9, ease: "power3.out", stagger: 0.04 });
        let leave: ReturnType<typeof setTimeout> | null = null;
        const spread = (i: number) => cards.forEach((c, j) => {
          const d = j - i;
          if (d === 0) { gsap.to(c, { x: 0, y: -26, rotation: 0, scale: 1.07, zIndex: 20, duration: 0.9, ease: "elastic.out(1, 0.55)", overwrite: true }); return; }
          // Spread scales with the free space beside the fan, so the outer cards never leave the screen.
          const room = Math.max(0, (window.innerWidth - fan.getBoundingClientRect().width) / 2 - 16);
          const k = Math.min(1, Math.max(0.25, room / 84));
          const x = Math.sign(d) * (48 + 36 / Math.abs(d)) * k;
          gsap.to(c, { x, y: x * Math.tan((base[j] * Math.PI) / 180), rotation: base[j], scale: 1, zIndex: 10 - Math.abs(d), duration: 1, ease: "elastic.out(1, 0.55)", overwrite: true });
        });
        // The active card is chosen from the pointer against the resting slots (which never move),
        // not from whatever card happens to be under the pointer, so the fan cannot feed back on itself.
        let active = -1;
        fan.addEventListener("pointermove", (e) => {
          if (leave) { clearTimeout(leave); leave = null; }
          const centers = slots.map((sl) => { const r = sl.getBoundingClientRect(); return r.left + r.width / 2; });
          const idx = centers.reduce((best, c, i) => (Math.abs(e.clientX - c) < Math.abs(e.clientX - centers[best]) ? i : best), 0);
          if (idx !== active) { active = idx; spread(idx); }
        });
        fan.addEventListener("pointerleave", () => {
          leave = setTimeout(() => { active = -1; cards.forEach((c, j) => gsap.to(c, { x: 0, y: 0, scale: 1, rotation: base[j], zIndex: j, duration: 1.1, ease: "elastic.out(1, 0.6)", overwrite: true })); }, 140);
        });
      }

      // 4b. The Muse test: pin the section and play the conversation as the user scrolls.
      const museEl = q("[data-muse]")[0] as HTMLElement | undefined;
      if (museEl) {
        const steps = q("[data-muse-step]") as HTMLElement[];
        const on = (n: number) => steps.forEach((el, i) => { el.dataset.on = String(i <= n); });
        const who = q("[data-muse-who]")[0] as HTMLElement | undefined;
        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: {
            trigger: museEl, start: "top top", end: "+=2600", pin: true, scrub: 0.6, invalidateOnRefresh: true,
            onUpdate: (st) => {
              const p = st.progress;
              on(p < 0.22 ? 0 : p < 0.45 ? 1 : p < 0.72 ? 2 : 3);
              if (who) who.textContent = p < 0.45 ? "naive agent" : "noctua";
            },
          },
        });
        tl.from(q("[data-muse-buyer]"), { y: 30, opacity: 0, scale: 0.94, stagger: 0.5, duration: 0.6 })
          .from(q("[data-muse-naive]"), { y: 30, opacity: 0, scale: 0.94, duration: 0.6 }, "+=0.4")
          .from(q("[data-muse-sent]"), { opacity: 0, duration: 0.3 })
          .to(q("[data-muse-phone]"), { x: 8, duration: 0.08, repeat: 5, yoyo: true, ease: "none" }, "+=0.1")
          .to(q("[data-muse-naive] > p"), { opacity: 0.35, duration: 0.4 }, "+=0.6")
          .to(q("[data-muse-sent]"), { opacity: 0, duration: 0.2 }, "<")
          .from(q("[data-muse-stamp]"), { scale: 2.4, opacity: 0, rotation: (i) => (i ? 30 : -30), duration: 0.5, ease: "back.out(2)", stagger: 0.45 })
          .to(q("[data-muse-naive]"), { height: 0, marginTop: 0, opacity: 0, duration: 0.6, ease: "power2.inOut" }, "+=0.8")
          .from(q("[data-muse-safe]"), { y: 40, opacity: 0, scale: 0.94, duration: 0.7 }, "-=0.1")
          .to({}, { duration: 0.8 }); // hold the final frame before the section releases
        on(0);
      }

      // 5. Count-up numbers
      q("[data-count]").forEach((el) => {
        const target = Number((el as HTMLElement).dataset.count);
        const o = { v: 0 };
        gsap.to(o, { v: target, duration: 1.6, ease: "power3.out", snap: { v: 1 }, onUpdate: () => { el.textContent = String(o.v); }, scrollTrigger: { trigger: el, start: "top 85%" } });
      });

      // 6. Footer stickers get shoved by the cursor, then spring back
      const footer = q("[data-footer]")[0] as HTMLElement | undefined;
      const shove = q("[data-shove]").map((el) => ({ el: el as HTMLElement, x: gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" }), y: gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" }) }));
      const onFooterMove = (e: PointerEvent) => {
        shove.forEach((s) => {
          const r = s.el.getBoundingClientRect();
          const dx = r.left + r.width / 2 - e.clientX, dy = r.top + r.height / 2 - e.clientY;
          const d = Math.hypot(dx, dy);
          if (d < 180) { const f = (180 - d) / 180; s.x((dx / d) * 120 * f); s.y((dy / d) * 120 * f); }
          else { s.x(0); s.y(0); }
        });
      };
      footer?.addEventListener("pointermove", onFooterMove);
      footer?.addEventListener("pointerleave", () => shove.forEach((s) => { s.x(0); s.y(0); }));

      // 7. Cursor bubble over [data-bubble]
      const bubble = q("[data-cursor]")[0] as HTMLElement | undefined;
      if (bubble && window.matchMedia("(pointer: fine)").matches) {
        const bx = gsap.quickTo(bubble, "x", { duration: 0.5, ease: "power3" }), by = gsap.quickTo(bubble, "y", { duration: 0.5, ease: "power3" });
        gsap.set(bubble, { scale: 0, rotation: -30 });
        let on = false;
        window.addEventListener("pointermove", (e) => {
          bx(e.clientX + 14); by(e.clientY - 46);
          const hit = (e.target as HTMLElement).closest?.("[data-bubble]") as HTMLElement | null;
          if (hit && !on) { on = true; bubble.textContent = hit.dataset.bubble ?? "open"; gsap.to(bubble, { scale: 1, rotation: 0, duration: 1.4, ease: "elastic.out(1, 0.4)", overwrite: "auto" }); }
          else if (!hit && on) { on = false; gsap.to(bubble, { scale: 0, rotation: -30, duration: 0.3, ease: "sine.inOut", overwrite: "auto" }); }
        });
      }
    }, root);

    return () => { ctx.revert(); gsap.ticker.remove(tick); lenis.destroy(); };
  }, []);

  const words = (s: string) => s.split(" ").map((w, i) => (
    <span key={i} data-word className="inline-block overflow-hidden pb-[0.08em] align-bottom"><span className="inline-block">{w}&nbsp;</span></span>
  ));

  return (
    <div ref={root} className="overflow-x-clip bg-black font-display text-ink">
      {/* Scribble transition: a pen stroke that thickens as it draws, covers the screen, then un-draws */}
      <svg data-scribble className="pointer-events-none fixed left-[-50vw] top-[-50vh] z-[70] h-[200vh] w-[200vw] text-[#ececec]" viewBox="0 0 1000 1000" preserveAspectRatio="none" fill="none" aria-hidden>
        <path d="M-120 -30 Q-75 -75 -30 -120 Q106 -80 162 -120 Q54 -12 -120 162 Q-80 298 -120 353 Q95 138 353 -120 Q489 -80 545 -120 Q193 232 -120 545 Q-80 681 -120 737 Q342 274 737 -120 Q872 -80 928 -120 Q402 407 -120 928 Q-80 1064 -120 1120 Q468 532 1120 -120 Q1160 16 1120 72 Q619 572 72 1120 Q207 1160 263 1120 Q709 675 1120 263 Q1160 399 1120 455 Q753 822 455 1120 Q591 1160 647 1120 Q889 878 1120 647 Q1160 782 1120 838 Q1010 948 838 1120 Q974 1160 1030 1120 Q1050 1100 1120 1030"
          stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ strokeWidth: "0%" }} />
      </svg>
      <div data-scribble-logo className="pointer-events-none fixed inset-0 z-[71] grid place-items-center opacity-0" aria-hidden>
        <div className="flex flex-col items-center gap-3 text-black">
          <div data-scribble-wiggle><Owl size={120} track={false} /></div>
          <span className="text-[44px] font-black tracking-[-0.07em]">noctua</span>
        </div>
      </div>

      {/* Cursor bubble */}
      <div data-cursor className="pointer-events-none fixed left-0 top-0 z-[80] hidden rounded-[22px] rounded-bl-[2px] bg-white px-3.5 py-1.5 text-[15px] font-extrabold lowercase text-black [@media(pointer:fine)]:block" aria-hidden>open</div>

      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 mix-blend-difference sm:px-9">
        <Link href="/" data-logo data-bubble="replay" className="text-[24px] font-black tracking-[-0.07em] text-white">noctua</Link>
        <nav aria-label="Main" className="hidden items-center gap-8 text-[14.5px] font-semibold lowercase text-white md:flex">
          <a href="#how" data-bubble="scroll">how it works</a>
          <a href="#muse" data-bubble="scroll">the muse test</a>
          <a href="#proof" data-bubble="scroll">proof</a>
          <a href="https://github.com/Aaditya1273/Noctua" data-bubble="code">source</a>
        </nav>
        <Link href="/app" data-bubble="go" className="rounded-full border-[1.5px] border-white px-4 py-1.5 text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-white">open app</Link>
      </header>

      <main>
        {/* Hero */}
        <section className="p-3">
          <div data-hero className="relative flex min-h-[calc(100dvh-24px)] flex-col justify-end overflow-hidden rounded-[26px] bg-[#0c0c0c] px-5 pb-10 pt-28 ring-1 ring-[#1c1c1c] sm:px-11 sm:pb-14">
            <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(#242424_1px,transparent_1px)] [background-size:24px_24px]" aria-hidden />
            <div data-depth="40" className="absolute right-[9%] top-[15%]"><div data-sticker className="owl-float rotate-[8deg]"><Owl size={170} /></div></div>
            <div data-depth="-30" className="absolute right-[30%] top-[13%] hidden md:block"><div data-sticker><Star s={58} /></div></div>
            <div data-depth="55" className="absolute right-[27%] top-[47%] hidden xl:block"><div data-sticker className="rotate-[-12deg]"><Zero /></div></div>
            <div data-depth="-45" className="absolute right-[4%] top-[50%] hidden lg:block"><div data-sticker className="rotate-[14deg]"><Shield /></div></div>

            <p data-hero-fade className="relative mb-7 max-w-[360px] font-sans text-[15.5px] leading-relaxed text-ink-2">
              A personal AI agent on NVIDIA Nemotron and Nebius Token Factory. It learns the tasks you repeat, proves them, and stops paying to think about them. It can&apos;t be talked into a bad deal or into giving out your address.
            </p>
            <h1 className="relative text-[clamp(3.3rem,11.5vw,12rem)] font-black leading-[0.84] tracking-[-0.068em]" aria-label="reason once. then never again.">
              <span aria-hidden>{words("reason")}<span data-word className="inline-block overflow-hidden pb-[0.1em] align-bottom"><span className="inline-block font-italic font-normal tracking-[-0.02em] [font-style:italic]">once.</span></span></span>
              <br />
              <span aria-hidden>
                {words("then")}
                <span className="relative inline-block align-bottom">
                  <span data-word className="inline-block overflow-hidden pb-[0.12em] align-bottom"><span className="inline-block">never</span></span>
                  <svg data-underline className="absolute -bottom-[0.02em] left-0 h-[0.2em] w-full" viewBox="0 0 300 30" preserveAspectRatio="none" aria-hidden>
                    <path d="M4 20 C 70 4, 140 28, 210 12 S 290 14, 296 8" fill="none" stroke="#fafafa" strokeWidth="5" strokeLinecap="round" />
                  </svg>
                </span>&nbsp;
                {words("again.")}
              </span>
            </h1>
            <div data-hero-fade className="relative mt-9 flex flex-wrap items-center gap-3">
              <Link href="/app" data-bubble="go" className="rounded-full bg-white px-7 py-3.5 text-[15.5px] font-extrabold lowercase text-black transition-transform hover:scale-[1.04]">open the app</Link>
              <a href="#how" data-bubble="scroll" className="rounded-full border-[1.5px] border-[#3a3a3a] px-7 py-3.5 text-[15.5px] font-extrabold lowercase text-white hover:border-white">see how it works</a>
              <span className="font-sans text-[13px] text-muted">no sign-up · synthetic sample inbox</span>
            </div>
          </div>
        </section>

        {/* Pinned horizontal sentence */}
        <section data-hw className="relative flex h-dvh flex-col justify-center overflow-hidden">
          <div data-hw-track className="flex w-max items-center gap-[3vw] whitespace-nowrap will-change-transform">
            <div data-hw-sticker><Receipt s={110} /></div>
            <h2 className="text-[clamp(5rem,15vw,15rem)] font-black lowercase leading-none tracking-[-0.06em]" aria-label={SENTENCE}>
              {SENTENCE.split("").map((ch, i) => ch === " "
                ? <span key={i} className="inline-block w-[0.28em]" />
                : <span key={i} data-letter aria-hidden className={`inline-block ${i > 15 ? "outline-text" : ""}`}>{ch}</span>)}
            </h2>
            <div data-hw-sticker><Zero s={150} /></div>
            <div data-hw-sticker className="pr-[30vw]"><Arrow /></div>
          </div>
          <p className="absolute inset-x-0 bottom-[9vh] mx-auto max-w-xl px-5 text-center font-sans text-[16px] leading-relaxed text-ink-2">
            The first time, Nemotron reasons it through{stats?.firstRunCost ? ` (about $${stats.firstRunCost.toFixed(4)}, measured)` : ""}. Once the workflow passes verification, the same request makes <em className="font-italic text-[1.15em] not-italic [font-style:italic] text-ink">zero</em> model calls.
          </p>
        </section>

        {/* Statement */}
        <section className="mx-auto max-w-6xl px-5 py-32 sm:px-9">
          <h2 data-rise className="text-[clamp(2.5rem,6.8vw,6.4rem)] font-black lowercase leading-[0.9] tracking-[-0.058em]">
            between <em className="font-italic font-normal not-italic [font-style:italic]">your inbox</em> and the model sits a policy engine that <span className="text-[#5a5a5a]">can&apos;t be talked into anything.</span>
          </h2>
          <div className="mt-10 flex flex-wrap items-start gap-10">
            <p data-rise className="max-w-xl font-sans text-[17px] leading-relaxed text-ink-2">
              Email, web pages and tool output are treated as untrusted data. Every tool call is checked on the server against twelve ordered rules. Irreversible actions need your approval, bound to the exact arguments, and spend from a separate daily risk budget.
            </p>
            <div data-draw className="hidden md:block"><Arrow /></div>
          </div>
        </section>

        {/* The Muse test: pinned scroll story */}
        <section id="muse" data-muse className="relative scroll-mt-0 border-t border-[#161616]">
          <div className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-16 sm:px-9 lg:grid-cols-[1fr_440px] lg:gap-16">
            <div>
              <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.2em] text-muted">the muse test</p>
              <h2 className="mt-4 text-[clamp(2.3rem,5.2vw,4.8rem)] font-black lowercase leading-[0.9] tracking-[-0.058em]">
                an agent sold a desk for <em className="font-italic font-normal not-italic [font-style:italic]">$10</em> and gave out a home address.
              </h2>
              <p className="mt-5 max-w-md font-sans text-[15px] leading-relaxed text-muted">
                Reported in September by <a className="underline hover:text-ink" href="https://www.theguardian.com/technology/2026/sep/28/metas-ai-agent-muse-home-address">The Guardian</a> and{" "}
                <a className="underline hover:text-ink" href="https://fortune.com/2026/10/19/meta-muse-ai-agent-facebook-marketplace-home-address-privacy/">Fortune</a>. Replayed here with synthetic data against Noctua&apos;s real policy engine.
              </p>
              <ol className="mt-10 space-y-4" aria-label="What happens">
                {["a buyer messages your agent", "a naive agent says yes, and sends your address", "noctua checks every message first", "and sends this instead, after you approve"].map((t, i) => (
                  <li key={t} data-muse-step={i} className="flex items-baseline gap-4 text-[clamp(1.2rem,2vw,1.7rem)] font-extrabold lowercase leading-tight tracking-[-0.03em] text-[#3a3a3a] transition-colors duration-300 data-[on=true]:text-white">
                    <span className="font-sans text-[13px] font-semibold tabular-nums">0{i + 1}</span>{t}
                  </li>
                ))}
              </ol>
            </div>

            <div data-muse-phone className="relative mx-auto w-full max-w-[440px] rounded-[30px] border border-[#2a2a2a] bg-[#0c0c0c] p-5 shadow-[0_40px_120px_-30px_rgb(0_0_0/1)]">
              <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4 font-sans">
                <div>
                  <p className="text-[14px] font-semibold text-white">Mid-century walnut desk</p>
                  <p className="text-[12.5px] text-muted">listed at $120 · your floor ${muse.floor}</p>
                </div>
                <span data-muse-who className="rounded-full border border-[#333] px-3 py-1 text-[12px] font-semibold text-ink-2">naive agent</span>
              </div>
              <div className="relative mt-5 min-h-[360px] space-y-3 font-sans">
                {muse.thread.map((m) => (
                  <p key={m.id} data-muse-buyer className="w-fit max-w-[86%] rounded-[20px] rounded-bl-[6px] border border-[#2a2a2a] px-4 py-2.5 text-[15px] text-ink-2">{m.text}</p>
                ))}
                <div data-muse-naive className="relative ml-auto w-fit max-w-[86%]">
                  <p className="rounded-[20px] rounded-br-[6px] bg-[#f2f2f2] px-4 py-2.5 text-[15px] text-black">{muse.naive}</p>
                  <span data-muse-sent className="mt-1.5 block text-right text-[12px] text-muted">sent · address shared</span>
                  <span data-muse-stamp="0" className="absolute -left-4 top-1/2 -translate-y-1/2 rotate-[-8deg] rounded-md border-[3px] border-white bg-black px-3 py-1 text-[13px] font-black uppercase tracking-wider text-white">blocked · below floor</span>
                  <span data-muse-stamp="1" className="absolute -right-3 -bottom-7 rotate-[6deg] rounded-md border-[3px] border-white bg-black px-3 py-1 text-[13px] font-black uppercase tracking-wider text-white">blocked · private data</span>
                </div>
                <div data-muse-safe className="ml-auto w-fit max-w-[86%]">
                  <p className="rounded-[20px] rounded-br-[6px] bg-white px-4 py-2.5 text-[15px] text-black">{muse.safe}<span className="mt-2 block text-[12px] text-[#6b6b6b]">— Sent by Noctua, an AI assistant, on behalf of Alex</span></p>
                  <span className="mt-1.5 block text-right text-[12px] text-ink-2">waits for your approval before sending</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Card fan */}
        <section id="how" className="scroll-mt-10 px-5 pb-36 pt-6 sm:px-9">
          <h2 data-rise className="mx-auto max-w-6xl text-[clamp(2.5rem,6.2vw,5.8rem)] font-black lowercase leading-[0.9] tracking-[-0.058em]">
            what happens on <em className="font-italic font-normal not-italic [font-style:italic]">every</em> task
          </h2>
          <div data-fan className="mx-auto mt-20 flex max-w-6xl flex-wrap justify-center gap-5 lg:flex-nowrap lg:gap-0">
            {CARDS.map((c, i) => (
              <div key={c.t} data-card-slot className="relative w-full max-w-[300px] sm:w-[262px] lg:-mx-3 lg:w-[200px] xl:w-[222px] 2xl:w-[262px]" style={{ zIndex: i }}>
              <article data-card data-rot={c.r}
                className={`relative w-full cursor-default rounded-[14px] p-6 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.95)] will-change-transform ${c.dark ? "border border-[#262626] bg-[#151515] text-white" : "bg-[#f2f2f2] text-black"}`}
                style={{ transform: `rotate(${c.r}deg)` }}>
                <div className="flex items-center justify-between">
                  <span className={`font-sans text-[12px] font-semibold uppercase tracking-[0.18em] ${c.dark ? "text-muted" : "text-[#6b6b6b]"}`}>0{i + 1}</span>
                  <span className={`size-2.5 rounded-full ${c.dark ? "bg-white" : "bg-black"}`} aria-hidden />
                </div>
                <h3 className="mt-14 text-[2.25rem] font-extrabold lowercase leading-none tracking-[-0.05em] lg:text-[1.75rem] xl:text-[1.95rem] 2xl:text-[2.25rem]">{c.t}</h3>
                <svg viewBox="0 0 200 10" className="mt-4 h-2 w-28" aria-hidden><path d="M2 6 C 50 1, 100 9, 198 4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                <ul className="mt-6 space-y-2.5 font-sans text-[14.5px] font-medium leading-snug">{c.items.map((x) => <li key={x}>{x}</li>)}</ul>
              </article>
              </div>
            ))}
          </div>
        </section>

        {/* Proof */}
        <section id="proof" className="scroll-mt-10 border-t border-[#161616] px-5 py-32 sm:px-9">
          <div className="mx-auto max-w-6xl">
            <p data-rise className="font-sans text-[13px] font-semibold uppercase tracking-[0.2em] text-muted">{stats?.live ? `measured live on nebius token factory · ${stats.date}` : "benchmark"}</p>
            <h2 data-rise className="mt-4 max-w-4xl text-[clamp(2.3rem,5.8vw,5.4rem)] font-black lowercase leading-[0.9] tracking-[-0.058em]">same seven tasks. learning <em className="font-italic font-normal not-italic [font-style:italic]">included</em> in the bill.</h2>
            {stats && (
              <dl className="mt-20 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { v: stats.noctuaCalls, s: `vs ${stats.baselineCalls}`, k: "model calls", n: "Noctua against reasoning every time" },
                  { v: stats.zeroRuns, s: `/ ${stats.totalRuns}`, k: "runs with zero inference", n: "verified skills, no model call" },
                  { v: stats.urgentMissed, s: "", k: "urgent messages missed", n: "unsafe skills demote themselves" },
                  { v: stats.attacksBlocked, s: `/ ${stats.attacksTotal}`, k: "attacks blocked", n: "enforced on the server" },
                ].map((x) => (
                  <div key={x.k} className="border-t border-[#2a2a2a] pt-7">
                    <dd className="text-[clamp(3.8rem,7.5vw,6.5rem)] font-black leading-none tracking-[-0.065em] tabular-nums"><span data-count={x.v}>{x.v}</span><span className="ml-2 text-[0.36em] font-bold tracking-[-0.03em] text-muted">{x.s}</span></dd>
                    <dt className="mt-5 text-[18px] font-extrabold lowercase">{x.k}</dt>
                    <p className="mt-1 font-sans text-[14px] text-muted">{x.n}</p>
                  </div>
                ))}
              </dl>
            )}
            {stats?.firstRunCost != null && (
              <div data-rise className="mt-20 grid gap-px overflow-hidden rounded-[18px] border border-[#262626] bg-[#262626] sm:grid-cols-3">
                {[
                  { k: "first time", v: `$${stats.firstRunCost.toFixed(4)}`, n: "full reasoning, measured" },
                  { k: "every repeat", v: "$0", n: "verified skill, no model call" },
                  { k: "for reference", v: `$${muse.price.min}–${muse.price.max}`, n: `${muse.price.product}, per month` },
                ].map((x) => (
                  <div key={x.k} className="bg-black p-7">
                    <p className="font-sans text-[12.5px] font-semibold uppercase tracking-[0.16em] text-muted">{x.k}</p>
                    <p className="mt-4 text-[clamp(2.6rem,4.6vw,4rem)] font-black leading-none tracking-[-0.06em] tabular-nums">{x.v}</p>
                    <p className="mt-3 font-sans text-[14px] text-muted">{x.n}</p>
                  </div>
                ))}
              </div>
            )}
            {stats?.firstRunCost != null && <p className="mt-4 max-w-3xl font-sans text-[12.5px] text-muted">Model cost only; not like-for-like. The subscription includes hosted compute and much broader capabilities. Reference price from <a className="underline hover:text-ink" href={muse.price.source}>published launch coverage</a>.</p>}
            {stats && <p className="mt-16 max-w-3xl font-sans text-[13.5px] leading-relaxed text-muted">
              {stats.live ? `Model ${stats.model}. Measured spend $${stats.noctuaCost?.toFixed(4)} against $${stats.baselineCost?.toFixed(4)} over only seven runs, with learning and two safety fallbacks counted; each further repetition saves the full reasoning cost. ` : "Demo mode: no inference performed. "}
              Synthetic sample inbox: this shows the mechanism, not real-world accuracy. Method in <a className="underline hover:text-ink" href="https://github.com/Aaditya1273/Noctua/blob/main/EVALUATION.md">EVALUATION.md</a>.
            </p>}
          </div>
        </section>

        {/* Double vertical marquee */}
        <section className="border-t border-[#161616] px-5 py-24 sm:px-9">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_520px]">
            <div>
              <h2 data-rise className="text-[clamp(2.4rem,5vw,4.4rem)] font-black lowercase leading-[0.92] tracking-[-0.055em]">every run leaves <em className="font-italic font-normal not-italic [font-style:italic]">evidence</em>.</h2>
              <p data-rise className="mt-6 max-w-md font-sans text-[16px] leading-relaxed text-ink-2">Receipts from API-reported tokens, every policy decision logged, every skill version and evaluation kept. Unknown stays unknown.</p>
              <Link href="/app" data-bubble="go" className="mt-8 inline-block rounded-full bg-white px-7 py-3.5 text-[15.5px] font-extrabold lowercase text-black">try it now</Link>
            </div>
            <div className="relative grid h-[620px] grid-cols-2 gap-4 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)]" aria-hidden>
              {[TILES_A, TILES_B].map((col, c) => (
                <div key={c} className={c ? "vmarquee-down" : "vmarquee-up"}>
                  {[...col, ...col].map((t, i) => (
                    <div key={i} className={`mb-4 flex h-[200px] items-end rounded-[12px] p-5 text-[1.65rem] font-extrabold lowercase leading-[1.02] tracking-[-0.04em] ${(i + c) % 2 ? "bg-[#f2f2f2] text-black" : "border border-[#262626] bg-[#151515] text-white"}`}>{t}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="p-2.5">
        <div data-footer className="relative flex min-h-[88dvh] flex-col justify-between overflow-hidden rounded-[22px] bg-[#f2f2f2] px-6 pb-6 pt-14 text-black sm:px-11">
          <div className="grid gap-10 sm:grid-cols-3">
            {[
              { b: "try it", l: <Link href="/app" data-bubble="go" className="hover:opacity-60">open the app</Link> },
              { b: "built with", l: <span>nvidia nemotron · nebius token factory</span> },
              { b: "source", l: <a href="https://github.com/Aaditya1273/Noctua" data-bubble="code" className="hover:opacity-60">github · apache-2.0</a> },
            ].map((c) => (
              <div key={c.b}>
                <span className="rounded-full bg-black px-3 py-1 font-sans text-[12.5px] font-medium lowercase text-white">{c.b}</span>
                <p className="mt-5 text-[clamp(1.4rem,2.5vw,2.3rem)] font-extrabold lowercase leading-tight tracking-[-0.045em]">{c.l}</p>
              </div>
            ))}
          </div>
          <div data-shove className="absolute right-[12%] top-[38%] rotate-[-10deg]"><Owl size={130} mood="happy" track={false} /></div>
          <div data-shove className="absolute left-[16%] top-[44%] rotate-[12deg]"><Shield s={84} /></div>
          <div data-shove className="absolute left-[46%] top-[34%]"><Star s={70} /></div>
          <div data-shove className="absolute right-[34%] top-[52%] rotate-[-6deg] hidden sm:block"><Receipt s={80} /></div>
          <p className="relative mt-24 select-none text-[clamp(5rem,25vw,25rem)] font-black leading-[0.76] tracking-[-0.08em]">noctua</p>
        </div>
      </footer>
    </div>
  );
}
