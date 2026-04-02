import type { MatchStatus, RegistrationStatus, TeamApplicationStatus, TournamentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PublicTournamentRow = {
  tournamentId: string;
  title: string;
  startsAt: Date;
  status: TournamentStatus;
  gameName: string;
  format: string;
  prizeMode: string;
  sponsorPrizeText: string | null;
  kind: "solo" | "team";
  teamName?: string;
  role?: "captain" | "member";
  registrationStatus?: RegistrationStatus;
  teamStatus?: TeamApplicationStatus;
};

export type PublicProfileActivity = {
  tournaments: PublicTournamentRow[];
  stats: {
    /** Уникальные турниры с любым участием */
    tournamentsEntered: number;
    /** Турниры, где в финальном раунде победитель совпал с ником/названием команды игрока */
    tournamentsWon: number;
    /** Все завершённые матчи, где winnerLabel = ник (соло) или название команды игрока */
    matchWins: number;
  };
  wonTournamentTitles: Array<{ tournamentId: string; title: string; startsAt: Date; sponsorPrizeText: string | null; prizeMode: string }>;
};

type FinishedMatch = {
  tournamentId: string;
  round: number;
  winnerLabel: string | null;
  status: MatchStatus;
};

function buildAliasSets(
  username: string,
  registrations: { tournamentId: string }[],
  teamApps: { tournamentId: string; teamName: string }[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  const add = (tid: string, label: string) => {
    const t = label.trim();
    if (!t) return;
    if (!map.has(tid)) map.set(tid, new Set());
    map.get(tid)!.add(t);
  };

  for (const r of registrations) {
    add(r.tournamentId, username);
  }

  for (const app of teamApps) {
    add(app.tournamentId, app.teamName);
  }

  return map;
}

function computeWinStats(
  tournamentIds: string[],
  aliasByTournament: Map<string, Set<string>>,
  matches: FinishedMatch[],
): { matchWins: number; tournamentsWon: number; wonIds: Set<string> } {
  let matchWins = 0;
  const wonIds = new Set<string>();

  for (const m of matches) {
    if (m.status !== "FINISHED" || !m.winnerLabel?.trim()) continue;
    const aliases = aliasByTournament.get(m.tournamentId);
    if (!aliases || !aliases.has(m.winnerLabel.trim())) continue;
    matchWins++;
  }

  const byTid = new Map<string, FinishedMatch[]>();
  for (const m of matches) {
    if (!byTid.has(m.tournamentId)) byTid.set(m.tournamentId, []);
    byTid.get(m.tournamentId)!.push(m);
  }

  for (const tid of tournamentIds) {
    const tm = byTid.get(tid) ?? [];
    if (tm.length === 0) continue;
    const maxR = Math.max(...tm.map((x) => x.round));
    const aliases = aliasByTournament.get(tid);
    if (!aliases) continue;
    const wonFinal = tm.some(
      (m) => m.round === maxR && m.status === "FINISHED" && m.winnerLabel && aliases.has(m.winnerLabel.trim()),
    );
    if (wonFinal) wonIds.add(tid);
  }

  return { matchWins, tournamentsWon: wonIds.size, wonIds };
}

export async function loadPublicProfileActivity(userId: string, username: string): Promise<PublicProfileActivity> {
  const [registrations, teamApplications, allTeamAsMember] = await Promise.all([
    prisma.tournamentRegistration.findMany({
      where: { userId },
      include: {
        tournament: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            status: true,
            format: true,
            prizeMode: true,
            sponsorPrizeText: true,
            game: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.teamApplication.findMany({
      where: { captainId: userId },
      include: {
        tournament: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            status: true,
            format: true,
            prizeMode: true,
            sponsorPrizeText: true,
            game: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.teamApplication.findMany({
      where: {
        members: {
          some: {
            OR: [{ linkedUserId: userId }, { username }],
          },
        },
        NOT: { captainId: userId },
      },
      include: {
        tournament: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            status: true,
            format: true,
            prizeMode: true,
            sponsorPrizeText: true,
            game: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  const teamById = new Map<string, (typeof teamApplications)[number]>();
  for (const app of teamApplications) teamById.set(app.id, app);
  for (const app of allTeamAsMember) {
    if (!teamById.has(app.id)) teamById.set(app.id, app);
  }
  const allTeamApps = [...teamById.values()];

  const rows: PublicTournamentRow[] = [];

  for (const r of registrations) {
    const t = r.tournament;
    rows.push({
      tournamentId: t.id,
      title: t.title,
      startsAt: t.startsAt,
      status: t.status,
      gameName: t.game.name,
      format: t.format,
      prizeMode: t.prizeMode,
      sponsorPrizeText: t.sponsorPrizeText,
      kind: "solo",
      registrationStatus: r.status,
    });
  }

  for (const app of teamApplications) {
    const t = app.tournament;
    rows.push({
      tournamentId: t.id,
      title: t.title,
      startsAt: t.startsAt,
      status: t.status,
      gameName: t.game.name,
      format: t.format,
      prizeMode: t.prizeMode,
      sponsorPrizeText: t.sponsorPrizeText,
      kind: "team",
      teamName: app.teamName,
      role: "captain",
      teamStatus: app.status,
    });
  }

  for (const app of allTeamAsMember) {
    if (app.captainId === userId) continue;
    const t = app.tournament;
    rows.push({
      tournamentId: t.id,
      title: t.title,
      startsAt: t.startsAt,
      status: t.status,
      gameName: t.game.name,
      format: t.format,
      prizeMode: t.prizeMode,
      sponsorPrizeText: t.sponsorPrizeText,
      kind: "team",
      teamName: app.teamName,
      role: "member",
      teamStatus: app.status,
    });
  }

  rows.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

  const tournamentIds = [...new Set(rows.map((r) => r.tournamentId))];

  const aliasByTournament = buildAliasSets(
    username,
    registrations.map((r) => ({ tournamentId: r.tournamentId })),
    allTeamApps.map((a) => ({ tournamentId: a.tournamentId, teamName: a.teamName })),
  );

  const matches: FinishedMatch[] =
    tournamentIds.length === 0
      ? []
      : await prisma.match.findMany({
          where: {
            tournamentId: { in: tournamentIds },
            status: "FINISHED",
            winnerLabel: { not: null },
          },
          select: {
            tournamentId: true,
            round: true,
            winnerLabel: true,
            status: true,
          },
        });

  const { matchWins, tournamentsWon, wonIds } = computeWinStats(tournamentIds, aliasByTournament, matches);

  const wonTournamentTitles: PublicProfileActivity["wonTournamentTitles"] = [];
  const seenWon = new Set<string>();
  for (const row of rows) {
    if (!wonIds.has(row.tournamentId) || seenWon.has(row.tournamentId)) continue;
    seenWon.add(row.tournamentId);
    wonTournamentTitles.push({
      tournamentId: row.tournamentId,
      title: row.title,
      startsAt: row.startsAt,
      sponsorPrizeText: row.sponsorPrizeText,
      prizeMode: row.prizeMode,
    });
  }
  wonTournamentTitles.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

  return {
    tournaments: rows,
    stats: {
      tournamentsEntered: tournamentIds.length,
      tournamentsWon,
      matchWins,
    },
    wonTournamentTitles,
  };
}
