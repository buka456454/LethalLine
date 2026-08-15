import { FriendshipStatus } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { requireAuth } from "@/lib/guards";
import { listFriendships } from "@/lib/friends";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const url = new URL(request.url);
    const tabRaw = url.searchParams.get("tab") ?? "friends";
    const tab = tabRaw === "incoming" || tabRaw === "outgoing" || tabRaw === "friends" ? tabRaw : null;
    if (!tab) return fail("Некорректная вкладка", 422);

    const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take") ?? 50) || 50));
    const skip = Math.max(0, Number(url.searchParams.get("skip") ?? 0) || 0);

    const items = await listFriendships(session.sub, tab, take, skip);
    return ok({
      tab,
      items: items.map((item) => ({
        friendshipId: item.friendshipId,
        status: item.status as FriendshipStatus,
        createdAt: item.createdAt.toISOString(),
        respondedAt: item.respondedAt?.toISOString() ?? null,
        user: item.user,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Не удалось загрузить список", 500);
  }
}
