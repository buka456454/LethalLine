import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireNewsManager, requireOwnerAdmin, requireStreamCommentManager } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const payloadSchema = z.object({
  type: z.enum(["news", "banner", "stream-comment"]),
  title: z.string().min(2).max(140).optional(),
  body: z.string().max(3000).optional(),
  imageUrl: z.string().max(500).optional(),
  streamCommentText: z.string().min(10).max(900).optional(),
  subtitle: z.string().max(240).optional(),
  ctaLabel: z.string().max(40).optional(),
  ctaHref: z.url().optional(),
  isPinned: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const [news, banners, streamComment] = await Promise.all([
    prisma.newsPost.findMany({ include: { author: true }, orderBy: { createdAt: "desc" } }),
    prisma.banner.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.streamComment.findUnique({ where: { key: "main" }, select: { text: true, updatedAt: true } }),
  ]);
  return ok({ news, banners, streamComment });
}

export async function POST(request: Request) {
  try {
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid payload", 422);

    if (parsed.data.type === "news") {
      const session = await requireNewsManager();
      const title = parsed.data.title?.trim();
      if (!title) return fail("Заголовок обязателен", 422);
      const news = await prisma.newsPost.create({
        data: {
          title,
          body: parsed.data.body ?? "",
          imageUrl: parsed.data.imageUrl,
          isPinned: parsed.data.isPinned ?? false,
          authorId: session.sub,
        },
      });
      await writeAuditLog({
        actorId: session.sub,
        action: "NEWS_CREATED",
        entity: "NewsPost",
        entityId: news.id,
      });
      return ok({ news }, 201);
    }

    if (parsed.data.type === "stream-comment") {
      const session = await requireStreamCommentManager();
      const text = parsed.data.streamCommentText?.trim();
      if (!text) return fail("Комментарий обязателен", 422);

      const streamComment = await prisma.streamComment.upsert({
        where: { key: "main" },
        update: {
          text,
          updatedById: session.sub,
        },
        create: {
          key: "main",
          text,
          updatedById: session.sub,
        },
      });

      await writeAuditLog({
        actorId: session.sub,
        action: "STREAM_COMMENT_UPDATED",
        entity: "StreamComment",
        entityId: streamComment.id,
      });
      return ok({ streamComment }, 201);
    }

    const session = await requireOwnerAdmin();
    const title = parsed.data.title?.trim();
    if (!title) return fail("Заголовок обязателен", 422);
    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle: parsed.data.subtitle,
        ctaLabel: parsed.data.ctaLabel,
        ctaHref: parsed.data.ctaHref,
        isActive: parsed.data.isActive ?? true,
      },
    });
    await writeAuditLog({
      actorId: session.sub,
      action: "BANNER_CREATED",
      entity: "Banner",
      entityId: banner.id,
    });
    return ok({ banner }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Failed to create content", 500);
  }
}
