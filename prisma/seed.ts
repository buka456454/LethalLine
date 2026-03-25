import { PrismaClient, RegistrationStatus, Role, TournamentFormat, TournamentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateSingleEliminationMatches } from "../src/lib/bracket";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("Admin12345!", 12);

  const superadmin = await prisma.user.upsert({
    where: { email: "superadmin@lethalline.gg" },
    update: {},
    create: {
      email: "superadmin@lethalline.gg",
      username: "superadmin",
      passwordHash: adminPassword,
      role: Role.SUPERADMIN,
    },
  });

  const game = await prisma.game.upsert({
    where: { slug: "counter-strike-2" },
    update: {},
    create: {
      name: "Counter-Strike 2",
      slug: "counter-strike-2",
      description: "Main tactical discipline",
    },
  });

  const tournament = await prisma.tournament.upsert({
    where: { slug: "spring-clash-2026" },
    update: {},
    create: {
      title: "Spring Clash 2026",
      slug: "spring-clash-2026",
      description: "Стартовый турнир платформы.",
      format: TournamentFormat.SINGLE_ELIMINATION,
      status: TournamentStatus.REGISTRATION_OPEN,
      maxParticipants: 16,
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      gameId: game.id,
      isPublished: true,
    },
  });

  const matchCount = await prisma.match.count({ where: { tournamentId: tournament.id } });
  if (matchCount === 0) {
    await prisma.match.createMany({
      data: generateSingleEliminationMatches(16).map((m) => ({
        tournamentId: tournament.id,
        round: m.round,
        orderInRound: m.orderInRound,
        bracketSegment: m.bracketSegment,
      })),
    });
  }

  const bannerExists = await prisma.banner.findFirst({ where: { title: "Новый сезон начинается - регистрируйся сейчас" } });
  if (!bannerExists) {
    await prisma.banner.create({
      data: {
        title: "Новый сезон начинается - регистрируйся сейчас",
        subtitle: "Lethal Line Arena",
        isActive: true,
      },
    });
  }

  const newsExists = await prisma.newsPost.findFirst({ where: { title: "Платформа запущена" } });
  if (!newsExists) {
    await prisma.newsPost.create({
      data: {
        title: "Платформа запущена",
        body: "Базовые модули регистрации, турниров и админки уже доступны.",
        authorId: superadmin.id,
        isPinned: true,
      },
    });
  }

  await prisma.tournamentRegistration.createMany({
    data: [
      {
        userId: superadmin.id,
        tournamentId: tournament.id,
        status: RegistrationStatus.APPROVED,
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
