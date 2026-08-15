import { FriendshipStatus, TournamentStatus } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { getFriendshipBetween } from "@/lib/friends";
import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { teamApplicationSchema } from "@/lib/schemas";
import { isAllowedTeamSize, requiredTeammates } from "@/lib/tournament";
import { checkVerifiedExperienceGate } from "@/lib/verification/gate";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const limit = rateLimit(`team-apply:${session.sub}`, 12, 10 * 60_000);
    if (!limit.allowed) return fail("Слишком много заявок. Попробуйте позже.", 429);
    const { id } = await context.params;
    const parsed = teamApplicationSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid team application payload", 422);

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { registrations: true, teamApplications: true },
    });
    if (!tournament) return fail("Tournament not found", 404);
    const now = new Date();
    const isCompleted = tournament.status === TournamentStatus.COMPLETED;
    const isFinishedByTime = Boolean(tournament.endsAt && tournament.endsAt <= now);
    if (isCompleted || isFinishedByTime) return fail("Tournament is completed", 400);
    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) return fail("Registration is closed", 400);

    if (tournament.requiresVerifiedExperience) {
      const gate = await checkVerifiedExperienceGate(session.sub, tournament.gameId);
      if (!gate.allowed) return fail(gate.message, 403);
    }

    const teamSlotsUsed = tournament.teamApplications.length;
    if (teamSlotsUsed >= tournament.maxTeams) return fail("Tournament is full", 400);

    const uniqueUsernames = Array.from(
      new Set(parsed.data.memberUsernames.map((name) => name.trim()).filter((name) => name.length > 0)),
    );
    const captain = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { username: true },
    });
    if (!captain) return fail("Captain user not found", 404);

    if (!isAllowedTeamSize(tournament.teamSize)) return fail("Unsupported team size", 400);

    const isSolo = tournament.teamSize === 1;
    const required = requiredTeammates(tournament.teamSize);
    if (required > 0 && uniqueUsernames.length !== required) {
      return fail(`Expected ${required} teammates for this tournament`, 422);
    }
    if (isSolo && uniqueUsernames.length > 0) {
      return fail("Solo tournament accepts only one player", 422);
    }

    if (uniqueUsernames.some((name) => name.toLowerCase() === captain.username.toLowerCase())) {
      return fail("Нельзя добавить капитана в список тиммейтов повторно", 422);
    }

    const linkedUsers = await prisma.user.findMany({
      where: {
        OR: uniqueUsernames.map((username) => ({
          username: { equals: username, mode: "insensitive" as const },
        })),
      },
      select: { id: true, username: true, isBanned: true },
    });

    if (!isSolo) {
      if (linkedUsers.length !== uniqueUsernames.length) {
        return fail("Один или несколько ников не найдены", 404);
      }
      if (linkedUsers.some((user) => user.isBanned)) {
        return fail("Нельзя добавить заблокированного игрока", 403);
      }

      for (const teammate of linkedUsers) {
        const friendship = await getFriendshipBetween(session.sub, teammate.id);
        if (!friendship || friendship.status !== FriendshipStatus.ACCEPTED) {
          return fail("В команду можно добавить только друзей", 403);
        }
      }
    }

    const usernamesWithCaptain = Array.from(new Set([captain.username, ...uniqueUsernames]));
    const linkedMap = new Map(linkedUsers.map((user) => [user.username.toLowerCase(), user.id]));
    linkedMap.set(captain.username.toLowerCase(), session.sub);

    // Соло никогда не хранит логотип команды — в сетке берём аватар капитана.
    const teamLogoUrl = isSolo ? null : parsed.data.teamLogoUrl || null;

    const application = await prisma.teamApplication.upsert({
      where: { captainId_tournamentId: { captainId: session.sub, tournamentId: id } },
      create: {
        captainId: session.sub,
        tournamentId: id,
        teamName: isSolo ? `${captain.username} (соло)` : parsed.data.teamName,
        teamLogoUrl,
        members: {
          create: usernamesWithCaptain.map((username) => ({
            username,
            isCaptain: username.toLowerCase() === captain.username.toLowerCase(),
            linkedUserId: linkedMap.get(username.toLowerCase()) ?? null,
          })),
        },
      },
      update: {
        teamName: isSolo ? `${captain.username} (соло)` : parsed.data.teamName,
        teamLogoUrl,
        status: "PENDING",
        members: {
          deleteMany: {},
          create: usernamesWithCaptain.map((username) => ({
            username,
            isCaptain: username.toLowerCase() === captain.username.toLowerCase(),
            linkedUserId: linkedMap.get(username.toLowerCase()) ?? null,
          })),
        },
      },
      include: { members: true, tournament: true },
    });

    const notificationUserIds = Array.from(
      new Set(application.members.map((member) => member.linkedUserId).filter((value): value is string => Boolean(value))),
    );

    if (notificationUserIds.length > 0) {
      await prisma.userTournamentNotification.createMany({
        data: notificationUserIds.map((userId) => ({
          userId,
          tournamentId: id,
          teamApplicationId: application.id,
          message: `Вы добавлены в заявку команды ${application.teamName} на турнир ${application.tournament.title}.`,
        })),
      });
    }

    await writeAuditLog({
      actorId: session.sub,
      action: "TEAM_APPLICATION_UPSERTED",
      entity: "TeamApplication",
      entityId: application.id,
      metadata: {
        tournamentId: id,
        teamName: application.teamName,
        members: application.members.map((member) => member.username),
      },
    });

    return ok({ application }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Failed to submit team application", 500);
  }
}
