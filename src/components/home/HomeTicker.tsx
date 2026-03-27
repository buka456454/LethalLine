"use client";

import * as React from "react";

type Props = {
  className?: string;
  repeatCount?: number;
  rotateEveryMs?: number;
};

const WORD_SETS = [
  ["LETHAL LINE", "ТУРНИРЫ", "МАТЧИ LIVE", "СЕТКА", "КОМАНДЫ", "НОВОСТИ", "СТРИМ", "ESPORTS"],
  ["LETHAL LINE", "REG OPEN", "IN PROGRESS", "BRACKET", "LIVE SCORES", "ADMIN HUB", "NEWS", "STREAM"],
  ["LETHAL LINE", "КИБЕРСПОРТ", "ЛИГИ", "СЕЗОН", "РЕЙТИНГИ", "СТАТИСТИКА", "ТРАНСЛЯЦИИ", "COMMUNITY"],
] as const;

export default function HomeTicker({ className, repeatCount = 4, rotateEveryMs = 3500 }: Props) {
  const [setIndex, setSetIndex] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setSetIndex((prev) => (prev + 1) % WORD_SETS.length);
    }, rotateEveryMs);
    return () => window.clearInterval(id);
  }, [rotateEveryMs]);

  const words = WORD_SETS[setIndex] ?? WORD_SETS[0];

  return (
    <section className={className}>
      <div className="ticker-viewport">
        <div className="ticker-track" aria-label="Lethal Line ticker">
          {Array.from({ length: repeatCount }).flatMap((_, repeatIndex) =>
            words.map((word, wordIndex) => (
              <span
                key={`${setIndex}-${repeatIndex}-${wordIndex}-${word}`}
                className="ticker-item"
                aria-hidden={repeatIndex === 0 ? undefined : true}
              >
                {word}
              </span>
            )),
          )}
        </div>
      </div>
    </section>
  );
}

