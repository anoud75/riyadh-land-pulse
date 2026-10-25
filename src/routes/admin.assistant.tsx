import { createFileRoute } from "@tanstack/react-router";
import { TeamAssistant } from "@/components/admin/TeamAssistant";

export const Route = createFileRoute("/admin/assistant")({
  head: () => ({
    meta: [
      { title: "المساعد — لوحة فريق سرج" },
      { name: "description", content: "مساعد الفريق يجيب من بيانات المحفظة والاستفسارات." },
      { property: "og:title", content: "المساعد — لوحة فريق سرج" },
      { property: "og:description", content: "اسأل عن الفجوات والراكد والاستفسارات." },
    ],
  }),
  component: () => (
    <div>
      <h1 className="mb-6 text-3xl font-bold">مساعد الفريق</h1>
      <TeamAssistant inline />
    </div>
  ),
});
