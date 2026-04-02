"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function VerifyPhoneCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/auth/verify-phone-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const text = await res.text();
      let body: { message?: string; error?: string } = {};
      if (text.trim()) {
        try {
          body = JSON.parse(text) as { message?: string; error?: string };
        } catch {
          setMsg("Некорректный ответ сервера.");
          return;
        }
      }
      if (!res.ok) {
        setMsg(body.error ?? "Ошибка");
        return;
      }
      setMsg(body.message ?? "Готово");
      setCode("");
      router.push("/?verify=ok");
      router.refresh();
    } catch {
      setMsg("Нет соединения с сервером.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={8}
        placeholder="Код из SMS"
        value={code}
        disabled={busy}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="w-[7.5rem] rounded border border-amber-500/40 bg-black/40 px-2 py-1 text-center font-mono text-sm tracking-widest text-amber-50 placeholder:text-amber-200/40 focus:border-[#14ffec]/60 focus:outline-none"
      />
      <button
        type="button"
        disabled={busy || code.length !== 6}
        onClick={() => void submit()}
        className="shrink-0 rounded-md border border-amber-500/50 bg-black/30 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"
      >
        {busy ? "…" : "Подтвердить"}
      </button>
      {msg ? <span className="text-[11px] text-zinc-300">{msg}</span> : null}
    </span>
  );
}
