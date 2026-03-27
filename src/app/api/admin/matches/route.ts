import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createMatchSchema = z.object({
  tournamentId: z.string().cuid(),
  round: z.number().int().min(1).max(64),
  orderInRound: z.number().int().min(1).max(256),
  bracketSegment: z.enum(["UPPER", "LOWER", "FINAL"]).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const session = await requireOwnerAdmin();
    const parsed = createMatchSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid payload", 422);

    const match = await prisma.match.create({
      data: {
        tournamentId: parsed.data.tournamentId,
        round: parsed.data.round,
        orderInRound: parsed.data.orderInRound,
        bracketSegment: parsed.data.bracketSegment ?? "UPPER",
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      },
    });

    await writeAuditLog({
      actorId: session.sub,
      action: "MATCH_CREATED",
      entity: "Match",
      entityId: match.id,
      metadata: parsed.data,
    });

    return ok({ match }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Failed to create match", 500);
  }
}

