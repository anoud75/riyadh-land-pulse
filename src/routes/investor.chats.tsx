import { createFileRoute } from "@tanstack/react-router";
import { AgentChat } from "@/components/AgentChat";

export const Route = createFileRoute("/investor/chats")({
  head: () => ({
    meta: [
      { title: "محادثاتي — سرج" },
      { name: "description", content: "محادثاتك مع محلّل المواقع في سرج." },
      { property: "og:title", content: "محادثاتي — سرج" },
      { property: "og:description", content: "محادثات محلّل المواقع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Chats,
});

function Chats() {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">محادثاتي</h1>
      <AgentChat mode="investor" />
    </div>
  );
}
