"use client";

import { useEffect, useState } from "react";

type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel: string;
};

function parseTyped(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

export default function NumberStepper({
  value,
  onChange,
  min,
  max,
  step,
  disabled = false,
  placeholder,
  ariaLabel,
}: Props) {
  const [text, setText] = useState(value == null ? "" : String(value));

  useEffect(() => {
    setText(value == null ? "" : String(value));
  }, [value]);

  const commit = (next: number | null) => {
    if (next == null) {
      onChange(null);
      setText("");
      return;
    }
    const clamped = Math.min(max, Math.max(min, next));
    onChange(clamped);
    setText(String(clamped));
  };

  const bump = (direction: 1 | -1) => {
    if (disabled) return;
    if (value == null) {
      if (direction < 0) return;
      commit(min > 0 ? min : step);
      return;
    }
    commit(value + direction * step);
  };

  return (
    <div className="flex h-[42px] overflow-hidden rounded-[0.35rem] border border-[rgba(50,50,50,0.95)] bg-[#141414] focus-within:border-[#0d7377] focus-within:shadow-[0_0_0_1px_rgba(20,255,236,0.28)]">
      <button
        type="button"
        disabled={disabled}
        aria-label={`${ariaLabel}: меньше`}
        className="w-10 shrink-0 text-lg text-zinc-400 transition hover:text-[#14ffec] disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => bump(-1)}
      >
        −
      </button>
      <input
        className="min-w-0 flex-1 bg-transparent px-1 text-center text-sm text-[#f4f4f4] outline-none disabled:cursor-not-allowed disabled:opacity-50"
        inputMode="numeric"
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(event) => {
          const next = event.target.value;
          if (next !== "" && !/^\d+$/.test(next)) return;
          setText(next);
          onChange(parseTyped(next));
        }}
        onBlur={() => commit(parseTyped(text))}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={`${ariaLabel}: больше`}
        className="w-10 shrink-0 text-lg text-zinc-400 transition hover:text-[#14ffec] disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => bump(1)}
      >
        +
      </button>
    </div>
  );
}
