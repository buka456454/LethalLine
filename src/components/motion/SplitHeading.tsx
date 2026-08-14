"use client";

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Маска-ревил по словам: слова выезжают из-под линии, как в референсе. */
export default function SplitHeading({
  text,
  className,
  level = 1,
  delay = 0.1,
}: {
  text: string;
  className?: string;
  level?: 1 | 2 | 3;
  delay?: number;
}) {
  const words = text.split(" ");
  const Tag = level === 1 ? motion.h1 : level === 2 ? motion.h2 : motion.h3;

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: delay } } }}
    >
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block pb-[0.08em]"
            variants={{ hidden: { y: "115%", opacity: 0 }, show: { y: "0%", opacity: 1 } }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            {word}
            {index < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
