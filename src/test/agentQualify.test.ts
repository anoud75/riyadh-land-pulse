import { describe, it, expect } from "vitest";
import { cleanProse, enforceReply, qualifyState } from "@/lib/agentQualify";

describe("qualify-first gate", () => {
  it("hospital without budget or size must ask", () => {
    expect(qualifyState(["أبغى أبني مستشفى"]).needsQualification).toBe(true);
  });
  it("budget given earlier in the chat lifts the gate", () => {
    expect(qualifyState(["أبغى أبني مستشفى", "ميزانيتي 20 مليون"]).needsQualification).toBe(false);
  });
  it("size alone lifts the gate", () => {
    expect(qualifyState(["أبي أرض لمستشفى مساحة 5000 م²"]).needsQualification).toBe(false);
  });
  it("asking about a specific parcel is not gated", () => {
    expect(qualifyState(["أبي أعرف عن SRE-015"]).needsQualification).toBe(false);
  });
  it("a gated reply never carries parcels, even if the model tries", () => {
    const r = enforceReply({ prose: "x", ui_action: { type: "SHOW_PARCELS", payload: ["SRE-015"] } }, qualifyState(["أبغى أبني مستشفى"]), new Set(["SRE-015"]));
    expect(r.ui_action).toEqual({ type: "ASK_QUALIFYING_QUESTIONS", payload: [] });
  });
  it("drops parcel ids no tool returned", () => {
    const r = enforceReply({ prose: "x", ui_action: { type: "SHOW_PARCELS", payload: ["SRE-015", "SRE-999"] } }, qualifyState(["ميزانيتي 60 مليون"]), new Set(["SRE-015"]));
    expect(r.ui_action.payload).toEqual(["SRE-015"]);
  });
  it("strips UI button text from prose", () => {
    expect(cleanProse("أرض مناسبة. يفتح سجل الأرض")).not.toContain("سجل الأرض");
  });
});
