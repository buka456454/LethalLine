import { TournamentFormat, TournamentStatus } from "@prisma/client";
import { z } from "zod";

export const registerSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  username: z.string().trim().min(3).max(24),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
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
  maxParticipants: z.number().int().min(2).max(512),
  entryFeeMinor: z.number().int().min(0).max(10_000_000).optional(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime().optional(),
  rules: z.string().max(3000).optional(),
  gameId: z.string().cuid(),
});

export const updateMatchSchema = z.object({
  scoreA: z.number().int().min(0).max(99),
  scoreB: z.number().int().min(0).max(99),
  status: z.enum(["SCHEDULED", "LIVE", "FINISHED"]),
  winnerLabel: z.string().max(120).optional(),
});

export const teamApplicationSchema = z.object({
  teamName: z.string().trim().min(2).max(60),
  teamLogoUrl: z.url().optional().or(z.literal("")),
  memberUsernames: z.array(z.string().trim().min(3).max(24)).min(1).max(12),
});

export const accountUpdateSchema = z
  .object({
    email: z.email().transform((value) => value.trim().toLowerCase()),
    username: z
      .string()
      .trim()
      .min(3)
      .max(24)
      .regex(/^[a-zA-Z0-9_]+$/),
    displayName: z.string().trim().max(60).optional(),
    avatarUrl: z.url().optional().or(z.literal("")),
    bio: z.string().trim().max(240).optional(),
    currentPassword: z.string().min(8).max(128).optional(),
    newPassword: z.string().min(8).max(128).optional(),
  })
  .refine((data) => !data.newPassword || !!data.currentPassword, {
    path: ["currentPassword"],
    message: "Current password is required",
  });
