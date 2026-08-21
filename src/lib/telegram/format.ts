export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function appBaseUrl() {
  const raw =
    process.env.APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "https://lethalline.ru";
  return raw.replace(/\/$/, "");
}

export function adminApplicationsUrl() {
  return `${appBaseUrl()}/admin/applications`;
}

export function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}
