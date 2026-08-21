import type { InlineKeyboardMarkup } from "@/lib/telegram/client";

export function regKeyboard(id: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `reg:approve:${id}` },
        { text: "❌ Reject", callback_data: `reg:reject:${id}` },
      ],
    ],
  };
}

export function teamKeyboard(id: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `team:approve:${id}` },
        { text: "❌ Reject", callback_data: `team:reject:${id}` },
      ],
    ],
  };
}

export function expKeyboard(id: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `exp:approve:${id}` },
        { text: "❌ Reject", callback_data: `exp:reject:${id}` },
      ],
    ],
  };
}

export function userKeyboard(id: string, isBanned: boolean): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        isBanned
          ? { text: "♻️ Unban", callback_data: `user:unban:${id}` }
          : { text: "🚫 Ban", callback_data: `user:ban:${id}` },
      ],
      [
        { text: "Role: USER", callback_data: `user:role:${id}:USER` },
        { text: "Role: ADMIN", callback_data: `user:role:${id}:ADMIN` },
      ],
    ],
  };
}
