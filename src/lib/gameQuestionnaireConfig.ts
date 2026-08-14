/**
 * Поля анкеты по дисциплинам: ранги и роли, ориентиры на MM/Act/Premier.
 * Значения сохраняются в rankLabel / primaryRole как строки (как и раньше).
 */

import { dotaMedalLabels, premierBucketLabels } from "@/lib/verification/rankLabels";

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

export const CUSTOM_SENTINEL = "__custom__";

/** Как несколько ролей лежат в одном строковом поле `primaryRole`. */
export const ROLE_SEPARATOR = " · ";
export const MAX_ROLES = 3;

export function parseRoles(stored: string | null | undefined): string[] {
  if (!stored) return [];
  return stored
    .split(/\s*[·|,;]\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== CUSTOM_SENTINEL);
}

export function serializeRoles(roles: string[]): string {
  const unique: string[] = [];
  for (const role of roles) {
    const trimmed = role.trim();
    if (!trimmed || trimmed === CUSTOM_SENTINEL) continue;
    if (unique.some((item) => item.toLowerCase() === trimmed.toLowerCase())) continue;
    unique.push(trimmed);
    if (unique.length >= MAX_ROLES) break;
  }
  return unique.join(ROLE_SEPARATOR);
}

/**
 * Явный ответ «в эту дисциплину не играю». Хранится в rankLabel как обычная строка,
 * но потребители (поиск напарников, публичный профиль) не считают это рангом.
 */
export const NOT_PLAYED_VALUE = "Не играл";
export const NOT_PLAYED_LABEL = "Нет опыта / не играл";

export function isNotPlayed(value: string | null | undefined) {
  return typeof value === "string" && value.trim() === NOT_PLAYED_VALUE;
}

/** Ставит «нет опыта» сразу после нейтрального пункта, чтобы вариант был у каждой игры. */
function withNotPlayed(options: SelectOption[]): SelectOption[] {
  const notPlayed: SelectOption = { value: NOT_PLAYED_VALUE, label: NOT_PLAYED_LABEL };
  const [first, ...rest] = options;
  if (!first) return [notPlayed];
  return first.value === "" ? [first, notPlayed, ...rest] : [notPlayed, first, ...rest];
}

function dotaMedalOptions(): SelectOption[] {
  const out: SelectOption[] = [{ value: "", label: "Не калиброван / не указываю" }];
  for (const label of dotaMedalLabels()) {
    out.push({ value: label, label });
  }
  out.push({ value: CUSTOM_SENTINEL, label: "Свой вариант (ввести вручную)…" });
  return withNotPlayed(out);
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
  out.push({ value: CUSTOM_SENTINEL, label: "Свой вариант…" });
  return withNotPlayed(out);
}

function cs2RankOptions(): SelectOption[] {
  const ranks: string[] = [
    ...premierBucketLabels(),
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
    "Не ранжируюсь в MM",
  ];
  const out: SelectOption[] = [{ value: "", label: "Не указываю" }];
  for (const r of ranks) {
    out.push({ value: r, label: r });
  }
  out.push({ value: CUSTOM_SENTINEL, label: "Свой вариант…" });
  return withNotPlayed(out);
}

const DOTA_ROLES: SelectOption[] = [
  { value: "", label: "Не указываю" },
  { value: "Позиция 1 — керри", label: "Позиция 1 — керри" },
  { value: "Позиция 2 — мид", label: "Позиция 2 — мид" },
  { value: "Позиция 3 — оффлейн", label: "Позиция 3 — оффлейн" },
  { value: "Позиция 4 — саппорт (полу)", label: "Позиция 4 — саппорт (полу)" },
  { value: "Позиция 5 — саппорт (лёгкий)", label: "Позиция 5 — саппорт (лёгкий)" },
  { value: "Универсал / флекс", label: "Универсал / флекс" },
  { value: CUSTOM_SENTINEL, label: "Свой вариант…" },
];

const VAL_ROLES: SelectOption[] = [
  { value: "", label: "Не указываю" },
  { value: "Дуэлянт", label: "Дуэлянт" },
  { value: "Заступник", label: "Заступник" },
  { value: "Контролёр", label: "Контролёр" },
  { value: "Страж", label: "Страж" },
  { value: "Флекс-роли", label: "Флекс-роли" },
  { value: CUSTOM_SENTINEL, label: "Свой вариант…" },
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
  { value: CUSTOM_SENTINEL, label: "Свой вариант…" },
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
    role: { mode: "select", label: "Позиции", options: DOTA_ROLES },
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
    role: { mode: "select", label: "Роли", options: VAL_ROLES },
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
    role: { mode: "select", label: "Роли в команде", options: CS2_ROLES },
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
  rank: {
    mode: "select",
    label: "Звание / ранг",
    options: withNotPlayed([
      { value: "", label: "Не указываю" },
      { value: CUSTOM_SENTINEL, label: "Свой вариант (ввести вручную)…" },
    ]),
  },
  hours: { label: "Часы в игре", placeholder: "Например 1200" },
  role: { mode: "freeText", label: "Роль" },
};

export function getGameQuestionnaireUi(slug: string): GameQuestionnaireUi {
  return CONFIG[slug] ?? DEFAULT_UI;
}

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
