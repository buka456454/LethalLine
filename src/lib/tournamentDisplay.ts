import { formatRubFromMinor } from "@/lib/money";

export type TournamentCatalogItem = {
  id: string;
  title: string;
  description: string | null;
  format: string;
  status: string;
  teamSize: number;
  maxTeams: number;
  maxParticipants: number;
  entryFeeMinor: number;
  prizeMode: "ENTRY_FEES" | "SPONSOR";
  sponsorPrizeText: string | null;
  startsAt: string;
  requiresVerifiedExperience: boolean;
  game: { name: string; slug: string };
  teamCount: number;
};

export function formatTournamentDate(iso: string | Date) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "дата уточняется";
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTournamentDayKey(iso: string | Date) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatTeamSizeLabel(teamSize: number) {
  if (teamSize <= 1) return "соло";
  return `${teamSize}v${teamSize}`;
}

export function formatEntryFeeLabel(entryFeeMinor: number) {
  if (entryFeeMinor <= 0) return "бесплатно";
  return formatRubFromMinor(entryFeeMinor);
}

export function serializeTournamentCatalogItem(t: {
  id: string;
  title: string;
  description: string | null;
  format: string;
  status: string;
  teamSize: number;
  maxTeams: number;
  maxParticipants: number;
  entryFeeMinor: number;
  prizeMode: "ENTRY_FEES" | "SPONSOR";
  sponsorPrizeText: string | null;
  startsAt: Date;
  requiresVerifiedExperience: boolean;
  game: { name: string; slug: string };
  teamApplications: Array<{ id: string }>;
}): TournamentCatalogItem {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    format: t.format,
    status: t.status,
    teamSize: t.teamSize,
    maxTeams: t.maxTeams,
    maxParticipants: t.maxParticipants,
    entryFeeMinor: t.entryFeeMinor,
    prizeMode: t.prizeMode,
    sponsorPrizeText: t.sponsorPrizeText,
    startsAt: t.startsAt.toISOString(),
    requiresVerifiedExperience: t.requiresVerifiedExperience,
    game: { name: t.game.name, slug: t.game.slug },
    teamCount: t.teamApplications.length,
  };
}
