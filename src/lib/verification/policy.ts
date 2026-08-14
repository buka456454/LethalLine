import { ExperienceVerificationStatus, VerificationMethod } from "@prisma/client";
import { BLOCKING_FLAGS, SUSPICIOUS_FLAGS, VERIFICATION_FLAGS, describeFlag, flagHint, type VerificationFlag } from "@/lib/verification/flags";
import { TRUST_LEVEL, expiresAtFor } from "@/lib/verification/trust";
import type { GameEvidence } from "@/lib/verification/providers";

/**
 * Решение по автопроверке.
 *
 * Принцип: одобряем автоматически только когда владение аккаунтом доказано
 * И ранг прочитан из API И нет тревожных сигналов. Всё остальное — либо
 * понятная инструкция игроку, либо очередь к модератору.
 */

export type VerificationDecision = {
  status: ExperienceVerificationStatus;
  method: VerificationMethod;
  trustLevel: number;
  flags: string[];
  /** Текст, который увидит пользователь. Для REJECTED это инструкция «что сделать». */
  note: string | null;
  expiresAt: Date | null;
};

function pick(flags: VerificationFlag[], list: VerificationFlag[]) {
  return flags.filter((flag) => list.includes(flag));
}

export function decideFromEvidence(evidence: GameEvidence): VerificationDecision {
  const flags = evidence.flags;

  // Провайдер лежит — не наказываем игрока и не одобряем вслепую.
  if (evidence.providerUnavailable) {
    return {
      status: ExperienceVerificationStatus.PENDING,
      method: VerificationMethod.LINKED_ACCOUNT,
      trustLevel: TRUST_LEVEL.LINKED_ACCOUNT,
      flags,
      note: "Сервис статистики временно недоступен. Мы повторим проверку автоматически.",
      expiresAt: null,
    };
  }

  const blocking = pick(flags, BLOCKING_FLAGS);
  if (blocking.length > 0) {
    return {
      status: ExperienceVerificationStatus.REJECTED,
      method: VerificationMethod.LINKED_ACCOUNT,
      trustLevel: TRUST_LEVEL.LINKED_ACCOUNT,
      flags,
      note: blocking.map(describeFlag).join(" "),
      expiresAt: null,
    };
  }

  // Ранга нет: аккаунт свой, но данные закрыты настройками. Это игрок правит сам.
  if (!evidence.rankLabel) {
    const fixable = flags.find((flag) => flagHint(flag));
    return {
      status: ExperienceVerificationStatus.REJECTED,
      method: VerificationMethod.LINKED_ACCOUNT,
      trustLevel: TRUST_LEVEL.LINKED_ACCOUNT,
      flags: flags.length > 0 ? flags : [VERIFICATION_FLAGS.NO_RANKED_DATA],
      note:
        (fixable ? flagHint(fixable) : null) ??
        "Мы не смогли прочитать ваш ранг. Откройте профиль и статистику матчей, затем нажмите «Проверить снова».",
      expiresAt: null,
    };
  }

  const suspicious = pick(flags, SUSPICIOUS_FLAGS);
  if (suspicious.length > 0) {
    return {
      status: ExperienceVerificationStatus.PENDING,
      method: VerificationMethod.API,
      trustLevel: TRUST_LEVEL.API,
      flags,
      note: `Ранг получен, но нужна проверка модератора: ${suspicious.map(describeFlag).join(" ")}`,
      expiresAt: expiresAtFor(VerificationMethod.API),
    };
  }

  return {
    status: ExperienceVerificationStatus.APPROVED,
    method: VerificationMethod.API,
    trustLevel: TRUST_LEVEL.API,
    flags,
    note: null,
    expiresAt: expiresAtFor(VerificationMethod.API),
  };
}

/**
 * Насколько сильно расходятся заявленный и проверенный ранг.
 * Сравниваем по позиции в упорядоченном списке подписей: если игрок
 * ошибся на пару ступеней — это нормально, если на полдиапазона — сигнал.
 */
export function detectRankMismatch(params: {
  orderedLabels: string[];
  selfReported: string | null | undefined;
  verified: string | null | undefined;
  /** Допустимый разрыв в ступенях. */
  tolerance: number;
}): boolean {
  const { orderedLabels, selfReported, verified, tolerance } = params;
  if (!selfReported || !verified) return false;
  const a = orderedLabels.indexOf(selfReported.trim());
  const b = orderedLabels.indexOf(verified.trim());
  if (a < 0 || b < 0) return false;
  return Math.abs(a - b) > tolerance;
}
