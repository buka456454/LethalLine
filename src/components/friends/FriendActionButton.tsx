"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type FriendActionState =
  | { kind: "none" }
  | { kind: "friends"; friendshipId: string }
  | { kind: "outgoing"; friendshipId: string }
  | { kind: "incoming"; friendshipId: string }
  | { kind: "self" };

type Props = {
  peerUserId: string;
  initial: FriendActionState;
  /** compact — одна ghost-кнопка для карточек и шапки чата */
  variant?: "full" | "compact";
  className?: string;
};

export default function FriendActionButton({ peerUserId, initial, variant = "full", className }: Props) {
  const router = useRouter();
  const [state, setState] = useState<FriendActionState>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const refresh = () => router.refresh();

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError("");
    try {
      await fn();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = () =>
    run(async () => {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: peerUserId }),
      });
      const body = (await res.json()) as { friendshipId?: string; error?: string };
      if (!res.ok || !body.friendshipId) throw new Error(body.error ?? "Не удалось отправить заявку");
      setState({ kind: "outgoing", friendshipId: body.friendshipId });
    });

  const accept = (friendshipId: string) =>
    run(async () => {
      const res = await fetch(`/api/friends/${friendshipId}/accept`, { method: "POST" });
      const body = (await res.json()) as { friendshipId?: string; error?: string };
      if (!res.ok || !body.friendshipId) throw new Error(body.error ?? "Не удалось принять");
      setState({ kind: "friends", friendshipId: body.friendshipId });
    });

  const decline = (friendshipId: string) =>
    run(async () => {
      const res = await fetch(`/api/friends/${friendshipId}/decline`, { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Не удалось отклонить");
      setState({ kind: "none" });
    });

  const remove = (friendshipId: string) =>
    run(async () => {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Не удалось удалить");
      setState({ kind: "none" });
      setMenuOpen(false);
    });

  if (state.kind === "self") return null;

  if (variant === "compact") {
    if (state.kind === "friends") {
      return <span className={className ?? "text-xs uppercase tracking-[0.12em] text-zinc-500"}>В друзьях</span>;
    }
    if (state.kind === "outgoing") {
      return (
        <button
          type="button"
          disabled={loading}
          className={className ?? "button-ghost text-xs"}
          onClick={() => void remove(state.friendshipId)}
        >
          {loading ? "…" : "Отменить заявку"}
        </button>
      );
    }
    if (state.kind === "incoming") {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading}
            className="button-primary px-2 py-1 text-xs"
            onClick={() => void accept(state.friendshipId)}
          >
            Принять
          </button>
          <button
            type="button"
            disabled={loading}
            className="button-secondary px-2 py-1 text-xs"
            onClick={() => void decline(state.friendshipId)}
          >
            Отклонить
          </button>
        </div>
      );
    }
    return (
      <button
        type="button"
        disabled={loading}
        className={className ?? "button-ghost text-xs"}
        onClick={() => void sendRequest()}
      >
        {loading ? "…" : "В друзья"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {state.kind === "none" ? (
          <button type="button" disabled={loading} className="button-secondary" onClick={() => void sendRequest()}>
            {loading ? "Отправка…" : "В друзья"}
          </button>
        ) : null}

        {state.kind === "outgoing" ? (
          <>
            <button type="button" disabled className="button-ghost opacity-70">
              Заявка отправлена
            </button>
            <button
              type="button"
              disabled={loading}
              className="text-xs uppercase tracking-[0.12em] text-zinc-500 underline decoration-[#323232] hover:text-[#14ffec]"
              onClick={() => void remove(state.friendshipId)}
            >
              Отменить
            </button>
          </>
        ) : null}

        {state.kind === "incoming" ? (
          <>
            <button
              type="button"
              disabled={loading}
              className="button-primary"
              onClick={() => void accept(state.friendshipId)}
            >
              {loading ? "…" : "Принять"}
            </button>
            <button
              type="button"
              disabled={loading}
              className="button-secondary"
              onClick={() => void decline(state.friendshipId)}
            >
              Отклонить
            </button>
          </>
        ) : null}

        {state.kind === "friends" ? (
          <div className="relative">
            <button
              type="button"
              className="button-ghost"
              disabled={loading}
              onClick={() => setMenuOpen((v) => !v)}
            >
              В друзьях
            </button>
            {menuOpen ? (
              <div className="absolute left-0 top-full z-20 mt-1 w-48 border border-[var(--ll-line)] bg-[#141414] p-1 shadow-lg">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:text-[#14ffec]"
                  disabled={loading}
                  onClick={() => void remove(state.friendshipId)}
                >
                  Удалить из друзей
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {error ? <p className="text-xs text-[#14ffec]">{error}</p> : null}
    </div>
  );
}
