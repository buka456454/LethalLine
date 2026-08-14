import Link from "next/link";
import Kicker from "@/components/ui/Kicker";
import Reveal from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";
import type { ShellCup } from "@/lib/shellData";

export default function HomeBigNav({ cup, kickUrl }: { cup: ShellCup | null; kickUrl: string }) {
  const rows = [
    { index: "1", title: "Первые шаги", meta: "что делать в начале", href: "/guide", external: false },
    { index: "2", title: "Собрать команду", meta: "поиск игроков по роли", href: "/teammates", external: false },
    {
      index: "3",
      title: "Турнир недели",
      meta: "сетка и призовой фонд",
      href: cup ? `/tournaments/${cup.id}` : "/tournaments",
      external: false,
    },
    { index: "4", title: "Эфир на Kick", meta: "разбор матчей", href: kickUrl, external: true },
  ];

  return (
    <section>
      <Reveal className="flex items-end justify-between gap-4 pb-4">
        <Kicker>разделы</Kicker>
        <span className="ll-kicker text-zinc-600">куда идти дальше</span>
      </Reveal>

      <StaggerGroup className="ll-bigrows" gap={0.09}>
        {rows.map((row) => {
          const content = (
            <>
              <span className="ll-bigrow-index">{`//${row.index}`}</span>
              <span className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <span className="ll-bigrow-title">{row.title}</span>
                <span className="ll-bigrow-meta">{row.meta}</span>
              </span>
            </>
          );

          return (
            <StaggerItem key={row.index}>
              {row.external ? (
                <a href={row.href} target="_blank" rel="noreferrer" className="ll-bigrow">
                  {content}
                </a>
              ) : (
                <Link href={row.href} className="ll-bigrow">
                  {content}
                </Link>
              )}
            </StaggerItem>
          );
        })}
      </StaggerGroup>

      <Reveal delay={0.1} className="flex flex-wrap items-center justify-between gap-4 pt-6">
        <p className="max-w-md text-xs uppercase leading-relaxed tracking-[0.18em] text-zinc-500">
          место в сетке не купить — только собрать команду и выиграть
        </p>
        <Link href="/guide" className="button-secondary text-xs uppercase tracking-[0.14em]">
          Как это работает
        </Link>
      </Reveal>
    </section>
  );
}
