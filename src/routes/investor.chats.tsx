import { createFileRoute } from "@tanstack/react-router";
import { ChatWorkspace } from "@/components/investor/ChatWorkspace";

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
  return <ChatWorkspace />;
}
