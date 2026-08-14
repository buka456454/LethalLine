import Kicker from "@/components/ui/Kicker";
import Frame from "@/components/ui/Frame";
import PublicImage from "@/components/ui/PublicImage";
import Reveal from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";

export type HomeNewsItem = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  isPinned: boolean;
  createdAt: Date;
};

function formatNewsDate(d: Date) {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export default function HomeNewsFeed({ items }: { items: HomeNewsItem[] }) {
  return (
    <section className="space-y-4">
      <Reveal className="flex items-end justify-between gap-4">
        <Kicker index="05">Новости</Kicker>
        <span className="ll-kicker text-zinc-600">анонсы и результаты</span>
      </Reveal>
      {items.length === 0 ? (
        <Frame brackets>
          <p className="text-sm text-zinc-500">Новостей пока нет.</p>
        </Frame>
      ) : (
        <StaggerGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" gap={0.07}>
          {items.map((news) => (
            <StaggerItem key={news.id} className="h-full">
              <Frame hover className="ll-media-zoom flex h-full flex-col">
                {news.imageUrl ? (
                  <div className="mb-3 overflow-hidden rounded-[0.4rem]">
                    <PublicImage
                      src={news.imageUrl}
                      alt={news.title}
                      width={1200}
                      height={630}
                      className="h-36 w-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-zinc-100">{news.title}</h3>
                  {news.isPinned ? (
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-[#14ffec]">pin</span>
                  ) : null}
                </div>
                <time
                  className="mt-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500"
                  dateTime={news.createdAt.toISOString()}
                >
                  {formatNewsDate(news.createdAt)}
                </time>
                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-zinc-400">{news.body}</p>
              </Frame>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </section>
  );
}
