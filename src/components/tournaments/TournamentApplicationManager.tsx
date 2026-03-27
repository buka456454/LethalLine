"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import JoinTournamentButton from "@/components/tournaments/JoinTournamentButton";

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
  entryFeeMinor,
  currency,
  existingTeamApplication,
}: {
  tournamentId: string;
  entryFeeMinor: number;
  currency: "RUB";
  existingTeamApplication: TeamApplicationPreview | null;
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
    if (!teamName.trim()) {
      setMessage("Введите название команды");
      return;
    }
    if (!memberUsernames.trim()) {
      setMessage("Добавьте ники игроков через запятую");
      return;
    }

    setLoading(true);
    setMessage("");
    if (hasDuplicates) {
      setMessage("Ники игроков повторяются. Убери дубликаты.");
      setLoading(false);
      return;
    }
    if (parsedMembers.length > 12) {
      setMessage("Максимум 12 ников в одной заявке.");
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/tournaments/${tournamentId}/team-apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamName: teamName.trim(),
        teamLogoUrl: logoUrl || undefined,
        memberUsernames: parsedMembers,
      }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "Не удалось отправить командную заявку");
      setLoading(false);
      return;
    }

    setLoading(false);
    setMessage("Командная заявка отправлена. Зарегистрированные игроки получат уведомление при входе.");
    router.refresh();
  };

  const initPayment = async () => {
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
    <div className="mt-4 space-y-4">
      <div className="rounded border border-[#323232] bg-[#323232] p-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#14ffec]">Индивидуальная заявка</h3>
        <p className="mt-1 text-xs text-zinc-300">Если играете соло, отправьте стандартную заявку.</p>
        <div className="mt-3">
          <JoinTournamentButton tournamentId={tournamentId} />
        </div>
      </div>

      <div className="rounded border border-[#323232] bg-[#323232] p-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#14ffec]">Заявка команды</h3>
        <p className="mt-1 text-xs text-zinc-300">
          Укажите название, логотип и ники игроков. Если ник зарегистрирован, игрок увидит уведомление при входе.
        </p>
        {isPaidTournament && (
          <p className="mt-2 text-xs text-zinc-200">
            Взнос за участие:{" "}
            <span className="font-semibold text-[#14ffec]">
              {(entryFeeMinor / 100).toFixed(2)} {currency}
            </span>
          </p>
        )}

        <div className="mt-3 space-y-3">
          <input
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            className="input-base"
            placeholder="Название команды"
          />
          <textarea
            value={memberUsernames}
            onChange={(event) => setMemberUsernames(event.target.value)}
            className="input-base min-h-24"
            placeholder="Ники через запятую: player1, player2, player3"
          />
          <p className="text-xs text-zinc-400">
            Указано игроков: {parsedMembers.length} | Уникальных: {uniqueMembers.length}
            {hasDuplicates ? " | Есть дубликаты" : ""}
          </p>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Логотип команды (файл)</span>
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
          {logoUrl && (
            <p className="text-xs text-zinc-300">
              Загружен логотип: <span className="text-[#14ffec]">{logoUrl}</span>
            </p>
          )}
          {existingTeamApplication && (
            <p className="text-xs text-zinc-300">
              Текущий статус вашей командной заявки: <span className="text-[#14ffec]">{existingTeamApplication.status}</span>
            </p>
          )}
          {isPaidTournament && existingTeamApplication && (
            <p className="text-xs text-zinc-300">
              Статус оплаты: <span className="text-[#14ffec]">{paymentStatus}</span>
            </p>
          )}
          <button type="button" onClick={submitTeamApplication} disabled={loading} className="button-primary">
            {loading ? "Отправка..." : "Отправить заявку команды"}
          </button>
          {isPaidTournament && paymentStatus !== "PAID" && (
            <div className="rounded border border-[#323232] bg-[#212121] p-3">
              <p className="text-xs text-zinc-300">
                После отправки заявки оплатите участие. Оплата подтверждается автоматически (webhook).
              </p>
              <label className="mt-2 flex items-start gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={agreeOffer}
                  onChange={(e) => setAgreeOffer(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Я согласен(на) с <a className="text-[#14ffec] underline" href="/offer">публичной офертой</a>.
                </span>
              </label>
              <button
                type="button"
                onClick={initPayment}
                disabled={loading}
                className="button-primary mt-3 w-full"
              >
                {loading ? "Подготовка оплаты..." : "Оплатить участие"}
              </button>
            </div>
          )}
          {message && <p className="text-sm text-[#14ffec]">{message}</p>}
        </div>
      </div>
    </div>
  );
}
