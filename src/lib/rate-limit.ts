type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();
const MAX_BUCKETS = 20_000;
let lastCleanup = 0;

function cleanup(now: number) {
  if (now - lastCleanup < 60_000 && buckets.size < MAX_BUCKETS) return;
  lastCleanup = now;
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
  // Аварийный сброс при раздувании (DoS по уникальным ключам).
  if (buckets.size > MAX_BUCKETS) {
    buckets.clear();
  }
}

/**
 * In-memory rate limit (один инстанс Node).
 * За Cloudflare / несколькими репликами нужен Redis — см. .env.example.
 */
export function rateLimit(key: string, max = 10, windowMs = 60_000) {
  const now = Date.now();
  cleanup(now);

  const current = buckets.get(key);

  if (!current || now > current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  if (current.count >= max) return { allowed: false, remaining: 0 };

  current.count += 1;
  buckets.set(key, current);
  return { allowed: true, remaining: max - current.count };
}
