import { loadAdminChatId } from "@/lib/telegram/acl";
import {
  isTelegramConfigured,
  sendMessage,
  sendPhoto,
  type InlineKeyboardMarkup,
} from "@/lib/telegram/client";

export async function notifyAdmin(
  text: string,
  options?: {
    reply_markup?: InlineKeyboardMarkup;
    /** Absolute path to a local image to attach (experience proof, etc.). */
    photoPath?: string | null;
  },
) {
  if (!isTelegramConfigured()) return;

  const chatId = await loadAdminChatId();
  if (!chatId) {
    console.warn("[telegram] admin chat id not bound yet; skip notify");
    return;
  }

  if (options?.photoPath) {
    const sent = await sendPhoto(chatId, options.photoPath, text, {
      parse_mode: "HTML",
      reply_markup: options.reply_markup,
    });
    if (sent) return;
    // Fall through to text-only if photo upload failed.
  }

  await sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: options?.reply_markup,
  });
}
