"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PublicImage from "@/components/ui/PublicImage";
import SaiIcon from "@/components/ui/SaiIcon";
import UserRoleBadge from "@/components/ui/UserRoleBadge";

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
  const [experience, setExperience] = useState("");

  const loadGames = useCallback(async () => {
    const res = await fetch("/api/games");
    const parsed = await parseResponseJson<{ games?: Game[]; error?: string }>(res);
    if (!parsed.ok) throw new Error(parsed.message);
    const body = parsed.data;
    if (!res.ok) throw new Error(body.error ?? "Не удалось загрузить игры");
    setGames(body.games ?? []);
  }, []);

  const loadUsers = useCallback(async (filters?: { gameId?: string; role?: string; experience?: string }) => {
    const params = new URLSearchParams();
    if (filters?.gameId) params.set("gameId", filters.gameId);
    if (filters?.role) params.set("role", filters.role);
    if (filters?.experience) params.set("experience", filters.experience);
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

  const applyFilters = async () => {
    try {
      setLoading(true);
      setError("");
      await loadUsers({
        gameId: gameId || undefined,
        role: role.trim() || undefined,
        experience: experience.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка фильтрации");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = async () => {
    setGameId("");
    setRole("");
    setExperience("");
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

  const hasActiveFilters = useMemo(() => Boolean(gameId || role.trim() || experience.trim()), [experience, gameId, role]);

  return (
    <div className="w-full space-y-6">
      <header className="flex items-center gap-3">
        <SaiIcon name="search" size={20} />
        <h1 className="text-3xl font-black uppercase tracking-[0.14em] text-[#14ffec]">Поиск напарников</h1>
      </header>

      <section className="surface rounded-xl p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Игра</span>
            <select className="input-base" value={gameId} onChange={(e) => setGameId(e.target.value)}>
              <option value="">Все игры</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Роль</span>
            <input
              className="input-base"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Например IGL, мид, саппорт"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Опыт</span>
            <input
              className="input-base"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Например Легенда, 2000, Immortal"
            />
          </label>
          <div className="flex items-end gap-2">
            <button type="button" className="button-primary w-full" onClick={() => void applyFilters()} disabled={loading}>
              Применить
            </button>
            <button
              type="button"
              className="rounded border border-[#323232] px-4 py-2 text-sm text-zinc-300 hover:text-[#14ffec]"
              onClick={() => void resetFilters()}
              disabled={loading || !hasActiveFilters}
            >
              Сброс
            </button>
          </div>
        </div>
      </section>

      {error && <p className="rounded bg-[#323232] p-2 text-sm text-[#14ffec]">{error}</p>}
      {loading ? (
        <p className="text-sm text-zinc-400">Загрузка пользователей…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-zinc-500">Подходящих пользователей пока нет.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {users.map((user) => {
            const initials = (user.displayName || user.username || "U").slice(0, 2).toUpperCase();
            return (
              <li key={user.id} className="surface rounded-xl p-4">
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
                      <div key={`${user.id}-${p.gameId}`} className="rounded border border-[#323232] bg-[#1b1b1b] p-2 text-xs text-zinc-300">
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

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="button-primary"
                    disabled={startingChatWith === user.id}
                    onClick={() => void startChat(user.id)}
                  >
                    {startingChatWith === user.id ? "Открытие…" : "Написать"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
