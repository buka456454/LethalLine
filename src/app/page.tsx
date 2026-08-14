import KickLiveBlock from "@/components/home/KickLiveBlock";
import HomeTicker from "@/components/home/HomeTicker";
import HomeNewsFeed, { type HomeNewsItem } from "@/components/home/HomeNewsFeed";
import HomeHero from "@/components/home/HomeHero";
import HomeLineSteps from "@/components/home/HomeLineSteps";
import HomeCupStrip, { type HomeCupCard } from "@/components/home/HomeCupStrip";
import HomeBigNav from "@/components/home/HomeBigNav";
import Reveal from "@/components/motion/Reveal";
import { prisma } from "@/lib/prisma";
import { loadShellData } from "@/lib/shellData";

export const dynamic = "force-dynamic";

export default async function Home() {
  const shell = await loadShellData();
  const kickChannel = process.env.NEXT_PUBLIC_KICK_CHANNEL ?? "lethalline";
  const kickProfileUrl = `https://kick.com/${kickChannel}`;

  let cups: HomeCupCard[] = [];
  let latestNews: HomeNewsItem[] = [];
  let streamCommentText = "";

  try {
    const [streamComment, tournamentsData, latestNewsData] = await Promise.all([
      prisma.streamComment.findUnique({ where: { key: "main" }, select: { text: true } }),
      prisma.tournament.findMany({
        where: { isPublished: true },
        include: { game: true, teamApplications: { select: { id: true } } },
        orderBy: { startsAt: "asc" },
        take: 6,
      }),
      prisma.newsPost.findMany({
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: 6,
      }),
    ]);
    streamCommentText = streamComment?.text ?? "";
    cups = tournamentsData as HomeCupCard[];
    latestNews = latestNewsData as HomeNewsItem[];
  } catch {
    cups = [];
    latestNews = [];
  }

  return (
    <div className="w-full space-y-10">
      <HomeHero session={shell.session} hasQuestionnaire={shell.hasQuestionnaire} cup={shell.cup} />
      <HomeTicker />
      <HomeLineSteps cup={shell.cup} />
      <Reveal>
        <KickLiveBlock
          channel={kickChannel}
          profileUrl={kickProfileUrl}
          streamComment={streamCommentText}
          title="Сейчас разбираем сетку"
        />
      </Reveal>
      <HomeBigNav cup={shell.cup} kickUrl={kickProfileUrl} />
      <HomeCupStrip cups={cups} />
      <HomeNewsFeed items={latestNews} />
    </div>
  );
}
