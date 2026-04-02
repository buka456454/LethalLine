import crypto from "crypto";

export type TBankConfig = {
  terminalKey: string;
  password: string;
  baseUrl?: string;
};

export type TBankInitRequest = {
  Amount: number;
  OrderId: string;
  Description?: string;
  NotificationURL?: string;
  SuccessURL?: string;
  FailURL?: string;
};

export type TBankInitResponse = {
  Success: boolean;
  ErrorCode: string;
  Message?: string;
  Details?: string;
  PaymentId?: string;
  PaymentURL?: string;
  TerminalKey?: string;
  OrderId?: string;
  Amount?: number;
  Status?: string;
};

export type TBankCancelRequest = {
  PaymentId: string;
  Amount?: number;
};

export type TBankCancelResponse = {
  Success: boolean;
  ErrorCode: string;
  Message?: string;
  Details?: string;
  PaymentId?: string;
  OrderId?: string;
  Status?: string;
};

export type TBankNotificationPayment = Record<string, unknown> & {
  TerminalKey?: string;
  OrderId?: string;
  Success?: boolean | string;
  Status?: string;
  PaymentId?: string;
  ErrorCode?: string;
  Amount?: number | string;
  Token?: string;
};

const DEFAULT_BASE_URL = "https://securepay.tinkoff.ru/v2";

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function toTokenString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function buildToken(params: Record<string, unknown>, password: string) {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === "Token") continue;
    if (value && typeof value === "object") continue;
    if (value === undefined) continue;
    flat[key] = toTokenString(value);
  }
  flat.Password = password;

  const tokenSource = Object.keys(flat)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => flat[k] ?? "")
    .join("");

  return sha256Hex(tokenSource);
}

async function tbankPost<TResponse>(
  baseUrl: string,
  path: string,
  payload: Record<string, unknown>,
): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const json = (await response.json()) as TResponse;
  return json;
}

export function getTBankConfigFromEnv(): TBankConfig {
  const terminalKey = process.env.TBANK_TERMINAL_KEY;
  const password = process.env.TBANK_PASSWORD;
  const baseUrl = process.env.TBANK_BASE_URL;

  if (!terminalKey) throw new Error("Missing TBANK_TERMINAL_KEY");
  if (!password) throw new Error("Missing TBANK_PASSWORD");

  return { terminalKey, password, baseUrl: baseUrl || DEFAULT_BASE_URL };
}

export async function tbankInitPayment(config: TBankConfig, request: TBankInitRequest): Promise<TBankInitResponse> {
  const payload: Record<string, unknown> = {
    TerminalKey: config.terminalKey,
    Amount: request.Amount,
    OrderId: request.OrderId,
    Description: request.Description,
    NotificationURL: request.NotificationURL,
    SuccessURL: request.SuccessURL,
    FailURL: request.FailURL,
  };
  payload.Token = buildToken(payload, config.password);

  return await tbankPost<TBankInitResponse>(config.baseUrl ?? DEFAULT_BASE_URL, "/Init", payload);
}

export async function tbankCancelPayment(config: TBankConfig, request: TBankCancelRequest): Promise<TBankCancelResponse> {
  const payload: Record<string, unknown> = {
    TerminalKey: config.terminalKey,
    PaymentId: request.PaymentId,
    Amount: request.Amount,
  };
  payload.Token = buildToken(payload, config.password);

  return await tbankPost<TBankCancelResponse>(config.baseUrl ?? DEFAULT_BASE_URL, "/Cancel", payload);
}

export function verifyTBankNotificationToken(notification: TBankNotificationPayment, password: string) {
  const token = typeof notification.Token === "string" ? notification.Token : "";
  const expected = buildToken(notification as Record<string, unknown>, password);
  return token && token === expected;
}

