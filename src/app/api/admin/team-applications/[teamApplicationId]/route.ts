import { TeamApplicationStatus } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { ModerationError } from "@/lib/admin/moderateRegistration";
import { moderateTeamApplication } from "@/lib/admin/moderateTeamApplication";
import { requireOwnerAdmin } from "@/lib/guards";
import { z } from "zod";

const payloadSchema = z.object({
  status: z.enum([TeamApplicationStatus.APPROVED, TeamApplicationStatus.REJECTED]),
});

export async function PATCH(request: Request, context: { params: Promise<{ teamApplicationId: string }> }) {
  try {
    const session = await requireOwnerAdmin();
    const { teamApplicationId } = await context.params;
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid payload", 422);

    const application = await moderateTeamApplication({
      teamApplicationId,
      status: parsed.data.status,
      actorId: session.sub,
      source: "admin_api",
    });

    return ok({ application });
  } catch (error) {
    if (error instanceof ModerationError) return fail(error.message, error.status);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Failed to update team application", 500);
  }
}
