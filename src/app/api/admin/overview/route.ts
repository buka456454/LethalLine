import { fail, ok } from "@/lib/api";
import { isOwnerAdminSession } from "@/lib/auth";
import { requireAdminTabAccess } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAdminTabAccess();
    const isOwner = isOwnerAdminSession(session);

    const streamCommentPromise = prisma.streamComment.findUnique({
      where: { key: "main" },
      select: { text: true, updatedAt: true },
    });

    if (!isOwner) {
      const streamComment = await streamCommentPromise;
      return ok({
        users: [],
        tournaments: [],
        registrations: [],
        matches: [],
        streamComment,
      });
    }

    const [users, tournaments, registrations, matches, streamComment] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, username: true, email: true, role: true, isBanned: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.tournament.findMany({
        include: { game: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.tournamentRegistration.findMany({
        include: { user: true, tournament: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.match.findMany({
        include: { tournament: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      streamCommentPromise,
    ]);

    return ok({ users, tournaments, registrations, matches, streamComment });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Failed to load admin overview", 500);
  }
}
