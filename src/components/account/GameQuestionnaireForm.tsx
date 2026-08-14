"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getGameCoverDecor, getGameCoverUrl } from "@/lib/gameAssets";
import GameCoverImageStack from "@/components/games/GameCoverImageStack";
import PublicImage from "@/components/ui/PublicImage";
import {
  CUSTOM_SENTINEL,
  MAX_ROLES,
  getGameQuestionnaireUi,
  isNotPlayed,
  mergeSelectValue,
  NOT_PLAYED_VALUE,
  parseRoles,
  serializeRoles,
  splitSelectValue,
  type GameQuestionnaireUi,
  type SelectOption,
} from "@/lib/gameQuestionnaireConfig";

type GameRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
};

type ProfileSlice = {
  mmr: number | null;
  rankLabel: string | null;
  hoursPlayed: number | null;
  primaryRole: string | null;
  experienceVerificationStatus: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";
  experienceProofImageUrl: string | null;
  experienceProofSubmittedAt: string | null;
  experienceVerificationReviewedAt: string | null;
  experienceVerificationNote: string | null;
} | null;

type ApiGameItem = { game: GameRow; profile: ProfileSlice };

async function parseResponseJson<T>(res: Response): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const text = await res.text();
  if (!text.trim()) {
    return { ok: false, message: res.ok ? "Пустой ответ сервера" : "Сервер не вернул данные" };
  }
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, message: "Ответ сервера не JSON" };
  }
}

function SelectOrTextRank({
  config,
  value,
  onChange,
}: {
  config: GameQuestionnaireUi["rank"];
  value: string;
  onChange: (v: string) => void;
}) {
  const options = config.options;
  const split = config.mode === "freeText" ? null : splitSelectValue(value, options);
  const selectVal = split?.select ?? "";
  const customVal = split?.custom ?? "";

  if (config.mode === "freeText") {
    return (
      <input
        className="input-base"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Например Легенда IV"
      />
    );
  }

  const showCustom = selectVal === CUSTOM_SENTINEL;

  return (
    <div className="space-y-2">
      <select
        className="input-base w-full"
        value={selectVal}
        onChange={(e) => {
          const v = e.target.value;
          if (v !== CUSTOM_SENTINEL) {
            onChange(v);
          } else {
            onChange(mergeSelectValue(CUSTOM_SENTINEL, customVal));
          }
        }}
      >
        {(options ?? []).map((o) => (
          <option key={o.value || "__empty"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {showCustom && (
        <input
          className="input-base"
          value={customVal}
          onChange={(e) => {
            const t = e.target.value;
            onChange(mergeSelectValue(CUSTOM_SENTINEL, t));
          }}
          placeholder="Введите ранг текстом"
        />
      )}
    </div>
  );
}

function presetRoleOptions(options: SelectOption[] | undefined) {
  return (options ?? []).filter((option) => option.value && option.value !== CUSTOM_SENTINEL);
}

function SelectOrTextRole({
  config,
  value,
  onChange,
}: {
  config: GameQuestionnaireUi["role"];
  value: string;
  onChange: (v: string) => void;
}) {
  const presets = presetRoleOptions(config.options);
  const presetValues = new Set(presets.map((option) => option.value));
  const selected = parseRoles(value);
  const selectedPresets = selected.filter((role) => presetValues.has(role));
  const customVal = selected.filter((role) => !presetValues.has(role)).join(", ");
  const atMax = selected.length >= MAX_ROLES;

  if (config.mode === "freeText") {
    return (
      <input
        className="input-base"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Керри, IGL…"
      />
    );
  }

  const emit = (nextPresets: string[], nextCustom: string) => {
    onChange(serializeRoles([...nextPresets, nextCustom]));
  };

  const togglePreset = (role: string) => {
    if (selectedPresets.includes(role)) {
      emit(
        selectedPresets.filter((item) => item !== role),
        customVal,
      );
      return;
    }
    if (atMax) return;
    emit([...selectedPresets, role], customVal);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">Можно выбрать до {MAX_ROLES}</p>
      <div className="flex flex-wrap gap-2">
        {presets.map((option) => {
          const checked = selectedPresets.includes(option.value);
          const disabled = atMax && !checked;
          return (
            <label
              key={option.value}
              className={`inline-flex cursor-pointer items-center gap-2 rounded border px-2.5 py-1.5 text-sm transition-colors ${
                checked
                  ? "border-[#14ffec]/60 bg-[#14ffec]/10 text-[#14ffec]"
                  : disabled
                    ? "cursor-not-allowed border-[#2a2a2a] text-zinc-600"
                    : "border-[#323232] bg-[#212121] text-zinc-300 hover:border-[#14ffec]/40"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                disabled={disabled}
                onChange={() => togglePreset(option.value)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
      <label className="block">
        <span className="mb-1 block text-xs text-zinc-500">Свой вариант</span>
        <input
          className="input-base"
          value={customVal}
          disabled={atMax && customVal.trim() === ""}
          onChange={(e) => emit(selectedPresets, e.target.value)}
          placeholder="Если роли нет в списке"
        />
      </label>
    </div>
  );
}

export default function GameQuestionnaireForm({ profileHref = "/account" }: { profileHref?: string }) {
  const router = useRouter();
  const [items, setItems] = useState<ApiGameItem[]>([]);
  const [draft, setDraft] = useState<
    Record<string, { mmr: string; rankLabel: string; hoursPlayed: string; primaryRole: string; experienceProofImageUrl: string }>
  >({});
  const [uploadingProofByGame, setUploadingProofByGame] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/account/game-profiles");
    const parsed = await parseResponseJson<{ games?: ApiGameItem[]; error?: string }>(res);
    if (!parsed.ok) {
      setError(parsed.message);
      setLoading(false);
      return;
    }
    const body = parsed.data;
    if (!res.ok) {
      setError(body.error ?? "Не удалось загрузить данные");
      setLoading(false);
      return;
    }
    const list = body.games ?? [];
    setItems(list);
    const next: Record<string, { mmr: string; rankLabel: string; hoursPlayed: string; primaryRole: string; experienceProofImageUrl: string }> =
      {};
    for (const row of list) {
      const p = row.profile;
      next[row.game.id] = {
        mmr: p?.mmr != null ? String(p.mmr) : "",
        rankLabel: p?.rankLabel ?? "",
        hoursPlayed: p?.hoursPlayed != null ? String(p.hoursPlayed) : "",
        primaryRole: p?.primaryRole ?? "",
        experienceProofImageUrl: p?.experienceProofImageUrl ?? "",
      };
    }
    setDraft(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateField = (gameId: string, key: keyof (typeof draft)[string], value: string) => {
    setDraft((prev) => ({
      ...prev,
      [gameId]: { ...prev[gameId], [key]: value },
    }));
  };

  /** «Нет опыта» обнуляет остальные поля: MMR, часы, роль и скриншот теряют смысл. */
  const updateRankLabel = (gameId: string, value: string) => {
    setDraft((prev) => {
      if (isNotPlayed(value)) {
        return {
          ...prev,
          [gameId]: { mmr: "", rankLabel: NOT_PLAYED_VALUE, hoursPlayed: "", primaryRole: "", experienceProofImageUrl: "" },
        };
      }
      return { ...prev, [gameId]: { ...prev[gameId], rankLabel: value } };
    });
  };

  const parseOptionalInt = (raw: string): number | null | undefined => {
    const t = raw.trim();
    if (t === "") return undefined;
    const n = Number(t);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
    return n;
  };

  const normalizeSelectValueForSave = (raw: string): string => {
    const trimmed = raw.trim();
    return trimmed === CUSTOM_SENTINEL ? "" : trimmed;
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    const profiles: Array<{
      gameId: string;
      mmr: number | null;
      rankLabel: string | null;
      hoursPlayed: number | null;
      primaryRole: string | null;
      experienceProofImageUrl?: string;
    }> = [];
    for (const row of items) {
      const d = draft[row.game.id] ?? { mmr: "", rankLabel: "", hoursPlayed: "", primaryRole: "", experienceProofImageUrl: "" };
      const mmr = parseOptionalInt(d.mmr);
      const hoursPlayed = parseOptionalInt(d.hoursPlayed);
      if (mmr === null || hoursPlayed === null) {
        setError("Числовые поля должны быть целыми числами или пустыми");
        setSaving(false);
        return;
      }
      profiles.push({
        gameId: row.game.id,
        mmr: mmr === undefined ? null : mmr,
        rankLabel: normalizeSelectValueForSave(d.rankLabel) || null,
        hoursPlayed: hoursPlayed === undefined ? null : hoursPlayed,
        primaryRole: normalizeSelectValueForSave(d.primaryRole) || null,
        experienceProofImageUrl: d.experienceProofImageUrl.trim() || undefined,
      });
    }
    const res = await fetch("/api/account/game-profiles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profiles }),
    });
    const parsedPut = await parseResponseJson<{ error?: string }>(res);
    if (!parsedPut.ok) {
      setError(parsedPut.message);
      setSaving(false);
      return;
    }
    const body = parsedPut.data;
    if (!res.ok) {
      setError(body.error ?? "Не удалось сохранить");
      setSaving(false);
      return;
    }
    setMessage("Анкета сохранена");
    setSaving(false);
    router.refresh();
  };

  const sortedItems = useMemo(() => [...items], [items]);

  const uploadProof = async (gameId: string, file: File) => {
    setUploadingProofByGame((prev) => ({ ...prev, [gameId]: true }));
    try {
      const formData = new FormData();
      formData.append("proof", file);
      const response = await fetch("/api/uploads/experience-proof", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as { proofImageUrl?: string; error?: string };
      if (!response.ok || !body.proofImageUrl) {
        setError(body.error ?? "Не удалось загрузить скриншот");
        return;
      }
      setDraft((prev) => ({
        ...prev,
        [gameId]: { ...prev[gameId], experienceProofImageUrl: body.proofImageUrl ?? "" },
      }));
      setMessage("Скриншот загружен. Нажмите «Сохранить анкету», чтобы отправить подтверждение на проверку.");
    } catch {
      setError("Не удалось загрузить скриншот");
    } finally {
      setUploadingProofByGame((prev) => ({ ...prev, [gameId]: false }));
    }
  };

  if (loading) {
    return <p className="text-sm text-zinc-400">Загрузка игр…</p>;
  }

  return (
    <div className="space-y-6">
      {sortedItems.map((row) => {
        const cover = getGameCoverUrl(row.game.slug);
        const decor = getGameCoverDecor(row.game.slug);
        const d = draft[row.game.id] ?? { mmr: "", rankLabel: "", hoursPlayed: "", primaryRole: "", experienceProofImageUrl: "" };
        const ui = getGameQuestionnaireUi(row.game.slug);
        const verificationStatus = row.profile?.experienceVerificationStatus ?? "NOT_SUBMITTED";
        const verificationNote = row.profile?.experienceVerificationNote ?? "";
        const notPlayed = isNotPlayed(d.rankLabel);

        return (
          <article
            key={row.game.id}
            className="overflow-hidden rounded-xl border border-[#323232] shadow-lg shadow-black/25"
          >
            <div className="flex flex-col md:flex-row">
              {cover && (
                <div
                  className={`relative h-40 w-full shrink-0 overflow-hidden md:h-auto md:min-h-[220px] md:w-52 ${decor.stripRingClass}`}
                >
                  <div className={`absolute inset-0 ${decor.panelBgClass}`} aria-hidden />
                  <GameCoverImageStack
                    slug={row.game.slug}
                    alt=""
                    className="absolute inset-0 h-full w-full"
                    sizes="(max-width: 768px) 100vw, 208px"
                  />
                  <p className="absolute bottom-2 left-3 z-20 text-sm font-black uppercase tracking-wider text-[#14ffec] drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
                    {row.game.name}
                  </p>
                </div>
              )}
              <div className="flex flex-1 flex-col gap-3 border-t border-[#2a2a2a] bg-[#1e1e1e] p-4 md:border-l md:border-t-0">
                {!cover && <h2 className="text-lg font-black uppercase tracking-wider text-[#14ffec]">{row.game.name}</h2>}
                <p className="text-sm leading-relaxed text-zinc-400">{ui.blurb}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">{ui.rank.label}</span>
                    <SelectOrTextRank
                      config={ui.rank}
                      value={d.rankLabel}
                      onChange={(v) => updateRankLabel(row.game.id, v)}
                    />
                  </label>
                  {!notPlayed && ui.numeric.show && (
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">
                        {ui.numeric.label}
                        {ui.numeric.emphasizeOptional && (
                          <span className="ml-1 font-normal normal-case text-zinc-600">— можно оставить пустым</span>
                        )}
                      </span>
                      <input
                        className="input-base"
                        inputMode="numeric"
                        value={d.mmr}
                        onChange={(e) => updateField(row.game.id, "mmr", e.target.value)}
                        placeholder={ui.numeric.placeholder}
                      />
                    </label>
                  )}
                  {!notPlayed && (
                    <label className="block">
                      <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">{ui.hours.label}</span>
                      <input
                        className="input-base"
                        inputMode="numeric"
                        value={d.hoursPlayed}
                        onChange={(e) => updateField(row.game.id, "hoursPlayed", e.target.value)}
                        placeholder={ui.hours.placeholder}
                      />
                    </label>
                  )}
                  {!notPlayed && (
                    <div className="sm:col-span-2">
                      <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">{ui.role.label}</span>
                      <SelectOrTextRole
                        config={ui.role}
                        value={d.primaryRole}
                        onChange={(v) => updateField(row.game.id, "primaryRole", v)}
                      />
                    </div>
                  )}
                </div>
                {notPlayed ? (
                  <div className="rounded-lg border border-[#323232] bg-[#212121] p-3">
                    <p className="text-xs uppercase tracking-wider text-zinc-400">Нет опыта</p>
                    <p className="mt-2 text-sm text-zinc-400">
                      Отмечено, что в этой дисциплине вы не играли. Ранг, часы и роль не нужны, скриншот тоже — в поиске
                      напарников по этой игре вас показывать не будем.
                    </p>
                    <button
                      type="button"
                      className="button-secondary mt-3 text-xs uppercase tracking-[0.12em]"
                      onClick={() => updateRankLabel(row.game.id, "")}
                    >
                      Я играю — заполнить
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#323232] bg-[#212121] p-3">
                    <p className="text-xs uppercase tracking-wider text-zinc-400">Подтверждение опыта</p>
                    <p className="mt-1 text-sm text-zinc-300">
                      Статус:{" "}
                      <span className="text-[#14ffec]">
                        {verificationStatus === "APPROVED"
                          ? "подтверждено"
                          : verificationStatus === "PENDING"
                            ? "на проверке"
                            : verificationStatus === "REJECTED"
                              ? "отклонено"
                              : "не отправлено"}
                      </span>
                    </p>
                    {verificationStatus === "REJECTED" && verificationNote && (
                      <p className="mt-2 rounded border border-[#3a3a3a] bg-[#1a1a1a] p-2 text-sm text-zinc-200">
                        Инструкция: {verificationNote}
                      </p>
                    )}
                    {d.experienceProofImageUrl && (
                      <div className="mt-3">
                        <PublicImage
                          src={d.experienceProofImageUrl}
                          alt={`Скриншот подтверждения опыта для ${row.game.name}`}
                          width={280}
                          height={160}
                          className="rounded border border-[#323232] object-cover"
                        />
                      </div>
                    )}
                    <label className="mt-3 block">
                      <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">
                        Скриншот опыта (PNG/JPG/WebP)
                      </span>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp"
                        className="input-base"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          void uploadProof(row.game.id, file);
                        }}
                      />
                    </label>
                    {uploadingProofByGame[row.game.id] ? (
                      <p className="mt-2 text-xs text-zinc-400">Загрузка скриншота...</p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}

      {error && <p className="rounded bg-[#323232] p-2 text-sm text-[#14ffec]">{error}</p>}
      {message && <p className="rounded bg-[#323232] p-2 text-sm text-zinc-300">{message}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="button" className="button-primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Сохранение…" : "Сохранить анкету"}
        </button>
        <button
          type="button"
          className="rounded border border-[#323232] px-4 py-2 text-sm text-zinc-300 hover:text-[#14ffec]"
          onClick={() => router.push(profileHref)}
        >
          К профилю
        </button>
      </div>
    </div>
  );
}
