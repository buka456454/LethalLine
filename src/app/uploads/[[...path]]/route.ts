import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fail } from "@/lib/api";
import { readSession } from "@/lib/auth";
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
 * Публичная раздача /uploads/... из storage/uploads.
 * experience-proofs — только для авторизованных (скриншоты аккаунтов).
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

  if (kind === "experience-proofs") {
    const session = await readSession();
    if (!session) return fail("Unauthorized", 401);
  }

  const storageRoot = path.resolve(getUploadStorageRoot());
  const legacyRoot = path.resolve(getLegacyPublicUploadsRoot());
  const storagePath = path.resolve(storageRoot, kind, basename);
  const legacyPath = path.resolve(legacyRoot, kind, basename);

  // Defense-in-depth: basename уже whitelist, но путь не должен выйти из корня.
  if (!storagePath.startsWith(storageRoot + path.sep) || !legacyPath.startsWith(legacyRoot + path.sep)) {
    return fail("Not found", 404);
  }

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
  const privateProof = kind === "experience-proofs";

  const stream = createReadStream(filePath);
  const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": privateProof ? "private, no-store" : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      ...(privateProof ? { "Content-Disposition": "inline" } : {}),
    },
  });
}
