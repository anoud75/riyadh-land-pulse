import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { FOOTPRINT_DISTRICTS, YEARS, getDistrictFootprint } from "@/data/districtSeries";
import { ThreeArmedFootprintSVG } from "@/components/investor/ThreeArmedFootprintSVG";
import { sar } from "@/components/investor/format";

export const Route = createFileRoute("/investor/footprint/$district")({
  head: ({ params }) => ({
    meta: [
      { title: `بصمة حي ${params.district} — سرج` },
      { name: "description", content: `سعر المتر وأيام الإغلاق والسكان في حي ${params.district}.` },
      { property: "og:title", content: `بصمة حي ${params.district} — سرج` },
      { property: "og:description", content: "بصمة الحي في ثلاثة أذرع." },
    ],
  }),
  component: Footprint,
});

const Dot = ({ c }: { c: string }) => <span className={`inline-block size-2.5 rounded-full ${c}`} />;
const ILLUSTRATIVE = "بيانات توضيحية — ليست من الهيئة العامة للإحصاء";

function Footprint() {
  const { district } = Route.useParams();
  const navigate = useNavigate();
  const { parcels } = usePortfolio();
  const [year, setYear] = useState(2026);
  const data = getDistrictFootprint(parcels, district, year);
  const cur = data.price.find((p) => p.year === year)!;

  return (
    <div>
      <Link to="/investor/map" className="text-sm text-muted-foreground hover:text-foreground">‹ عودة إلى الخريطة</Link>
      <div className="mt-3 flex flex-wrap gap-2">
        {FOOTPRINT_DISTRICTS.map((d) => (
          <button key={d.ar} onClick={() => navigate({ to: "/investor/footprint/$district", params: { district: d.ar } })}
            className={`rounded-full border px-3 py-1 text-sm ${d.ar === data.district ? "bg-foreground text-background" : "bg-surface hover:bg-secondary"}`}>
            {d.ar}
          </button>
        ))}
      </div>
      <h1 className="mt-6 text-4xl font-bold">بصمة حي {data.district}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{data.parcelsInDistrict} أرض في المحفظة · {data.closedDeals} صفقة مغلقة</p>

      <label className="mt-6 flex items-center gap-4 text-sm">
        <span>السنة</span>
        <input type="range" min={2019} max={2026} value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-64 accent-primary" />
        <span className="font-mono text-lg">{year}</span>
      </label>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border bg-card p-4">
          <ThreeArmedFootprintSVG data={data} />
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Dot c="bg-chart-blue" />سكني · بيع · ذكور</span>
            <span className="flex items-center gap-1"><Dot c="bg-primary" />تجاري · إيجار · إناث</span>
          </div>
        </div>

        <div className="space-y-4">
          <Panel title="سعر المتر (ريال)" note={cur.residentialReal || cur.commercialReal ? "2026: من سجل سرج حيث يوجد سعر. باقي السنوات توضيحية." : "سلسلة توضيحية — لا سجل تاريخي للأسعار بعد."}>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground"><tr><th className="text-right font-normal">السنة</th><th className="text-right font-normal"><Dot c="bg-chart-blue" /> سكني</th><th className="text-right font-normal"><Dot c="bg-primary" /> تجاري</th></tr></thead>
              <tbody>
                {data.price.map((p) => (
                  <tr key={p.year} className={p.year === year ? "font-semibold text-primary" : ""}>
                    <td className="font-mono">{p.year}</td><td className="font-mono">{sar(p.residential)}{p.residentialReal && " ●"}</td><td className="font-mono">{sar(p.commercial)}{p.commercialReal && " ●"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="الصفقات المغلقة حسب أيام العرض" note="من سجل سرج الفعلي.">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground"><tr><th className="text-right font-normal">الأيام</th><th className="text-right font-normal"><Dot c="bg-chart-blue" /> بيع</th><th className="text-right font-normal"><Dot c="bg-primary" /> إيجار</th></tr></thead>
              <tbody>{data.deals.map((d) => <tr key={d.label}><td className="font-mono">{d.label}</td><td className="font-mono">{d.sale}</td><td className="font-mono">{d.lease}</td></tr>)}</tbody>
            </table>
            <p className="mt-2 text-sm">{data.medianDays != null ? `الوسيط: ${data.medianDays} يومًا` : `عينة غير كافية (${data.closedDeals} صفقة) — لا يُعرض وسيط.`}</p>
          </Panel>

          <Panel title={`السكان ${year} · ${sar(data.populationTotal)} نسمة`} note={ILLUSTRATIVE}>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground"><tr><th className="text-right font-normal">العمر</th><th className="text-right font-normal"><Dot c="bg-chart-blue" /> ذكور</th><th className="text-right font-normal"><Dot c="bg-primary" /> إناث</th></tr></thead>
              <tbody>{data.population.map((p) => <tr key={p.band}><td className="font-mono">{p.band}</td><td className="font-mono">{sar(p.male)}</td><td className="font-mono">{sar(p.female)}</td></tr>)}</tbody>
            </table>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
      <p className="mt-3 text-xs text-muted-foreground">{note}</p>
    </section>
  );
}
