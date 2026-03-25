"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TournamentRef = {
  id: string;
  title: string;
  startsAt: string;
  status: string;
};

type MemberApplication = {
  id: string;
  teamName: string;
  status: string;
  tournament: TournamentRef;
  captain: { username: string };
};

type CaptainApplication = {
  id: string;
  teamName: string;
  status: string;
  tournament: TournamentRef;
};

type NotificationItem = {
  id: string;
  message: string;
  isRead: boolean;
  tournament: { id: string; title: string };
};

export default function ParticipationSection() {
  const [memberApplications, setMemberApplications] = useState<MemberApplication[]>([]);
  const [captainApplications, setCaptainApplications] = useState<CaptainApplication[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [applicationsRes, notificationsRes] = await Promise.all([
        fetch("/api/account/applications"),
        fetch("/api/notifications"),
      ]);
      const applicationsBody = (await applicationsRes.json()) as {
        memberApplications?: MemberApplication[];
        captainApplications?: CaptainApplication[];
      };
      const notificationsBody = (await notificationsRes.json()) as { notifications?: NotificationItem[] };

      setMemberApplications(applicationsBody.memberApplications ?? []);
      setCaptainApplications(applicationsBody.captainApplications ?? []);
      setNotifications(notificationsBody.notifications ?? []);
      setLoading(false);
    };

    load().catch(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
  };

  return (
    <section className="surface mt-5 rounded-xl p-6">
      <h2 className="text-xl font-black uppercase tracking-[0.12em] text-[#14ffec]">Участие в турнирах</h2>
      <p className="mt-2 text-sm text-zinc-400">Командные заявки, в которые вы добавлены капитаном или участвуете как капитан.</p>

      {loading && <p className="mt-4 text-sm text-zinc-400">Загрузка данных...</p>}

      {!loading && (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <article className="rounded border border-[#323232] bg-[#323232] p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-zinc-200">Уведомления</h3>
              <button
                type="button"
                className="rounded border border-[#323232] bg-[#212121] px-2 py-1 text-xs text-zinc-300 hover:text-[#14ffec]"
                onClick={markAllRead}
              >
                Прочитать все
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {notifications.length === 0 && <p className="text-xs text-zinc-400">Новых уведомлений нет.</p>}
              {notifications.slice(0, 8).map((notification) => (
                <div key={notification.id} className="rounded border border-[#323232] bg-[#212121] p-2 text-xs text-zinc-300">
                  <p>{notification.message}</p>
                  <p className="mt-1 text-[#14ffec]">{notification.isRead ? "Прочитано" : "Непрочитано"}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded border border-[#323232] bg-[#323232] p-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-zinc-200">Я капитан</h3>
            <div className="mt-3 space-y-2">
              {captainApplications.length === 0 && <p className="text-xs text-zinc-400">Командных заявок пока нет.</p>}
              {captainApplications.map((application) => (
                <div key={application.id} className="rounded border border-[#323232] bg-[#212121] p-2 text-xs text-zinc-300">
                  <p className="font-semibold text-zinc-100">{application.teamName}</p>
                  <p>{application.tournament.title}</p>
                  <p className="text-[#14ffec]">{application.status}</p>
                  <Link href={`/tournaments/${application.tournament.id}`} className="mt-1 inline-block text-[#14ffec]">
                    Перейти к турниру
                  </Link>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded border border-[#323232] bg-[#323232] p-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-zinc-200">Я участник команды</h3>
            <div className="mt-3 space-y-2">
              {memberApplications.length === 0 && <p className="text-xs text-zinc-400">Вас пока не добавили в заявки.</p>}
              {memberApplications.map((application) => (
                <div key={application.id} className="rounded border border-[#323232] bg-[#212121] p-2 text-xs text-zinc-300">
                  <p className="font-semibold text-zinc-100">{application.teamName}</p>
                  <p>Капитан: {application.captain.username}</p>
                  <p>{application.tournament.title}</p>
                  <p className="text-[#14ffec]">{application.status}</p>
                  <Link href={`/tournaments/${application.tournament.id}`} className="mt-1 inline-block text-[#14ffec]">
                    Перейти к турниру
                  </Link>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
