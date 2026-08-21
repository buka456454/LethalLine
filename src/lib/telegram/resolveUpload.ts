import fs from "node:fs";
import path from "node:path";
import { getLegacyPublicUploadsRoot, getUploadStorageRoot } from "@/lib/uploads/paths";

/**
 * Maps a public upload URL/path to a local filesystem path for Telegram attach.
 * Supports `/uploads/...` and absolute site URLs ending with that path.
 */
export function resolveLocalUploadPath(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null;

  let pathname = publicUrl.trim();
  try {
    if (/^https?:\/\//i.test(pathname)) {
      pathname = new URL(pathname).pathname;
    }
  } catch {
    return null;
  }

  const match = pathname.match(/^\/uploads\/([a-z0-9-]+)\/([a-zA-Z0-9._-]{1,180})$/i);
  if (!match) return null;

  const kind = match[1];
  const filename = match[2];
  if (!kind || !filename) return null;

  const candidates = [
    path.join(getUploadStorageRoot(), kind, filename),
    path.join(getLegacyPublicUploadsRoot(), kind, filename),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // continue
    }
  }

  return null;
}
