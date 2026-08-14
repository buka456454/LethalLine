"use client";

import { useCallback, useEffect, useState } from "react";
import { getGameCoverDecor, getGameCoverUrl } from "@/lib/gameAssets";
import CountUp from "@/components/motion/CountUp";

type UserRole = "USER" | "ADMIN" | "SUPERADMIN" | "JOURNALIST" | "COMMENTATOR";

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
  users?: Array<{ id: string; username: string; email: string; role: UserRole; isBanned: boolean }>;
  tournaments?: Array<{ id: string; title: string }>;
  matches?: Array<{
    id: string;
    status: "SCHEDULED" | "LIVE" | "FINISHED";
    participantA: string | null;
    participantB: string | null;
    tournament: { id: string; title: string };
  }>;
  streamComment?: {
    text: string;
    updatedAt: string;
  } | null;
};

type AdminPanelProps = {
  isOwner: boolean;
  canManageNews: boolean;
  canManageStreamComment: boolean;
};

export default function AdminPanel({ isOwner, canManageNews, canManageStreamComment }: AdminPanelProps) {
  const isNewsOnlyRole = !isOwner && canManageNews && !canManageStreamComment;
  const [data, setData] = useState<DashboardData>({});
  const [state, setState] = useState({
    gameName: "",
    gameSlug: "",
    newsTitle: "",
    newsBody: "",
    newsImageUrl: "",
    userId: "",
    userRole: "USER" as UserRole,
    userBan: false,
    userDeleteConfirm: "",
    streamCommentText: "",
    matchId: "",
    matchTournamentId: "",
    matchScoreA: "1",
    matchScoreB: "0",
    matchWinnerLabel: "",
  });
  const [message, setMessage] = useState("");
  const selectedUser = (data.users ?? []).find((user) => user.id === state.userId) ?? null;

  const toSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const load = useCallback(async () => {
    if (isNewsOnlyRole) {
      setData({
        metrics: undefined,
        logs: [],
        games: [],
        users: [],
        tournaments: [],
        matches: [],
        streamComment: null,
      });
      setState((prev) => ({ ...prev, streamCommentText: "" }));
      return;
    }

    if (isOwner) {
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
        streamComment?: DashboardData["streamComment"];
      };
      setData({
        metrics: analyticsJson.metrics,
        logs: auditJson.logs,
        games: gamesJson.games,
        users: overviewJson.users,
        tournaments: overviewJson.tournaments,
        matches: overviewJson.matches,
        streamComment: overviewJson.streamComment ?? null,
      });
      setState((prev) => ({ ...prev, streamCommentText: overviewJson.streamComment?.text ?? "" }));
      return;
    }

    const overviewRes = await fetch("/api/admin/overview");
    const overviewJson = (await overviewRes.json()) as {
      streamComment?: DashboardData["streamComment"];
    };
    setData({
      metrics: undefined,
      logs: [],
      games: [],
      users: [],
      tournaments: [],
      matches: [],
      streamComment: overviewJson.streamComment ?? null,
    });
    setState((prev) => ({ ...prev, streamCommentText: overviewJson.streamComment?.text ?? "" }));
  }, [isOwner, isNewsOnlyRole]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

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
        imageUrl: state.newsImageUrl || undefined,
      }),
    });
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setMessage(json.error ?? "Ошибка создания новости");
      return;
    }
    setMessage("Новость опубликована");
    setState((prev) => ({ ...prev, newsTitle: "", newsBody: "", newsImageUrl: "" }));
    await load();
  };

  const uploadNewsImage = async (file: File | undefined) => {
    if (!file) return;
    setMessage("");

    const formData = new FormData();
    formData.set("image", file);
    const response = await fetch("/api/uploads/news-image", {
      method: "POST",
      body: formData,
    });
    const body = (await response.json()) as { imageUrl?: string; error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "Ошибка загрузки изображения");
      return;
    }

    setState((prev) => ({ ...prev, newsImageUrl: body.imageUrl ?? "" }));
    setMessage("Изображение загружено");
  };

  const updateStreamComment = async () => {
    const text = state.streamCommentText.trim();
    if (text.length < 10) {
      setMessage("Комментарий должен быть минимум 10 символов");
      return;
    }

    setMessage("");
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "stream-comment",
        streamCommentText: text,
      }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "Ошибка сохранения комментария");
      return;
    }

    setMessage("Комментарий к стриму обновлен");
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

  const deleteUser = async () => {
    if (!selectedUser) return;
    setMessage("");

    const confirmValue = state.userDeleteConfirm.trim();
    if (confirmValue !== selectedUser.username) {
      setMessage("Для удаления введи точный ник пользователя");
      return;
    }

    const accepted = window.confirm(
      `Удалить аккаунт ${selectedUser.username}? Это действие необратимо и удалит связанные данные пользователя.`,
    );
    if (!accepted) return;

    const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
      method: "DELETE",
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(json.error ?? "Ошибка удаления пользователя");
      return;
    }

    setMessage(`Аккаунт ${selectedUser.username} удален`);
    setState((prev) => ({
      ...prev,
      userId: "",
      userRole: "USER",
      userBan: false,
      userDeleteConfirm: "",
    }));
    await load();
  };

  const updateMatch = async () => {
    if (!state.matchId) return;
    if (!state.matchWinnerLabel) {
      setMessage("Выбери победителя");
      return;
    }
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

  const matchesByTournament = (data.matches ?? []).filter((match) =>
    state.matchTournamentId ? match.tournament.id === state.matchTournamentId : true,
  );
  const selectedMatch = (data.matches ?? []).find((m) => m.id === state.matchId) ?? null;
  const newsPublishSection = canManageNews ? (
    <section>
      <article className="ll-frame p-4">
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
          <input
            className="input-base"
            value={state.newsImageUrl}
            onChange={(event) => setState((prev) => ({ ...prev, newsImageUrl: event.target.value }))}
            placeholder="URL изображения (заполнится автоматически после загрузки)"
          />
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="block w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-[#323232] file:px-2 file:py-1 file:text-zinc-200"
            onChange={(event) => void uploadNewsImage(event.target.files?.[0])}
          />
          <button type="button" className="button-primary w-full" onClick={createNews}>
            Опубликовать
          </button>
        </div>
      </article>
    </section>
  ) : null;

  return (
    <div className="w-full space-y-6">
      {message && <p className="ll-frame p-3 text-sm text-[#14ffec]">{message}</p>}

      {isNewsOnlyRole && newsPublishSection}

      {isOwner && (
        <section className="grid gap-3 md:grid-cols-4">
          <Metric title="// users" value={data.metrics?.usersTotal ?? 0} />
          <Metric title="// cups" value={data.metrics?.activeTournaments ?? 0} />
          <Metric title="// live" value={data.metrics?.matchesLive ?? 0} />
          <Metric title="// conv %" value={data.metrics?.conversionRate ?? 0} />
        </section>
      )}

      {isOwner && (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="ll-frame p-4">
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
              {(data.games ?? []).map((game) => {
                const cover = getGameCoverUrl(game.slug);
                const decor = getGameCoverDecor(game.slug);
                return (
                  <li key={game.id} className="flex items-center gap-2 rounded bg-[#323232] px-2 py-1">
                    {cover ? (
                      <span
                        className={`relative inline-flex h-8 w-14 shrink-0 overflow-hidden rounded ${decor.stripRingClass}`}
                      >
                        <span className={`absolute inset-0 ${decor.panelBgClass}`} aria-hidden />
                        <img
                          src={cover}
                          alt=""
                          width={56}
                          height={32}
                          className="relative z-[1] h-full w-full object-cover brightness-[0.88]"
                        />
                      </span>
                    ) : null}
                    <span>
                      {game.name} ({game.slug})
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>
        </section>
      )}

      {!isNewsOnlyRole && newsPublishSection}

      {canManageStreamComment && (
        <section>
          <article className="ll-frame p-4">
            <h2 className="text-lg font-bold">Комментарий к стриму</h2>
            <p className="mt-2 text-sm text-zinc-300">
              Этот текст показывается прямо под плеером на главной странице как официальный комментарий к текущей трансляции.
            </p>
            <textarea
              className="input-base mt-3 min-h-28"
              value={state.streamCommentText}
              onChange={(event) => setState((prev) => ({ ...prev, streamCommentText: event.target.value }))}
              placeholder="Например: Сегодня в эфире разбор финала, начнем через 10 минут."
            />
            <button type="button" className="button-primary mt-3 w-full" onClick={updateStreamComment}>
              Сохранить комментарий
            </button>
          </article>
        </section>
      )}

      {isOwner && (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="ll-frame p-4">
          <h2 className="text-lg font-bold">Роли и бан пользователей</h2>
          <div className="mt-3 space-y-2">
            <select
              className="input-base"
              aria-label="Выбор пользователя"
              value={state.userId}
              onChange={(event) =>
                setState((prev) => {
                  const nextUserId = event.target.value;
                  const found = (data.users ?? []).find((user) => user.id === nextUserId);
                  return {
                    ...prev,
                    userId: nextUserId,
                    userRole: found?.role ?? "USER",
                    userBan: found?.isBanned ?? false,
                    userDeleteConfirm: "",
                  };
                })
              }
            >
              <option value="">Выберите пользователя</option>
              {(data.users ?? []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.email}) [{user.role}] {user.isBanned ? "[BANNED]" : ""}
                </option>
              ))}
            </select>
            <select
              className="input-base"
              aria-label="Роль пользователя"
              value={state.userRole}
              onChange={(event) => setState((prev) => ({ ...prev, userRole: event.target.value as UserRole }))}
            >
              <option value="USER">USER</option>
              <option value="JOURNALIST">JOURNALIST</option>
              <option value="COMMENTATOR">COMMENTATOR</option>
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
            {selectedUser && (
              <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 p-3">
                <p className="text-sm font-semibold text-red-300">Удаление аккаунта</p>
                <p className="mt-1 text-xs text-zinc-300">
                  Чтобы удалить <span className="font-semibold text-zinc-100">{selectedUser.username}</span>, введи его ник
                  ниже.
                </p>
                <input
                  className="input-base mt-2"
                  value={state.userDeleteConfirm}
                  onChange={(event) => setState((prev) => ({ ...prev, userDeleteConfirm: event.target.value }))}
                  placeholder={selectedUser.username}
                />
                <button
                  type="button"
                  className="mt-2 w-full rounded-lg border border-red-400/60 bg-red-600/80 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={deleteUser}
                  disabled={state.userDeleteConfirm.trim() !== selectedUser.username}
                >
                  Удалить аккаунт
                </button>
              </div>
            )}
          </div>
          </article>

          <article className="ll-frame p-4">
          <h2 className="text-lg font-bold">Управление матчем</h2>
          <div className="mt-3 space-y-2">
            <select
              className="input-base"
              aria-label="Выбор турнира"
              value={state.matchTournamentId}
              onChange={(event) =>
                setState((prev) => ({ ...prev, matchTournamentId: event.target.value, matchId: "", matchWinnerLabel: "" }))
              }
            >
              <option value="">Выберите турнир</option>
              {(data.tournaments ?? []).map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.title}
                </option>
              ))}
            </select>
            <select
              className="input-base"
              aria-label="Выбор матча"
              value={state.matchId}
              onChange={(event) =>
                setState((prev) => {
                  const nextId = event.target.value;
                  const found = (data.matches ?? []).find((m) => m.id === nextId);
                  return {
                    ...prev,
                    matchId: nextId,
                    matchWinnerLabel: found?.participantA ?? "",
                    matchScoreA: "1",
                    matchScoreB: "0",
                  };
                })
              }
            >
              <option value="">Выберите матч</option>
              {matchesByTournament.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.id.slice(-8)} ({match.status}) {match.participantA ?? "TBD"} vs {match.participantB ?? "TBD"}
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
              {selectedMatch?.participantA && <option value={selectedMatch.participantA}>Победитель: {selectedMatch.participantA}</option>}
              {selectedMatch?.participantB && <option value={selectedMatch.participantB}>Победитель: {selectedMatch.participantB}</option>}
            </select>
            <button type="button" className="button-primary w-full" onClick={updateMatch}>
              Сохранить результат матча
            </button>
          </div>
          </article>
        </section>
      )}

      {isOwner && (
        <section className="ll-frame p-4">
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
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <article className="ll-frame ll-frame--brackets ll-hover-lift p-4">
      <p className="ll-kicker">{title}</p>
      <p className="mt-2 text-3xl font-black text-[#14ffec]">
        <CountUp value={value} />
      </p>
    </article>
  );
}
