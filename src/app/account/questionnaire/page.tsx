import Link from "next/link";
import { redirect } from "next/navigation";
import GameQuestionnaireForm from "@/components/account/GameQuestionnaireForm";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function QuestionnairePage() {
  const session = await readSession();
  if (!session) redirect("/sign-in");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true },
  });
  if (!me) redirect("/sign-in");

  const profileHref = `/u/${encodeURIComponent(me.username)}`;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-[0.12em] text-[#14ffec]">Игровая анкета</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Расскажите, во что вы играете: ранг, роли (можно несколько) и скриншот для подтверждения. По этим данным вас находят другие
            игроки, а мы подбираем соперников вашего уровня. Если в игру вы не играли — выберите «Нет опыта».
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm">
          <Link href={profileHref} className="text-zinc-400 underline decoration-[#323232] hover:text-[#14ffec]">
            ← К профилю
          </Link>
          <Link href="/account/edit" className="text-zinc-500 underline decoration-[#323232] hover:text-[#14ffec]">
            Редактировать данные аккаунта
          </Link>
        </div>
      </div>
      <GameQuestionnaireForm profileHref={profileHref} />
    </div>
  );
}
