import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fail, ok } from "@/lib/api";
import { requireAuth } from "@/lib/guards";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export async function POST(request: Request) {
  try {
    await requireAuth();
    const formData = await request.formData();
    const file = formData.get("logo");

    if (!(file instanceof File)) return fail("Logo file is required", 422);
    if (!ALLOWED_TYPES.has(file.type)) return fail("Unsupported image type", 415);
    if (file.size > 3 * 1024 * 1024) return fail("File too large (max 3MB)", 413);

    const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : ".png";
    const filename = `${randomUUID()}${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "team-logos");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    return ok({ logoUrl: `/uploads/team-logos/${filename}` }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Upload failed", 500);
  }
}
