import { createServerFn } from "@tanstack/react-start";
import type { Inquiry, Parcel } from "@/data/types";

interface AgentInput {
  mode: "investor" | "admin";
  messages: { role: "user" | "assistant"; content: string }[];
  extraParcels?: Parcel[];
  extraInquiries?: Inquiry[];
}

export const askSarjAgent = createServerFn({ method: "POST" })
  .inputValidator((d: AgentInput) => {
    if (d.mode !== "investor" && d.mode !== "admin") throw new Error("bad mode");
    return d;
  })
  .handler(async ({ data }) => {
    const { runSarjAgent } = await import("./sarjAgent.server");
    try {
      return {
        ok: true as const,
        ...(await runSarjAgent({
          mode: data.mode,
          messages: data.messages,
          extraParcels: data.extraParcels ?? [],
          // investor mode never receives inquiries
          extraInquiries: data.mode === "admin" ? (data.extraInquiries ?? []) : [],
        })),
      };
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      console.error("sarj agent failed", status, e);
      return {
        ok: false as const,
        error: status === 402 ? "نفد رصيد الذكاء الاصطناعي في مساحة العمل." : status === 429 ? "ضغط مؤقت على الخدمة، حاولي بعد قليل." : "تعذّر الوصول إلى الوكيل الآن.",
      };
    }
  });
