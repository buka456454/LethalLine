"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AccountUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  createdAt: string;
};

export default function AccountSettingsForm({ initialUser }: { initialUser: AccountUser }) {
  const router = useRouter();
  const [form, setForm] = useState({
    email: initialUser.email,
    username: initialUser.username,
    displayName: initialUser.displayName ?? "",
    avatarUrl: initialUser.avatarUrl ?? "",
    bio: initialUser.bio ?? "",
    currentPassword: "",
    newPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const avatarPreview = useMemo(() => {
    if (form.avatarUrl) return form.avatarUrl;
    return null;
  }, [form.avatarUrl]);

  const initials = useMemo(() => {
    const source = form.displayName || form.username || "U";
    return source.trim().slice(0, 2).toUpperCase();
  }, [form.displayName, form.username]);

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(body.error ?? "Не удалось сохранить настройки");
      setSaving(false);
      return;
    }

    setMessage("Профиль обновлен");
    setForm((prev) => ({ ...prev, currentPassword: "", newPassword: "" }));
    setSaving(false);
    router.refresh();
  };

  return (
    <section className="surface w-full rounded-xl p-6">
      <h1 className="text-2xl font-black uppercase tracking-[0.12em] text-[#14ffec]">Настройки аккаунта</h1>
      <p className="mt-2 text-sm text-zinc-400">Редактируйте профиль, контактные данные и параметры входа.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-3">
          <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-xl border border-[#323232] bg-[#323232]">
            {avatarPreview ? (
              <Image src={avatarPreview} alt="Avatar preview" width={144} height={144} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-black text-[#14ffec]">{initials}</span>
            )}
          </div>
          <p className="text-xs text-zinc-500">Роль: {initialUser.role}</p>
          <p className="text-xs text-zinc-500">С нами с {new Date(initialUser.createdAt).toLocaleDateString()}</p>
        </aside>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Имя отображения</span>
            <input
              className="input-base"
              value={form.displayName}
              onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
              placeholder="Vlad Cyber"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Username</span>
            <input
              className="input-base"
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="vlad_player"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Email</span>
            <input
              className="input-base"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="you@team.gg"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Аватар (URL)</span>
            <input
              className="input-base"
              value={form.avatarUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, avatarUrl: event.target.value }))}
              placeholder="https://example.com/avatar.png"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">О себе</span>
            <textarea
              className="input-base min-h-28"
              value={form.bio}
              onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
              placeholder="Капитан команды, играю в CS2 и Valorant."
            />
          </label>

          <div className="rounded-lg border border-[#323232] bg-[#323232] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Смена пароля</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input
                type="password"
                className="input-base"
                value={form.currentPassword}
                onChange={(event) => setForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                placeholder="Текущий пароль"
              />
              <input
                type="password"
                className="input-base"
                value={form.newPassword}
                onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                placeholder="Новый пароль"
              />
            </div>
          </div>

          {error && <p className="rounded bg-[#323232] p-2 text-sm text-[#14ffec]">{error}</p>}
          {message && <p className="rounded bg-[#323232] p-2 text-sm text-zinc-300">{message}</p>}

          <button type="button" className="button-primary" disabled={saving} onClick={save}>
            {saving ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </div>
      </div>
    </section>
  );
}
