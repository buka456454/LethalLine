import { TournamentStatus } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { teamApplicationSchema } from "@/lib/schemas";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const parsed = teamApplicationSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid team application payload", 422);

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { registrations: true, teamApplications: true },
    });
    if (!tournament) return fail("Tournament not found", 404);
    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) return fail("Registration is closed", 400);

    const allSlots = tournament.registrations.length + tournament.teamApplications.length;
    if (allSlots >= tournament.maxParticipants) return fail("Tournament is full", 400);

    const uniqueUsernames = Array.from(
      new Set(parsed.data.memberUsernames.map((name) => name.trim()).filter((name) => name.length > 0)),
    );
    const captain = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { username: true },
    });
    const usernamesWithCaptain = captain
      ? Array.from(new Set([captain.username, ...uniqueUsernames]))
      : uniqueUsernames;

    const linkedUsers = await prisma.user.findMany({
      where: {
        OR: usernamesWithCaptain.map((username) => ({
          username: { equals: username, mode: "insensitive" as const },
        })),
      },
      select: { id: true, username: true },
    });

    const linkedMap = new Map(linkedUsers.map((user) => [user.username.toLowerCase(), user.id]));

    const application = await prisma.teamApplication.upsert({
      where: { captainId_tournamentId: { captainId: session.sub, tournamentId: id } },
      create: {
        captainId: session.sub,
        tournamentId: id,
        teamName: parsed.data.teamName,
        teamLogoUrl: parsed.data.teamLogoUrl || null,
        members: {
          create: usernamesWithCaptain.map((username) => ({
            username,
            isCaptain: captain ? username.toLowerCase() === captain.username.toLowerCase() : false,
            linkedUserId: linkedMap.get(username.toLowerCase()) ?? null,
          })),
        },
      },
      update: {
        teamName: parsed.data.teamName,
        teamLogoUrl: parsed.data.teamLogoUrl || null,
        status: "PENDING",
        members: {
          deleteMany: {},
          create: usernamesWithCaptain.map((username) => ({
            username,
            isCaptain: captain ? username.toLowerCase() === captain.username.toLowerCase() : false,
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
