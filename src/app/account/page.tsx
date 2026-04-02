import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Личный кабинет = публичный профиль. Редактирование — `/account/edit`. */
export default async function AccountPage() {
  const session = await readSession();
  if (!session) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true },
  });

  if (!user) redirect("/sign-in");

  redirect(`/u/${encodeURIComponent(user.username)}`);
}
