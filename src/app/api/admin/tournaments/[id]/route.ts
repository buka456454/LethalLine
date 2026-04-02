import { TournamentStatus } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { adminTournamentPatchSchema } from "@/lib/schemas";
import { regenerateTournamentBracketFromApprovedEntries, reseedTournamentBracket } from "@/lib/bracket-seeding";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireOwnerAdmin();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = adminTournamentPatchSchema.safeParse(body);
    if (!parsed.success) return fail("Некорректные данные", 422);

    const existing = await prisma.tournament.findUnique({ where: { id } });
    if (!existing) return fail("Турнир не найден", 404);

    if (parsed.data.action === "complete") {
      if (existing.status === TournamentStatus.COMPLETED) {
        return ok({ tournament: existing });
      }

      const tournament = await prisma.tournament.update({
        where: { id },
        data: {
          status: TournamentStatus.COMPLETED,
          endsAt: existing.endsAt ?? new Date(),
        },
      });

      await writeAuditLog({
        actorId: session.sub,
        action: "TOURNAMENT_COMPLETED",
        entity: "Tournament",
        entityId: id,
        metadata: { title: tournament.title },
      });

      return ok({ tournament });
    }

    if (parsed.data.action === "setStatus") {
      if (existing.status === parsed.data.status) {
        return ok({ tournament: existing });
      }

      const tournament = await prisma.tournament.update({
        where: { id },
        data: {
          status: parsed.data.status,
          ...(parsed.data.status === TournamentStatus.COMPLETED && !existing.endsAt ? { endsAt: new Date() } : {}),
        },
      });

      if (parsed.data.status === TournamentStatus.IN_PROGRESS) {
        await regenerateTournamentBracketFromApprovedEntries(id);
      } else if (existing.status === TournamentStatus.REGISTRATION_OPEN && parsed.data.status !== TournamentStatus.REGISTRATION_OPEN) {
        await reseedTournamentBracket(id);
      }

      await writeAuditLog({
        actorId: session.sub,
        action: "TOURNAMENT_STATUS_UPDATED",
        entity: "Tournament",
        entityId: id,
        metadata: { from: existing.status, to: parsed.data.status, title: tournament.title },
      });

      return ok({ tournament });
    }

    return fail("Неизвестное действие", 400);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Не удалось обновить турнир", 500);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireOwnerAdmin();
    const { id } = await context.params;

    const existing = await prisma.tournament.findUnique({ where: { id } });
    if (!existing) return fail("Турнир не найден", 404);

    await prisma.tournament.delete({ where: { id } });

    await writeAuditLog({
      actorId: session.sub,
      action: "TOURNAMENT_DELETED",
      entity: "Tournament",
      entityId: id,
      metadata: { title: existing.title },
    });

    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Не удалось удалить турнир", 500);
  }
}
