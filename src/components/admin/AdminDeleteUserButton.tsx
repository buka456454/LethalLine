"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function AdminDeleteUserButton({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading]);

  const confirmDelete = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
      const body = (await res.json()) as { error?: string; deletedUserId?: string };
      if (!res.ok) throw new Error(body.error ?? "Не удалось удалить аккаунт");
      setOpen(false);
      router.push("/teammates");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить аккаунт");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button type="button" className="button-secondary inline-flex" onClick={() => setOpen(true)}>
        Удалить аккаунт
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            onClick={() => {
              if (!loading) setOpen(false);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="ll-frame w-full max-w-md p-5"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.28, ease: EASE }}
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Подтверждение</p>
              <h2 id={titleId} className="mt-2 text-lg font-black uppercase tracking-[0.08em] text-[#14ffec]">
                Удалить аккаунт?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                Вы точно уверены, что хотите удалить аккаунт пользователя «{username}»?
              </p>
              {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button type="button" className="button-ghost" disabled={loading} onClick={() => setOpen(false)}>
                  Отмена
                </button>
                <button type="button" className="button-primary" disabled={loading} onClick={() => void confirmDelete()}>
                  {loading ? "Удаление…" : "Удалить"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
