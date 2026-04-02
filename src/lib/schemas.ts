import { TournamentFormat, TournamentStatus } from "@prisma/client";
import { normalizeRuPhoneE164 } from "@/lib/phone";
import { z } from "zod";

const ruPhoneE164 = z
  .string()
  .trim()
  .transform((v) => normalizeRuPhoneE164(v))
  .pipe(z.string().regex(/^\+7\d{10}$/, "Неверный номер телефона"));

export const registerSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  username: z.string().trim().min(3).max(24),
  password: z.string().min(8).max(128),
  phone: z.union([ruPhoneE164, z.literal(""), z.null()]).optional(),
});

export const loginSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
});

/** 6 цифр из SMS подтверждения телефона */
export const verifyPhoneCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((s) => s.replace(/\D/g, ""))
    .pipe(z.string().length(6).regex(/^\d{6}$/, "Нужен код из 6 цифр")),
});

export const createGameSchema = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  iconUrl: z.url().optional(),
});

export const createTournamentSchema = z.object({
  title: z.string().min(4).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  format: z.enum(TournamentFormat),
  status: z.enum(TournamentStatus).optional(),
  isPublished: z.boolean().optional(),
  teamSize: z.union([z.literal(1), z.literal(2), z.literal(5)]),
  maxTeams: z.number().int().min(2).max(512),
  entryFeeMinor: z.number().int().min(0).max(10_000_000).optional(),
  eventDate: z.iso.datetime().optional(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime().optional().nullable(),
  prizeMode: z.enum(["ENTRY_FEES", "SPONSOR"]).optional(),
  sponsorPrizeText: z.string().max(1000).optional(),
  rules: z.string().max(3000).optional(),
  requiresVerifiedExperience: z.boolean().optional(),
  gameId: z.string().cuid(),
});

export const adminTournamentPatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("complete"),
  }),
  z.object({
    action: z.literal("setStatus"),
    status: z.enum(TournamentStatus),
  }),
]);

export const updateMatchSchema = z.object({
  scoreA: z.number().int().min(0).max(99),
  scoreB: z.number().int().min(0).max(99),
  status: z.enum(["SCHEDULED", "LIVE", "FINISHED"]),
  winnerLabel: z.string().max(120).optional(),
});

/** HTTPS URL или путь к загрузке вида /uploads/<kind>/… */
export const imageUrlOrPathSchema = z
  .string()
  .max(2048)
  .refine(
    (s) => {
      if (s === "") return true;
      if (/^\/uploads\/(avatars|team-logos|experience-proofs)\/[a-zA-Z0-9._-]{1,180}\.(png|jpe?g|webp)$/i.test(s)) return true;
      try {
        const u = new URL(s);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Must be http(s) URL or /uploads/… image path" },
  );

export const teamApplicationSchema = z.object({
  teamName: z.string().trim().min(1).max(60),
  teamLogoUrl: imageUrlOrPathSchema.optional(),
  memberUsernames: z.array(z.string().trim().min(3).max(24)).min(0).max(12),
});

/** Пустая строка из формы = «поле не заполняли» (как undefined). */
const emptyOrPassword = z.union([z.literal(""), z.string().min(8).max(128)]).optional();

export const accountUpdateSchema = z
  .object({
    email: z.email().transform((value) => value.trim().toLowerCase()),
    /** Пустая строка = сбросить номер; иначе нормализованный +7… */
    phone: z
      .string()
      .transform((s) => {
        const t = s.trim();
        if (t === "") return null;
        return normalizeRuPhoneE164(t);
      })
      .refine((p) => p === null || /^\+7\d{10}$/.test(p), { message: "Неверный номер телефона" }),
    /** Как при регистрации — без ограничения только латиницей (уже существующие ники валидны). */
    username: z.string().trim().min(3).max(24),
    displayName: z.string().trim().max(60).optional(),
    avatarUrl: imageUrlOrPathSchema.optional(),
    bio: z.string().trim().max(240).optional(),
    currentPassword: emptyOrPassword,
    newPassword: emptyOrPassword,
  })
  .refine((data) => !data.newPassword || (typeof data.currentPassword === "string" && data.currentPassword.length >= 8), {
    path: ["currentPassword"],
    message: "Current password is required",
  });

const nullableTrimmed = (max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v == null) return undefined;
      const t = String(v).trim();
      if (t === "") return undefined;
      return t.length > max ? t.slice(0, max) : t;
    });

export const userGameProfileEntrySchema = z.object({
  gameId: z.string().cuid(),
  mmr: z.number().int().min(0).max(20_000).nullable().optional(),
  rankLabel: nullableTrimmed(80),
  hoursPlayed: z.number().int().min(0).max(200_000).nullable().optional(),
  primaryRole: nullableTrimmed(80),
  experienceProofImageUrl: imageUrlOrPathSchema.optional(),
});

export const putUserGameProfilesSchema = z.object({
  profiles: z.array(userGameProfileEntrySchema).max(64),
});

export const adminExperienceVerificationPatchSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "REJECTED" && !data.note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "Instruction is required when rejecting verification",
      });
    }
  });
