/**
 * Сигналы риска, которые мы вешаем на профиль при автопроверке.
 *
 * Флаги не решают судьбу заявки сами — решение принимает policy.ts.
 * Их задача: объяснить и пользователю, и модератору, что именно не так.
 */

export const VERIFICATION_FLAGS = {
  /** Профиль Steam закрыт: часы и дату регистрации прочитать нельзя. */
  PRIVATE_PROFILE: "PRIVATE_PROFILE",
  /** Аккаунт есть, но рейтинговых данных нет (не калиброван или скрыл матчи). */
  NO_RANKED_DATA: "NO_RANKED_DATA",
  VAC_BAN: "VAC_BAN",
  GAME_BAN: "GAME_BAN",
  FACEIT_BAN: "FACEIT_BAN",
  /** Слишком свежий аккаунт для заявленного уровня. */
  NEW_ACCOUNT: "NEW_ACCOUNT",
  /** Высокий ранг при подозрительно малом количестве часов — типичный смурф. */
  LOW_HOURS_HIGH_RANK: "LOW_HOURS_HIGH_RANK",
  /** Пользователь указал одно, платформа говорит другое. */
  RANK_MISMATCH: "RANK_MISMATCH",
  /** Этот внешний аккаунт уже привязывали к другому пользователю сайта. */
  REUSED_ACCOUNT: "REUSED_ACCOUNT",
  /** FACEIT и Steam не сошлись по SteamID: привязка выглядит чужой. */
  CROSS_CHECK_FAILED: "CROSS_CHECK_FAILED",
} as const;

export type VerificationFlag = (typeof VERIFICATION_FLAGS)[keyof typeof VERIFICATION_FLAGS];

/** Флаги, при которых допускать до турниров нельзя ни при каких условиях. */
export const BLOCKING_FLAGS: VerificationFlag[] = [
  VERIFICATION_FLAGS.VAC_BAN,
  VERIFICATION_FLAGS.GAME_BAN,
  VERIFICATION_FLAGS.FACEIT_BAN,
  VERIFICATION_FLAGS.REUSED_ACCOUNT,
  VERIFICATION_FLAGS.CROSS_CHECK_FAILED,
];

/** Флаги, которые не блокируют, но требуют взгляда модератора. */
export const SUSPICIOUS_FLAGS: VerificationFlag[] = [
  VERIFICATION_FLAGS.NEW_ACCOUNT,
  VERIFICATION_FLAGS.LOW_HOURS_HIGH_RANK,
  VERIFICATION_FLAGS.RANK_MISMATCH,
];

const FLAG_TEXT: Record<VerificationFlag, string> = {
  PRIVATE_PROFILE: "Профиль Steam закрыт — мы не видим часы в игре.",
  NO_RANKED_DATA: "У аккаунта нет данных о рейтинге.",
  VAC_BAN: "На аккаунте есть блокировка VAC.",
  GAME_BAN: "На аккаунте есть игровая блокировка.",
  FACEIT_BAN: "Аккаунт заблокирован на FACEIT.",
  NEW_ACCOUNT: "Аккаунт зарегистрирован совсем недавно.",
  LOW_HOURS_HIGH_RANK: "Высокий ранг при очень малом количестве часов.",
  RANK_MISMATCH: "Указанный ранг заметно расходится с данными платформы.",
  REUSED_ACCOUNT: "Этот игровой аккаунт уже привязан к другому профилю на сайте.",
  CROSS_CHECK_FAILED: "Аккаунты Steam и FACEIT принадлежат разным людям.",
};

export function describeFlag(flag: string): string {
  return FLAG_TEXT[flag as VerificationFlag] ?? flag;
}

/** Подсказка пользователю: что он может сделать сам. */
const FLAG_HINT: Partial<Record<VerificationFlag, string>> = {
  PRIVATE_PROFILE:
    "Откройте профиль Steam: «Настройки приватности» → «Мой профиль» и «Детали игр» поставьте «Открытый», затем нажмите «Проверить снова».",
  NO_RANKED_DATA:
    "Для Dota 2 включите в настройках игры «Открыть данные матчей», для CS2 сыграйте хотя бы один матч Premier. Затем нажмите «Проверить снова».",
};

export function flagHint(flag: string): string | null {
  return FLAG_HINT[flag as VerificationFlag] ?? null;
}
