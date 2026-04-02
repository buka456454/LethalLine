import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { canAccessAdminTabSession, readSession } from "@/lib/auth";
import { getBrandLogos, pickBrandLogo } from "@/lib/brand";
import SaiIcon from "@/components/ui/SaiIcon";
import PublicImage from "@/components/ui/PublicImage";
import KickLiveBlock from "@/components/home/KickLiveBlock";
import HomeTicker from "@/components/home/HomeTicker";
import QuestionnaireNudge from "@/components/home/QuestionnaireNudge";
import GameCoverPanel from "@/components/games/GameCoverPanel";
import HomeNewsFeed, { type HomeNewsItem } from "@/components/home/HomeNewsFeed";

export const dynamic = "force-dynamic";

type HomeTournament = {
  id: string;
  title: string;
  maxParticipants: number;
  game: { name: string; slug: string };
  registrations: Array<{ id: string }>;
};

export default async function Home({ searchParams }: { searchParams?: Promise<{ verify?: string }> }) {
  const sp = (await searchParams) ?? {};
  const verifyBanner = sp.verify === "ok";
  let tournaments: HomeTournament[] = [];
  let banners: Awaited<ReturnType<typeof prisma.banner.findMany>> = [];
  let latestNews: HomeNewsItem[] = [];
  let streamCommentText = "";
  let platformStats = {
    users: 0,
    games: 0,
    activeTournaments: 0,
    matches: 0,
  };
  const [session, logos] = await Promise.all([readSession(), getBrandLogos()]);

  try {
    const [usersCount, gamesCount, activeTournamentsCount, matchesCount] = await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.tournament.count({
        where: {
          status: {
            in: ["REGISTRATION_OPEN", "IN_PROGRESS", "RESULTS_COUNTING"],
          },
        },
      }),
      prisma.match.count(),
    ]);

    platformStats = {
      users: usersCount,
      games: gamesCount,
      activeTournaments: activeTournamentsCount,
      matches: matchesCount,
    };

    const [streamComment, tournamentsData, bannersData, latestNewsData] = await Promise.all([
      prisma.streamComment.findUnique({
        where: { key: "main" },
        select: { text: true },
      }),
      prisma.tournament.findMany({
        include: { game: true, registrations: true },
        orderBy: { startsAt: "asc" },
        take: 4,
      }) as Promise<HomeTournament[]>,
      prisma.banner.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 }),
      prisma.newsPost.findMany({
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: 6,
      }) as Promise<HomeNewsItem[]>,
    ]);
    streamCommentText = streamComment?.text ?? "";
    tournaments = tournamentsData;
    banners = bannersData;
    latestNews = latestNewsData;
  } catch {
    tournaments = [];
    banners = [];
    latestNews = [];
    streamCommentText = "";
    platformStats = {
      users: 0,
      games: 0,
      activeTournaments: 0,
      matches: 0,
    };
  }

  const heroBanner = banners[0];
  const homeLogo = pickBrandLogo(logos, 1);
  const canAdmin = session ? canAccessAdminTabSession(session) : false;
  const kickChannel = process.env.NEXT_PUBLIC_KICK_CHANNEL ?? "lethalline";
  const kickProfileUrl = `https://kick.com/${kickChannel}`;

  let showQuestionnaireNudge = false;
  if (session) {
    try {
      const profiles = await prisma.userGameProfile.findMany({
        where: { userId: session.sub },
        select: { mmr: true, rankLabel: true, hoursPlayed: true, primaryRole: true },
      });
      const hasFilled = profiles.some(
        (p) =>
          p.mmr != null ||
          p.hoursPlayed != null ||
          (p.rankLabel != null && p.rankLabel.trim() !== "") ||
          (p.primaryRole != null && p.primaryRole.trim() !== ""),
      );
      showQuestionnaireNudge = !hasFilled;
    } catch {
      showQuestionnaireNudge = false;
    }
  }

  return (
    <div className="w-full space-y-6">
      {verifyBanner ? (
        <p className="rounded-lg border border-[#0d7377]/50 bg-[#0d7377]/15 px-4 py-3 text-center text-sm text-[#14ffec]">
          Действие успешно выполнено.
        </p>
      ) : null}
      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_18%_22%,rgba(20,255,236,0.18),transparent_46%),radial-gradient(circle_at_82%_18%,rgba(13,115,119,0.25),transparent_40%),linear-gradient(140deg,#141414_0%,#1b1b1b_40%,#101010_100%)] px-7 py-20 shadow-[0_40px_120px_rgba(0,0,0,0.6)] sm:px-12 sm:py-28 min-h-[720px]">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_18%,transparent_82%,rgba(255,255,255,0.03))]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#0d7377]/25 blur-3xl animate-orbit-slow" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-56 w-56 rounded-full bg-[#14ffec]/15 blur-3xl animate-orbit-reverse" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#14ffec] to-transparent opacity-60" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-zinc-400">Esports Platform</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black uppercase leading-[1.05] tracking-[0.1em] text-[#14ffec] sm:text-5xl">
              Организация киберспортивных матчей нового поколения
            </h1>
            <p className="mt-5 max-w-2xl text-zinc-300">
              Регистрация игроков, управление турнирами по разным играм и адаптивная сетка матчей.
            </p>
            {heroBanner && <p className="mt-4 text-sm text-zinc-300">{heroBanner.title}</p>}

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/tournaments" className="button-primary">
                Смотреть турниры
              </Link>
              <Link
                href={canAdmin ? "/admin" : "/sign-in"}
                className="rounded-lg bg-black/30 px-4 py-3 text-sm font-semibold text-zinc-200 backdrop-blur hover:text-[#14ffec]"
              >
                {canAdmin ? "Админ-панель" : "Войти в систему"}
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-[radial-gradient(circle_at_50%_0%,rgba(20,255,236,0.22),transparent_55%)] blur-2xl opacity-70" />
            <div className="relative rounded-3xl bg-black/15 p-6 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-400">Core identity</p>
              {homeLogo && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-black/15">
                    <PublicImage
                      src={homeLogo.src}
                      alt="Главный логотип"
                      width={44}
                      height={44}
                      className="h-11 w-11 object-contain opacity-95"
                      priority
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">Lethal Line</p>
                    <p className="mt-1 text-xs text-zinc-400">Турниры • Матчи • Live</p>
                  </div>
                </div>
              )}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Users</p>
                  <p className="mt-1 text-lg font-black text-[#14ffec]">{platformStats.users}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Tournaments</p>
                  <p className="mt-1 text-lg font-black text-[#14ffec]">{platformStats.activeTournaments}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Matches</p>
                  <p className="mt-1 text-lg font-black text-[#14ffec]">{platformStats.matches}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </section>

      <HomeTicker className="relative left-1/2 right-1/2 -mx-[75vw] w-[150vw] overflow-hidden" />
      <div className="-mt-3 flex justify-end pr-4 sm:pr-6">
        <Link
          href="/guide"
          className="guide-fab guide-fab-launch z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#14ffec]/40 bg-[#141414]/80 text-[#14ffec] shadow-lg shadow-black/50 ring-1 ring-white/10 backdrop-blur-sm transition hover:border-[#14ffec]/75 hover:bg-[#14ffec]/10 hover:shadow-[0_0_24px_rgba(20,255,236,0.2)]"
          aria-label="Справка по сайту"
          title="Справка по сайту"
        >
          <SaiIcon name="file" size={16} />
        </Link>
      </div>

      <KickLiveBlock channel={kickChannel} profileUrl={kickProfileUrl} streamComment={streamCommentText} />

      <section className="grid gap-4 md:grid-cols-6 xl:grid-cols-8">
        <StatCard title="Игроков на платформе" value={platformStats.users} icon="user" className="md:col-span-3 xl:col-span-3" />
        <StatCard title="Дисциплин" value={platformStats.games} icon="star" className="md:col-span-2 xl:col-span-1" />
        <StatCard
          title="Активных турниров"
          value={platformStats.activeTournaments}
          icon="calendar"
          className="md:col-span-3 xl:col-span-2"
        />
        <StatCard title="Матчей в системе" value={platformStats.matches} icon="video" className="md:col-span-4 xl:col-span-2" />
      </section>

      <section>
        <article className="surface rounded-xl p-5">
          <h2 className="text-xl font-black uppercase tracking-[0.12em] text-[#14ffec]">Как работает платформа</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <StepCard
              title="1. Регистрация"
              icon="file"
              description="Создайте аккаунт, заполните профиль и получите доступ к турнирам."
            />
            <StepCard
              title="2. Участие"
              icon="check"
              description="Выберите дисциплину, подайте заявку и дождитесь модерации."
            />
            <StepCard
              title="3. Матчи"
              icon="camera"
              description="Следите за адаптивной сеткой, счетом и статусами в реальном времени."
            />
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-4 xl:grid-cols-6">
        {tournaments.map((tournament, index) => (
          <div
            key={tournament.id}
            className={`transition hover:border-[#0d7377] ${
              index === 0 ? "md:col-span-2 xl:col-span-3" : index === 1 ? "md:col-span-2 xl:col-span-2" : "xl:col-span-1"
            }`}
          >
            <GameCoverPanel
              slug={tournament.game.slug}
              minHeightClassName="min-h-[200px]"
              className="h-full hover:border-[#0d7377]"
              contentClassName="flex h-full min-h-[200px] flex-col p-4"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">{tournament.game.name}</p>
              <h2 className="mt-2 text-lg font-bold text-zinc-100">{tournament.title}</h2>
              <p className="mt-2 text-sm text-zinc-300">
                {tournament.registrations.length}/{tournament.maxParticipants} участников
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded bg-black/40">
                <div
                  className="h-full bg-gradient-to-r from-[#0d7377] to-[#14ffec] transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((tournament.registrations.length / tournament.maxParticipants) * 100))}%`,
                  }}
                />
              </div>
              <Link href={`/tournaments/${tournament.id}`} className="mt-auto pt-4 text-sm text-[#14ffec]">
                Открыть турнир
              </Link>
            </GameCoverPanel>
          </div>
        ))}
      </section>

      <section>
        <article className="surface rounded-xl p-5">
          <h2 className="text-xl font-black uppercase tracking-[0.12em] text-[#14ffec]">Сезонная дорожная карта</h2>
          <div className="mt-4 space-y-3">
            <TimelineRow stage="Q1" title="Запуск платформы" text="Регистрация, турнирные сетки, базовая модерация." />
            <TimelineRow stage="Q2" title="Продвинутая админка" text="Роли, аудит действий, контент и аналитика." />
            <TimelineRow stage="Q3" title="Командный режим" text="Кланы, captain-панель и расширенные правила матчей." />
            <TimelineRow stage="Q4" title="Лиги и партнерства" text="Сезонные лиги, спонсорские блоки, публичный API." />
          </div>
        </article>
      </section>

      <HomeNewsFeed items={latestNews} />

      <section>
        <article className="surface rounded-xl p-5 md:p-6">
          <h2 className="text-xl font-black uppercase tracking-[0.12em] text-[#14ffec]">Почему Lethal Line</h2>
          <ul className="mt-4 grid gap-3 text-sm text-zinc-300 md:grid-cols-3">
            <li className="rounded-lg border border-[#323232] bg-[#323232] p-4 transition hover:border-[#0d7377]/50">
              Гибкая админ-система: роли, модерация, audit log.
            </li>
            <li className="rounded-lg border border-[#323232] bg-[#323232] p-4 transition hover:border-[#0d7377]/50">
              Адаптивная турнирная сетка для мобильных и desktop.
            </li>
            <li className="rounded-lg border border-[#323232] bg-[#323232] p-4 transition hover:border-[#0d7377]/50">
              Современный dark UI с динамичными акцентами.
            </li>
          </ul>
        </article>
      </section>

      <footer className="relative overflow-hidden rounded-2xl border border-[#0d7377]/40 bg-[radial-gradient(circle_at_10%_20%,rgba(20,255,236,0.15),transparent_40%),linear-gradient(140deg,#181818_10%,#202020_45%,#161616_100%)] p-6">
        <div className="pointer-events-none absolute -left-16 top-4 h-36 w-36 rounded-full bg-[#14ffec]/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-[#0d7377]/20 blur-2xl" />

        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-400">
              <SaiIcon name="chat" size={14} />
              Contact hub
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.1em] text-[#14ffec]">Связь</h2>
            <p className="mt-2 text-sm text-zinc-300">
              Трансляции и анонсы — на{" "}
              <a href={kickProfileUrl} target="_blank" rel="noreferrer" className="text-[#14ffec] hover:underline">
                Kick
              </a>
              , быстрые новости — в Telegram.
            </p>
          </div>
          <div className="rounded-full border border-[#14ffec]/30 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-300">
            Lethal Line Network
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 md:grid-cols-12">
          <a
            href="https://t.me/LethalLine"
            target="_blank"
            rel="noreferrer"
            className="group md:col-span-5 rounded-2xl border border-[#0d7377]/60 bg-[#121212]/80 p-4 transition hover:-translate-y-0.5 hover:border-[#14ffec]"
          >
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-zinc-400">
              <SaiIcon name="chat" />
              Telegram
            </p>
            <p className="mt-2 text-lg font-bold text-zinc-100 group-hover:text-[#14ffec]">t.me/LethalLine</p>
            <p className="mt-1 text-xs text-zinc-400">Быстрый ответ по турнирам и новостям.</p>
          </a>

          <a
            href="mailto:LethalLineEsports@yandex.ru"
            className="group md:col-span-5 rounded-2xl border border-[#323232] bg-[#181818]/85 p-4 transition hover:-translate-y-0.5 hover:border-[#14ffec]"
          >
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-zinc-400">
              <SaiIcon name="inbox" />
              Email
            </p>
            <p className="mt-2 break-all text-lg font-bold text-zinc-100 group-hover:text-[#14ffec]">LethalLineEsports@yandex.ru</p>
            <p className="mt-1 text-xs text-zinc-400">Для предложений и партнёрств.</p>
          </a>

          <a
            href={kickProfileUrl}
            target="_blank"
            rel="noreferrer"
            className="group md:col-span-2 rounded-2xl border border-[#53fc18]/45 bg-[#121212]/80 p-4 transition hover:-translate-y-0.5 hover:border-[#14ffec]"
          >
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-zinc-400">
              <SaiIcon name="video" />
              Kick
            </p>
            <p className="mt-2 text-lg font-bold text-zinc-100 group-hover:text-[#53fc18]">kick.com/{kickChannel}</p>
            <p className="mt-1 text-xs text-zinc-400">Стримы турниров и эфиры Lethal Line.</p>
          </a>
        </div>
      </footer>

      <QuestionnaireNudge enabled={showQuestionnaireNudge} />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  className,
}: {
  title: string;
  value: number;
  icon: "user" | "star" | "calendar" | "video";
  className?: string;
}) {
  return (
    <article className={`surface rounded-xl p-4 transition hover:border-[#0d7377] hover:-translate-y-0.5 ${className ?? ""}`}>
      <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
        <SaiIcon name={icon} />
        {title}
      </p>
      <p className="mt-2 text-3xl font-black text-[#14ffec]">{value}</p>
    </article>
  );
}

function StepCard({
  title,
  icon,
  description,
}: {
  title: string;
  icon: "file" | "check" | "camera";
  description: string;
}) {
  return (
    <div className="rounded-lg border border-[#323232] bg-[#323232] p-4 transition hover:border-[#0d7377]">
      <h3 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-zinc-100">
        <SaiIcon name={icon} />
        {title}
      </h3>
      <p className="mt-2 text-sm text-zinc-300">{description}</p>
    </div>
  );
}

function TimelineRow({ stage, title, text }: { stage: string; title: string; text: string }) {
  return (
    <div className="grid grid-cols-[52px_1fr] gap-3 rounded border border-[#323232] bg-[#323232] p-3">
      <div className="flex items-center justify-center rounded border border-[#0d7377] bg-[#212121] text-xs font-bold tracking-[0.12em] text-[#14ffec]">
        {stage}
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-100">{title}</p>
        <p className="mt-1 text-xs text-zinc-300">{text}</p>
      </div>
    </div>
  );
}

