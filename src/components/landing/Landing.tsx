import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Parcel } from "@/data/types";

export function NoiseOverlay() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full opacity-[0.07] mix-blend-overlay">
      <filter id="sarj-noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#sarj-noise)" />
    </svg>
  );
}

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`landing-reveal ${seen ? "is-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export function KineticHeadline({ text, className = "" }: { text: string; className?: string }) {
  return (
    <h1 className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="landing-word" style={{ animationDelay: `${120 + i * 70}ms` }}>
          {w}{" "}
        </span>
      ))}
    </h1>
  );
}

export function CountUp({ value }: { value: number | null }) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen || value == null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(value);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 1200);
      setN(value * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, value]);
  const shown = value == null ? "—" : Number.isInteger(value) ? Math.round(n).toLocaleString("en-US") : n.toFixed(1);
  return <span ref={ref}>{shown}</span>;
}

export function AnimatedList({ items }: { items: { title: string; meta: string }[] }) {
  const [ref, seen] = useInView<HTMLUListElement>();
  return (
    <ul ref={ref} className="space-y-3">
      {items.map((it, i) => (
        <li
          key={it.title}
          className={`landing-reveal ${seen ? "is-in" : ""} flex items-start gap-4 rounded-2xl border border-ink-line bg-ink-foreground/[0.03] px-5 py-4`}
          style={{ transitionDelay: `${i * 260}ms` }}
        >
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary-soft" />
          <div>
            <div className="text-sm text-ink-foreground">{it.title}</div>
            <div className="mt-1 text-xs text-ink-muted">{it.meta}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Dotted Riyadh field; parcel locations glow on top of a regular dot grid. */
export function DottedRiyadhMap({ parcels }: { parcels: Parcel[] }) {
  const pts = parcels.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const lats = pts.map((p) => p.lat), lngs = pts.map((p) => p.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const W = 400, H = 400, pad = 40;
  const x = (lng: number) => pad + ((lng - minLng) / (maxLng - minLng || 1)) * (W - pad * 2);
  const y = (lat: number) => H - pad - ((lat - minLat) / (maxLat - minLat || 1)) * (H - pad * 2);
  const grid: [number, number][] = [];
  for (let gx = 10; gx < W; gx += 14)
    for (let gy = 10; gy < H; gy += 14) {
      const d = Math.hypot(gx - W / 2, (gy - H / 2) * 1.1);
      if (d < 185) grid.push([gx, gy]);
    }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="size-full" aria-label="مواقع أراضي المحفظة في الرياض">
      {grid.map(([gx, gy], i) => (
        <circle key={i} cx={gx} cy={gy} r={1.1} fill="currentColor" opacity={0.16} />
      ))}
      {pts.map((p, i) => (
        <circle
          key={p.parcel_id}
          cx={x(p.lng)}
          cy={y(p.lat)}
          r={p.status === "available" ? 2.6 : 1.8}
          fill={p.status === "available" ? "var(--primary-soft)" : "currentColor"}
          opacity={p.status === "available" ? 0.95 : 0.4}
          className={p.status === "available" ? "landing-pulse" : ""}
          style={{ animationDelay: `${(i % 12) * 400}ms` }}
        />
      ))}
    </svg>
  );
}
