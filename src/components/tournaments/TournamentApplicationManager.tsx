"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { requiredTeammates } from "@/lib/tournament";
import { getApplicationStatusLabel } from "@/lib/tournamentStatus";
import ParticipantAvatar from "@/components/ui/ParticipantAvatar";
import TeamRosterSlots, { type RosterCaptain, type RosterFriend } from "@/components/tournaments/TeamRosterSlots";

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "не оплачен",
  PENDING: "оплата обрабатывается",
  PAID: "оплачен",
  REFUND_PENDING: "возврат в обработке",
  REFUNDED: "возвращён",
  REFUND_FAILED: "возврат не прошёл",
};

type TeamApplicationPreview = {
  id: string;
  teamName: string;
  teamLogoUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  paymentStatus?: "UNPAID" | "PENDING" | "PAID" | "REFUND_PENDING" | "REFUNDED" | "REFUND_FAILED";
  members: Array<{ id: string; username: string; isCaptain: boolean }>;
};

export default function TournamentApplicationManager({
  tournamentId,
  teamSize,
  entryFeeMinor,
  currency: _currency,
  requiresVerifiedExperience,
  experienceVerified,
  existingTeamApplication,
  canSubmitApplication,
  captain,
}: {
  tournamentId: string;
  teamSize: 1 | 2 | 5;
  entryFeeMinor: number;
  currency: "RUB";
  requiresVerifiedExperience: boolean;
  experienceVerified: boolean;
  existingTeamApplication: TeamApplicationPreview | null;
  canSubmitApplication: boolean;
  captain: RosterCaptain;
}) {
  const router = useRouter();
  const isSolo = teamSize === 1;
  const required = requiredTeammates(teamSize);

  const initialTeammates = useMemo(() => {
    const empty = Array.from({ length: required }, () => null as RosterFriend | null);
    if (!existingTeamApplication || isSolo) return empty;
    const others = existingTeamApplication.members.filter((member) => !member.isCaptain);
    return empty.map((_, index) => {
      const member = others[index];
      if (!member) return null;
      return {
        id: member.id,
        username: member.username,
        displayName: null,
        avatarUrl: null,
        rankLabel: null,
      } satisfies RosterFriend;
    });
  }, [existingTeamApplication, isSolo, required]);

  const [teamName, setTeamName] = useState(
    existingTeamApplication && !isSolo ? existingTeamApplication.teamName : "",
  );
  const [teammates, setTeammates] = useState<Array<RosterFriend | null>>(initialTeammates);
  const [logoUrl, setLogoUrl] = useState(isSolo ? "" : existingTeamApplication?.teamLogoUrl ?? "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreeOffer, setAgreeOffer] = useState(false);

  const isPaidTournament = entryFeeMinor > 0;
  const paymentStatus = existingTeamApplication?.paymentStatus ?? "UNPAID";
  const blockedByRank = requiresVerifiedExperience && !experienceVerified;
  const filledTeammates = teammates.filter((item): item is RosterFriend => Boolean(item));
  const rosterComplete = isSolo || filledTeammates.length === required;
  const submitDisabled = loading || !canSubmitApplication || blockedByRank || (!isSolo && !rosterComplete);

  const uploadLogo = async (file: File) => {
    const formData = new FormData();
    formData.append("logo", file);
    const response = await fetch("/api/uploads/team-logo", {
      method: "POST",
      body: formData,
    });
    const body = (await response.json()) as { logoUrl?: string; error?: string };
    if (!response.ok || !body.logoUrl) {
      throw new Error(body.error ?? "Не удалось загрузить логотип");
    }
    return body.logoUrl;
  };

  const submitTeamApplication = async () => {
    if (blockedByRank) {
      setMessage("Сначала подтвердите ранг в анкете.");
      return;
    }
    if (!canSubmitApplication) {
      setMessage("Турнир завершён: подача заявок недоступна.");
      return;
    }
    if (!isSolo && !teamName.trim()) {
      setMessage("Введите название команды");
      return;
    }
    if (!isSolo && filledTeammates.length !== required) {
      setMessage(`Добавьте ${required} друзей в состав.`);
      return;
    }

    setLoading(true);
    setMessage("");

    const response = await fetch(`/api/tournaments/${tournamentId}/team-apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamName: isSolo ? "Соло-заявка" : teamName.trim(),
        teamLogoUrl: isSolo ? undefined : logoUrl || undefined,
        memberUsernames: isSolo ? [] : filledTeammates.map((member) => member.username),
      }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "Не удалось отправить заявку");
      setLoading(false);
      return;
    }

    setLoading(false);
    setMessage(isSolo ? "Заявка отправлена." : "Командная заявка отправлена.");
    if (isPaidTournament && agreeOffer) {
      const pay = await fetch(`/api/tournaments/${tournamentId}/team-apply/payment`, { method: "POST" });
      const payBody = (await pay.json()) as { paymentUrl?: string | null; error?: string };
      if (pay.ok && payBody.paymentUrl) {
        window.location.href = payBody.paymentUrl;
        return;
      }
      if (!pay.ok) setMessage(payBody.error ?? "Заявка создана, но оплату не удалось открыть.");
    }
    router.refresh();
  };

  const initPayment = async () => {
    if (!canSubmitApplication) {
      setMessage("Турнир завершён: оплата недоступна.");
      return;
    }
    if (!existingTeamApplication) {
      setMessage("Сначала отправьте заявку, затем оплатите участие.");
      return;
    }
    if (!agreeOffer) {
      setMessage("Нужно согласиться с офертой перед оплатой.");
      return;
    }
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/tournaments/${tournamentId}/team-apply/payment`, { method: "POST" });
    const body = (await response.json()) as { paymentUrl?: string | null; error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "Не удалось создать платеж");
      setLoading(false);
      return;
    }
    if (body.paymentUrl) {
      window.location.href = body.paymentUrl;
      return;
    }
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="ll-frame p-5">
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#14ffec]">
        {isSolo ? "Заявка на участие" : `Заявка команды (${teamSize} игроков)`}
      </h3>
      <p className="mt-2 text-sm text-zinc-400">
        {isPaidTournament
          ? `После отправки откроется оплата взноса ${(entryFeeMinor / 100).toFixed(0)} ₽ через Т-Банк.`
          : isSolo
            ? "Вы подаёте заявку от себя. В сетке будет ваш аватар или буква ника."
            : "Соберите состав из друзей, при желании загрузите логотип и нажмите «Готово»."}
      </p>
      {blockedByRank && (
        <p className="mt-3 border border-[var(--ll-line)] px-3 py-2 text-sm text-zinc-200">
          Отправить заявку можно после того, как мы подтвердим ваш ранг.{" "}
          <Link href="/account/questionnaire" className="text-[#14ffec]">
            Перейти к анкете
          </Link>
        </p>
      )}
      {!canSubmitApplication && (
        <p className="mt-2 text-sm text-zinc-500">Приём заявок на этот турнир закрыт.</p>
      )}

      <div className="mt-4 space-y-4">
        {isSolo ? (
          <div className="flex items-center gap-3 border border-[var(--ll-line)] bg-black/30 p-3">
            <ParticipantAvatar
              label={captain.displayName || captain.username}
              logoUrl={captain.avatarUrl}
              size={40}
            />
            <div>
              <p className="text-sm font-semibold text-zinc-100">{captain.displayName || captain.username}</p>
              <p className="text-xs text-zinc-500">@{captain.username} · соло</p>
            </div>
          </div>
        ) : null}

        {!isSolo ? (
          <>
            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              className="input-base"
              placeholder="Название команды"
            />
            <TeamRosterSlots
              teamSize={teamSize}
              captain={captain}
              value={teammates}
              onChange={setTeammates}
            />
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-500">
                Логотип команды (необязательно)
              </span>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg"
                className="input-base"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    setMessage("Загрузка логотипа...");
                    const uploaded = await uploadLogo(file);
                    setLogoUrl(uploaded);
                    setMessage("Логотип загружен");
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : "Ошибка загрузки логотипа");
                  }
                }}
              />
              {logoUrl ? <p className="mt-1 text-xs text-zinc-500">Логотип выбран</p> : null}
            </label>
          </>
        ) : null}

        {existingTeamApplication && (
          <p className="text-xs text-zinc-400">
            Ваша заявка {getApplicationStatusLabel(existingTeamApplication.status)}
            {isPaidTournament ? ` · взнос ${PAYMENT_STATUS_LABELS[paymentStatus] ?? paymentStatus}` : ""}
          </p>
        )}
        {isPaidTournament && (
          <label className="flex items-start gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={agreeOffer} onChange={(e) => setAgreeOffer(e.target.checked)} className="mt-0.5" />
            <span>
              Соглашаюсь с{" "}
              <Link className="text-[#14ffec] underline" href="/offer">
                условиями оферты
              </Link>
              . Если заявку отклонят, взнос вернётся.
            </span>
          </label>
        )}
        {!isSolo && !rosterComplete ? (
          <p className="text-xs text-zinc-500">
            Чтобы отправить заявку, заполните все слоты друзьями ({filledTeammates.length}/{required}).
          </p>
        ) : null}
        <button
          type="button"
          onClick={existingTeamApplication && isPaidTournament && paymentStatus !== "PAID" ? initPayment : submitTeamApplication}
          disabled={submitDisabled || (isPaidTournament && !agreeOffer && !existingTeamApplication)}
          className="button-primary w-full"
        >
          {loading
            ? "Обработка..."
            : isPaidTournament
              ? `Готово · оплатить ${(entryFeeMinor / 100).toFixed(0)} ₽`
              : "Готово"}
        </button>
        {message && <p className="text-sm text-[#14ffec]">{message}</p>}
      </div>
    </div>
  );
}
