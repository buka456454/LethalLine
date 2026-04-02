import nodemailer from "nodemailer";

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Доп. заголовки (например Auto-Submitted для транзакционных писем) */
  headers?: Record<string, string>;
  replyTo?: string;
};

export type SendMailResult =
  | { ok: true }
  | { ok: false; skipped: true }
  | { ok: false; skipped: false; smtpError?: string };

const GENERIC_MAIL_FAIL = "Не удалось отправить письмо. Проверьте настройки почты на сервере.";

/** Сообщение для UI: без сырого SMTP в проде; отдельный текст при антиспаме 554. */
export function formatSmtpFailureForUser(smtpError?: string): string {
  if (!smtpError) return GENERIC_MAIL_FAIL;
  const lower = smtpError.toLowerCase();
  if (
    lower.includes("554") &&
    (lower.includes("spam") || lower.includes("suspicion") || lower.includes("rejected under"))
  ) {
    return (
      "Отправка отклонена как спам (часто у Яндекса). " +
      "Если письмо уже приходило — введите код в жёлтой полосе сверху. Иначе позже или настройте почту для домена (например Resend)."
    );
  }
  const expose =
    process.env.NODE_ENV === "development" || process.env.SMTP_DEBUG_ERRORS === "1";
  if (expose) return `${GENERIC_MAIL_FAIL.replace(/\.$/, "")}: ${smtpError}`;
  return GENERIC_MAIL_FAIL;
}

/**
 * Отправка писем через SMTP (Яндекс, Gmail, корпоративная почта).
 * Без SMTP_HOST письмо не уходит; текст пишется в лог сервера (удобно в dev).
 * Ошибки SMTP не пробрасываются — смотрите лог `[email] SMTP send failed`.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    console.warn("[email] SMTP_HOST не задан — письмо не отправлено:", input.to);
    console.info("[email] Текст письма:\n", input.text);
    return { ok: false, skipped: true };
  }

  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  const from = process.env.SMTP_FROM?.trim() ?? user ?? "noreply@localhost";

  try {
    await transporter.sendMail({
      from,
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
      headers: input.headers,
    });
    return { ok: true };
  } catch (err) {
    console.error("[email] SMTP send failed:", err);
    const smtpError = err instanceof Error ? err.message : String(err);
    const exposeSmtp =
      process.env.NODE_ENV === "development" || process.env.SMTP_DEBUG_ERRORS === "1";
    return {
      ok: false,
      skipped: false,
      ...(exposeSmtp ? { smtpError } : {}),
    };
  }
}
