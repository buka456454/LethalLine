/**
 * Общий транспорт для внешних игровых API (Steam, OpenDota, Leetify, FACEIT).
 *
 * Задачи: не подвешивать наши роуты чужими таймаутами, не падать от одиночной
 * пятисотки провайдера и не долбить провайдера одинаковыми запросами.
 */

export type IntegrationErrorKind =
  | "TIMEOUT"
  | "NETWORK"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "HTTP"
  | "PARSE";

export class IntegrationError extends Error {
  readonly kind: IntegrationErrorKind;
  readonly provider: string;
  readonly status?: number;

  constructor(provider: string, kind: IntegrationErrorKind, message: string, status?: number) {
    super(`[${provider}] ${message}`);
    this.name = "IntegrationError";
    this.provider = provider;
    this.kind = kind;
    this.status = status;
  }
}

type CacheEntry = { value: unknown; expiresAt: number };

const cache = new Map<string, CacheEntry>();

/** Ограничитель размера, чтобы кэш не рос бесконечно в долгоживущем процессе. */
const MAX_CACHE_ENTRIES = 500;

function readCache<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function writeCache(key: string, value: unknown, ttlMs: number) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateIntegrationCache(keyPrefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) cache.delete(key);
  }
}

export type FetchJsonOptions = {
  provider: string;
  headers?: Record<string, string>;
  method?: "GET" | "POST";
  body?: string;
  timeoutMs?: number;
  /** Сколько раз повторить при таймауте / 5xx / 429. */
  retries?: number;
  /** Ключ кэша. Без него ответ не кэшируется. */
  cacheKey?: string;
  cacheTtlMs?: number;
  /** 404 вернуть как null вместо исключения. */
  notFoundAsNull?: boolean;
};

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T>(url: string, options: FetchJsonOptions): Promise<T | null> {
  const {
    provider,
    headers,
    method = "GET",
    body,
    timeoutMs = 8_000,
    retries = 2,
    cacheKey,
    cacheTtlMs = 60_000,
    notFoundAsNull = false,
  } = options;

  if (cacheKey) {
    const cached = readCache<T | null>(cacheKey);
    if (cached !== undefined) return cached;
  }

  let lastError: IntegrationError | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: { Accept: "application/json", ...headers },
        body,
        signal: controller.signal,
        cache: "no-store",
      });

      if (response.status === 404) {
        if (notFoundAsNull) {
          if (cacheKey) writeCache(cacheKey, null, cacheTtlMs);
          return null;
        }
        throw new IntegrationError(provider, "NOT_FOUND", "Resource not found", 404);
      }

      if (response.status === 401 || response.status === 403) {
        // Ключ провайдера неверный или отозван: повторять бессмысленно.
        throw new IntegrationError(provider, "UNAUTHORIZED", `Request rejected (${response.status})`, response.status);
      }

      if (!response.ok) {
        const kind: IntegrationErrorKind = response.status === 429 ? "RATE_LIMITED" : "HTTP";
        const error = new IntegrationError(provider, kind, `HTTP ${response.status}`, response.status);
        if (RETRYABLE_STATUSES.has(response.status) && attempt < retries) {
          lastError = error;
          await sleep(300 * (attempt + 1));
          continue;
        }
        throw error;
      }

      const text = await response.text();
      if (!text.trim()) {
        if (cacheKey) writeCache(cacheKey, null, cacheTtlMs);
        return null;
      }

      let parsed: T;
      try {
        parsed = JSON.parse(text) as T;
      } catch {
        throw new IntegrationError(provider, "PARSE", "Response is not valid JSON");
      }

      if (cacheKey) writeCache(cacheKey, parsed, cacheTtlMs);
      return parsed;
    } catch (error) {
      if (error instanceof IntegrationError) {
        if (error.kind === "HTTP" || error.kind === "RATE_LIMITED") {
          lastError = error;
          if (attempt < retries) {
            await sleep(300 * (attempt + 1));
            continue;
          }
        }
        throw error;
      }

      const aborted = error instanceof Error && error.name === "AbortError";
      lastError = new IntegrationError(
        provider,
        aborted ? "TIMEOUT" : "NETWORK",
        aborted ? `Timed out after ${timeoutMs}ms` : "Network request failed",
      );
      if (attempt < retries) {
        await sleep(300 * (attempt + 1));
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new IntegrationError(provider, "NETWORK", "Request failed");
}

/** Тот же транспорт, но для провайдеров, отвечающих не-JSON (Steam OpenID). */
export async function fetchText(url: string, options: Omit<FetchJsonOptions, "cacheKey" | "cacheTtlMs">) {
  const { provider, headers, method = "GET", body, timeoutMs = 8_000 } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new IntegrationError(provider, "HTTP", `HTTP ${response.status}`, response.status);
    }
    return await response.text();
  } catch (error) {
    if (error instanceof IntegrationError) throw error;
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new IntegrationError(
      provider,
      aborted ? "TIMEOUT" : "NETWORK",
      aborted ? `Timed out after ${timeoutMs}ms` : "Network request failed",
    );
  } finally {
    clearTimeout(timer);
  }
}
