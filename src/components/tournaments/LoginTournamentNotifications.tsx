"use client";

import { useEffect, useState } from "react";

type LoginNotification = {
  id: string;
  message: string;
  tournament: { id: string; title: string };
  teamApplication: { id: string; teamName: string } | null;
};

export default function LoginTournamentNotifications() {
  const [notifications, setNotifications] = useState<LoginNotification[]>([]);

  useEffect(() => {
    const raw = sessionStorage.getItem("ll_login_notifications");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as LoginNotification[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setNotifications(parsed);
      }
    } catch {
      // ignore bad session payload
    } finally {
      sessionStorage.removeItem("ll_login_notifications");
    }
  }, []);

  const markRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications([]);
  };

  if (notifications.length === 0) return null;

  return (
    <section className="surface mb-5 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[#14ffec]">Уведомления участия</h2>
        <button
          type="button"
          onClick={markRead}
          className="rounded border border-[#323232] bg-[#323232] px-2 py-1 text-xs text-zinc-300 hover:text-[#14ffec]"
        >
          Прочитано
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {notifications.map((notification) => (
          <article key={notification.id} className="rounded border border-[#323232] bg-[#323232] p-3 text-sm text-zinc-200">
            {notification.message}
          </article>
        ))}
      </div>
    </section>
  );
}
