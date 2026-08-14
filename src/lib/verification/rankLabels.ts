/**
 * Единый словарь подписей рангов.
 *
 * Здесь и только здесь живут человеческие названия рангов. Из него берут
 * варианты выбора в анкете и нормализация ответов внешних API, поэтому
 * проверенный ранг всегда совпадает по написанию с тем, что видит пользователь.
 *
 * Модуль намеренно без зависимостей и без обращений к process.env:
 * его импортируют и серверные интеграции, и клиентская форма анкеты.
 */

export const ROMAN = ["I", "II", "III", "IV", "V"] as const;

const DOTA_MEDAL_TIERS = ["Вышка", "Страж", "Рыцарь", "Архонт", "Легенда", "Власть", "Божество"] as const;

export const DOTA_IMMORTAL_LABEL = "Титан (Immortal)";

/** Все медали Dota 2 по возрастанию: «Вышка I» … «Божество V», затем «Титан». */
export function dotaMedalLabels(): string[] {
  const labels: string[] = [];
  for (const tier of DOTA_MEDAL_TIERS) {
    for (const roman of ROMAN) {
      labels.push(`${tier} ${roman}`);
    }
  }
  labels.push(DOTA_IMMORTAL_LABEL);
  return labels;
}

/**
 * rank_tier из OpenDota -> подпись медали. 55 => «Легенда V», 80+ => «Титан».
 * null, если ранга нет: игрок не калиброван или скрыл публичные матчи.
 */
export function formatDotaRankTier(rankTier: number | null | undefined): string | null {
  if (typeof rankTier !== "number" || rankTier <= 0) return null;
  const tier = Math.floor(rankTier / 10);
  const stars = rankTier % 10;
  if (tier >= 8) return DOTA_IMMORTAL_LABEL;
  const medal = DOTA_MEDAL_TIERS[tier - 1];
  if (!medal) return null;
  const roman = ROMAN[Math.min(Math.max(stars, 1), 5) - 1];
  return `${medal} ${roman}`;
}

/**
 * Порядковый вес медали (0..80) для сравнений и эвристик.
 * Это не MMR, а только порядок: «Легенда V» выше «Архонта I».
 */
export function dotaRankTierToScore(rankTier: number | null | undefined): number | null {
  if (typeof rankTier !== "number" || rankTier <= 0) return null;
  const tier = Math.floor(rankTier / 10);
  const stars = Math.min(Math.max(rankTier % 10, 1), 5);
  if (tier >= 8) return 80;
  return tier * 10 + stars;
}

/** Цветовые диапазоны Premier в CS2: конкретное число прячем в диапазон. */
const PREMIER_BUCKETS: Array<{ min: number; max: number; label: string }> = [
  { min: 0, max: 4_999, label: "Premier 0–4999 (серый)" },
  { min: 5_000, max: 9_999, label: "Premier 5000–9999 (голубой)" },
  { min: 10_000, max: 14_999, label: "Premier 10000–14999 (синий)" },
  { min: 15_000, max: 19_999, label: "Premier 15000–19999 (фиолетовый)" },
  { min: 20_000, max: 24_999, label: "Premier 20000–24999 (розовый)" },
  { min: 25_000, max: 29_999, label: "Premier 25000–29999 (красный)" },
  { min: 30_000, max: Number.MAX_SAFE_INTEGER, label: "Premier 30000+ (золотой)" },
];

export function premierBucketLabels(): string[] {
  return PREMIER_BUCKETS.map((bucket) => bucket.label);
}

export function formatPremierRating(rating: number | null | undefined): string | null {
  if (typeof rating !== "number" || rating <= 0) return null;
  return PREMIER_BUCKETS.find((item) => rating >= item.min && rating <= item.max)?.label ?? null;
}

/** Порядковый вес ранга CS2 в той же шкале, что и Premier-рейтинг. */
export function premierRatingToScore(rating: number | null | undefined): number | null {
  if (typeof rating !== "number" || rating <= 0) return null;
  return rating;
}

export function formatFaceitLevel(level: number | null | undefined): string | null {
  if (typeof level !== "number" || level <= 0) return null;
  return `FACEIT уровень ${Math.round(level)}`;
}
