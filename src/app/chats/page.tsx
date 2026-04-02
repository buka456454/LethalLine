"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PublicImage from "@/components/ui/PublicImage";
import SaiIcon from "@/components/ui/SaiIcon";
import UserRoleBadge from "@/components/ui/UserRoleBadge";

type Dialog = {
  id: string;
  peer: {
    id: string;
    username: string;
    role: "USER" | "ADMIN" | "SUPERADMIN" | "JOURNALIST" | "COMMENTATOR";
    displayName: string | null;
    avatarUrl: string | null;
  };
  updatedAt: string;
  unreadCount: number;
  lastMessage: { id: string; body: string; createdAt: string; senderId: string } | null;
};

type ChatMessage = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  readAt: string | null;
};

function ChatsPageInner() {
  const searchParams = useSearchParams();
  const requestedDialogId = searchParams.get("dialogId");

  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [activeDialogId, setActiveDialogId] = useState<string | null>(requestedDialogId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingDialogs, setLoadingDialogs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);

  const loadDialogs = useCallback(async () => {
    const res = await fetch("/api/chats/dialogs");
    const body = (await res.json()) as { dialogs?: Dialog[]; error?: string };
    if (!res.ok) throw new Error(body.error ?? "Не удалось загрузить диалоги");
    const next = body.dialogs ?? [];
    setDialogs(next);
    if (next.length > 0) {
      const firstId = next[0].id;
      setActiveDialogId((prev) => prev ?? requestedDialogId ?? firstId);
    }
  }, [requestedDialogId]);

  const loadMessages = useCallback(async (dialogId: string) => {
    const res = await fetch(`/api/chats/messages?dialogId=${encodeURIComponent(dialogId)}`);
    const body = (await res.json()) as { messages?: ChatMessage[]; error?: string };
    if (!res.ok) throw new Error(body.error ?? "Не удалось загрузить сообщения");
    setMessages(body.messages ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setLoadingDialogs(true);
        setError("");
        await loadDialogs();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки диалогов");
      } finally {
        setLoadingDialogs(false);
      }
    })();
  }, [loadDialogs]);

  useEffect(() => {
    if (!activeDialogId) {
      setMessages([]);
      return;
    }
    void (async () => {
      try {
        setLoadingMessages(true);
        setError("");
        await loadMessages(activeDialogId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки сообщений");
      } finally {
        setLoadingMessages(false);
      }
    })();
  }, [activeDialogId, loadMessages]);

  useEffect(() => {
    const source = new EventSource("/api/chats/stream");
    const refresh = () => {
      void loadDialogs();
      if (activeDialogId) void loadMessages(activeDialogId);
    };
    source.addEventListener("message_created", refresh);
    source.addEventListener("dialog_updated", refresh);
    source.onerror = () => {
      // Browser auto-reconnects EventSource, no custom action needed.
    };
    return () => source.close();
  }, [activeDialogId, loadDialogs, loadMessages]);

  useEffect(() => {
    if (!activeDialogId) return;
    inputRef.current?.focus();
  }, [activeDialogId]);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messages, activeDialogId, loadingMessages]);

  const sendMessage = async () => {
    if (!activeDialogId || sending) return;
    const body = draft.trim();
    if (!body) return;

    try {
      setSending(true);
      setError("");
      const res = await fetch("/api/chats/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dialogId: activeDialogId, body }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Не удалось отправить сообщение");
      setDraft("");
      await Promise.all([loadDialogs(), loadMessages(activeDialogId)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const activeDialog = useMemo(() => dialogs.find((d) => d.id === activeDialogId) ?? null, [activeDialogId, dialogs]);

  return (
    <div className="w-full space-y-4">
      <header className="flex items-center gap-3">
        <SaiIcon name="chat" size={20} />
        <h1 className="text-3xl font-black uppercase tracking-[0.14em] text-[#14ffec]">Личные чаты</h1>
      </header>

      {error && <p className="rounded bg-[#323232] p-2 text-sm text-[#14ffec]">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="surface rounded-xl p-3">
          <h2 className="text-xs uppercase tracking-[0.18em] text-zinc-500">Диалоги</h2>
          {loadingDialogs ? (
            <p className="mt-3 text-sm text-zinc-500">Загрузка…</p>
          ) : dialogs.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Диалогов пока нет.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {dialogs.map((dialog) => {
                const isActive = dialog.id === activeDialogId;
                const initials = (dialog.peer.displayName || dialog.peer.username || "U").slice(0, 2).toUpperCase();
                return (
                  <li key={dialog.id}>
                    <button
                      type="button"
                      className={`flex w-full items-start gap-3 rounded-lg border p-2 text-left transition ${
                        isActive ? "border-[#0d7377] bg-[#1b1b1b]" : "border-[#323232] hover:border-[#0d7377]"
                      }`}
                      onClick={() => setActiveDialogId(dialog.id)}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#323232] bg-[#323232]">
                        {dialog.peer.avatarUrl ? (
                          <PublicImage src={dialog.peer.avatarUrl} alt="" width={40} height={40} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-black text-[#14ffec]">{initials}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate text-sm font-semibold text-zinc-100">
                          <span className="truncate">{dialog.peer.displayName || dialog.peer.username}</span>
                          <UserRoleBadge role={dialog.peer.role} size="sm" />
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {dialog.lastMessage?.body ?? "Начните общение"}
                        </p>
                      </div>
                      {dialog.unreadCount > 0 && (
                        <span className="rounded-full bg-[#0d7377] px-2 py-0.5 text-xs font-semibold text-zinc-100">
                          {dialog.unreadCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="surface flex h-[70vh] min-h-[520px] max-h-[760px] min-w-0 flex-col overflow-hidden rounded-xl">
          <div className="border-b border-[#323232] px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <span>{activeDialog ? activeDialog.peer.displayName || activeDialog.peer.username : "Выберите диалог"}</span>
              {activeDialog && <UserRoleBadge role={activeDialog.peer.role} size="sm" />}
            </p>
            {activeDialog && <p className="text-xs text-zinc-500">@{activeDialog.peer.username}</p>}
          </div>

          <div className="min-h-0 flex-1 p-4">
            <div
              ref={messagesViewportRef}
              className="h-full space-y-2 overflow-y-auto overscroll-contain rounded-lg border border-[#323232] bg-[#191919] p-3"
            >
            {!activeDialog ? (
              <p className="text-sm text-zinc-500">Откройте диалог слева, чтобы писать сообщения.</p>
            ) : loadingMessages ? (
              <p className="text-sm text-zinc-500">Загрузка сообщений…</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-zinc-500">Сообщений пока нет. Напишите первым.</p>
            ) : (
              messages.map((msg) => {
                const isOwn = Boolean(activeDialog && msg.senderId !== activeDialog.peer.id);
                return (
                  <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                    <article
                      className={`max-w-[85%] rounded-lg border p-3 ${
                        isOwn
                          ? "border-[#0d7377] bg-[#0f2a2b] text-zinc-100"
                          : "border-[#323232] bg-[#1b1b1b] text-zinc-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm">{msg.body}</p>
                      <p className={`mt-1 text-[11px] ${isOwn ? "text-[#8de9e1]" : "text-zinc-500"}`}>
                        {new Date(msg.createdAt).toLocaleString("ru-RU")}
                      </p>
                    </article>
                  </div>
                );
              })
            )}
            </div>
          </div>

          <div className="border-t border-[#323232] p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                className="input-base"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={activeDialog ? "Введите сообщение" : "Сначала выберите диалог"}
                disabled={!activeDialog}
                maxLength={1200}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <button
                type="button"
                className="button-primary"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void sendMessage()}
                disabled={!activeDialog || sending}
              >
                {sending ? "..." : "Отправить"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ChatsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Загрузка чатов…</p>}>
      <ChatsPageInner />
    </Suspense>
  );
}
