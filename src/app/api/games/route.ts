import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { ensureCoreGames } from "@/lib/coreGames";
import { requireOwnerAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createGameSchema } from "@/lib/schemas";
import { Prisma } from "@prisma/client";

export async function GET() {
  await ensureCoreGames();
  const games = await prisma.game.findMany({
    include: { tournaments: true },
    orderBy: { name: "asc" },
  });
  return ok({ games });
}

export async function POST(request: Request) {
  try {
    const session = await requireOwnerAdmin();
    const body = await request.json();
    const parsed = createGameSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid game payload", 422);

    const game = await prisma.game.create({ data: parsed.data });

    await writeAuditLog({
      actorId: session.sub,
      action: "GAME_CREATED",
      entity: "Game",
      entityId: game.id,
      metadata: parsed.data,
    });

    return ok({ game }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("Game with this name or slug already exists", 409);
    }
    return fail("Failed to create game", 500);
  }
}
