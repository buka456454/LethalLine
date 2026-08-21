import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegram/handlers";

export async function POST(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return Response.json({ ok: false, error: "Webhook not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  if (provided !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return Response.json({ ok: false, error: "Bot token missing" }, { status: 503 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Ack immediately so the long-poll bridge can continue; work runs in-process.
  void handleTelegramUpdate(update).catch((error) => {
    console.error("[telegram] webhook handler error:", error);
  });

  return Response.json({ ok: true });
}
