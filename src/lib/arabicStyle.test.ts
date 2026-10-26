import { describe, expect, it } from "vitest";
import { polishArabic } from "./arabicStyle";

describe("polishArabic", () => {
  it("uses Arabic numerals instead of Hindi digits", () => {
    expect(polishArabic("١٢٠ أرضًا")).toBe("120 أرضًا");
  });
  it("removes the space before punctuation", () => {
    expect(polishArabic("الملقا ، النرجس .")).toBe("الملقا، النرجس.");
  });
  it("replaces حوالي with نحو and يتواجد with يوجد", () => {
    expect(polishArabic("حوالي 50 ألفًا يتواجد")).toBe("نحو 50 ألفًا يوجد");
  });
});
