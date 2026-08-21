#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

TOKEN="${TELEGRAM_BOT_TOKEN:-}"
SECRET="${TELEGRAM_WEBHOOK_SECRET:-}"
BASE="${APP_URL:-${AUTH_URL:-https://lethalline.ru}}"
BASE="${BASE%/}"
URL="${BASE}/api/telegram/webhook"

if [[ -z "$TOKEN" || -z "$SECRET" ]]; then
  echo "TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET must be set in .env"
  exit 1
fi

echo "Setting webhook → $URL"
# Prefer Node helper (IPv4 fallbacks) because default DNS may point at a filtered Telegram IP.
node <<'NODE'
const https = require("https");
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const url = `${(process.env.APP_URL || process.env.AUTH_URL || "https://lethalline.ru").replace(/\/$/, "")}/api/telegram/webhook`;
const ips = ["149.154.167.220", "149.154.167.99", "149.154.167.50", "149.154.167.91"];
const body = JSON.stringify({
  url,
  secret_token: secret,
  allowed_updates: ["message", "callback_query"],
  drop_pending_updates: true,
});

function post(ip) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: ip,
        servername: "api.telegram.org",
        port: 443,
        path: `/bot${token}/setWebhook`,
        method: "POST",
        headers: {
          Host: "api.telegram.org",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 12000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, data }));
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  for (const ip of ips) {
    try {
      const r = await post(ip);
      console.log(ip, r.status, r.data);
      if (String(r.data).includes('"ok":true')) {
        console.log("WEBHOOK_OK");
        process.exit(0);
      }
    } catch (e) {
      console.log(ip, "fail", e.message);
    }
  }
  console.log("WEBHOOK_FAIL");
  process.exit(1);
})();
NODE
