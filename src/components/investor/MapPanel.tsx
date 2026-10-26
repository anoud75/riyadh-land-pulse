import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GripHorizontal, Minus } from "lucide-react";
import assistantIcon from "@/assets/sarj-assistant.png.asset.json";
import { Button } from "@/components/ui/button";

/** Viewport-bounded panel dragging; the map keeps its native gesture handling. */
export function MapPanel({ title, side, onMinimize, children, hidden = false, className = "", icon = false }: {
  title: string; side: "left" | "right"; onMinimize: () => void; children: ReactNode; hidden?: boolean; className?: string; icon?: boolean;
}) {
  const panel = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    const resize = () => setPosition(null);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  return <aside ref={panel} className={`map-floating-panel map-panel-${side} ${className}`} aria-label={title} hidden={hidden}
    style={position ? { left: position.left, top: position.top, right: "auto", bottom: "auto" } : undefined}>
    <header className="map-panel-handle" onPointerDown={(e) => {
      if ((e.target as HTMLElement).closest("button") || e.button !== 0) return;
      const rect = panel.current?.getBoundingClientRect();
      if (!rect) return;
      drag.current = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
      e.currentTarget.setPointerCapture(e.pointerId);
    }} onPointerMove={(e) => {
      const start = drag.current; const rect = panel.current?.getBoundingClientRect();
      if (!start || !rect) return;
      setPosition({ left: Math.max(8, Math.min(window.innerWidth - rect.width - 8, start.left + e.clientX - start.x)), top: Math.max(8, Math.min(window.innerHeight - rect.height - 8, start.top + e.clientY - start.y)) });
    }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      {icon ? <img src={assistantIcon.url} alt="" aria-hidden="true" className="size-7 shrink-0 object-contain" /> : <GripHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />}
      <span className="flex-1 text-xs font-semibold">{title}</span>
      <Button variant="ghost" size="icon" className="size-7" aria-label={`تصغير ${title}`} title={`تصغير ${title}`} onClick={onMinimize}><Minus className="size-4" /></Button>
    </header>
    <PanelBody>{children}</PanelBody>
  </aside>;
}

/** Scroll area with an always-visible, draggable scrollbar so hidden content is discoverable. */
function PanelBody({ children }: { children: ReactNode }) {
  const scroll = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; top: number } | null>(null);
  const [geo, setGeo] = useState({ top: 0, max: 0, thumb: 0, track: 0, over: false });

  const measure = useCallback(() => {
    const el = scroll.current;
    if (!el) return;
    // A hidden panel measures 0×0: keep every value finite (NaN never equals itself,
    // which would make the guard below re-render forever).
    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    const over = max > 4;
    const trackH = track.current?.clientHeight || el.clientHeight || 0;
    const ratio = el.scrollHeight > 0 ? el.clientHeight / el.scrollHeight : 1;
    const thumb = Math.max(28, Math.round(ratio * trackH));
    setGeo((p) => (p.top === el.scrollTop && p.max === max && p.thumb === thumb && p.track === trackH && p.over === over ? p : { top: el.scrollTop, max, thumb, track: trackH, over }));
  }, []);

  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener("scroll", measure, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener("scroll", measure); };
  }, [measure]);
  useEffect(measure);

  const jump = (clientY: number) => {
    const el = scroll.current, tr = track.current;
    if (!el || !tr) return;
    const rect = tr.getBoundingClientRect();
    el.scrollTo({ top: ((clientY - rect.top) / rect.height) * el.scrollHeight - el.clientHeight / 2, behavior: "smooth" });
  };

  return (
    <div className="map-panel-body">
      <div className="map-panel-scroll" ref={scroll}>{children}</div>
      {geo.over && (
        <div className="map-scroll-track" ref={track} aria-hidden="true"
          onPointerDown={(e) => { if ((e.target as HTMLElement).dataset["thumb"]) return; jump(e.clientY); }}>
          <div data-thumb="1" className="map-scroll-thumb"
            style={{ height: geo.thumb, transform: `translateY(${geo.max ? (geo.top / geo.max) * (geo.track - geo.thumb) : 0}px)` }}
            onPointerDown={(e) => {
              e.stopPropagation();
              const el = scroll.current; if (!el) return;
              drag.current = { y: e.clientY, top: el.scrollTop };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const el = scroll.current, start = drag.current;
              if (!el || !start || geo.track <= geo.thumb) return;
              el.scrollTop = start.top + ((e.clientY - start.y) / (geo.track - geo.thumb)) * geo.max;
            }}
            onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} />
        </div>
      )}
    </div>
  );
}
