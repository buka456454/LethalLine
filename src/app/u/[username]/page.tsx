import Link from "next/link";
import { notFound } from "next/navigation";
import { readSession } from "@/lib/auth";
import { loadPublicProfileActivity } from "@/lib/publicProfileActivity";
import { prisma } from "@/lib/prisma";
import { getTournamentStatusLabel } from "@/lib/tournamentStatus";
import { isNotPlayed } from "@/lib/gameQuestionnaireConfig";
import { getFriendRelation } from "@/lib/friends";
import PublicImage from "@/components/ui/PublicImage";
import UserRoleBadge from "@/components/ui/UserRoleBadge";
import StartChatButton from "@/components/ui/StartChatButton";
import FriendActionButton from "@/components/friends/FriendActionButton";

export const dynamic = "force-dynamic";

function ratingLabel(slug: string) {
  if (slug === "dota-2") return "MMR";
  if (slug === "valorant") return "RR / рейтинг";
  if (slug === "cs2" || slug === "counter-strike-2") return "Premier / Faceit ELO";
  return "Рейтинг";
}

function formatTournamentFormat(f: string) {
  if (f === "SINGLE_ELIMINATION") return "Олимпийка";
  if (f === "DOUBLE_ELIMINATION") return "Дабл-элим";
  if (f === "ROUND_ROBIN") return "Круговая";
  return f;
}

function formatTournamentStatus(s: string) {
  return getTournamentStatusLabel(s);
}

function formatRegStatus(s: string) {
  if (s === "PENDING") return "На модерации";
  if (s === "APPROVED") return "Одобрена";
  if (s === "REJECTED") return "Отклонена";
  return s;
}

function formatTeamStatus(s: string) {
  if (s === "PENDING") return "На модерации";
  if (s === "APPROVED") return "Допущена";
  if (s === "REJECTED") return "Отклонена";
  return s;
}

export default async function PublicUserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const session = await readSession();

  const user = await prisma.user.findUnique({
    where: { username: decoded },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      role: true,
      createdAt: true,
      isBanned: true,
      gameProfiles: {
        include: { game: true },
        orderBy: { game: { name: "asc" } },
      },
    },
  });

  if (!user || user.isBanned) notFound();

  const isOwner = session?.sub === user.id;
  const activity = await loadPublicProfileActivity(user.id, user.username);
  const friendRelation =
    session && !isOwner ? await getFriendRelation(session.sub, user.id) : null;

  const hasAnyStat = (p: (typeof user.gameProfiles)[number]) =>
    !isNotPlayed(p.rankLabel) &&
    (p.mmr != null ||
      (p.rankLabel != null && p.rankLabel.trim() !== "") ||
      p.hoursPlayed != null ||
      (p.primaryRole != null && p.primaryRole.trim() !== ""));

  const filledProfiles = user.gameProfiles.filter(hasAnyStat);
  const notPlayedGames = user.gameProfiles.filter((p) => isNotPlayed(p.rankLabel)).map((p) => p.game.name);
  const rankVerified = user.gameProfiles.some((p) => p.experienceVerificationStatus === "APPROVED");
  const gameTitles = [...new Set(filledProfiles.map((p) => p.game.name))];
  const initials = (user.displayName || user.username || "U").trim().slice(0, 2).toUpperCase();
  const avatar = user.avatarUrl;

  const { stats, tournaments, wonTournamentTitles } = activity;

  return (
    <div className="w-full space-y-6">
      <section className="ll-frame w-full p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#323232] bg-[#323232]">
            {avatar ? (
              <PublicImage src={avatar} alt="" width={144} height={144} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-black text-[#14ffec]">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Публичный профиль</p>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-[0.08em] text-[#14ffec]">{user.displayName || user.username}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-zinc-400">@{user.username}</p>
              <UserRoleBadge role={user.role} size="sm" />
              {rankVerified ? (
                <span className="border border-[#14ffec] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#14ffec]">
                  ранг проверен
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-zinc-500">На сайте с {new Date(user.createdAt).toLocaleDateString()}</p>
            {isOwner && (
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/account/edit" className="button-primary inline-flex">
                  Редактировать
                </Link>
                <Link href="/account/questionnaire" className="button-secondary inline-flex">
                  Анкета
                </Link>
                <Link href="/friends" className="button-ghost inline-flex">
                  Друзья
                </Link>
              </div>
            )}
            {!isOwner && session ? (
              <div className="mt-4 flex flex-wrap items-start gap-3">
                {friendRelation?.kind === "incoming" ? (
                  <>
                    <FriendActionButton peerUserId={user.id} initial={friendRelation} />
                    <StartChatButton peerUserId={user.id} className="button-secondary" />
                  </>
                ) : (
                  <>
                    <StartChatButton peerUserId={user.id} />
                    <FriendActionButton peerUserId={user.id} initial={friendRelation ?? { kind: "none" }} />
                  </>
                )}
              </div>
            ) : null}
            {user.bio && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-200">{user.bio}</p>}
          </div>
        </div>
      </section>

      <section className="ll-frame w-full p-6">
        <h2 className="text-lg font-black uppercase tracking-[0.12em] text-[#14ffec]">Об игроке</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[#323232] bg-[#212121] p-4 text-center">
            <p className="text-2xl font-black text-[#14ffec]">{stats.tournamentsEntered}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">Турниров с участием</p>
          </div>
          <div className="rounded-lg border border-[#323232] bg-[#212121] p-4 text-center">
            <p className="text-2xl font-black text-[#14ffec]">{stats.tournamentsWon}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">Побед в турнирах</p>
          </div>
          <div className="rounded-lg border border-[#323232] bg-[#212121] p-4 text-center">
            <p className="text-2xl font-black text-[#14ffec]">{stats.matchWins}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">Победных матчей</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-zinc-400">
          <li>
            <span className="text-zinc-500">На платформе: </span>
            {Math.max(0, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86_400_000))} дн. (с{" "}
            {new Date(user.createdAt).toLocaleDateString()})
          </li>
          {gameTitles.length > 0 && (
            <li>
              <span className="text-zinc-500">Дисциплины в анкете: </span>
              {gameTitles.join(", ")}
            </li>
          )}
        </ul>
        <p className="mt-3 text-xs text-zinc-600">
          Победы считаются по сетке, не по скрину в чате.
        </p>
      </section>

      {wonTournamentTitles.length > 0 && (
        <section className="ll-frame w-full p-6">
          <h2 className="text-lg font-black uppercase tracking-[0.12em] text-[#14ffec]">Турнирные победы</h2>
          <ul className="mt-4 space-y-3">
            {wonTournamentTitles.map((w) => (
              <li key={w.tournamentId} className="rounded-lg border border-[#323232] bg-[#212121] p-4">
                <Link href={`/tournaments/${w.tournamentId}`} className="font-semibold text-zinc-100 hover:text-[#14ffec]">
                  {w.title}
                </Link>
                <p className="mt-1 text-xs text-zinc-500">{new Date(w.startsAt).toLocaleDateString()}</p>
                {w.prizeMode === "SPONSOR" && w.sponsorPrizeText && (
                  <p className="mt-2 text-sm text-zinc-300">Приз: {w.sponsorPrizeText}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="ll-frame w-full p-6">
        <h2 className="text-lg font-black uppercase tracking-[0.12em] text-[#14ffec]">Участие в турнирах</h2>
        {tournaments.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Пока нет заявок и регистраций.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {tournaments.map((row, idx) => (
              <li key={`${row.tournamentId}-${row.kind}-${row.teamName ?? "solo"}-${row.role ?? ""}-${idx}`} className="rounded-lg border border-[#323232] bg-[#212121] p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/tournaments/${row.tournamentId}`} className="font-semibold text-zinc-100 hover:text-[#14ffec]">
                    {row.title}
                  </Link>
                  <span className="text-xs uppercase tracking-wider text-zinc-500">{formatTournamentStatus(row.status)}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  {row.gameName} · {formatTournamentFormat(row.format)} · {new Date(row.startsAt).toLocaleDateString()}
                </p>
                <p className="mt-2 text-sm text-zinc-300">
                  {row.kind === "solo" && (
                    <>
                      Соло · заявка: <span className="text-[#14ffec]">{row.registrationStatus && formatRegStatus(row.registrationStatus)}</span>
                    </>
                  )}
                  {row.kind === "team" && (
                    <>
                      Команда «{row.teamName}» · {row.role === "captain" ? "капитан" : "состав"} ·{" "}
                      <span className="text-[#14ffec]">{row.teamStatus && formatTeamStatus(row.teamStatus)}</span>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ll-frame w-full p-6">
        <h2 className="text-lg font-black uppercase tracking-[0.12em] text-[#14ffec]">Игровая анкета</h2>
        {filledProfiles.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Пользователь ещё не заполнил анкету.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {filledProfiles.map((p) => (
              <li key={p.id} className="rounded-lg border border-[#323232] bg-[#212121] p-4">
                <p className="text-sm font-bold uppercase tracking-wider text-zinc-200">{p.game.name}</p>
                <dl className="mt-2 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
                  {p.mmr != null && (
                    <>
                      <dt className="text-zinc-500">{ratingLabel(p.game.slug)}</dt>
                      <dd>{p.mmr}</dd>
                    </>
                  )}
                  {p.rankLabel && (
                    <>
                      <dt className="text-zinc-500">Звание</dt>
                      <dd>{p.rankLabel}</dd>
                    </>
                  )}
                  {p.hoursPlayed != null && (
                    <>
                      <dt className="text-zinc-500">Часы</dt>
                      <dd>{p.hoursPlayed}</dd>
                    </>
                  )}
                  {p.primaryRole && (
                    <>
                      <dt className="text-zinc-500">Роль</dt>
                      <dd>{p.primaryRole}</dd>
                    </>
                  )}
                </dl>
              </li>
            ))}
          </ul>
        )}
        {notPlayedGames.length > 0 && (
          <p className="mt-4 text-xs uppercase tracking-[0.14em] text-zinc-600">
            не играет: {notPlayedGames.join(" · ")}
          </p>
        )}
      </section>
    </div>
  );
}
