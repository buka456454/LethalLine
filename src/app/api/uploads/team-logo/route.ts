import { fail, ok } from "@/lib/api";
import { requireAuth } from "@/lib/guards";
import { saveUploadedImage } from "@/lib/uploads/saveUploadedImage";

const MAX_BYTES = 3 * 1024 * 1024;

const BLOCKED_TYPES = new Set(["image/svg+xml", "text/html", "application/xhtml+xml"]);

export async function POST(request: Request) {
  try {
    await requireAuth();
    const formData = await request.formData();
    const file = formData.get("logo");

    if (!(file instanceof File)) return fail("Logo file is required", 422);
    if (file.type && BLOCKED_TYPES.has(file.type)) return fail("Unsupported image type", 415);
    if (file.size > MAX_BYTES) return fail("File too large (max 3MB)", 413);

    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveUploadedImage("team-logos", buffer, { maxBytes: MAX_BYTES });
    if (!saved.ok) return fail(saved.message, saved.status);

    return ok({ logoUrl: saved.value.publicPath }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Upload failed", 500);
  }
}
