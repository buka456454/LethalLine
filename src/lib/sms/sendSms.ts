export type SmsSendResult =
  | { ok: true }
  | { ok: false; skipped?: boolean; error?: string };

/**
 * Отправка SMS через Twilio при заданных TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.
 * Иначе — только лог в консоль (как dev-режим для почты).
 */
export async function sendSms(input: { to: string; body: string }): Promise<SmsSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();

  if (!sid || !token || !from) {
    console.info("[sms] SMS не отправлено (нет TWILIO_*). Код/текст:\n", input.body, "\n→", input.to);
    return { ok: false, skipped: true };
  }

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const params = new URLSearchParams({ To: input.to, From: from, Body: input.body });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[sms] Twilio error:", res.status, errText);
      return { ok: false, error: "Не удалось отправить SMS" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[sms] Twilio request failed:", err);
    return { ok: false, error: "Ошибка сети при отправке SMS" };
  }
}

export function formatSmsFailureForUser(result: SmsSendResult): string {
  if (result.ok) return "SMS отправлено.";
  if (result.skipped) return "SMS не настроено на сервере — код смотрите в логах (TWILIO_* в .env).";
  return result.error ?? "Не удалось отправить SMS.";
}
