"use client";

import { useEffect, useMemo, useState } from "react";
import ParticipantAvatar from "@/components/ui/ParticipantAvatar";

export type RosterCaptain = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type RosterFriend = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  rankLabel: string | null;
};

type Props = {
  teamSize: 2 | 5;
  captain: RosterCaptain;
  /** Слоты тиммейтов фиксированной длины (teamSize - 1), пустые = null */
  value: Array<RosterFriend | null>;
  onChange: (members: Array<RosterFriend | null>) => void;
};

export default function TeamRosterSlots({ teamSize, captain, value, onChange }: Props) {
  const openSlots = teamSize - 1;
  const [friends, setFriends] = useState<RosterFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/friends?tab=friends&take=100");
        const body = (await res.json()) as {
          items?: Array<{ user: RosterFriend }>;
          error?: string;
        };
        if (!res.ok) throw new Error(body.error ?? "Не удалось загрузить друзей");
        if (!cancelled) {
          setFriends((body.items ?? []).map((item) => item.user));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка загрузки друзей");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const slots = useMemo(() => {
    return Array.from({ length: openSlots }, (_, i) => value[i] ?? null);
  }, [openSlots, value]);

  const selectedIds = new Set(slots.filter(Boolean).map((m) => (m as RosterFriend).id));
  const filledCount = slots.filter(Boolean).length;

  const setSlot = (index: number, friend: RosterFriend | null) => {
    const next = Array.from({ length: openSlots }, (_, i) => value[i] ?? null);
    next[index] = friend;
    onChange(next);
    setPickerSlot(null);
  };

  const availableFriends = friends.filter((friend) => !selectedIds.has(friend.id));

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Состав</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        <div className="flex flex-col items-center gap-2 border border-[var(--ll-line)] bg-black/30 p-3">
          <ParticipantAvatar
            label={captain.displayName || captain.username}
            logoUrl={captain.avatarUrl}
            size={40}
          />
          <p className="truncate text-center text-xs font-semibold text-zinc-100">{captain.username}</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#14ffec]">капитан</p>
        </div>

        {slots.map((member, index) => (
          <div
            key={`slot-${index}`}
            className="relative flex flex-col items-center gap-2 border border-dashed border-[var(--ll-line)] bg-black/20 p-3"
          >
            {member ? (
              <>
                <ParticipantAvatar
                  label={member.displayName || member.username}
                  logoUrl={member.avatarUrl}
                  size={40}
                />
                <p className="truncate text-center text-xs font-semibold text-zinc-100">{member.username}</p>
                <button
                  type="button"
                  className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 hover:text-[#14ffec]"
                  onClick={() => setSlot(index, null)}
                >
                  Убрать
                </button>
              </>
            ) : (
              <button
                type="button"
                className="flex h-full min-h-[88px] w-full flex-col items-center justify-center gap-1 text-[#14ffec] transition hover:bg-[#14ffec]/5"
                onClick={() => setPickerSlot(pickerSlot === index ? null : index)}
                disabled={loading}
              >
                <span className="text-2xl font-light leading-none">+</span>
                <span className="text-[10px] uppercase tracking-[0.12em]">друг</span>
              </button>
            )}

            {pickerSlot === index ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto border border-[var(--ll-line)] bg-[#141414] p-1 shadow-lg">
                {loading ? (
                  <p className="px-2 py-2 text-xs text-zinc-500">Загрузка…</p>
                ) : availableFriends.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-zinc-500">
                    {friends.length === 0
                      ? "Пока нет друзей. Добавьте игроков в друзья, затем вернитесь сюда."
                      : "Все друзья уже в составе."}
                  </p>
                ) : (
                  availableFriends.map((friend) => (
                    <button
                      key={friend.id}
                      type="button"
                      className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm text-zinc-200 hover:bg-[#1b1b1b] hover:text-[#14ffec]"
                      onClick={() => setSlot(index, friend)}
                    >
                      <ParticipantAvatar
                        label={friend.displayName || friend.username}
                        logoUrl={friend.avatarUrl}
                        size={20}
                      />
                      <span className="truncate">@{friend.username}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        Заполнено {filledCount} из {openSlots}. В команду можно добавить только принятых друзей.
      </p>
      {error ? <p className="text-xs text-[#14ffec]">{error}</p> : null}
    </div>
  );
}
