import { fail, ok } from "@/lib/api";
import { requireAuth } from "@/lib/guards";
import { getFriendRelation } from "@/lib/friends";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const userId = new URL(request.url).searchParams.get("userId")?.trim() ?? "";
    if (!userId) return fail("userId обязателен", 422);
    if (userId === session.sub) return ok({ kind: "self" as const });

    const relation = await getFriendRelation(session.sub, userId);
    return ok(relation);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Не удалось получить статус", 500);
  }
}
