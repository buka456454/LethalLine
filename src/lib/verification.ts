import { createHash, randomInt } from "node:crypto";

const CODE_DIGITS = 6;

export function hashVerificationToken(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

export function generateOtpCodePlain(): string {
  return String(randomInt(0, 1_000_000)).padStart(CODE_DIGITS, "0");
}
