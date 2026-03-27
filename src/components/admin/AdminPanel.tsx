"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  metrics?: {
    usersTotal: number;
    usersBanned: number;
    activeTournaments: number;
    registrationsTotal: number;
    approvedRegistrations: number;
    conversionRate: number;
    matchesLive: number;
  };
  logs?: Array<{
    id: string;
    action: string;
    entity: string;
    createdAt: string;
    actor: { username: string };
  }>;
  games?: Array<{ id: string; name: string; slug: string }>;
  users?: Array<{ id: string; username: string; role: "USER" | "ADMIN" | "SUPERADMIN"; isBanned: boolean }>;
  tournaments?: Array<{ id: string; title: string }>;
  matches?: Array<{ id: string; status: "SCHEDULED" | "LIVE" | "FINISHED" }>;
};

export default function AdminPanel() {
  const [data, setData] = useState<DashboardData>({});
  const [state, setState] = useState({
    gameName: "",
    gameSlug: "",
    newsTitle: "",
    newsBody: "",
    userId: "",
    userRole: "USER",
    userBan: false,
    matchId: "",
    matchScoreA: "1",
    matchScoreB: "0",
    matchWinnerLabel: "Participant A",
  });
  const [message, setMessage] = useState("");

  const toSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const load = async () => {
    const [analyticsRes, auditRes, gamesRes, overviewRes] = await Promise.all([
      fetch("/api/admin/analytics"),
      fetch("/api/admin/audit"),
      fetch("/api/games"),
      fetch("/api/admin/overview"),
    ]);
    const analyticsJson = (await analyticsRes.json()) as { metrics?: DashboardData["metrics"] };
    const auditJson = (await auditRes.json()) as { logs?: DashboardData["logs"] };
    const gamesJson = (await gamesRes.json()) as { games?: DashboardData["games"] };
    const overviewJson = (await overviewRes.json()) as {
      users?: DashboardData["users"];
      tournaments?: DashboardData["tournaments"];
      matches?: DashboardData["matches"];
    };
    setData({
      metrics: analyticsJson.metrics,
      logs: auditJson.logs,
      games: gamesJson.games,
      users: overviewJson.users,
      tournaments: overviewJson.tournaments,
      matches: overviewJson.matches,
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const createGame = async () => {
    setMessage("");
    const name = state.gameName.trim();
    const slug = (state.gameSlug.trim() || toSlug(name)).toLowerCase();
    if (name.length < 2) {
      setMessage("Название игры слишком короткое");
      return;
    }
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      setMessage("Slug должен содержать только a-z, 0-9 и дефис");
      return;
    }

    const response = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        description: `${name} esports discipline`,
      }),
    });
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setMessage(json.error ?? "Ошибка создания игры");
      return;
    }
    setMessage("Игра создана");
    setState((prev) => ({ ...prev, gameName: "", gameSlug: "" }));
    await load();
  };

  const createNews = async () => {
    setMessage("");
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "news",
        title: state.newsTitle,
        body: state.newsBody,
      }),
    });
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setMessage(json.error ?? "Ошибка создания новости");
      return;
    }
    setMessage("Новость опубликована");
    setState((prev) => ({ ...prev, newsTitle: "", newsBody: "" }));
    await load();
  };

  const updateUser = async () => {
    if (!state.userId) return;
    setMessage("");
    const response = await fetch(`/api/admin/users/${state.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: state.userRole,
        isBanned: state.userBan,
        banReason: state.userBan ? "Manual moderation" : undefined,
      }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(json.error ?? "Ошибка обновления пользователя");
      return;
    }
    setMessage("Пользователь обновлен");
    await load();
  };

  const updateMatch = async () => {
    if (!state.matchId) return;
    setMessage("");
    const scoreA = Number(state.matchScoreA);
    const scoreB = Number(state.matchScoreB);
    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
      setMessage("Укажи корректный счет");
      return;
    }
    const response = await fetch(`/api/admin/matches/${state.matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scoreA,
        scoreB,
        status: "FINISHED",
        winnerLabel: state.matchWinnerLabel,
      }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(json.error ?? "Ошибка обновления матча");
      return;
    }
    setMessage("Матч обновлен");
    await load();
  };

  return (
    <div className="w-full space-y-6">
      <h1 className="text-3xl font-black uppercase tracking-[0.14em] text-[#14ffec]">Admin Control</h1>
      {message && <p className="rounded border border-[#323232] bg-[#323232] p-2 text-sm text-[#14ffec]">{message}</p>}

      <section className="grid gap-3 md:grid-cols-3">
        <Metric title="Пользователи" value={data.metrics?.usersTotal ?? 0} />
        <Metric title="Активные турниры" value={data.metrics?.activeTournaments ?? 0} />
        <Metric title="Конверсия заявок (%)" value={data.metrics?.conversionRate ?? 0} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="surface rounded-xl p-4">
          <h2 className="text-lg font-bold">Создать игру</h2>
          <div className="mt-3 space-y-2">
            <input
              className="input-base"
              value={state.gameName}
              onChange={(event) => setState((prev) => ({ ...prev, gameName: event.target.value }))}
              placeholder="Counter-Strike 2"
            />
            <input
              className="input-base"
              value={state.gameSlug}
              onChange={(event) => setState((prev) => ({ ...prev, gameSlug: event.target.value }))}
              onBlur={() =>
                setState((prev) => ({
                  ...prev,
                  gameSlug: prev.gameSlug.trim() || toSlug(prev.gameName),
                }))
              }
              placeholder="counter-strike-2"
            />
            <button type="button" className="button-primary w-full" onClick={createGame}>
              Сохранить игру
            </button>
          </div>
          <ul className="mt-4 space-y-1 text-sm text-zinc-300">
            {(data.games ?? []).map((game) => (
              <li key={game.id} className="rounded bg-[#323232] px-2 py-1">
                {game.name} ({game.slug})
              </li>
            ))}
          </ul>
        </article>

        <article className="surface rounded-xl p-4">
          <h2 className="text-lg font-bold">Публикация новости</h2>
          <div className="mt-3 space-y-2">
            <input
              className="input-base"
              value={state.newsTitle}
              onChange={(event) => setState((prev) => ({ ...prev, newsTitle: event.target.value }))}
              placeholder="Финал сезона уже в эту субботу"
            />
            <textarea
              className="input-base min-h-28"
              value={state.newsBody}
              onChange={(event) => setState((prev) => ({ ...prev, newsBody: event.target.value }))}
              placeholder="Описание события..."
            />
            <button type="button" className="button-primary w-full" onClick={createNews}>
              Опубликовать
            </button>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="surface rounded-xl p-4">
          <h2 className="text-lg font-bold">Роли и бан пользователей</h2>
          <div className="mt-3 space-y-2">
            <select
              className="input-base"
              aria-label="Выбор пользователя"
              value={state.userId}
              onChange={(event) => setState((prev) => ({ ...prev, userId: event.target.value }))}
            >
              <option value="">Выберите пользователя</option>
              {(data.users ?? []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.role}) {user.isBanned ? "[BANNED]" : ""}
                </option>
              ))}
            </select>
            <select
              className="input-base"
              aria-label="Роль пользователя"
              value={state.userRole}
              onChange={(event) => setState((prev) => ({ ...prev, userRole: event.target.value }))}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPERADMIN">SUPERADMIN</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={state.userBan}
                onChange={(event) => setState((prev) => ({ ...prev, userBan: event.target.checked }))}
              />
              Заблокировать
            </label>
            <button type="button" className="button-primary w-full" onClick={updateUser}>
              Обновить пользователя
            </button>
          </div>
        </article>

        <article className="surface rounded-xl p-4">
          <h2 className="text-lg font-bold">Оперативное обновление матча</h2>
          <div className="mt-3 space-y-2">
            <select
              className="input-base"
              aria-label="Выбор матча"
              value={state.matchId}
              onChange={(event) => setState((prev) => ({ ...prev, matchId: event.target.value }))}
            >
              <option value="">Выберите матч</option>
              {(data.matches ?? []).map((match) => (
                <option key={match.id} value={match.id}>
                  {match.id.slice(-8)} ({match.status})
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input-base"
                value={state.matchScoreA}
                onChange={(event) => setState((prev) => ({ ...prev, matchScoreA: event.target.value }))}
                placeholder="Score A"
                inputMode="numeric"
              />
              <input
                className="input-base"
                value={state.matchScoreB}
                onChange={(event) => setState((prev) => ({ ...prev, matchScoreB: event.target.value }))}
                placeholder="Score B"
                inputMode="numeric"
              />
            </div>
            <select
              className="input-base"
              aria-label="Выбор победителя матча"
              value={state.matchWinnerLabel}
              onChange={(event) => setState((prev) => ({ ...prev, matchWinnerLabel: event.target.value }))}
            >
              <option value="Participant A">Победитель: Participant A</option>
              <option value="Participant B">Победитель: Participant B</option>
            </select>
            <button type="button" className="button-primary w-full" onClick={updateMatch}>
              Завершить матч и объявить победителя
            </button>
          </div>
        </article>
      </section>

      <section className="surface rounded-xl p-4">
        <h2 className="text-lg font-bold">Audit Log</h2>
        <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1 text-sm">
          {(data.logs ?? []).map((log) => (
            <div key={log.id} className="rounded border border-[#323232] bg-[#323232] p-2">
              <p className="font-semibold text-zinc-200">
                {log.action} / {log.entity}
              </p>
              <p className="text-zinc-400">
                {log.actor.username} - {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <article className="surface rounded-xl p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-[#14ffec]">{value}</p>
    </article>
  );
}
