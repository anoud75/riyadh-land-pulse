import { createFileRoute } from "@tanstack/react-router";
import { ChatWorkspace } from "@/components/investor/ChatWorkspace";

export const Route = createFileRoute("/admin/assistant")({
  head: () => ({
    meta: [
      { title: "مساعد الفريق — سرج" },
      { name: "description", content: "مساعد فريق سرج: مطابقة المشترين، تقارير، رسوم بيانية، وخريطة داخل المحادثة." },
      { property: "og:title", content: "مساعد الفريق — سرج" },
      { property: "og:description", content: "اسأل عن الفجوات والراكد والاستفسارات، واطلب تقريرًا أو رسمًا أو خريطة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" }],
  }),
  component: () => <ChatWorkspace mode="admin" />,
});
