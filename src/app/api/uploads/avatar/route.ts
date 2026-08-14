import { fail, ok } from "@/lib/api";
import { requireAuth } from "@/lib/guards";
import { rateLimit } from "@/lib/rate-limit";
import { saveUploadedImage } from "@/lib/uploads/saveUploadedImage";

const MAX_BYTES = 2 * 1024 * 1024;

/** Не доверяем client MIME и расширению — проверяется сигнатура в saveUploadedImage. */
const BLOCKED_TYPES = new Set(["image/svg+xml", "text/html", "application/xhtml+xml"]);

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const limit = rateLimit(`upload-avatar:${session.sub}`, 20, 60 * 60_000);
    if (!limit.allowed) return fail("Слишком много загрузок. Попробуйте позже.", 429);
    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!(file instanceof File)) return fail("Avatar file is required", 422);
    if (file.type && BLOCKED_TYPES.has(file.type)) return fail("Unsupported image type", 415);
    if (file.size > MAX_BYTES) return fail("File too large (max 2MB)", 413);

    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveUploadedImage("avatars", buffer, { maxBytes: MAX_BYTES });
    if (!saved.ok) return fail(saved.message, saved.status);

    return ok({ avatarUrl: saved.value.publicPath }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Upload failed", 500);
  }
}
