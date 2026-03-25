import { describe, expect, it } from "vitest";
import { hasRole } from "@/lib/auth";

describe("role hierarchy", () => {
  it("allows upward access", () => {
    expect(hasRole("SUPERADMIN", "ADMIN")).toBe(true);
    expect(hasRole("ADMIN", "USER")).toBe(true);
  });

  it("blocks insufficient role", () => {
    expect(hasRole("USER", "ADMIN")).toBe(false);
  });
});
