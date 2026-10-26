import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChatWorkspace } from "@/components/investor/ChatWorkspace";

export const Route = createFileRoute("/investor/chats")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => ({ q: typeof s["q"] === "string" && s["q"] ? s["q"] : undefined }),
  head: () => ({
    meta: [
      { title: "المساعد الذكي — سرج" },
      { name: "description", content: "محادثاتك مع محلّل المواقع في سرج." },
      { property: "og:title", content: "المساعد الذكي — سرج" },
      { property: "og:description", content: "محادثات محلّل المواقع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" }],
  }),
  component: Chats,
});

function Chats() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/investor/chats" });
  return <ChatWorkspace initialPrompt={q} onInitialSent={() => navigate({ search: {}, replace: true })} />;
}
