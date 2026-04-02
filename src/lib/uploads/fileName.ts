/**
 * Имя файла в URL: безопасные символы, ограниченная длина.
 * Поддерживает UUID от randomUUID() и старые имена из public/uploads.
 */
const SAFE_UPLOAD_BASENAME = /^[a-zA-Z0-9._-]{1,180}\.(png|jpe?g|webp)$/i;

export function isSafeUploadBasename(name: string): boolean {
  if (name.includes("..") || name.includes("/") || name.includes("\\")) return false;
  return SAFE_UPLOAD_BASENAME.test(name);
}
