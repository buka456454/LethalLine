import path from "node:path";

/** Подпапки внутри корня загрузок (совпадают с URL /uploads/...) */
export const UPLOAD_KINDS = ["avatars", "team-logos", "news", "experience-proofs"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

/**
 * Корень пользовательских загрузок на диске.
 * В проде задайте UPLOAD_STORAGE_ROOT (абсолютный путь) и смонтируйте том.
 * По умолчанию: <cwd>/storage/uploads — не в public/, файлы отдаются через /uploads/... route.
 */
export function getUploadStorageRoot(): string {
  const fromEnv = process.env.UPLOAD_STORAGE_ROOT?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(/* turbopackIgnore: true */ process.cwd(), "storage", "uploads");
}

export function getKindDir(kind: UploadKind): string {
  return path.join(getUploadStorageRoot(), kind);
}

/** Легаси: раньше писали в public/uploads */
export function getLegacyPublicUploadsRoot(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "public", "uploads");
}
