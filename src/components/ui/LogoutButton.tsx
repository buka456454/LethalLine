"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function LogoutButton({ label = "Выход", className }: { label?: string; className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });
      router.replace("/");
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className={
        className ??
        "rounded-md border border-[#323232] bg-[#323232] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-200 transition hover:border-[#0d7377] hover:text-[#14ffec] disabled:opacity-60"
      }
    >
      {isPending ? "Выход..." : label}
    </button>
  );
}
