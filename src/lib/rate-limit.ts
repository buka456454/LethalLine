type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

export function rateLimit(key: string, max = 10, windowMs = 60_000) {
  const now = Date.now();
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
