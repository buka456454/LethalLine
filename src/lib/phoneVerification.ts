import { prisma } from "@/lib/prisma";
import { formatSmsFailureForUser, sendSms, type SmsSendResult } from "@/lib/sms/sendSms";
import { generateOtpCodePlain, hashVerificationToken } from "@/lib/verification";

const EXPIRY_MINUTES = 30;

export async function completePhoneVerification(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      phoneVerifiedAt: new Date(),
      phoneVerificationCodeHash: null,
      phoneVerificationExpires: null,
    },
  });
}

export type IssuePhoneVerificationResult = {
  smsSent: boolean;
  smsSkipped: boolean;
  smsError?: string;
};

/**
 * Сохраняет хеш кода и шлёт SMS на номер (или пишет в лог, если Twilio не настроен).
 */
export async function issuePhoneVerification(userId: string, phoneE164: string): Promise<IssuePhoneVerificationResult> {
  const plainCode = generateOtpCodePlain();
  const codeHash = hashVerificationToken(plainCode);
  const expires = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      phoneVerificationCodeHash: codeHash,
      phoneVerificationExpires: expires,
    },
  });

  const body = `Lethal Line: код ${plainCode} (действует ${EXPIRY_MINUTES} мин.)`;
  const sms: SmsSendResult = await sendSms({ to: phoneE164, body });

  return {
    smsSent: sms.ok === true,
    smsSkipped: sms.ok === false && sms.skipped === true,
    smsError: !sms.ok && "error" in sms && sms.error ? sms.error : undefined,
  };
}

export function userMessageForIssueResult(r: IssuePhoneVerificationResult): string {
  if (r.smsSkipped) return formatSmsFailureForUser({ ok: false, skipped: true });
  if (r.smsSent) return "Код отправлен на номер телефона.";
  return formatSmsFailureForUser({ ok: false, error: r.smsError });
}
