/** Нормализация российского номера в E.164 вида +7XXXXXXXXXX (10 цифр после 7). */
export function normalizeRuPhoneE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  let n = digits;
  if (n.length === 11 && n.startsWith("8")) n = "7" + n.slice(1);
  if (n.length === 10) n = "7" + n;
  if (n.length === 11 && n.startsWith("7")) return `+${n}`;
  if (n.length > 0) return `+${n}`;
  return raw.trim();
}

export function maskPhoneE164(phone: string): string {
  if (phone.length < 8) return phone;
  return `${phone.slice(0, 3)} ••• •• ${phone.slice(-4)}`;
}
