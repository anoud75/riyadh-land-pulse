/** Category icons drawn on canvas and registered as Mapbox images (browser only; call after map style loads). */
import type mapboxgl from "mapbox-gl";

export const PLACE_ICON: Record<string, { emoji: string; color: string }> = {
  hospital: { emoji: "🏥", color: "#e11d48" }, pharmacy: { emoji: "💊", color: "#16a34a" }, cafe: { emoji: "☕", color: "#a16207" },
  restaurant: { emoji: "🍴", color: "#ea580c" }, school: { emoji: "🏫", color: "#2563eb" }, supermarket: { emoji: "🛒", color: "#0891b2" },
  mosque: { emoji: "🕌", color: "#0f766e" }, park: { emoji: "🌳", color: "#65a30d" }, gym: { emoji: "🏋️", color: "#9333ea" },
  shopping_mall: { emoji: "🛍", color: "#db2777" },
};

export const iconId = (c: string) => `pi-${c}`;

export function registerPlaceIcons(m: mapboxgl.Map) {
  const S = 64;
  for (const [cat, { emoji, color }] of Object.entries(PLACE_ICON)) {
    if (m.hasImage(iconId(cat))) continue;
    const cv = document.createElement("canvas"); cv.width = cv.height = S;
    const g = cv.getContext("2d"); if (!g) continue;
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 3, 0, Math.PI * 2);
    g.fillStyle = "#ffffff"; g.fill(); g.lineWidth = 5; g.strokeStyle = color; g.stroke();
    g.font = `${S * 0.5}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(emoji, S / 2, S / 2 + 2);
    m.addImage(iconId(cat), g.getImageData(0, 0, S, S), { pixelRatio: 2 });
  }
}

/** Mapbox expression: category property → icon image id. */
export const iconExpr = (prop: string) => ["concat", "pi-", ["get", prop]] as unknown as mapboxgl.Expression;
