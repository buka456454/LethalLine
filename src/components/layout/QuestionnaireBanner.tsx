import Link from "next/link";

export default function QuestionnaireBanner() {
  return (
    <div className="border-b border-[var(--ll-line)] bg-[#0d7377]/15 px-4 py-2 text-sm text-zinc-200">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-3">
          <span className="ll-dot-live shrink-0" aria-hidden />
          Заполните анкету: без указанного ранга мы не сможем допустить вас к турнирам.
        </p>
        <Link href="/account/questionnaire" className="button-primary inline-flex w-fit px-3 py-1.5 text-xs uppercase tracking-[0.12em]">
          Заполнить анкету
        </Link>
      </div>
    </div>
  );
}
