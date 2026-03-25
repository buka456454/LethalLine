import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const payloadSchema = z.object({
  type: z.enum(["news", "banner"]),
  title: z.string().min(2).max(140),
  body: z.string().max(3000).optional(),
  subtitle: z.string().max(240).optional(),
  ctaLabel: z.string().max(40).optional(),
  ctaHref: z.url().optional(),
  isPinned: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const [news, banners] = await Promise.all([
    prisma.newsPost.findMany({ include: { author: true }, orderBy: { createdAt: "desc" } }),
    prisma.banner.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  return ok({ news, banners });
}

export async function POST(request: Request) {
  try {
    const session = await requireOwnerAdmin();
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid payload", 422);

    if (parsed.data.type === "news") {
      const news = await prisma.newsPost.create({
        data: {
          title: parsed.data.title,
          body: parsed.data.body ?? "",
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

    const banner = await prisma.banner.create({
      data: {
        title: parsed.data.title,
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
