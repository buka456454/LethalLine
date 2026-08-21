"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import FriendsIcon from "@/components/icons/FriendsIcon";
import { INCOMING_FRIENDS_EVENT } from "@/components/friends/incomingEvents";
import type { IncomingFriendPreview } from "@/lib/shellData";

const SEEN_KEY = "ll_seen_friend_requests";
const POLL_MS = 15_000;

type IncomingItem = IncomingFriendPreview;

function readSeenIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeSeenIds(ids: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

function emitIncomingCount(count: number) {
  window.dispatchEvent(new CustomEvent(INCOMING_FRIENDS_EVENT, { detail: { count } }));
}

export default function FriendRequestToast({
  enabled,
  initialIncoming,
}: {
  enabled: boolean;
  initialIncoming: IncomingItem[];
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [incoming, setIncoming] = useState<IncomingItem[]>(initialIncoming);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const unseen = useMemo(
    () => incoming.filter((item) => !dismissed.has(item.friendshipId)),
    [incoming, dismissed],
  );
  const current = unseen[0] ?? null;
  const extra = Math.max(0, unseen.length - 1);

  const markSeen = useCallback((ids: string[]) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      writeSeenIds(next);
      return next;
    });
  }, []);

  const applyIncoming = useCallback((next: IncomingItem[]) => {
    setIncoming(next);
    emitIncomingCount(next.length);
  }, []);

  const refreshIncoming = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(`/api/friends?tab=incoming&take=8&_=${Date.now()}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) return;
      const body = (await res.json()) as { items?: IncomingItem[]; error?: string };
      const next = (body.items ?? []).filter(
        (item): item is IncomingItem => Boolean(item?.friendshipId && item?.user),
      );
      applyIncoming(next);
    } catch {
      /* keep last known list */
    }
  }, [applyIncoming, enabled]);

  useEffect(() => {
    setMounted(true);
    setDismissed(readSeenIds());
    emitIncomingCount(initialIncoming.length);
  }, [initialIncoming.length]);

  useEffect(() => {
    if (!enabled) return;
    void refreshIncoming();
    const id = window.setInterval(() => void refreshIncoming(), POLL_MS);
    const onFocus = () => void refreshIncoming();
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, refreshIncoming]);

  const run = async (fn: () => Promise<void>) => {
    if (!current) return;
    setBusy(true);
    try {
      await fn();
      markSeen([current.friendshipId]);
      await refreshIncoming();
      router.refresh();
    } catch {
      /* keep toast open */
    } finally {
      setBusy(false);
    }
  };

  const accept = () =>
    run(async () => {
      const res = await fetch(`/api/friends/${current!.friendshipId}/accept`, { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Не удалось принять");
    });

  const decline = () =>
    run(async () => {
      const res = await fetch(`/api/friends/${current!.friendshipId}/decline`, { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Не удалось отклонить");
    });

  if (!enabled || !mounted) return null;

  const toast =
    current ? (
      <motion.aside
        key={current.friendshipId}
        role="status"
        aria-live="polite"
        initial={{ opacity: 0, y: 20, x: 12 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, y: 14, x: 8 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="fixed bottom-20 right-4 z-[80] w-[min(100vw-2rem,20.5rem)] border border-[var(--ll-line)] bg-[#141414]/95 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-md md:bottom-6 sm:right-6"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-[#14ffec]">
            <FriendsIcon className="h-4 w-4" />
            <h2 className="text-sm font-black uppercase tracking-[0.14em]">Заявка в друзья</h2>
          </div>
          <button
            type="button"
            onClick={() => markSeen([current.friendshipId])}
            className="shrink-0 rounded-sm border border-[#323232] px-2 py-0.5 text-xs text-zinc-500 transition hover:border-[#14ffec] hover:text-zinc-200"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <p className="mt-3 text-sm leading-snug text-zinc-300">
          <span className="font-semibold text-zinc-100">
            {current.user.displayName || current.user.username}
          </span>{" "}
          хочет добавить вас в друзья.
          {extra > 0 ? ` Ещё ${extra} в входящих.` : null}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="button-primary px-3 py-1.5 text-xs" disabled={busy} onClick={() => void accept()}>
            {busy ? "…" : "Принять"}
          </button>
          <button
            type="button"
            className="button-secondary px-3 py-1.5 text-xs"
            disabled={busy}
            onClick={() => void decline()}
          >
            Отклонить
          </button>
          <Link
            href="/friends?tab=incoming"
            className="button-ghost px-2 py-1.5 text-xs uppercase tracking-[0.12em]"
            onClick={() => markSeen(unseen.map((item) => item.friendshipId))}
          >
            Все заявки
          </Link>
        </div>
      </motion.aside>
    ) : null;

  return createPortal(<AnimatePresence mode="wait">{toast}</AnimatePresence>, document.body);
}
