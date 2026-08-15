import Link from "next/link";
import { redirect } from "next/navigation";
import FriendActionButton from "@/components/friends/FriendActionButton";
import StartChatButton from "@/components/ui/StartChatButton";
import PublicImage from "@/components/ui/PublicImage";
import { readSession } from "@/lib/auth";
import { listFriendships } from "@/lib/friends";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

type Tab = "friends" | "incoming" | "outgoing";

function parseTab(value: string | undefined): Tab {
  if (value === "incoming" || value === "outgoing") return value;
  return "friends";
}

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/sign-in");

  const { tab: tabRaw } = await searchParams;
  const tab = parseTab(tabRaw);
  const items = await listFriendships(session.sub, tab, 50, 0);

  const emptyCopy =
    tab === "incoming"
      ? "Входящих заявок пока нет."
      : tab === "outgoing"
        ? "Исходящих заявок нет."
        : "Пока никого нет. Найдите игроков и отправьте заявку.";

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ll-kicker">социальное</p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-[0.12em] text-[#14ffec]">Друзья</h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Список игроков, с которыми вы уже связались. Чат доступен и без дружбы — заявки просто помогают держать
            состав под рукой.
          </p>
        </div>
        <Link href="/teammates" className="button-secondary text-xs uppercase tracking-[0.12em]">
          Найти игроков
        </Link>
      </div>

      <section className="ll-frame w-full p-4 sm:p-6">
        {items.length === 0 ? (
          <div className="space-y-3 py-8 text-center">
            <p className="text-sm text-zinc-400">{emptyCopy}</p>
            {tab === "friends" ? (
              <Link href="/teammates" className="button-primary inline-flex text-xs uppercase tracking-[0.12em]">
                К поиску игроков
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--ll-line)]">
            {items.map((item) => {
              const name = item.user.displayName || item.user.username;
              const initials = name.trim().slice(0, 2).toUpperCase();
              return (
                <li key={item.friendshipId} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-[#323232] bg-[#212121]">
                    {item.user.avatarUrl ? (
                      <PublicImage
                        src={item.user.avatarUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-black text-[#14ffec]">{initials}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-zinc-100">{name}</p>
                    <p className="truncate text-xs text-zinc-500">
                      @{item.user.username}
                      {item.user.rankLabel ? ` · ${item.user.rankLabel}` : ""}
                    </p>
                  </div>
                  <div className={cn("flex flex-wrap items-center gap-2")}>
                    {tab === "incoming" ? (
                      <FriendActionButton
                        peerUserId={item.user.id}
                        initial={{ kind: "incoming", friendshipId: item.friendshipId }}
                        variant="compact"
                      />
                    ) : null}
                    {tab === "outgoing" ? (
                      <FriendActionButton
                        peerUserId={item.user.id}
                        initial={{ kind: "outgoing", friendshipId: item.friendshipId }}
                        variant="compact"
                      />
                    ) : null}
                    {tab === "friends" ? (
                      <FriendActionButton
                        peerUserId={item.user.id}
                        initial={{ kind: "friends", friendshipId: item.friendshipId }}
                        variant="compact"
                      />
                    ) : null}
                    <StartChatButton peerUserId={item.user.id} className="button-primary px-3 py-1.5 text-xs" />
                    <Link
                      href={`/u/${encodeURIComponent(item.user.username)}`}
                      className="button-ghost px-3 py-1.5 text-xs"
                    >
                      Профиль
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
