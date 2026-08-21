import fs from "node:fs";
import https from "node:https";
import { lookup as dnsLookup } from "node:dns/promises";
import path from "node:path";

type TelegramApiResponse<T = unknown> = {
  ok: boolean;
  description?: string;
  result?: T;
};

export type InlineKeyboardButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

export type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};

export type SendMessageOptions = {
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  reply_markup?: InlineKeyboardMarkup;
  disable_web_page_preview?: boolean;
};

/** Prefer known-good edge first — default DNS often points at a filtered host from this VM. */
const TELEGRAM_IPV4_FALLBACKS = [
  "149.154.167.220",
  "149.154.167.99",
  "149.154.167.50",
  "149.154.167.91",
];

let stickyIp: string | null = process.env.TELEGRAM_API_IP?.trim() || null;

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
}

export function isTelegramConfigured() {
  return Boolean(getBotToken());
}

async function resolveTelegramHosts(): Promise<string[]> {
  const hosts: string[] = [];
  if (stickyIp) hosts.push(stickyIp);

  for (const ip of TELEGRAM_IPV4_FALLBACKS) {
    if (!hosts.includes(ip)) hosts.push(ip);
  }

  // DNS last — often returns unreachable IPs that waste timeout budget.
  try {
    const resolved = await dnsLookup("api.telegram.org", { all: true, family: 4 });
    for (const entry of resolved) {
      if (!hosts.includes(entry.address)) hosts.push(entry.address);
    }
  } catch {
    // ignore
  }

  return hosts;
}

function requestToIp(
  ip: string,
  apiPath: string,
  options: {
    method?: string;
    headers?: Record<string, string | number>;
    body?: Buffer | string;
    timeoutMs?: number;
  },
): Promise<string> {
  const method = options.method ?? "POST";
  const timeoutMs = options.timeoutMs ?? 4_000;
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: ip,
        servername: "api.telegram.org",
        port: 443,
        path: apiPath,
        method,
        headers: {
          Host: "api.telegram.org",
          ...(options.headers ?? {}),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      },
    );
    req.on("timeout", () => {
      req.destroy(new Error(`timeout ${ip}`));
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function telegramCall<T>(
  method: string,
  body: Record<string, unknown>,
  timeoutMs = 4_000,
): Promise<T | null> {
  const token = getBotToken();
  if (!token) return null;

  const payload = JSON.stringify(body);
  const apiPath = `/bot${token}/${method}`;
  const hosts = await resolveTelegramHosts();
  let lastError: unknown;

  for (const ip of hosts) {
    try {
      const raw = await requestToIp(ip, apiPath, {
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        body: payload,
        timeoutMs,
      });
      const data = JSON.parse(raw) as TelegramApiResponse<T>;
      if (!data.ok) {
        console.error(`[telegram] ${method} failed:`, data.description ?? raw);
        return null;
      }
      stickyIp = ip;
      return data.result ?? null;
    } catch (error) {
      lastError = error;
    }
  }

  console.error(`[telegram] ${method} error:`, lastError);
  return null;
}

async function telegramMultipartCall<T>(
  method: string,
  fields: Record<string, string>,
  fileField: { name: string; filename: string; contentType: string; buffer: Buffer },
): Promise<T | null> {
  const token = getBotToken();
  if (!token) return null;

  const boundary = `----lltg${Date.now().toString(16)}`;
  const chunks: Buffer[] = [];

  for (const [key, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
        "utf8",
      ),
    );
  }

  chunks.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"\r\nContent-Type: ${fileField.contentType}\r\n\r\n`,
      "utf8",
    ),
  );
  chunks.push(fileField.buffer);
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"));
  const body = Buffer.concat(chunks);

  const apiPath = `/bot${token}/${method}`;
  const hosts = await resolveTelegramHosts();
  let lastError: unknown;

  for (const ip of hosts) {
    try {
      const raw = await requestToIp(ip, apiPath, {
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
        },
        body,
        timeoutMs: 20_000,
      });
      const data = JSON.parse(raw) as TelegramApiResponse<T>;
      if (!data.ok) {
        console.error(`[telegram] ${method} failed:`, data.description ?? raw);
        return null;
      }
      stickyIp = ip;
      return data.result ?? null;
    } catch (error) {
      lastError = error;
    }
  }

  console.error(`[telegram] ${method} error:`, lastError);
  return null;
}

function guessContentType(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  options: SendMessageOptions = {},
) {
  return telegramCall<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: options.parse_mode ?? "HTML",
    disable_web_page_preview: options.disable_web_page_preview ?? true,
    ...(options.reply_markup ? { reply_markup: options.reply_markup } : {}),
  });
}

export async function sendPhoto(
  chatId: number | string,
  photoPath: string,
  caption: string,
  options: SendMessageOptions = {},
) {
  const buffer = await fs.promises.readFile(photoPath);
  const filename = path.basename(photoPath);
  const fields: Record<string, string> = {
    chat_id: String(chatId),
    caption: caption.slice(0, 1024),
    parse_mode: options.parse_mode ?? "HTML",
  };
  if (options.reply_markup) {
    fields.reply_markup = JSON.stringify(options.reply_markup);
  }

  return telegramMultipartCall<{ message_id: number }>(
    "sendPhoto",
    fields,
    {
      name: "photo",
      filename,
      contentType: guessContentType(filename),
      buffer,
    },
  );
}

export async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  options: SendMessageOptions = {},
) {
  return telegramCall("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: options.parse_mode ?? "HTML",
    disable_web_page_preview: options.disable_web_page_preview ?? true,
    ...(options.reply_markup ? { reply_markup: options.reply_markup } : {}),
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return telegramCall("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text, show_alert: false } : {}),
  });
}

export async function setWebhook(url: string, secretToken: string) {
  return telegramCall("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
}

export const ADMIN_BOT_COMMANDS = [
  { command: "start", description: "Привязка и справка" },
  { command: "pending", description: "Сводка ожидающих заявок" },
  { command: "apps", description: "Заявки с кнопками Approve/Reject" },
  { command: "user", description: "Список игроков или /user ник" },
  { command: "help", description: "Список команд" },
] as const;

/** Menu shown in Telegram when typing «/». */
export async function setMyCommands(
  commands: ReadonlyArray<{ command: string; description: string }> = ADMIN_BOT_COMMANDS,
) {
  return telegramCall("setMyCommands", {
    commands: commands.map((c) => ({
      command: c.command,
      description: c.description,
    })),
  });
}
