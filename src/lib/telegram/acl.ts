import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CHAT_ID_FILE = path.join(process.cwd(), "data", "telegram-admin-chat-id");

let runtimeChatId: string | null = null;

export function getTelegramAdminUsername() {
  const configured = process.env.TELEGRAM_ADMIN_USERNAME?.trim();
  return (configured && configured.length > 0 ? configured : "B6yKka").replace(/^@/, "").toLowerCase();
}

export function isTelegramAdminUsername(username: string | undefined | null) {
  if (!username) return false;
  return username.replace(/^@/, "").toLowerCase() === getTelegramAdminUsername();
}

export async function loadAdminChatId(): Promise<string | null> {
  if (runtimeChatId) return runtimeChatId;

  const fromEnv = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (fromEnv) {
    runtimeChatId = fromEnv;
    return runtimeChatId;
  }

  try {
    const raw = (await readFile(CHAT_ID_FILE, "utf8")).trim();
    if (raw) {
      runtimeChatId = raw;
      return runtimeChatId;
    }
  } catch {
    // file missing is fine
  }

  return null;
}

export async function bindAdminChatId(chatId: number | string) {
  const value = String(chatId);
  runtimeChatId = value;
  process.env.TELEGRAM_ADMIN_CHAT_ID = value;

  try {
    await mkdir(path.dirname(CHAT_ID_FILE), { recursive: true });
    await writeFile(CHAT_ID_FILE, value, "utf8");
  } catch (error) {
    console.error("[telegram] failed to persist admin chat id:", error);
  }
}

export type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export function isTelegramAdminUser(user: TelegramUser | undefined | null) {
  return isTelegramAdminUsername(user?.username);
}
