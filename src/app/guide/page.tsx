import type { Metadata } from "next";
import Link from "next/link";
import Kicker from "@/components/ui/Kicker";
import Frame from "@/components/ui/Frame";
import Reveal from "@/components/motion/Reveal";
import SplitHeading from "@/components/motion/SplitHeading";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";

export const metadata: Metadata = {
  title: "Первые шаги | Lethal Line",
  description: "Что делать в начале: регистрация, анкета, поиск команды и заявка на турнир.",
};

export default function GuidePage() {
  return (
    <div className="w-full space-y-6 pb-8">
      <header>
        <Kicker index="00">Первые шаги</Kicker>
        <SplitHeading
          text="Что делать в начале"
          className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-[#14ffec]"
        />
        <Reveal delay={0.3}>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400">
            Шесть коротких шагов от регистрации до первого матча. Всё нужное собрано в меню под вашим ником в правом
            верхнем углу: анкета, настройки и профиль.
          </p>
        </Reveal>
      </header>

      <StaggerGroup className="grid gap-3 md:grid-cols-2" gap={0.07}>
        {[
          {
            n: "01",
            t: "Создайте аккаунт",
            d: "Нажмите «Регистрация» в шапке сайта. После входа там появится ваш ник с меню.",
          },
          {
            n: "02",
            t: "Заполните анкету",
            d: "Ник → «Анкета». Для каждой игры укажите ранг, роль и приложите скриншот. Если в игру вы не играли, выберите «Нет опыта». Ранг нужен, чтобы подобрать вам соперников такого же уровня.",
          },
          {
            n: "03",
            t: "Выберите турнир",
            d: "Раздел «Турниры». Подать заявку можно, пока идёт приём заявок — дальше начинаются матчи, затем подсчёт результатов и завершение.",
          },
          {
            n: "04",
            t: "Подайте заявку",
            d: "Заявку оформляет капитан: вписывает состав и оплачивает взнос. Если модерация откажет, взнос вернётся по условиям оферты.",
          },
          {
            n: "05",
            t: "Найдите игроков",
            d: "Раздел «Игроки» — поиск по игре, рангу и роли. Кнопка «Написать» открывает чат. Точка на пункте «Чаты» значит, что есть непрочитанные сообщения.",
          },
          {
            n: "06",
            t: "Если остались вопросы",
            d: "Ссылки на эту страницу, оферту, Telegram и трансляции на Kick есть в подвале любой страницы.",
          },
        ].map((b) => (
          <StaggerItem key={b.n} className="h-full">
            <Frame brackets hover className="h-full">
              <Kicker index={b.n}>{b.t}</Kicker>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{b.d}</p>
            </Frame>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <Reveal className="flex flex-wrap gap-3">
        <Link href="/tournaments" className="button-primary">
          К турнирам
        </Link>
        <Link href="/account/questionnaire" className="button-secondary">
          Заполнить анкету
        </Link>
      </Reveal>
    </div>
  );
}
