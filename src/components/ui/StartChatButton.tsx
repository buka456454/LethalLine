"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StartChatButton({
  peerUserId,
  label = "Написать",
  className,
}: {
  peerUserId: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      className={className ?? "button-primary"}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/chats/dialogs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ peerUserId }),
          });
          const body = (await res.json()) as { dialogId?: string; error?: string };
          if (!res.ok || !body.dialogId) throw new Error(body.error ?? "Не удалось открыть чат");
          router.push(`/chats?dialogId=${encodeURIComponent(body.dialogId)}`);
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Открытие…" : label}
    </button>
  );
}
