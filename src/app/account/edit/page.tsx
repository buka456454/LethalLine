import Link from "next/link";
import { redirect } from "next/navigation";
import AccountSettingsForm from "@/components/account/AccountSettingsForm";
import ParticipationSection from "@/components/account/ParticipationSection";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountEditPage() {
  const session = await readSession();
  if (!session) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      role: true,
      createdAt: true,
      phone: true,
      phoneVerifiedAt: true,
    },
  });

  if (!user) redirect("/sign-in");

  const profileHref = `/u/${encodeURIComponent(user.username)}`;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-[0.12em] text-[#14ffec]">Редактирование</h1>
          <p className="mt-1 text-sm text-zinc-400">Пароль, email, телефон, ник и данные профиля. Публичная страница — по ссылке ниже.</p>
        </div>
        <Link href={profileHref} className="text-sm text-[#14ffec] underline decoration-[#323232] hover:decoration-[#14ffec]">
          ← К публичному профилю
        </Link>
      </div>
      <AccountSettingsForm
        backToProfileHref={profileHref}
        initialUser={{
          ...user,
          createdAt: user.createdAt.toISOString(),
          phoneVerified: user.phone == null || user.phoneVerifiedAt != null,
        }}
      />
      <section className="surface w-full rounded-xl p-6">
        <h2 className="text-lg font-black uppercase tracking-[0.12em] text-[#14ffec]">Игровой профиль</h2>
        <p className="mt-2 text-sm text-zinc-400">Анкета отображается на публичной странице профиля.</p>
        <Link href="/account/questionnaire" className="button-primary mt-4 inline-flex">
          Заполнить анкету
        </Link>
      </section>
      <ParticipationSection />
    </div>
  );
}
