"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import PublicImage from "@/components/ui/PublicImage";
import UserRoleBadge from "@/components/ui/UserRoleBadge";
import SplitHeading from "@/components/motion/SplitHeading";
import FriendActionButton, { type FriendActionState } from "@/components/friends/FriendActionButton";
import TeammatesFilters from "@/components/teammates/TeammatesFilters";
import {
  getExperienceScale,
  normalizeNumericRange,
  type ExperienceMetric,
} from "@/lib/gameQuestionnaireConfig";

type Game = { id: string; name: string; slug: string };
type TeammateProfile = {
  gameId: string;
  game: Game;
  mmr: number | null;
  rankLabel: string | null;
  hoursPlayed: number | null;
  primaryRole: string | null;
};
type Teammate = {
  id: string;
  username: string;
  role: "USER" | "ADMIN" | "SUPERADMIN" | "JOURNALIST" | "COMMENTATOR";
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  friendRelation?: FriendActionState;
  gameProfiles: TeammateProfile[];
};

async function parseResponseJson<T>(res: Response): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const text = await res.text();
  if (!text.trim()) {
    return { ok: false, message: res.ok ? "Пустой ответ сервера" : "Сервер не вернул данные" };
  }
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, message: "Ответ сервера не JSON" };
  }
}

export default function TeammatesPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<Teammate[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingChatWith, setStartingChatWith] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [gameId, setGameId] = useState("");
  const [role, setRole] = useState("");
  const [metric, setMetric] = useState<ExperienceMetric>("rating");
  const [expFrom, setExpFrom] = useState<number | null>(null);
  const [expTo, setExpTo] = useState<number | null>(null);

  const loadGames = useCallback(async () => {
    const res = await fetch("/api/games");
    const parsed = await parseResponseJson<{ games?: Game[]; error?: string }>(res);
    if (!parsed.ok) throw new Error(parsed.message);
    const body = parsed.data;
    if (!res.ok) throw new Error(body.error ?? "Не удалось загрузить игры");
    setGames(body.games ?? []);
  }, []);

  const loadUsers = useCallback(async (filters?: {
    gameId?: string;
    role?: string;
    minHours?: number;
    maxHours?: number;
    minMmr?: number;
    maxMmr?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.gameId) params.set("gameId", filters.gameId);
    if (filters?.role) params.set("role", filters.role);
    if (filters?.minHours != null) params.set("minHours", String(filters.minHours));
    if (filters?.maxHours != null) params.set("maxHours", String(filters.maxHours));
    if (filters?.minMmr != null) params.set("minMmr", String(filters.minMmr));
    if (filters?.maxMmr != null) params.set("maxMmr", String(filters.maxMmr));
    params.set("take", "100");

    const suffix = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/teammates${suffix}`);
    const parsed = await parseResponseJson<{ users?: Teammate[]; error?: string }>(res);
    if (!parsed.ok) throw new Error(parsed.message);
    const body = parsed.data;
    if (!res.ok) throw new Error(body.error ?? "Не удалось загрузить пользователей");
    setUsers(body.users ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError("");
        await Promise.all([loadGames(), loadUsers()]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadGames, loadUsers]);

  const selectedSlug = games.find((game) => game.id === gameId)?.slug;

  const buildFilterQuery = () => {
    const range = normalizeNumericRange(expFrom, expTo);
    const scale = selectedSlug ? getExperienceScale(selectedSlug, metric) : null;
    const clamp = (value?: number) => {
      if (value == null || !scale) return value;
      return Math.min(scale.max, Math.max(scale.min, value));
    };
    const min = clamp(range.min);
    const max = clamp(range.max);
    return {
      gameId: gameId || undefined,
      role: gameId ? role.trim() || undefined : undefined,
      minHours: gameId && metric === "hours" ? min : undefined,
      maxHours: gameId && metric === "hours" ? max : undefined,
      minMmr: gameId && metric === "rating" ? min : undefined,
      maxMmr: gameId && metric === "rating" ? max : undefined,
    };
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      setError("");
      await loadUsers(buildFilterQuery());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка фильтрации");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = async () => {
    setGameId("");
    setRole("");
    setMetric("rating");
    setExpFrom(null);
    setExpTo(null);
    try {
      setLoading(true);
      setError("");
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  const changeGame = (nextGameId: string) => {
    setGameId(nextGameId);
    setRole("");
    setMetric("rating");
    setExpFrom(null);
    setExpTo(null);
  };

  const changeMetric = (next: ExperienceMetric) => {
    setMetric(next);
    setExpFrom(null);
    setExpTo(null);
  };

  const startChat = async (peerUserId: string) => {
    try {
      setStartingChatWith(peerUserId);
      setError("");
      const res = await fetch("/api/chats/dialogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerUserId }),
      });
      const parsed = await parseResponseJson<{ dialogId?: string; error?: string }>(res);
      if (!parsed.ok) throw new Error(parsed.message);
      const body = parsed.data;
      if (!res.ok || !body.dialogId) throw new Error(body.error ?? "Не удалось открыть чат");
      router.push(`/chats?dialogId=${encodeURIComponent(body.dialogId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания чата");
    } finally {
      setStartingChatWith(null);
    }
  };

  const hasActiveFilters = useMemo(
    () => Boolean(gameId || role.trim() || expFrom != null || expTo != null),
    [expFrom, expTo, gameId, role],
  );

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ll-kicker">{"//02 игроки"}</p>
          <SplitHeading
            text="Собрать команду"
            className="mt-1 text-3xl font-black uppercase tracking-[0.12em] text-[#14ffec]"
          />
          <p className="mt-2 text-sm text-zinc-500">
            Найдите игроков по игре, роли и диапазону опыта, напишите им в чат и позовите в свою команду.
          </p>
        </div>
        <Link href="/tournaments" className="button-secondary text-xs uppercase tracking-[0.12em]">
          Турнир недели
        </Link>
      </header>

      <TeammatesFilters
        games={games}
        loading={loading}
        gameId={gameId}
        role={role}
        metric={metric}
        expFrom={expFrom}
        expTo={expTo}
        onGameId={changeGame}
        onRole={setRole}
        onMetric={changeMetric}
        onExpFrom={setExpFrom}
        onExpTo={setExpTo}
        onApply={() => void applyFilters()}
        onReset={() => void resetFilters()}
        hasActiveFilters={hasActiveFilters}
      />

      {error && <p className="rounded bg-[#323232] p-2 text-sm text-[#14ffec]">{error}</p>}
      {loading ? (
        <p className="text-sm text-zinc-400">Загрузка пользователей…</p>
      ) : users.length === 0 ? (
        <div className="ll-frame p-5">
          <p className="text-sm text-zinc-400">Подходящих игроков нет. Без ранга в анкете вас тоже не найдут.</p>
          <a href="/account/questionnaire" className="button-primary mt-3 inline-flex text-xs uppercase tracking-[0.12em]">
            Анкета
          </a>
        </div>
      ) : (
        <ul className="grid list-none gap-4 md:grid-cols-2">
          <AnimatePresence initial={false} mode="popLayout">
          {users.map((user, index) => {
            const initials = (user.displayName || user.username || "U").slice(0, 2).toUpperCase();
            return (
              <motion.li
                key={user.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className="ll-frame ll-frame--brackets ll-hover-lift p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#323232] bg-[#323232]">
                    {user.avatarUrl ? (
                      <PublicImage src={user.avatarUrl} alt="" width={56} height={56} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-black text-[#14ffec]">{initials}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-semibold text-zinc-100">
                      <span>{user.displayName || user.username}</span>
                      <UserRoleBadge role={user.role} size="sm" />
                    </p>
                    <p className="text-xs text-zinc-500">@{user.username}</p>
                    {user.bio && <p className="mt-2 line-clamp-2 text-sm text-zinc-300">{user.bio}</p>}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {user.gameProfiles.length === 0 ? (
                    <p className="text-xs text-zinc-500">Анкета по играм пока не заполнена.</p>
                  ) : (
                    user.gameProfiles.slice(0, 3).map((p) => (
                      <div
                        key={`${user.id}-${p.gameId}`}
                        className="rounded border border-[var(--ll-line)] bg-black/30 p-2 text-xs text-zinc-300 transition-colors duration-300 hover:border-[#14ffec]/40"
                      >
                        <p className="font-semibold text-[#14ffec]">{p.game.name}</p>
                        <p>
                          Роль: <span className="text-zinc-100">{p.primaryRole || "—"}</span> · Ранг:{" "}
                          <span className="text-zinc-100">{p.rankLabel || "—"}</span>
                        </p>
                        <p>
                          Часы: <span className="text-zinc-100">{p.hoursPlayed ?? "—"}</span> · MMR:{" "}
                          <span className="text-zinc-100">{p.mmr ?? "—"}</span>
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="button-primary"
                    disabled={startingChatWith === user.id}
                    onClick={() => void startChat(user.id)}
                  >
                    {startingChatWith === user.id ? "Открытие…" : "Написать"}
                  </button>
                  <Link href={`/u/${encodeURIComponent(user.username)}`} className="button-secondary text-sm">
                    Профиль
                  </Link>
                  <FriendActionButton
                    peerUserId={user.id}
                    initial={user.friendRelation ?? { kind: "none" }}
                    variant="compact"
                    className="button-ghost text-xs"
                  />
                </div>
              </motion.li>
            );
          })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
