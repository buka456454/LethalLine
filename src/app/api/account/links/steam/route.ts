import { ExternalProvider } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { requireAuth } from "@/lib/guards";
import { getLinkedAccount, unlinkExternalAccount } from "@/lib/verification/link";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAuth();
    const account = await getLinkedAccount(session.sub, ExternalProvider.STEAM);
    if (!account) return ok({ linked: false });
    return ok({
      linked: true,
      steamId64: account.providerAccountId,
      handle: account.handle,
      profileUrl: account.profileUrl,
      avatarUrl: account.avatarUrl,
      linkedAt: account.linkedAt,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Не удалось получить привязку", 500);
  }
}

export async function DELETE() {
  try {
    const session = await requireAuth();
    const result = await unlinkExternalAccount(session.sub, ExternalProvider.STEAM);
    if (!result.removed) return fail("Steam не привязан", 404);
    return ok({ ok: true, downgradedProfiles: result.downgraded });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Не удалось отвязать Steam", 500);
  }
}
