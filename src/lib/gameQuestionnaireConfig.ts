/**
 * Поля анкеты по дисциплинам: ранги и роли, ориентиры на MM/Act/Premier.
 * Значения сохраняются в rankLabel / primaryRole как строки (как и раньше).
 */

export type SelectOption = { value: string; label: string };

export type GameQuestionnaireUi = {
  slug: string;
  /** Коротко: что важно для «профессиональности» в этой дисциплине */
  blurb: string;
  numeric: {
    show: boolean;
    label: string;
    placeholder: string;
    /** Если true — поле можно оставить пустым без потери смысла */
    emphasizeOptional?: boolean;
  };
  rank: {
    mode: "freeText" | "select";
    label: string;
    options?: SelectOption[];
  };
  hours: { label: string; placeholder: string };
  role: {
    mode: "freeText" | "select";
    label: string;
    options?: SelectOption[];
  };
};

const ROMAN = ["I", "II", "III", "IV", "V"] as const;

function dotaMedalOptions(): SelectOption[] {
  const tiers: { key: string; ru: string }[] = [
    { key: "herald", ru: "Вышка" },
    { key: "guardian", ru: "Страж" },
    { key: "crusader", ru: "Рыцарь" },
    { key: "archon", ru: "Архонт" },
    { key: "legend", ru: "Легенда" },
    { key: "ancient", ru: "Власть" },
    { key: "divine", ru: "Божество" },
  ];
  const out: SelectOption[] = [{ value: "", label: "Не калиброван / не указываю" }];
  for (const t of tiers) {
    for (let i = 0; i < 5; i++) {
      const label = `${t.ru} ${ROMAN[i]}`;
      out.push({ value: label, label });
    }
  }
  out.push({ value: "Титан (Immortal)", label: "Титан (Immortal)" });
  out.push({ value: "__custom__", label: "Свой вариант (ввести вручную)…" });
  return out;
}

function valorantRankOptions(): SelectOption[] {
  const out: SelectOption[] = [{ value: "", label: "Не калиброван / не указываю" }];
  const bands: { ru: string; en: string }[] = [
    { ru: "Железо", en: "Iron" },
    { ru: "Бронза", en: "Bronze" },
    { ru: "Серебро", en: "Silver" },
    { ru: "Золото", en: "Gold" },
    { ru: "Платина", en: "Platinum" },
    { ru: "Алмаз", en: "Diamond" },
    { ru: "Восходящий", en: "Ascendant" },
    { ru: "Бессмертный", en: "Immortal" },
  ];
  for (const b of bands) {
    for (let d = 1; d <= 3; d++) {
      const label = `${b.ru} ${d}`;
      out.push({ value: label, label });
    }
  }
  out.push({ value: "Радиант", label: "Радиант" });
  out.push({ value: "__custom__", label: "Свой вариант…" });
  return out;
}

function cs2RankOptions(): SelectOption[] {
  const ranks: string[] = [
    "Серебро I",
    "Серебро II",
    "Серебро III",
    "Серебро IV",
    "Серебро — элита",
    "Серебро — элита мастер",
    "Золотая звезда I",
    "Золотая звезда II",
    "Золотая звезда III",
    "Золотая звезда IV",
    "Мастер-страж I",
    "Мастер-страж II",
    "Мастер-страж — отличник",
    "Легендарный орёл",
    "Легендарный орёл мастер",
    "Высший золотой",
    "Глобальная элита",
    "Только Premier / Faceit (ранг в поле ниже)",
    "Не ранжируюсь в MM",
  ];
  const out: SelectOption[] = [{ value: "", label: "Не указываю" }];
  for (const r of ranks) {
    out.push({ value: r, label: r });
  }
  out.push({ value: "__custom__", label: "Свой вариант…" });
  return out;
}

const DOTA_ROLES: SelectOption[] = [
  { value: "", label: "Не указываю" },
  { value: "Позиция 1 — керри", label: "Позиция 1 — керри" },
  { value: "Позиция 2 — мид", label: "Позиция 2 — мид" },
  { value: "Позиция 3 — оффлейн", label: "Позиция 3 — оффлейн" },
  { value: "Позиция 4 — саппорт (полу)", label: "Позиция 4 — саппорт (полу)" },
  { value: "Позиция 5 — саппорт (лёгкий)", label: "Позиция 5 — саппорт (лёгкий)" },
  { value: "Универсал / флекс", label: "Универсал / флекс" },
  { value: "__custom__", label: "Свой вариант…" },
];

const VAL_ROLES: SelectOption[] = [
  { value: "", label: "Не указываю" },
  { value: "Дуэлянт", label: "Дуэлянт" },
  { value: "Заступник", label: "Заступник" },
  { value: "Контролёр", label: "Контролёр" },
  { value: "Страж", label: "Страж" },
  { value: "Флекс-роли", label: "Флекс-роли" },
  { value: "__custom__", label: "Свой вариант…" },
];

const CS2_ROLES: SelectOption[] = [
  { value: "", label: "Не указываю" },
  { value: "Капитан / IGL", label: "Капитан / IGL" },
  { value: "Точка захода (Entry)", label: "Точка захода (Entry)" },
  { value: "Саппорт", label: "Саппорт" },
  { value: "AWP", label: "AWP" },
  { value: "Лёркер", label: "Лёркер" },
  { value: "Рифлер", label: "Рифлер" },
  { value: "Универсал", label: "Универсал" },
  { value: "__custom__", label: "Свой вариант…" },
];

const CONFIG: Record<string, GameQuestionnaireUi> = {
  "dota-2": {
    slug: "dota-2",
    blurb:
      "В Dota 2 уровень чаще всего читают по медали рейтинга и MMR. Позиции 1–5 — стандарт для командного поиска и турниров.",
    numeric: {
      show: true,
      label: "MMR (рейтинговый матчмейкинг)",
      placeholder: "Например 3500",
    },
    rank: { mode: "select", label: "Медаль рейтинга", options: dotaMedalOptions() },
    hours: { label: "Часы в Dota 2", placeholder: "Steam / общее время" },
    role: { mode: "select", label: "Основная позиция", options: DOTA_ROLES },
  },
  valorant: {
    slug: "valorant",
    blurb:
      "В Valorant ранг актов (Iron → Radiant) и RR показывают текущую форму. Роль агента помогает подобрать состав в турнире.",
    numeric: {
      show: true,
      label: "RR в текущем ранге (опционально)",
      placeholder: "0–100",
      emphasizeOptional: true,
    },
    rank: { mode: "select", label: "Ранг актов", options: valorantRankOptions() },
    hours: { label: "Часы в Valorant", placeholder: "По желанию" },
    role: { mode: "select", label: "Предпочитаемая роль", options: VAL_ROLES },
  },
  cs2: {
    slug: "cs2",
    blurb:
      "В CS2 отдельно живут премьер-рейтинг, Faceit и соревновательные ранги. Укажите то, по чему вы обычно оцениваете свой уровень.",
    numeric: {
      show: true,
      label: "Premier ELO или Elo Faceit (опционально)",
      placeholder: "Например 15000 или 2500",
      emphasizeOptional: true,
    },
    rank: { mode: "select", label: "Ранг в соревновательном режиме", options: cs2RankOptions() },
    hours: { label: "Часы в CS2", placeholder: "Steam" },
    role: { mode: "select", label: "Роль в команде", options: CS2_ROLES },
  },
};

const DEFAULT_UI: GameQuestionnaireUi = {
  slug: "_default",
  blurb: "Укажите уровень игры — так проще подбирать составы и соперников.",
  numeric: {
    show: true,
    label: "Числовой рейтинг (опционально)",
    placeholder: "Очки рейтинга",
    emphasizeOptional: true,
  },
  rank: { mode: "freeText", label: "Звание / ранг" },
  hours: { label: "Часы в игре", placeholder: "Например 1200" },
  role: { mode: "freeText", label: "Роль" },
};

export function getGameQuestionnaireUi(slug: string): GameQuestionnaireUi {
  return CONFIG[slug] ?? DEFAULT_UI;
}

export const CUSTOM_SENTINEL = "__custom__";

/** Текущее значение → значение <select> и текст кастома */
export function splitSelectValue(
  stored: string,
  options: SelectOption[] | undefined,
): { select: string; custom: string } {
  const trimmed = stored.trim();
  if (!trimmed) return { select: "", custom: "" };
  if (trimmed === CUSTOM_SENTINEL) return { select: CUSTOM_SENTINEL, custom: "" };
  if (!options?.length) return { select: CUSTOM_SENTINEL, custom: trimmed };
  const values = new Set(options.map((o) => o.value).filter((v) => v && v !== CUSTOM_SENTINEL));
  if (values.has(trimmed)) return { select: trimmed, custom: "" };
  return { select: CUSTOM_SENTINEL, custom: trimmed };
}

/** Собрать строку для сохранения из select + custom */
export function mergeSelectValue(select: string, custom: string): string {
  if (select === CUSTOM_SENTINEL) {
    const trimmedCustom = custom.trim();
    return trimmedCustom || CUSTOM_SENTINEL;
  }
  return select.trim();
}
