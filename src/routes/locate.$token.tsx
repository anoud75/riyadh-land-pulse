import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { lazyWithReload } from "@/lib/lazyWithReload";
import { Check } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioProvider";
import { boundsCheck } from "@/lib/adminEngine";

const PinMap = lazyWithReload(() => import("@/components/admin/PinMap"));

export const Route = createFileRoute("/locate/$token")({
  head: () => ({
    meta: [
      { title: "حدّد موقع أرضك — سرج" },
      { name: "description", content: "ضع دبوسًا على موقع أرضك ليصل إلى فريق سرج." },
      { property: "og:title", content: "حدّد موقع أرضك — سرج" },
      { property: "og:description", content: "ضع دبوسًا على موقع أرضك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" }],
  }),
  component: Locate,
});

function Locate() {
  const { token } = Route.useParams();
  const { locationRequests, completeLocation } = usePortfolio();
  const req = locationRequests.find((r) => r.token === token);
  const [pos, setPos] = useState({ lat: 24.7136, lng: 46.6753 });
  const [done, setDone] = useState(false);
  const geo = boundsCheck(pos.lat, pos.lng);
  if (!req) return (
    <div dir="rtl" className="mx-auto max-w-md p-10 text-center">
      <h1 className="text-2xl font-bold">الرابط غير صالح أو انتهت صلاحيته</h1>
      <p className="mt-2 text-sm text-muted-foreground">اطلب من فريق سرج رابطًا جديدًا.</p>
    </div>
  );
  if (done || req.done) return (
    <div dir="rtl" className="mx-auto max-w-md p-10 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-6" /></span>
      <h1 className="mt-4 text-2xl font-bold">شكرًا، وصلنا الموقع</h1>
      <p className="mt-2 text-sm text-muted-foreground">سيتواصل معك فريق سرج قريبًا.</p>
    </div>
  );
  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">حدّد موقع أرضك في {req.draft.district_ar}</h1>
      <p className="text-sm text-muted-foreground">اضغط على مكان الأرض في الخريطة أو اسحب الدبوس، ثم اضغط «أرسل الموقع».</p>
      <div className="h-[460px] overflow-hidden rounded-2xl border">
        <ClientOnly fallback={null}><Suspense fallback={null}><PinMap lat={pos.lat} lng={pos.lng} onChange={(lat, lng) => setPos({ lat, lng })} /></Suspense></ClientOnly>
      </div>
      {geo.outOfBounds && <p className="text-sm text-destructive">الدبوس خارج الرياض بـ {geo.beyondKm} كم — تأكّد من المكان.</p>}
      <button onClick={() => { completeLocation(token, pos.lat, pos.lng); setDone(true); }} className="w-full rounded-full bg-ink py-3 text-ink-foreground">أرسل الموقع</button>
    </div>
  );
}
