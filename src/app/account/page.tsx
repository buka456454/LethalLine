import { redirect } from "next/navigation";
import AccountSettingsForm from "@/components/account/AccountSettingsForm";
import ParticipationSection from "@/components/account/ParticipationSection";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
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
    },
  });

  if (!user) redirect("/sign-in");

  return (
    <div className="w-full">
      <AccountSettingsForm
        initialUser={{
          ...user,
          createdAt: user.createdAt.toISOString(),
        }}
      />
      <ParticipationSection />
    </div>
  );
}
