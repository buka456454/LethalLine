import type { CSSProperties } from "react";
import Link from "next/link";
import CtaBox from "@/components/ui/CtaBox";
import Frame from "@/components/ui/Frame";
import Kicker from "@/components/ui/Kicker";
import Reveal from "@/components/motion/Reveal";
import SplitHeading from "@/components/motion/SplitHeading";
import CountUp from "@/components/motion/CountUp";
import type { ShellCup } from "@/lib/shellData";
import { formatRubFromMinor } from "@/lib/money";
import type { SessionPayload } from "@/lib/auth";

export default function HomeHero({
  session,
  hasQuestionnaire,
  cup,
}: {
  session: SessionPayload | null;
  hasQuestionnaire: boolean;
  cup: ShellCup | null;
}) {
  const primary = !session
    ? { href: "/sign-in?mode=register", label: "Зарегистрироваться" }
    : !hasQuestionnaire
      ? { href: "/account/questionnaire", label: "Заполнить анкету" }
      : cup
        ? { href: `/tournaments/${cup.id}`, label: "Турнир этой недели" }
        : { href: "/tournaments", label: "Смотреть турниры" };

  const secondary = cup
    ? { href: `/tournaments/${cup.id}`, label: "Турнир этой недели" }
    : { href: "/tournaments", label: "Все турниры" };

  const fillPercent = cup && cup.maxTeams > 0 ? Math.min(100, Math.round((cup.takenTeams / cup.maxTeams) * 100)) : 0;

  return (
    <Frame brackets grid className="relative min-h-[460px] overflow-hidden p-6 sm:p-10">
      <span className="ll-beam ll-beam--a" aria-hidden />
      <span className="ll-beam ll-beam--b" aria-hidden />
      <span className="ll-beam ll-beam--c" aria-hidden />

      <p className="pointer-events-none absolute inset-x-0 top-6 select-none text-center text-[13vw] font-black leading-none tracking-[0.12em] text-white/[0.035]">
        LINE
      </p>

      <div className="relative z-10 flex items-center justify-between gap-4">
        <Kicker index="00">Lethal Line</Kicker>
        <div className="flex items-center gap-3">
          <span className="ll-kicker hidden sm:inline">соперники твоего уровня</span>
          <span className="ll-dot-live" aria-hidden />
        </div>
      </div>

      <div className="relative z-10 mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <SplitHeading
            text="Собери команду и забери призовой фонд"
            className="max-w-xl text-4xl font-black uppercase leading-[0.95] tracking-[0.08em] text-[#14ffec] sm:text-5xl"
          />
          <Reveal delay={0.35}>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-zinc-400">
              Онлайн-турниры по CS2, Dota 2 и Valorant. Зарегистрируйся, собери команду и подай заявку. Призовой фонд
              делится между победителями и выплачивается в рублях, а матчи комментируют в прямом эфире.
            </p>
          </Reveal>
          <Reveal delay={0.45} className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-4">
              <div className="ll-dial" style={{ "--ll-dial-p": fillPercent } as CSSProperties} aria-hidden>
                <span className="text-xs font-black tracking-[0.08em] text-[#14ffec]">
                  <CountUp value={fillPercent} suffix="%" />
                </span>
              </div>
              <div>
                <p className="ll-kicker">мест занято</p>
                <p className="mt-1 text-sm text-zinc-300">
                  {cup ? `${cup.takenTeams} из ${cup.maxTeams} команд` : "ждём анонс турнира"}
                </p>
              </div>
            </div>
            <div className="border-l border-[var(--ll-line)] pl-6">
              <p className="ll-kicker">уровень соперников</p>
              <p className="mt-1 text-sm text-zinc-300">ранг проверяем вручную</p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.25} className="space-y-4">
          <CtaBox
            primary={primary}
            secondary={secondary.href === primary.href ? undefined : secondary}
            hint="Регистрация занимает минуту. Дальше — анкета, команда и заявка на турнир."
          />
          {cup ? (
            <Link href={`/tournaments/${cup.id}`} className="ll-frame ll-frame--brackets ll-hover-lift block px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <Kicker>турнир недели</Kicker>
                <span className="ll-icon-btn" aria-hidden>
                  ↗
                </span>
              </div>
              <p className="mt-2 text-lg font-bold text-zinc-100">{cup.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-500">
                {cup.gameName} · мест {cup.takenTeams}/{cup.maxTeams}
                {cup.entryFeeMinor > 0 ? ` · взнос ${formatRubFromMinor(cup.entryFeeMinor)}` : ""}
              </p>
              <div className="ll-meter mt-3">
                <span style={{ width: `${fillPercent}%` }} />
              </div>
            </Link>
          ) : null}
        </Reveal>
      </div>
    </Frame>
  );
}
