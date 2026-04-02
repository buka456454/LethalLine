type ChatEvent =
  | { type: "message_created"; dialogId: string }
  | { type: "dialog_updated"; dialogId: string };

type Listener = (event: ChatEvent) => void;

const listenersByUser = new Map<string, Set<Listener>>();

export function subscribeChatEvents(userId: string, listener: Listener) {
  const bucket = listenersByUser.get(userId) ?? new Set<Listener>();
  bucket.add(listener);
  listenersByUser.set(userId, bucket);
  return () => {
    const current = listenersByUser.get(userId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) listenersByUser.delete(userId);
  };
}

export function publishChatEvents(userIds: string[], event: ChatEvent) {
  for (const userId of userIds) {
    const listeners = listenersByUser.get(userId);
    if (!listeners || listeners.size === 0) continue;
    for (const listener of listeners) listener(event);
  }
}
