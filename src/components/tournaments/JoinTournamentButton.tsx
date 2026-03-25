"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinTournamentButton({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const join = async () => {
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/tournaments/${tournamentId}/join`, { method: "POST" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Не удалось отправить заявку");
      setLoading(false);
      return;
    }
    setMessage("Заявка отправлена на модерацию");
    setLoading(false);
    router.refresh();
  };

  return (
    <div>
      <button type="button" onClick={join} disabled={loading} className="button-primary">
        {loading ? "Отправка..." : "Участвовать"}
      </button>
      {message && <p className="mt-2 text-sm text-[#14ffec]">{message}</p>}
    </div>
  );
}
