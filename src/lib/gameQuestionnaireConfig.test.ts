import { describe, expect, it } from "vitest";
import { CUSTOM_SENTINEL, mergeSelectValue, splitSelectValue } from "./gameQuestionnaireConfig";

const sample = [
  { value: "", label: "—" },
  { value: "Легенда IV", label: "Легенда IV" },
  { value: CUSTOM_SENTINEL, label: "Свой" },
];

describe("splitSelectValue", () => {
  it("empty", () => {
    expect(splitSelectValue("", sample)).toEqual({ select: "", custom: "" });
  });
  it("sentinel value", () => {
    expect(splitSelectValue(CUSTOM_SENTINEL, sample)).toEqual({ select: CUSTOM_SENTINEL, custom: "" });
  });
  it("matches option", () => {
    expect(splitSelectValue("Легенда IV", sample)).toEqual({ select: "Легенда IV", custom: "" });
  });
  it("unknown → custom", () => {
    expect(splitSelectValue("Immortal top 50", sample)).toEqual({ select: CUSTOM_SENTINEL, custom: "Immortal top 50" });
  });
});

describe("mergeSelectValue", () => {
  it("fixed", () => {
    expect(mergeSelectValue("Легенда IV", "")).toBe("Легенда IV");
  });
  it("custom empty", () => {
    expect(mergeSelectValue(CUSTOM_SENTINEL, "   ")).toBe(CUSTOM_SENTINEL);
  });
  it("custom", () => {
    expect(mergeSelectValue(CUSTOM_SENTINEL, "  x  ")).toBe("x");
  });
});
