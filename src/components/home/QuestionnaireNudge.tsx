"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

const SNOOZE_KEY = "ll_qnudge_snooze_until";
const SNOOZE_MS = 7 * 86_400_000;

type Props = {
  /** Сервер: пользователь вошёл и нет ни одной заполненной строки анкеты */
  enabled: boolean;
};

export default function QuestionnaireNudge({ enabled }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(SNOOZE_KEY);
      if (raw) {
        const until = parseInt(raw, 10);
        if (!Number.isNaN(until) && Date.now() < until) return;
      }
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, [enabled]);

  const snooze = useCallback(() => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  const dismiss = snooze;

  if (!enabled) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          role="dialog"
          aria-labelledby="qnudge-title"
          initial={{ opacity: 0, y: 24, x: 16 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 16, x: 8 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="fixed bottom-5 right-4 z-[60] w-[min(100vw-2rem,20rem)] rounded-xl border border-[#0d7377]/70 bg-[#181818]/95 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-md sm:right-6 sm:bottom-6"
        >
          <div className="flex items-start justify-between gap-2">
            <h2 id="qnudge-title" className="text-sm font-black uppercase tracking-[0.14em] text-[#14ffec]">
              Заполните анкету
            </h2>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 rounded border border-[#323232] px-2 py-0.5 text-xs text-zinc-500 transition hover:border-[#0d7377] hover:text-zinc-200"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 text-sm leading-snug text-zinc-300">
            Укажите свой ранг в играх — так вас найдут другие игроки, а мы подберём соперников вашего уровня.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link href="/account/questionnaire" className="button-primary inline-flex justify-center text-center text-sm">
              Пройти анкету
            </Link>
            <button
              type="button"
              onClick={snooze}
              className="rounded border border-[#323232] px-3 py-2 text-sm text-zinc-400 transition hover:border-[#0d7377] hover:text-zinc-200"
            >
              Позже
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
