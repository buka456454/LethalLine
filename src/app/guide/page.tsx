import type { Metadata } from "next";
import Link from "next/link";
import SaiIcon from "@/components/ui/SaiIcon";

export const metadata: Metadata = {
  title: "Как пользоваться сайтом | Lethal Line Esports",
  description: "Актуальный гайд по Lethal Line: аккаунт, анкета, чаты, турниры, статусы и участие.",
};

export default function GuidePage() {
  return (
    <div className="w-full space-y-10 pb-8">
      <header className="relative overflow-hidden rounded-2xl border border-[#0d7377]/35 bg-[linear-gradient(140deg,#181c1c_0%,#141818_50%,#101414_100%)] p-6 md:p-8">
        <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-[#14ffec]/10 blur-3xl" />
        <div className="relative">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0d7377] transition hover:text-[#14ffec]"
          >
            ← На главную
          </Link>
          <h1 className="mt-4 text-3xl font-black uppercase tracking-[0.08em] text-[#14ffec] md:text-4xl">
            Как пользоваться сайтом
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Ниже — актуальный порядок действий: от входа и настройки аккаунта до участия в турнирах и общения в личных чатах.
            Администраторам доступны расширенные инструменты управления турнирами и статусами.
          </p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <GuideBlock
          step="01"
          title="Регистрация и вход"
          icon="user"
          items={[
            "Откройте «Войти в систему» на главной и создайте аккаунт или войдите с существующим email.",
            "После входа используйте кнопку «Аккаунт» в правом верхнем углу: в выпадающем меню доступны «Профиль» и «Выход».",
          ]}
        />
        <GuideBlock
          step="02"
          title="Профиль и анкета по играм"
          icon="file"
          items={[
            "В настройках аккаунта можно загрузить аватар и изменить отображаемые данные.",
            "Раздел «Игровая анкета»: укажите ранг, роль, часы и опыт по дисциплинам. Для некоторых турниров может требоваться подтверждение опыта.",
          ]}
        />
        <GuideBlock
          step="03"
          title="Турниры"
          icon="calendar"
          items={[
            "Страница «Турниры» показывает ближайшее событие и полный список активных/прошедших турниров.",
            "У турниров есть статусы: «Набор участников», «В процессе», «Подсчёт результатов», «Завершен». Подача заявок доступна только при открытой регистрации.",
          ]}
        />
        <GuideBlock
          step="04"
          title="Заявка и ожидание"
          icon="check"
          items={[
            "На странице турнира нажмите «Подать заявку» и заполните данные команды/состава.",
            "После отправки отслеживайте статус заявки, сетку матчей и результат турнира прямо на странице турнира.",
          ]}
        />
        <GuideBlock
          step="05"
          title="Личные чаты"
          icon="chat"
          items={[
            "В разделе «Чаты» диалоги отображаются списком, входящие/исходящие сообщения разделены по сторонам, а новые сообщения помечаются индикатором в меню.",
            "Окно сообщений работает как отдельный прокручиваемый блок с автопрокруткой к последнему сообщению.",
          ]}
        />
        <GuideBlock
          step="06"
          title="Новости и связь"
          icon="chat"
          items={[
            "Анонсы и новости публикуются на главной странице и в каналах связи (Telegram/Kick).",
            "Для партнёрств и официальных вопросов используйте контакты из блока «Связь» внизу главной страницы.",
          ]}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/tournaments" className="button-primary">
          К турнирам
        </Link>
        <Link
          href="/account/edit"
          className="rounded-lg border border-[#323232] bg-black/25 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-[#14ffec]/50 hover:text-[#14ffec]"
        >
          Настройки аккаунта
        </Link>
      </div>
    </div>
  );
}

function GuideBlock({
  step,
  title,
  icon,
  items,
}: {
  step: string;
  title: string;
  icon: "user" | "file" | "calendar" | "check" | "chat";
  items: string[];
}) {
  return (
    <article className="surface rounded-xl border border-[#323232] p-5 transition hover:border-[#0d7377]/60">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#0d7377]/45 bg-black/30">
          <SaiIcon name={icon} size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0d7377]">{step}</p>
          <h2 className="mt-1 text-lg font-bold text-zinc-100">{title}</h2>
          <ul className="mt-3 list-none space-y-2 text-sm leading-relaxed text-zinc-400">
            {items.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#14ffec]" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
