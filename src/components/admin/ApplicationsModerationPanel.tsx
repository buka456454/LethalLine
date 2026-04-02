"use client";

import { useEffect, useMemo, useState } from "react";
import PublicImage from "@/components/ui/PublicImage";

type RegistrationItem = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user: { id: string; username: string };
  tournament: { id: string; title: string };
};

type TeamApplicationItem = {
  id: string;
  teamName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  paymentStatus?: "UNPAID" | "PENDING" | "PAID" | "REFUND_PENDING" | "REFUNDED" | "REFUND_FAILED";
  createdAt: string;
  captain: { id: string; username: string };
  tournament: { id: string; title: string; entryFeeMinor?: number; currency?: "RUB" };
  members: Array<{ id: string; username: string; isCaptain: boolean; linkedUserId: string | null }>;
};

type ExperienceVerificationItem = {
  id: string;
  experienceVerificationStatus: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";
  experienceProofImageUrl: string | null;
  experienceProofSubmittedAt: string | null;
  experienceVerificationReviewedAt: string | null;
  experienceVerificationNote: string | null;
  user: { id: string; username: string };
  game: { id: string; name: string; slug: string };
};

type ApplicationsPayload = {
  registrations: RegistrationItem[];
  teamApplications: TeamApplicationItem[];
  experienceVerifications: ExperienceVerificationItem[];
};

export default function ApplicationsModerationPanel() {
  const [data, setData] = useState<ApplicationsPayload>({ registrations: [], teamApplications: [], experienceVerifications: [] });
  const [query, setQuery] = useState("");
  const [onlyPending, setOnlyPending] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [rejectInstructions, setRejectInstructions] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/admin/applications");
    const body = (await response.json()) as ApplicationsPayload & { error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "Не удалось загрузить заявки");
      setLoading(false);
      return;
    }
    setData({
      registrations: body.registrations ?? [],
      teamApplications: body.teamApplications ?? [],
      experienceVerifications: body.experienceVerifications ?? [],
    });
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const filteredRegistrations = useMemo(() => {
    return data.registrations.filter((item) => {
      if (onlyPending && item.status !== "PENDING") return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return item.user.username.toLowerCase().includes(q) || item.tournament.title.toLowerCase().includes(q);
    });
  }, [data.registrations, onlyPending, query]);

  const filteredTeamApplications = useMemo(() => {
    return data.teamApplications.filter((item) => {
      if (onlyPending && item.status !== "PENDING") return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        item.teamName.toLowerCase().includes(q) ||
        item.captain.username.toLowerCase().includes(q) ||
        item.tournament.title.toLowerCase().includes(q)
      );
    });
  }, [data.teamApplications, onlyPending, query]);

  const filteredExperienceVerifications = useMemo(() => {
    return data.experienceVerifications.filter((item) => {
      if (onlyPending && item.experienceVerificationStatus !== "PENDING") return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return item.user.username.toLowerCase().includes(q) || item.game.name.toLowerCase().includes(q);
    });
  }, [data.experienceVerifications, onlyPending, query]);

  const updateRegistration = async (registrationId: string, status: "APPROVED" | "REJECTED") => {
    const response = await fetch(`/api/admin/registrations/${registrationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "Не удалось обновить индивидуальную заявку");
      return;
    }
    setMessage(`Индивидуальная заявка ${status === "APPROVED" ? "одобрена" : "отклонена"}`);
    await load();
  };

  const updateTeamApplication = async (teamApplicationId: string, status: "APPROVED" | "REJECTED") => {
    const response = await fetch(`/api/admin/team-applications/${teamApplicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "Не удалось обновить командную заявку");
      return;
    }
    setMessage(`Командная заявка ${status === "APPROVED" ? "одобрена" : "отклонена"}`);
    await load();
  };

  const updateExperienceVerification = async (profileId: string, status: "APPROVED" | "REJECTED") => {
    const note = rejectInstructions[profileId]?.trim() ?? "";
    if (status === "REJECTED" && !note) {
      setMessage("Для отклонения заявки на подтверждение опыта заполните инструкцию для игрока.");
      return;
    }

    const response = await fetch(`/api/admin/experience-verifications/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        ...(status === "REJECTED" ? { note } : {}),
      }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "Не удалось обновить заявку на подтверждение опыта");
      return;
    }
    setMessage(`Подтверждение опыта ${status === "APPROVED" ? "одобрено" : "отклонено"}`);
    await load();
  };

  return (
    <div className="w-full space-y-5">
      <div className="rounded-xl border border-[#323232] bg-[#212121] p-4">
        <h1 className="text-2xl font-black uppercase tracking-[0.1em] text-[#14ffec]">Модерация заявок</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Отдельный центр: принимаем/отклоняем индивидуальные и командные заявки.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            className="input-base max-w-sm"
            placeholder="Поиск по игроку, команде или турниру"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <label className="flex items-center gap-2 rounded border border-[#323232] bg-[#323232] px-3 py-2 text-sm text-zinc-300">
            <input type="checkbox" checked={onlyPending} onChange={(event) => setOnlyPending(event.target.checked)} />
            Только PENDING
          </label>
          <button type="button" className="button-primary" onClick={() => void load()} disabled={loading}>
            {loading ? "Обновление..." : "Обновить"}
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-[#14ffec]">{message}</p>}
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="surface rounded-xl p-4">
          <h2 className="text-lg font-bold text-zinc-100">Индивидуальные заявки</h2>
          <div className="mt-3 space-y-2">
            {filteredRegistrations.length === 0 && <p className="text-sm text-zinc-400">Заявок не найдено.</p>}
            {filteredRegistrations.map((item) => (
              <div key={item.id} className="rounded border border-[#323232] bg-[#323232] p-3">
                <p className="text-sm text-zinc-100">
                  <span className="font-semibold">{item.user.username}</span> {"->"} {item.tournament.title}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Статус: {item.status} | {new Date(item.createdAt).toLocaleString("ru-RU")}
                </p>
                <div className="mt-2 flex gap-2">
                  <button type="button" className="button-primary" onClick={() => void updateRegistration(item.id, "APPROVED")}>
                    Принять
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[#323232] bg-[#212121] px-4 py-2 text-sm text-zinc-200 hover:text-[#14ffec]"
                    onClick={() => void updateRegistration(item.id, "REJECTED")}
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface rounded-xl p-4">
          <h2 className="text-lg font-bold text-zinc-100">Командные заявки</h2>
          <div className="mt-3 space-y-2">
            {filteredTeamApplications.length === 0 && <p className="text-sm text-zinc-400">Заявок не найдено.</p>}
            {filteredTeamApplications.map((item) => (
              <div key={item.id} className="rounded border border-[#323232] bg-[#323232] p-3">
                <p className="text-sm text-zinc-100">
                  <span className="font-semibold">{item.teamName}</span> ({item.captain.username}) {"->"} {item.tournament.title}
                </p>
                <p className="mt-1 text-xs text-zinc-300">Состав: {item.members.map((member) => member.username).join(", ")}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Статус: {item.status} | {new Date(item.createdAt).toLocaleString("ru-RU")}
                </p>
                {(item.tournament.entryFeeMinor ?? 0) > 0 && (
                  <p className="mt-1 text-xs text-zinc-400">
                    Взнос: {((item.tournament.entryFeeMinor ?? 0) / 100).toFixed(2)} {item.tournament.currency ?? "RUB"} | Оплата:{" "}
                    <span className="text-zinc-200">{item.paymentStatus ?? "UNPAID"}</span>
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => void updateTeamApplication(item.id, "APPROVED")}
                    disabled={(item.tournament.entryFeeMinor ?? 0) > 0 && (item.paymentStatus ?? "UNPAID") !== "PAID"}
                    title={(item.tournament.entryFeeMinor ?? 0) > 0 && (item.paymentStatus ?? "UNPAID") !== "PAID" ? "Нужна оплата (PAID)" : undefined}
                  >
                    Принять
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[#323232] bg-[#212121] px-4 py-2 text-sm text-zinc-200 hover:text-[#14ffec]"
                    onClick={() => void updateTeamApplication(item.id, "REJECTED")}
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface rounded-xl p-4">
          <h2 className="text-lg font-bold text-zinc-100">Подтверждение опыта</h2>
          <div className="mt-3 space-y-2">
            {filteredExperienceVerifications.length === 0 && <p className="text-sm text-zinc-400">Заявок не найдено.</p>}
            {filteredExperienceVerifications.map((item) => (
              <div key={item.id} className="rounded border border-[#323232] bg-[#323232] p-3">
                <p className="text-sm text-zinc-100">
                  <span className="font-semibold">{item.user.username}</span> | {item.game.name}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Статус: {item.experienceVerificationStatus} |{" "}
                  {item.experienceProofSubmittedAt ? new Date(item.experienceProofSubmittedAt).toLocaleString("ru-RU") : "дата неизвестна"}
                </p>
                {item.experienceProofImageUrl ? (
                  <a href={item.experienceProofImageUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                    <PublicImage
                      src={item.experienceProofImageUrl}
                      alt={`Proof ${item.user.username} / ${item.game.name}`}
                      width={520}
                      height={220}
                      className="h-36 w-full rounded border border-[#454545] object-cover"
                    />
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-zinc-400">Скриншот не найден.</p>
                )}
                {item.experienceVerificationNote ? (
                  <p className="mt-2 text-xs text-zinc-300">Текущая инструкция: {item.experienceVerificationNote}</p>
                ) : null}
                <textarea
                  className="input-base mt-2 min-h-16"
                  placeholder="Инструкция игроку при отклонении (обязательно)"
                  value={rejectInstructions[item.id] ?? ""}
                  onChange={(event) => setRejectInstructions((prev) => ({ ...prev, [item.id]: event.target.value }))}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => void updateExperienceVerification(item.id, "APPROVED")}
                  >
                    Принять
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[#323232] bg-[#212121] px-4 py-2 text-sm text-zinc-200 hover:text-[#14ffec]"
                    onClick={() => void updateExperienceVerification(item.id, "REJECTED")}
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
