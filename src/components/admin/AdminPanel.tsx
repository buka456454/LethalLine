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
    tournamentTitle: "",
    tournamentSlug: "",
    tournamentGameId: "",
    tournamentDescription: "",
    tournamentFormat: "SINGLE_ELIMINATION",
    tournamentParticipationType: "TEAM",
    tournamentMaxParticipants: "16",
    tournamentMaxTeams: "16",
    tournamentStartsAt: "",
    tournamentEndsAt: "",
    tournamentStatus: "REGISTRATION_OPEN",
    tournamentIsPublished: true,
    tournamentPrizePool: "",
    tournamentWinnerReward: "",
    tournamentRules: "",
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

  const createTournament = async () => {
    setMessage("");
    const title = state.tournamentTitle.trim();
    const slug = (state.tournamentSlug.trim() || toSlug(title)).toLowerCase();
    const startsAtValue = state.tournamentStartsAt
      ? new Date(state.tournamentStartsAt)
      : new Date(Date.now() + 1000 * 60 * 60 * 24);
    const endsAtValue = state.tournamentEndsAt ? new Date(state.tournamentEndsAt) : null;
    const maxParticipants = Number(
      state.tournamentParticipationType === "TEAM" ? state.tournamentMaxTeams : state.tournamentMaxParticipants,
    );

    if (title.length < 4) {
      setMessage("Название турнира должно быть минимум 4 символа");
      return;
    }
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      setMessage("Slug турнира должен содержать только a-z, 0-9 и дефис");
      return;
    }
    if (!state.tournamentGameId) {
      setMessage("Выбери игру для турнира");
      return;
    }
    if (!Number.isInteger(maxParticipants) || maxParticipants < 2 || maxParticipants > 512) {
      setMessage("Максимум участников/команд должен быть от 2 до 512");
      return;
    }
    if (Number.isNaN(startsAtValue.getTime())) {
      setMessage("Укажи корректную дату старта");
      return;
    }
    if (endsAtValue && Number.isNaN(endsAtValue.getTime())) {
      setMessage("Укажи корректную дату окончания");
      return;
    }
    if (endsAtValue && endsAtValue <= startsAtValue) {
      setMessage("Дата окончания должна быть позже даты старта");
      return;
    }

    const generatedRules = [
      state.tournamentRules.trim(),
      `Тип участия: ${state.tournamentParticipationType === "TEAM" ? "Команды" : "Одиночные игроки"}`,
      state.tournamentPrizePool.trim() ? `Призовой фонд: ${state.tournamentPrizePool.trim()}` : "",
      state.tournamentWinnerReward.trim() ? `Награда победителю: ${state.tournamentWinnerReward.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        description: state.tournamentDescription.trim() || `${title} official bracket`,
        format: state.tournamentFormat,
        status: state.tournamentStatus,
        isPublished: state.tournamentIsPublished,
        maxParticipants,
        startsAt: startsAtValue.toISOString(),
        endsAt: endsAtValue ? endsAtValue.toISOString() : undefined,
        rules: generatedRules || undefined,
        gameId: state.tournamentGameId,
      }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(json.error ?? "Ошибка создания турнира");
      return;
    }
    setMessage("Турнир создан");
    setState((prev) => ({
      ...prev,
      tournamentTitle: "",
      tournamentSlug: "",
      tournamentDescription: "",
      tournamentPrizePool: "",
      tournamentWinnerReward: "",
      tournamentRules: "",
      tournamentEndsAt: "",
    }));
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

      <section className="grid gap-4 lg:grid-cols-1">
        <article className="surface rounded-xl p-4">
          <h2 className="text-lg font-bold">Создать турнир (расширенные настройки)</h2>
          <div className="mt-3 space-y-2">
            <input
              className="input-base"
              value={state.tournamentTitle}
              onChange={(event) => setState((prev) => ({ ...prev, tournamentTitle: event.target.value }))}
              placeholder="Spring Clash 2026"
            />
            <input
              className="input-base"
              value={state.tournamentSlug}
              onChange={(event) => setState((prev) => ({ ...prev, tournamentSlug: event.target.value }))}
              onBlur={() =>
                setState((prev) => ({
                  ...prev,
                  tournamentSlug: prev.tournamentSlug.trim() || toSlug(prev.tournamentTitle),
                }))
              }
              placeholder="spring-clash-2026"
            />
            <textarea
              className="input-base min-h-20"
              value={state.tournamentDescription}
              onChange={(event) => setState((prev) => ({ ...prev, tournamentDescription: event.target.value }))}
              placeholder="Короткое описание турнира"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                className="input-base"
                aria-label="Формат турнира"
                value={state.tournamentFormat}
                onChange={(event) => setState((prev) => ({ ...prev, tournamentFormat: event.target.value }))}
              >
                <option value="SINGLE_ELIMINATION">Single Elimination</option>
                <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                <option value="ROUND_ROBIN">Round Robin</option>
              </select>
              <select
                className="input-base"
                aria-label="Тип участия"
                value={state.tournamentParticipationType}
                onChange={(event) => setState((prev) => ({ ...prev, tournamentParticipationType: event.target.value }))}
              >
                <option value="TEAM">Командный</option>
                <option value="SOLO">Одиночный</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input-base"
                value={state.tournamentMaxTeams}
                onChange={(event) => setState((prev) => ({ ...prev, tournamentMaxTeams: event.target.value }))}
                placeholder="Макс. команд (например 16)"
                inputMode="numeric"
              />
              <input
                className="input-base"
                value={state.tournamentMaxParticipants}
                onChange={(event) => setState((prev) => ({ ...prev, tournamentMaxParticipants: event.target.value }))}
                placeholder="Макс. игроков (например 64)"
                inputMode="numeric"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input-base"
                type="datetime-local"
                aria-label="Дата и время старта турнира"
                value={state.tournamentStartsAt}
                onChange={(event) => setState((prev) => ({ ...prev, tournamentStartsAt: event.target.value }))}
              />
              <input
                className="input-base"
                type="datetime-local"
                aria-label="Дата и время окончания турнира"
                value={state.tournamentEndsAt}
                onChange={(event) => setState((prev) => ({ ...prev, tournamentEndsAt: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="input-base"
                aria-label="Статус турнира"
                value={state.tournamentStatus}
                onChange={(event) => setState((prev) => ({ ...prev, tournamentStatus: event.target.value }))}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="REGISTRATION_OPEN">REGISTRATION_OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
              <label className="flex items-center gap-2 rounded border border-[#323232] bg-[#212121] px-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={state.tournamentIsPublished}
                  onChange={(event) => setState((prev) => ({ ...prev, tournamentIsPublished: event.target.checked }))}
                />
                Опубликовать сразу
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input-base"
                value={state.tournamentPrizePool}
                onChange={(event) => setState((prev) => ({ ...prev, tournamentPrizePool: event.target.value }))}
                placeholder="Призовой фонд (например 100 000 RUB)"
              />
              <input
                className="input-base"
                value={state.tournamentWinnerReward}
                onChange={(event) => setState((prev) => ({ ...prev, tournamentWinnerReward: event.target.value }))}
                placeholder="Награда победителю"
              />
            </div>
            <textarea
              className="input-base min-h-28"
              value={state.tournamentRules}
              onChange={(event) => setState((prev) => ({ ...prev, tournamentRules: event.target.value }))}
              placeholder="Правила турнира (карты, bo3/bo5, штрафы и т.д.)"
            />
            <select
              className="input-base"
              aria-label="Выбор игры для турнира"
              value={state.tournamentGameId}
              onChange={(event) => setState((prev) => ({ ...prev, tournamentGameId: event.target.value }))}
            >
              <option value="">Выберите игру</option>
              {(data.games ?? []).map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
            <button type="button" className="button-primary w-full" onClick={createTournament}>
              Создать турнир
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
