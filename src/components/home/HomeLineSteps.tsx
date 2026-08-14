import Link from "next/link";
import Frame from "@/components/ui/Frame";
import Kicker from "@/components/ui/Kicker";
import Reveal from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";
import type { ShellCup } from "@/lib/shellData";

const STEPS = [
  {
    index: "01",
    title: "Заполните анкету",
    text: "Выберите игру, укажите ранг и роль, приложите скриншот. Так мы подберём соперников вашего уровня.",
    href: "/account/questionnaire",
    label: "Заполнить анкету",
  },
  {
    index: "02",
    title: "Найдите игроков",
    text: "Ищите напарников по игре, рангу и роли, пишите им в чат и собирайте команду.",
    href: "/teammates",
    label: "Найти игроков",
  },
  {
    index: "03",
    title: "Подайте заявку",
    text: "Капитан вписывает состав и оплачивает взнос. После проверки команда попадает в турнирную сетку.",
    href: "",
    label: "К турниру недели",
  },
] as const;

export default function HomeLineSteps({ cup }: { cup: ShellCup | null }) {
  return (
    <section className="space-y-4">
      <Reveal className="flex items-end justify-between gap-4">
        <Kicker index="02">С чего начать</Kicker>
        <span className="ll-kicker text-zinc-600">три шага</span>
      </Reveal>

      <StaggerGroup className="grid gap-3 md:grid-cols-3" gap={0.1}>
        {STEPS.map((step) => {
          const href = step.index === "03" ? (cup ? `/tournaments/${cup.id}/apply` : "/tournaments") : step.href;
          return (
            <StaggerItem key={step.index} className="h-full">
              <Frame brackets hover className="group flex h-full flex-col">
                <Kicker index={step.index}>{step.title}</Kicker>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">{step.text}</p>
                <Link
                  href={href}
                  className="button-secondary mt-5 inline-flex items-center justify-center gap-2 text-center text-xs uppercase tracking-[0.12em]"
                >
                  {step.label}
                  <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                    →
                  </span>
                </Link>
              </Frame>
            </StaggerItem>
          );
        })}
      </StaggerGroup>
    </section>
  );
}
