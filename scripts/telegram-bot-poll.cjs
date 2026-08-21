#!/usr/bin/env node
/**
 * Long-polling bridge: pulls Telegram updates and forwards them to the local
 * Next.js webhook handler. Used when Telegram cannot reach our public HTTPS
 * webhook (inbound timeout), while outbound API calls still work.
 */
const https = require("https");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return;
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const LOCAL_WEBHOOK =
  process.env.TELEGRAM_LOCAL_WEBHOOK?.trim() || "http://127.0.0.1:3000/api/telegram/webhook";
const OFFSET_FILE = path.join(ROOT, "data", "telegram-poll-offset");
const TELEGRAM_IPS = [
  process.env.TELEGRAM_API_IP?.trim(),
  "149.154.167.220",
  "149.154.167.99",
  "149.154.167.50",
  "149.154.167.91",
].filter(Boolean);

let stickyIp = TELEGRAM_IPS[0] || "149.154.167.220";

if (!TOKEN || !SECRET) {
  console.error("TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET are required");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function orderedIps() {
  const list = [stickyIp, ...TELEGRAM_IPS.filter((ip) => ip !== stickyIp)];
  return [...new Set(list)];
}

function postJsonToIp(ip, apiPath, body, timeoutMs) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: ip,
        servername: "api.telegram.org",
        port: 443,
        path: apiPath,
        method: "POST",
        headers: {
          Host: "api.telegram.org",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error(`timeout ${ip}`)));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function telegramCall(method, body, timeoutMs = 8_000) {
  const apiPath = `/bot${TOKEN}/${method}`;
  let lastError;
  for (const ip of orderedIps()) {
    try {
      const res = await postJsonToIp(ip, apiPath, body, timeoutMs);
      const data = JSON.parse(res.body);
      if (!data.ok) {
        throw new Error(data.description || res.body);
      }
      stickyIp = ip;
      return data.result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("telegram unreachable");
}

function readOffset() {
  try {
    const raw = fs.readFileSync(OFFSET_FILE, "utf8").trim();
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeOffset(offset) {
  fs.mkdirSync(path.dirname(OFFSET_FILE), { recursive: true });
  fs.writeFileSync(OFFSET_FILE, String(offset), "utf8");
}

async function forwardUpdate(update) {
  const res = await fetch(LOCAL_WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": SECRET,
    },
    body: JSON.stringify(update),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`local webhook ${res.status}: ${text}`);
  }
}

async function ensureNoWebhook() {
  try {
    await telegramCall("deleteWebhook", { drop_pending_updates: false }, 8_000);
    console.log("[tg-poll] webhook cleared (using long polling)");
  } catch (error) {
    console.warn("[tg-poll] deleteWebhook:", error.message || error);
  }
}

async function ensureCommandMenu() {
  const commands = [
    { command: "start", description: "Привязка и справка" },
    { command: "pending", description: "Сводка ожидающих заявок" },
    { command: "apps", description: "Заявки с кнопками Approve/Reject" },
    { command: "user", description: "Список игроков или /user ник" },
    { command: "help", description: "Список команд" },
  ];
  try {
    await telegramCall("setMyCommands", { commands }, 8_000);
    console.log("[tg-poll] command menu set (", commands.map((c) => "/" + c.command).join(", "), ")");
  } catch (error) {
    console.warn("[tg-poll] setMyCommands:", error.message || error);
  }
}

async function loop() {
  await ensureNoWebhook();
  await ensureCommandMenu();
  let offset = readOffset();
  console.log(`[tg-poll] started; sticky=${stickyIp}; offset=${offset}; forward → ${LOCAL_WEBHOOK}`);

  while (true) {
    try {
      // Long-poll timeout 25s + 8s network margin on sticky IP first.
      const updates = await telegramCall(
        "getUpdates",
        {
          offset: offset > 0 ? offset : undefined,
          timeout: 25,
          allowed_updates: ["message", "callback_query"],
        },
        35_000,
      );

      for (const update of updates || []) {
        const started = Date.now();
        try {
          await forwardUpdate(update);
          console.log(`[tg-poll] handled update_id=${update.update_id} in ${Date.now() - started}ms`);
        } catch (error) {
          console.error(`[tg-poll] forward failed update_id=${update.update_id}:`, error);
        }
        offset = update.update_id + 1;
        writeOffset(offset);
      }
    } catch (error) {
      console.error("[tg-poll] getUpdates error:", error.message || error);
      await sleep(1500);
    }
  }
}

loop().catch((error) => {
  console.error("[tg-poll] fatal:", error);
  process.exit(1);
});
