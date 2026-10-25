/**
 * Hard scope guard run on the server before any model call.
 * Off-topic questions and team-only questions in investor mode get a fixed reply.
 */
export type ScopeVerdict = { ok: true } | { ok: false; reason: "off_topic" | "team_only"; reply: string };

const strip = (s: string) => s.replace(/[ًٌٍَُِّْـ]/g, "").replace(/[أإآ]/g, "ا").toLowerCase();

const DOMAIN = /(ارض|اراض|قطع|حي |حي$|احياء|عقار|سعر|اسعار|متر|م²|مساح|شارع|مستودع|ايجار|بيع|استثمار|خريط|منطق|شمال|جنوب|شرق|غرب|وسط|الرياض|sre-|تفاوض|وسيط|تقرير|قارن|مقارن|رسم|مخطط|تجاري|سكني|مخزون|محفظ|راكد|فجو|مشروع|مستشفى|مدرس|معرض|قرب|بعد|كم|اقرب|zoom)/;
const OFF_TOPIC = /(طبخ|طبخه|وصفه|وصفات|كبسه|اكل|مطعم|حلويات|كيك|recipe|cook|رياضه|مباراه|كوره|دوري|هلال|نصر|football|فيلم|مسلسل|اغنيه|اغاني|movie|song|شعر|قصيده|نكته|joke|برمج|كود|python|javascript|code|طقس|weather|ترجم|translate|صحتي|دواء|رجيم|حبيب|سياس|دين|فتوى|واجب|homework|بيتكوين|كريبتو|سهم|اسهم)/;
const TEAM_ONLY = /(استفسار|الاستفسارات|واقفه|متوقف|المشترين|مشترين|المنتظرين|منتظر|عملاء|العملاء|اسماء|اسم المستثمر|جوال|رقم|ارقام|تواصل مع|الفريق|المبيعات|نفاد|خساره|الاداء|اداء|صفقات الفريق|الكتل)/;

const INVESTOR_SCOPE = "أعتذر، أنا «محلّل المواقع» وأجيب فقط عن أراضي سرج في الرياض: البحث، المقارنة، الأسعار، هامش التفاوض، والخريطة.";
const ADMIN_SCOPE = "أعتذر، أنا «مساعد الفريق» وأجيب فقط عن عمل فريق سرج: المحفظة، الاستفسارات والمطابقة، الفجوات، الراكد، التقارير، والخريطة.";

export function classifyScope(mode: "investor" | "admin", question: string): ScopeVerdict {
  const q = strip(question);
  const domain = DOMAIN.test(q);
  if (OFF_TOPIC.test(q) && !domain) return { ok: false, reason: "off_topic", reply: mode === "investor" ? INVESTOR_SCOPE : ADMIN_SCOPE };
  if (mode === "investor" && TEAM_ONLY.test(q))
    return { ok: false, reason: "team_only", reply: "هذا السؤال يخص عمل فريق سرج الداخلي (الاستفسارات والمشترين والأداء)، ولا أطّلع عليه بصفتي «محلّل المواقع». أستطيع مساعدتك في البحث عن أرض أو مقارنة أرضين أو تقرير هامش التفاوض." };
  return { ok: true };
}

export const SCOPE_SUGGESTIONS = {
  investor: ["أرني أراضي تجارية شمال الرياض", "تقرير السوق لشرق الرياض", "قرّب الخريطة على حي الملقا"],
  admin: ["ليش الشمال يخسرنا؟", "ارسم فجوة العرض والطلب", "من ينتظر ولا نملك له أرضًا؟"],
} as const;
