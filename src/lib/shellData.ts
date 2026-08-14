import { prisma } from "@/lib/prisma";
import { canAccessAdminTabSession, readSession, type SessionPayload } from "@/lib/auth";

export type ShellCup = {
  id: string;
  title: string;
  gameName: string;
  gameSlug: string;
  slotsLeft: number;
  maxTeams: number;
  takenTeams: number;
  status: string;
  entryFeeMinor: number;
  requiresVerifiedExperience: boolean;
};

export type ShellData = {
  session: SessionPayload | null;
  canAdmin: boolean;
  unreadChats: number;
  cup: ShellCup | null;
  rankVerified: boolean;
  hasQuestionnaire: boolean;
  needsPhoneVerify: boolean;
  phone: string | null;
};

export async function loadShellData(): Promise<ShellData> {
  const session = await readSession();
  const empty: ShellData = {
    session,
    canAdmin: false,
    unreadChats: 0,
    cup: null,
    rankVerified: false,
    hasQuestionnaire: false,
    needsPhoneVerify: false,
    phone: null,
  };

  try {
    const cupRow = await prisma.tournament.findFirst({
      where: {
        isPublished: true,
        status: { in: ["REGISTRATION_OPEN", "IN_PROGRESS"] },
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        title: true,
        status: true,
        maxTeams: true,
        entryFeeMinor: true,
        requiresVerifiedExperience: true,
        game: { select: { name: true, slug: true } },
        teamApplications: { where: { status: "APPROVED" }, select: { id: true } },
      },
    });

    const cup: ShellCup | null = cupRow
      ? {
          id: cupRow.id,
          title: cupRow.title,
          gameName: cupRow.game.name,
          gameSlug: cupRow.game.slug,
          takenTeams: cupRow.teamApplications.length,
          maxTeams: cupRow.maxTeams,
          slotsLeft: Math.max(0, cupRow.maxTeams - cupRow.teamApplications.length),
          status: cupRow.status,
          entryFeeMinor: cupRow.entryFeeMinor,
          requiresVerifiedExperience: cupRow.requiresVerifiedExperience,
        }
      : null;

    if (!session) {
      return { ...empty, cup };
    }

    const [unreadChats, user, profiles] = await Promise.all([
      prisma.chatMessage.count({
        where: {
          readAt: null,
          senderId: { not: session.sub },
          dialog: {
            OR: [{ participantAId: session.sub }, { participantBId: session.sub }],
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: session.sub },
        select: { phone: true, phoneVerifiedAt: true },
      }),
      prisma.userGameProfile.findMany({
        where: { userId: session.sub },
        select: {
          mmr: true,
          rankLabel: true,
          hoursPlayed: true,
          primaryRole: true,
          experienceVerificationStatus: true,
        },
      }),
    ]);

    const hasQuestionnaire = profiles.some(
      (p) =>
        p.mmr != null ||
        p.hoursPlayed != null ||
        (p.rankLabel != null && p.rankLabel.trim() !== "") ||
        (p.primaryRole != null && p.primaryRole.trim() !== ""),
    );
    const rankVerified = profiles.some((p) => p.experienceVerificationStatus === "APPROVED");
    const needsPhoneVerify = Boolean(user?.phone) && !user?.phoneVerifiedAt;

    return {
      session,
      canAdmin: canAccessAdminTabSession(session),
      unreadChats,
      cup,
      rankVerified,
      hasQuestionnaire,
      needsPhoneVerify,
      phone: user?.phone ?? null,
    };
  } catch {
    return empty;
  }
}
