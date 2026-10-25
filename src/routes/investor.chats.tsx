import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/investor/chats")({
  head: () => ({
    meta: [
      { title: "محادثاتي — سرج" },
      { name: "description", content: "محادثاتك مع محلّل المواقع في سرج." },
      { property: "og:title", content: "محادثاتي — سرج" },
      { property: "og:description", content: "محادثات محلّل المواقع." },
    ],
  }),
  component: Chats,
});

const CHATS = [
  "أبغى أرض لمستودع جنوب الرياض، ميزانيتي مليون ريال سنويًا",
  "قارن بين المناخ والمنصورية",
  "أراضي سكنية شمال الرياض تحت 5 ملايين",
  "كم شخصًا يصل إلى أرض الرمال خلال ربع ساعة؟",
  "أرني أراضي البيع فقط",
];

function Chats() {
  return (
    <div>
      <h1 className="text-3xl font-bold">محادثاتي</h1>
      <p className="mt-2 text-sm text-muted-foreground">محادثات مثال. محلّل المواقع يُضاف في الخطوة التالية.</p>
      <div className="mt-6 space-y-2">
        {CHATS.map((c) => <div key={c} className="rounded-2xl border bg-card p-4 text-sm">{c}</div>)}
      </div>
    </div>
  );
}
