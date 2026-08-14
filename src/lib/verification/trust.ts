import { VerificationMethod } from "@prisma/client";

/**
 * Уровни доверия к подтверждению опыта.
 *
 * Смысл шкалы: чем выше уровень, тем дороже подделать. Скриншот стоит ниже
 * привязанного аккаунта, потому что картинку можно взять чужую, а пройти
 * логин в Steam за другого человека — нельзя.
 */
export const TRUST_LEVEL: Record<VerificationMethod, number> = {
  NONE: 0,
  /** Пользователь просто написал ранг руками. */
  SELF_REPORTED: 1,
  /** Скриншот с одноразовым кодом, подтверждённый модератором. */
  SCREENSHOT: 2,
  /** Владение аккаунтом доказано, но ранг из API получить не удалось. */
  LINKED_ACCOUNT: 3,
  /** Владение доказано и ранг прочитан из API. */
  API: 4,
};

/** Минимум для турниров с требованием подтверждённого ранга. */
export const MIN_TRUST_FOR_GATED_TOURNAMENT = TRUST_LEVEL.SCREENSHOT;

/** Сколько живёт снимок из API до обязательной пересинхронизации. */
export const API_SNAPSHOT_TTL_DAYS = 14;

/** Ручное подтверждение скриншотом тоже не вечно. */
export const SCREENSHOT_TTL_DAYS = 90;

export function trustLevelOf(method: VerificationMethod) {
  return TRUST_LEVEL[method] ?? 0;
}

export function describeMethod(method: VerificationMethod): string {
  switch (method) {
    case "API":
      return "автоматически по данным платформы";
    case "LINKED_ACCOUNT":
      return "аккаунт привязан, ранг скрыт настройками";
    case "SCREENSHOT":
      return "скриншот проверен модератором";
    case "SELF_REPORTED":
      return "указано пользователем";
    default:
      return "не подтверждено";
  }
}

export function expiresAtFor(method: VerificationMethod, from = new Date()): Date | null {
  const days = method === "API" || method === "LINKED_ACCOUNT" ? API_SNAPSHOT_TTL_DAYS : method === "SCREENSHOT" ? SCREENSHOT_TTL_DAYS : null;
  if (days === null) return null;
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
