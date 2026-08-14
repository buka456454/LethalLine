"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import LogoutButton from "@/components/ui/LogoutButton";

const panelTransition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

export default function AccountMenu({
  username,
  canAdmin,
}: {
  username: string;
  canAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const close = () => {
    cancelClose();
    setOpen(false);
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 80);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => cancelClose(), []);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => {
          cancelClose();
          setOpen((value) => !value);
        }}
        className="inline-flex cursor-pointer select-none items-center gap-2 rounded-sm border border-[var(--ll-line)] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#14ffec] transition-colors duration-200 hover:border-[#14ffec] hover:bg-[#14ffec]/8"
      >
        {username}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            id={menuId}
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.96, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, scale: 0.97, filter: "blur(3px)" }}
            transition={panelTransition}
            style={{ originX: 1, originY: 0 }}
            className="absolute right-0 top-full z-40 pt-2"
          >
            <div className="w-48 border border-[var(--ll-line)] bg-[#141414] p-1 shadow-lg shadow-black/50">
              <Link
                href={`/u/${encodeURIComponent(username)}`}
                role="menuitem"
                className="block px-3 py-2 text-sm text-zinc-200 hover:text-[#14ffec]"
                onClick={close}
              >
                Профиль
              </Link>
              <Link
                href="/account/questionnaire"
                role="menuitem"
                className="block px-3 py-2 text-sm text-zinc-200 hover:text-[#14ffec]"
                onClick={close}
              >
                Анкета
              </Link>
              <Link
                href="/account/edit"
                role="menuitem"
                className="block px-3 py-2 text-sm text-zinc-200 hover:text-[#14ffec]"
                onClick={close}
              >
                Настройки
              </Link>
              {canAdmin ? (
                <Link
                  href="/admin"
                  role="menuitem"
                  className="block px-3 py-2 text-sm text-zinc-200 hover:text-[#14ffec]"
                  onClick={close}
                >
                  Админ
                </Link>
              ) : null}
              <div className="px-1 py-1">
                <LogoutButton
                  label="Выход"
                  className="w-full rounded-sm border border-[var(--ll-line)] px-3 py-2 text-left text-sm text-zinc-300 hover:text-[#14ffec] disabled:opacity-60"
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
