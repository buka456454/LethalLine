import { describe, expect, it } from "vitest";
import { verifyTBankNotificationToken } from "@/lib/payments/tbank";

// Test vector based on T-Bank docs: token = sha256(sortedValuesConcat + Password)
describe("tbank token verification", () => {
  it("verifies notification token deterministically", () => {
    const password = "11111111111";
    const notification = {
      TerminalKey: "1234567890DEMO",
      OrderId: "000000",
      Success: "true",
      Status: "AUTHORIZED",
      PaymentId: "0000000",
      ErrorCode: "0",
      Amount: "1111",
      CardId: "000000",
      Pan: "200000******0000",
      ExpDate: "1111",
      RebillId: "000000",
      Token: "1c0964277d0213349243065a0d5b838b8e90d2d25f740d0f2767836e710e80c8",
    };

    expect(verifyTBankNotificationToken(notification, password)).toBe(true);
  });
});

