"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TOURNAMENT_STATUS_OPTIONS, getTournamentStatusLabel } from "@/lib/tournamentStatus";

type Props = {
  tournamentId: string;
  status: string;
};

export default function TournamentAdminActions({ tournamentId, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"status" | "delete" | null>(null);
  const [nextStatus, setNextStatus] = useState(status);

  useEffect(() => {
    setNextStatus(status);
  }, [status]);

  const saveStatus = async () => {
    if (nextStatus === status) return;
    if (!window.confirm(`Изменить статус турнира на «${getTournamentStatusLabel(nextStatus)}»?`)) {
      return;
    }
    setBusy("status");
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setStatus", status: nextStatus }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? "Не удалось изменить статус турнира");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (
      !window.confirm(
        "Удалить турнир безвозвратно? Удалятся заявки, команды, матчи и уведомления — турнир пропадёт из списков и статистики.",
      )
    ) {
      return;
    }
    setBusy("delete");
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? "Не удалось удалить турнир");
        return;
      }
      router.push("/tournaments");
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#323232]/80 pt-4">
      <select
        value={nextStatus}
        onChange={(e) => setNextStatus(e.target.value)}
        disabled={busy !== null}
        className="rounded-lg border border-[#323232] bg-[#212121] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-zinc-200"
      >
        {TOURNAMENT_STATUS_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy !== null || nextStatus === status}
        onClick={() => void saveStatus()}
        className="rounded-lg border border-[#0d7377]/60 bg-[#0d7377]/15 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#14ffec] transition hover:bg-[#0d7377]/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy === "status" ? "…" : "Сменить статус"}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void remove()}
        className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy === "delete" ? "…" : "Удалить турнир"}
      </button>
      <p className="w-full text-[11px] text-zinc-500">Текущий статус: {getTournamentStatusLabel(status)}.</p>
    </div>
  );
}
