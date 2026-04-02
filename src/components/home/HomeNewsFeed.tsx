import SaiIcon from "@/components/ui/SaiIcon";
import PublicImage from "@/components/ui/PublicImage";

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
  if (items.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-[#323232] bg-[#181818] p-8 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_10%_0%,rgba(20,255,236,0.08),transparent_50%)]" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#0d7377]">Лента</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.1em] text-[#14ffec] md:text-3xl">Новости и обновления</h2>
          <p className="mt-4 text-sm text-zinc-400">Новостей пока нет — загляните позже.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#0d7377]/35 bg-[linear-gradient(145deg,#141818_0%,#121616_45%,#0e1212_100%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_85%_10%,rgba(20,255,236,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#14ffec]/50 to-transparent" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-[#0d7377]/12 blur-3xl" />

      <div className="relative mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-[#0d7377]">
            <SaiIcon name="chat" size={14} />
            Актуальное
          </p>
          <h2 className="mt-2 text-3xl font-black uppercase leading-tight tracking-[0.08em] text-[#14ffec] md:text-4xl">
            Новости и обновления
          </h2>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Анонсы турниров, изменения на платформе и важные объявления команды Lethal Line.
          </p>
        </div>
        <div className="h-1 w-full max-w-xs shrink-0 rounded-full bg-gradient-to-r from-[#0d7377] to-[#14ffec] md:mb-2" aria-hidden />
      </div>

      <ul className="relative grid list-none gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((news, index) => {
          const isLead = index === 0;
          return (
            <li
              key={news.id}
              className={
                isLead
                  ? "md:col-span-2 xl:col-span-2 xl:row-span-1"
                  : ""
              }
            >
              <article
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#2a3535] bg-[#0f1313]/90 p-6 transition duration-300 hover:-translate-y-0.5 hover:border-[#14ffec]/45 hover:shadow-[0_0_0_1px_rgba(20,255,236,0.12),0_20px_50px_rgba(0,0,0,0.35)] md:p-7 ${
                  isLead ? "min-h-[220px] md:min-h-[240px]" : ""
                }`}
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#14ffec]/[0.06] blur-2xl transition group-hover:bg-[#14ffec]/10" />
                {news.imageUrl && (
                  <div className="relative mb-4 overflow-hidden rounded-lg border border-[#2a3535]">
                    <PublicImage
                      src={news.imageUrl}
                      alt={news.title}
                      width={1200}
                      height={630}
                      className="h-40 w-full object-cover md:h-44"
                    />
                  </div>
                )}
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <h3
                    className={`font-bold leading-snug text-zinc-50 group-hover:text-[#14ffec] ${
                      isLead ? "text-xl md:text-2xl" : "text-lg md:text-xl"
                    }`}
                  >
                    {news.title}
                  </h3>
                  {news.isPinned ? (
                    <span className="shrink-0 rounded-md border border-[#14ffec]/40 bg-[#14ffec]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#14ffec]">
                      Закреплено
                    </span>
                  ) : null}
                </div>
                <time
                  className="relative mt-3 block text-xs uppercase tracking-[0.14em] text-zinc-500"
                  dateTime={news.createdAt.toISOString()}
                >
                  {formatNewsDate(news.createdAt)}
                </time>
                <p
                  className={`relative mt-4 flex-1 leading-relaxed text-zinc-300 ${
                    isLead ? "text-base md:text-[1.05rem] line-clamp-6" : "text-sm md:text-[0.95rem] line-clamp-5"
                  }`}
                >
                  {news.body.length > (isLead ? 420 : 320) ? `${news.body.slice(0, isLead ? 420 : 320).trim()}…` : news.body}
                </p>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
