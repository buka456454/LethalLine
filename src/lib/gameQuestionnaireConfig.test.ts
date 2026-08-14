import { describe, expect, it } from "vitest";
import { CUSTOM_SENTINEL, MAX_ROLES, mergeSelectValue, parseRoles, serializeRoles, splitSelectValue } from "./gameQuestionnaireConfig";

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

describe("parseRoles / serializeRoles", () => {
  it("keeps a single legacy role", () => {
    expect(parseRoles("Позиция 4 — саппорт (полу)")).toEqual(["Позиция 4 — саппорт (полу)"]);
  });
  it("splits several roles", () => {
    expect(parseRoles("Позиция 1 — керри · Позиция 4 — саппорт (полу)")).toEqual([
      "Позиция 1 — керри",
      "Позиция 4 — саппорт (полу)",
    ]);
  });
  it("caps at three and drops duplicates", () => {
    expect(
      serializeRoles(["Керри", "Мид", "керри", "Оффлейн", "Саппорт"]),
    ).toBe("Керри · Мид · Оффлейн");
  });
  it("round-trips", () => {
    const stored = serializeRoles(["Дуэлянт", "Страж"]);
    expect(parseRoles(stored)).toEqual(["Дуэлянт", "Страж"]);
    expect(stored.split(" · ").length).toBeLessThanOrEqual(MAX_ROLES);
  });
});
