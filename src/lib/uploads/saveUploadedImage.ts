import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { UploadKind } from "./paths";
import { getKindDir } from "./paths";
import { sniffImageBuffer } from "./imageSniff";

export type SaveUploadResult = { publicPath: string; absolutePath: string };

/**
 * Сохраняет буфер после проверки сигнатуры. Публичный URL всегда /uploads/{kind}/{uuid}{ext}
 */
export async function saveUploadedImage(
  kind: UploadKind,
  buffer: Buffer,
  options: { maxBytes: number },
): Promise<{ ok: true; value: SaveUploadResult } | { ok: false; status: number; message: string }> {
  if (buffer.length > options.maxBytes) {
    return { ok: false, status: 413, message: `File too large (max ${Math.round(options.maxBytes / 1024)}KB)` };
  }

  const sniffed = sniffImageBuffer(buffer);
  if (!sniffed) {
    return { ok: false, status: 415, message: "Invalid image: allowed PNG, JPEG, WebP only" };
  }

  const filename = `${randomUUID()}${sniffed.extension}`;
  const dir = getKindDir(kind);
  await mkdir(dir, { recursive: true });
  const absolutePath = path.join(dir, filename);
  await writeFile(absolutePath, buffer);

  return {
    ok: true,
    value: {
      publicPath: `/uploads/${kind}/${filename}`,
      absolutePath,
    },
  };
}
