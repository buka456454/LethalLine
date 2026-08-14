import { TournamentStatus } from "@prisma/client";

export const TOURNAMENT_STATUS_OPTIONS: Array<{ value: TournamentStatus; label: string }> = [
  { value: TournamentStatus.DRAFT, label: "Черновик" },
  { value: TournamentStatus.REGISTRATION_OPEN, label: "Приём заявок" },
  { value: TournamentStatus.IN_PROGRESS, label: "Матчи идут" },
  { value: TournamentStatus.RESULTS_COUNTING, label: "Считаем результаты" },
  { value: TournamentStatus.COMPLETED, label: "Завершён" },
];

const STATUS_LABELS = new Map<TournamentStatus, string>(TOURNAMENT_STATUS_OPTIONS.map((item) => [item.value, item.label]));

export function getTournamentStatusLabel(status: string): string {
  return STATUS_LABELS.get(status as TournamentStatus) ?? status;
}

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "на проверке",
  APPROVED: "принята",
  REJECTED: "отклонена",
};

/** Человеческий текст вместо PENDING / APPROVED / REJECTED. */
export function getApplicationStatusLabel(status: string): string {
  return APPLICATION_STATUS_LABELS[status] ?? status;
}

