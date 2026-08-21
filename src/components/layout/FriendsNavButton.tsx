"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FriendsIcon from "@/components/icons/FriendsIcon";
import { INCOMING_FRIENDS_EVENT } from "@/components/friends/incomingEvents";

export default function FriendsNavButton({ pendingCount = 0 }: { pendingCount?: number }) {
  const [count, setCount] = useState(pendingCount);

  useEffect(() => {
    setCount(pendingCount);
  }, [pendingCount]);

  useEffect(() => {
    const onUpdate = (event: Event) => {
      const next = (event as CustomEvent<{ count?: number }>).detail?.count;
      if (typeof next === "number") setCount(next);
    };
    window.addEventListener(INCOMING_FRIENDS_EVENT, onUpdate);
    return () => window.removeEventListener(INCOMING_FRIENDS_EVENT, onUpdate);
  }, []);

  const label = count > 0 ? `Друзья, входящих заявок: ${count}` : "Друзья";

  return (
    <Link
      href="/friends"
      aria-label={label}
      title="Друзья"
      className="relative inline-flex h-[34px] w-[34px] items-center justify-center rounded-sm border border-[var(--ll-line)] text-[#14ffec] transition-colors duration-200 hover:border-[#14ffec] hover:bg-[#14ffec]/8"
    >
      <FriendsIcon className="h-4 w-4" />
      {count > 0 ? <span className="ll-dot-live absolute right-1 top-1" aria-hidden /> : null}
    </Link>
  );
}
