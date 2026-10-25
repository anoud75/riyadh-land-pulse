import type { DistrictFootprint } from "@/data/districtSeries";

const BLUE = "var(--chart-blue)";
const PURPLE = "var(--primary)";
const C = 320; // centre
const START = 100; // arms start outside the district lens so bars of neighbouring arms never touch
const LEN = 190; // arm length

/** Unit vectors for the three arms (SVG y grows downwards). */
const arm = (deg: number) => {
  const r = (deg * Math.PI) / 180;
  return { ux: Math.cos(r), uy: -Math.sin(r), px: -Math.sin(r), py: -Math.cos(r) };
};
const UR = arm(30); // upper-right
const UL = arm(150); // upper-left
const DN = arm(270); // down

const pt = (a: ReturnType<typeof arm>, along: number, side = 0) =>
  [C + a.ux * along + a.px * side, C + a.uy * along + a.py * side] as const;

function Bars({ a, rows, max, colors, width }: { a: ReturnType<typeof arm>; rows: [number, number, boolean?][]; max: number; colors: [string, string]; width: number }) {
  const step = LEN / rows.length;
  return (
    <>
      {rows.map(([v1, v2, hi], i) => {
        const along = START + step * (i + 0.5);
        return [v1, v2].map((v, k) => {
          const h = max ? (v / max) * width : 0;
          const s = k === 0 ? 1 : -1; // first series on one side of the arm, second on the other
          const [x1, y1] = pt(a, along - step * 0.35, 0);
          const [x2, y2] = pt(a, along + step * 0.35, 0);
          const [x3, y3] = pt(a, along + step * 0.35, s * h);
          const [x4, y4] = pt(a, along - step * 0.35, s * h);
          return (
            <polygon key={`${i}-${k}`} points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`} fill={colors[k]} fillOpacity={hi === false ? 0.35 : 0.9} />
          );
        });
      })}
    </>
  );
}

function Label({ a, along, side = 0, children, size = 11, anchor = "middle" }: { a: ReturnType<typeof arm>; along: number; side?: number; children: string; size?: number; anchor?: "middle" | "start" | "end" }) {
  const [x, y] = pt(a, along, side);
  return <text x={x} y={y} fontSize={size} textAnchor={anchor} dominantBaseline="middle" fill="currentColor">{children}</text>;
}

export function ThreeArmedFootprintSVG({ data, overlay = false }: { data: DistrictFootprint; overlay?: boolean }) {
  const priceMax = Math.max(...data.price.flatMap((p) => [p.residential, p.commercial]));
  const dealMax = Math.max(1, ...data.deals.flatMap((d) => [d.sale, d.lease]));
  const popMax = Math.max(...data.population.flatMap((p) => [p.male, p.female]));
  const step = (n: number) => LEN / n;

  return (
    <svg viewBox="0 0 640 640" className={`w-full text-foreground ${overlay ? "" : ""}`} role="img" aria-label={`بصمة حي ${data.district}`}>
      {[UR, UL, DN].map((a, i) => {
        const [x1, y1] = pt(a, START);
        const [x2, y2] = pt(a, START + LEN);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity=".25" />;
      })}
      <circle cx={C} cy={C} r={START - 12} fill={overlay ? "none" : "var(--accent)"} stroke={overlay ? "currentColor" : "none"} strokeOpacity=".5" strokeWidth={2} />
      {!overlay && <text x={C} y={C - 6} textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">{data.district}</text>}
      {!overlay && <text x={C} y={C + 12} textAnchor="middle" fontSize="11" fill="currentColor" opacity=".6">{data.year}</text>}

      {/* Upper-right: price/m² by year — residential vs commercial; selected year full opacity */}
      <Bars a={UR} width={44} max={priceMax} colors={[BLUE, PURPLE]}
        rows={data.price.map((p) => [p.residential, p.commercial, p.year === data.year])} />
      {data.price.map((p, i) => i % 2 === 1 || p.year === data.year ? (
        <Label key={p.year} a={UR} along={START + step(8) * (i + 0.5)} side={-56} size={9}>{String(p.year).slice(2)}</Label>
      ) : null)}
      <Label a={UR} along={START + LEN + 22} size={12}>سعر المتر</Label>

      {/* Upper-left: closed deals by days on market — sale vs lease */}
      <Bars a={UL} width={44} max={dealMax} colors={[BLUE, PURPLE]} rows={data.deals.map((d) => [d.sale, d.lease])} />
      {data.deals.map((d, i) => (
        <Label key={d.label} a={UL} along={START + step(5) * (i + 0.5)} side={56} size={9}>{d.label}</Label>
      ))}
      <Label a={UL} along={START + LEN + 22} size={12}>أيام الإغلاق</Label>
      {data.medianDays != null && (() => {
        const idx = Math.min(4, [30, 60, 90, 150, Infinity].findIndex((m) => data.medianDays! < m));
        const [x, y] = pt(UL, START + step(5) * (idx + 0.5));
        return (
          <g>
            <rect x={x - 34} y={y - 11} width={68} height={22} rx={11} fill="var(--foreground)" />
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="var(--background)">وسيط {data.medianDays} يومًا</text>
          </g>
        );
      })()}

      {/* Down: population pyramid — male vs female */}
      <Bars a={DN} width={58} max={popMax} colors={[BLUE, PURPLE]} rows={data.population.map((p) => [p.male, p.female])} />
      {data.population.map((p, i) => (
        <Label key={p.band} a={DN} along={START + step(7) * (i + 0.5)} side={0} size={8}>{p.band}</Label>
      ))}
      <Label a={DN} along={START + LEN + 18} size={12}>السكان</Label>
    </svg>
  );
}
