"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { requiredTeammates } from "@/lib/tournament";
import { getApplicationStatusLabel } from "@/lib/tournamentStatus";

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
}: {
  tournamentId: string;
  teamSize: 1 | 2 | 5;
  entryFeeMinor: number;
  currency: "RUB";
  requiresVerifiedExperience: boolean;
  experienceVerified: boolean;
  existingTeamApplication: TeamApplicationPreview | null;
  canSubmitApplication: boolean;
}) {
  const router = useRouter();
  const [teamName, setTeamName] = useState(existingTeamApplication?.teamName ?? "");
  const [memberUsernames, setMemberUsernames] = useState(
    existingTeamApplication ? existingTeamApplication.members.map((member) => member.username).join(", ") : "",
  );
  const [logoUrl, setLogoUrl] = useState(existingTeamApplication?.teamLogoUrl ?? "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreeOffer, setAgreeOffer] = useState(false);

  const isPaidTournament = entryFeeMinor > 0;
  const paymentStatus = existingTeamApplication?.paymentStatus ?? "UNPAID";
  const blockedByRank = requiresVerifiedExperience && !experienceVerified;
  const submitDisabled = loading || !canSubmitApplication || blockedByRank;

  const parsedMembers = memberUsernames
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const uniqueMembers = Array.from(new Set(parsedMembers.map((value) => value.toLowerCase())));
  const hasDuplicates = uniqueMembers.length !== parsedMembers.length;

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
    const isSolo = teamSize === 1;
    if (!isSolo && !teamName.trim()) {
      setMessage("Введите название команды");
      return;
    }

    setLoading(true);
    setMessage("");
    if (hasDuplicates) {
      setMessage("Ники игроков повторяются. Убери дубликаты.");
      setLoading(false);
      return;
    }
    const required = requiredTeammates(teamSize);
    if (required > 0 && parsedMembers.length !== required) {
      setMessage(`Для этого турнира укажите ровно ${required} ник(а) сокомандников.`);
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/tournaments/${tournamentId}/team-apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamName: isSolo ? "Соло-заявка" : teamName.trim(),
        teamLogoUrl: logoUrl || undefined,
        memberUsernames: isSolo ? [] : parsedMembers,
      }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "Не удалось отправить командную заявку");
      setLoading(false);
      return;
    }

    setLoading(false);
    setMessage(isSolo ? "Соло-заявка отправлена." : "Командная заявка отправлена.");
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
      setMessage("Сначала отправьте заявку команды, затем оплатите участие.");
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
        {teamSize === 1 ? "Заявка на участие" : `Заявка команды (${teamSize} игроков)`}
      </h3>
      <p className="mt-2 text-sm text-zinc-400">
        {isPaidTournament
          ? `После отправки откроется оплата взноса ${(entryFeeMinor / 100).toFixed(0)} ₽ через Т-Банк.`
          : "Заявку отправляет капитан, а модерация проверит состав и допустит команду."}
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

      <div className="mt-4 space-y-3">
        {teamSize > 1 && (
          <input
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            className="input-base"
            placeholder="Название команды"
          />
        )}
        {teamSize > 1 && (
          <>
            <textarea
              value={memberUsernames}
              onChange={(event) => setMemberUsernames(event.target.value)}
              className="input-base min-h-24"
              placeholder={`Ники остальных игроков через запятую (${requiredTeammates(teamSize)} шт.)`}
            />
            <p className="text-xs text-zinc-500">
              Капитан — вы, вас вписывать не нужно. Указано {parsedMembers.length} из {requiredTeammates(teamSize)}
              {hasDuplicates ? " · есть повторяющиеся ники" : ""}
            </p>
          </>
        )}
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-500">Логотип (необязательно)</span>
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
        </label>
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
        <button
          type="button"
          onClick={existingTeamApplication && isPaidTournament && paymentStatus !== "PAID" ? initPayment : submitTeamApplication}
          disabled={submitDisabled || (isPaidTournament && !agreeOffer && !existingTeamApplication)}
          className="button-primary w-full"
        >
          {loading
            ? "Обработка..."
            : isPaidTournament
              ? `Отправить заявку и оплатить ${(entryFeeMinor / 100).toFixed(0)} ₽`
              : "Отправить заявку"}
        </button>
        {message && <p className="text-sm text-[#14ffec]">{message}</p>}
      </div>
    </div>
  );
}
