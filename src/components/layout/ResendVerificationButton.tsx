"use client";

import { useState } from "react";

export default function ResendVerificationButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const click = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/auth/resend-phone-verification", {
        method: "POST",
        credentials: "include",
      });
      const text = await res.text();
      let body: { message?: string; error?: string } = {};
      if (text.trim()) {
        try {
          body = JSON.parse(text) as { message?: string; error?: string };
        } catch {
          setMsg("Сервер вернул не JSON. Обновите страницу или попробуйте позже.");
          return;
        }
      }
      if (!res.ok) {
        setMsg(body.error ?? `Ошибка ${res.status}`);
        return;
      }
      setMsg(body.message ?? "Готово");
    } catch {
      setMsg("Не удалось связаться с сервером.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col gap-1 sm:inline-flex sm:flex-row sm:items-center sm:gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void click()}
        className="shrink-0 rounded-md border border-[#14ffec]/40 bg-black/30 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[#14ffec] hover:bg-[#14ffec]/10 disabled:opacity-50"
      >
        {busy ? "…" : "Отправить код снова"}
      </button>
      {msg ? <span className="text-[11px] text-zinc-400">{msg}</span> : null}
    </span>
  );
}
