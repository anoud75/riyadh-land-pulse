import { useEffect, useRef, useState } from "react";
import orbMp4 from "@/assets/sarj-orb.mp4.asset.json";
import orbWebm from "@/assets/sarj-orb.webm.asset.json";
import { cn } from "@/lib/utils";

/**
 * The assistant orb: the looping clip, multiplied onto the page so its white
 * backdrop disappears. Falls back to a soft disc if the clip can't load, and
 * holds a still frame when the visitor asks for reduced motion.
 */
export function SarjOrb({ className }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      v.currentTime = 3.2;
      return;
    }
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [failed]);

  return (
    <span className={cn("sarj-orb", className)}>
      {failed ? (
        <span className="sarj-orb-fallback" aria-hidden="true" />
      ) : (
        <video
          ref={ref}
          className="sarj-orb-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          tabIndex={-1}
          aria-hidden="true"
          onError={() => setFailed(true)}
        >
          <source src={orbWebm.url} type="video/webm" />
          <source src={orbMp4.url} type="video/mp4" />
        </video>
      )}
    </span>
  );
}
