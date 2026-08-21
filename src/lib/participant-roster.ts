import type { ParticipantRoster } from "@/lib/bracket-types";

type RosterRegistration = {
  user: { username: string; avatarUrl: string | null };
};

type RosterTeamApplication = {
  teamName: string;
  teamLogoUrl: string | null;
  captain: { username: string; avatarUrl: string | null };
  members: Array<{ username: string; isCaptain: boolean }>;
};

function sortMembers<T extends { isCaptain: boolean }>(members: T[]) {
  return [...members].sort((a, b) => Number(b.isCaptain) - Number(a.isCaptain));
}

function appLogoUrl(app: RosterTeamApplication, teamSize: number): string | null {
  if (app.teamLogoUrl) return app.teamLogoUrl;
  const isSolo = teamSize === 1 || / \(соло\)$/i.test(app.teamName);
  if (isSolo) return app.captain.avatarUrl;
  return null;
}

/** Собирает состав по лейблу сетки: соло = username, команды = teamName. */
export function buildParticipantRosters(input: {
  teamSize: number;
  registrations: RosterRegistration[];
  teamApplications: RosterTeamApplication[];
}): Record<string, ParticipantRoster> {
  const out: Record<string, ParticipantRoster> = {};

  if (input.teamSize === 1) {
    for (const reg of input.registrations) {
      out[reg.user.username] = {
        label: reg.user.username,
        kind: "solo",
        logoUrl: reg.user.avatarUrl,
        members: [{ username: reg.user.username, isCaptain: true }],
      };
    }
    for (const app of input.teamApplications) {
      const captainName = app.members.find((m) => m.isCaptain)?.username ?? app.captain.username;
      const members = app.members.length
        ? sortMembers(app.members).map((m) => ({ username: m.username, isCaptain: m.isCaptain }))
        : [{ username: captainName, isCaptain: true }];
      out[captainName] = {
        label: captainName,
        kind: "solo",
        logoUrl: appLogoUrl(app, 1) ?? out[captainName]?.logoUrl ?? null,
        members,
      };
    }
    return out;
  }

  for (const app of input.teamApplications) {
    out[app.teamName] = {
      label: app.teamName,
      kind: "team",
      logoUrl: app.teamLogoUrl,
      members: sortMembers(app.members).map((m) => ({ username: m.username, isCaptain: m.isCaptain })),
    };
  }
  return out;
}
