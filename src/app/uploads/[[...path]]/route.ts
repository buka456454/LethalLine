import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fail } from "@/lib/api";
import { isSafeUploadBasename } from "@/lib/uploads/fileName";
import { UPLOAD_KINDS, getLegacyPublicUploadsRoot, getUploadStorageRoot, type UploadKind } from "@/lib/uploads/paths";

function extMime(ext: string): string {
  const e = ext.toLowerCase();
  if (e === ".png") return "image/png";
  if (e === ".jpg" || e === ".jpeg") return "image/jpeg";
  if (e === ".webp") return "image/webp";
  return "application/octet-stream";
}

function isUploadKind(s: string): s is UploadKind {
  return (UPLOAD_KINDS as readonly string[]).includes(s);
}

export const runtime = "nodejs";

/**
 * Публичная раздача /uploads/avatars/* и /uploads/team-logos/* из storage/uploads.
 * Файлы в public/uploads по-прежнему отдаёт Next как статику, если лежат там (легаси).
 */
export async function GET(_request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const { path: segments } = await context.params;
  if (!segments || segments.length !== 2) {
    return fail("Not found", 404);
  }

  const [kind, basename] = segments;
  if (!isUploadKind(kind) || !isSafeUploadBasename(basename)) {
    return fail("Not found", 404);
  }

  const storagePath = path.join(getUploadStorageRoot(), kind, basename);
  const legacyPath = path.join(getLegacyPublicUploadsRoot(), kind, basename);

  let filePath = storagePath;
  try {
    await stat(filePath);
  } catch {
    try {
      await stat(legacyPath);
      filePath = legacyPath;
    } catch {
      return fail("Not found", 404);
    }
  }

  const ext = path.extname(basename);
  const contentType = extMime(ext);

  const stream = createReadStream(filePath);
  const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
