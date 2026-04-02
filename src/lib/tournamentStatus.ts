import { TournamentStatus } from "@prisma/client";

export const TOURNAMENT_STATUS_OPTIONS: Array<{ value: TournamentStatus; label: string }> = [
  { value: TournamentStatus.DRAFT, label: "Черновик" },
  { value: TournamentStatus.REGISTRATION_OPEN, label: "Набор участников" },
  { value: TournamentStatus.IN_PROGRESS, label: "В процессе" },
  { value: TournamentStatus.RESULTS_COUNTING, label: "Подсчет результатов" },
  { value: TournamentStatus.COMPLETED, label: "Завершен" },
];

const STATUS_LABELS = new Map<TournamentStatus, string>(TOURNAMENT_STATUS_OPTIONS.map((item) => [item.value, item.label]));

export function getTournamentStatusLabel(status: string): string {
  return STATUS_LABELS.get(status as TournamentStatus) ?? status;
}

