import { useEffect, useRef, useState, type ReactNode } from "react";
import { GripHorizontal, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Viewport-bounded panel dragging; the map keeps its native gesture handling. */
export function MapPanel({ title, side, onMinimize, children, hidden = false, className = "" }: {
  title: string; side: "left" | "right"; onMinimize: () => void; children: ReactNode; hidden?: boolean; className?: string;
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
      <GripHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
      <span className="flex-1 text-xs font-semibold">{title}</span>
      <Button variant="ghost" size="icon" className="size-7" aria-label={`تصغير ${title}`} title={`تصغير ${title}`} onClick={onMinimize}><Minus className="size-4" /></Button>
    </header>
    <div className="map-panel-body">{children}</div>
  </aside>;
}