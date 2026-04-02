/**
 * Canonical cover images live in /public/games. Slug → file mapping is centralized here.
 * Legacy slug `counter-strike-2` maps to the same asset as `cs2`.
 */

export const GAME_COVER_BY_SLUG: Record<string, string> = {
  valorant: "/games/valorant.jpg",
  "dota-2": "/games/dota2.jpg",
  cs2: "/games/cs2.jpg",
  "counter-strike-2": "/games/cs2.jpg",
};

export type CoreGameDef = {
  slug: string;
  name: string;
  description: string;
};

export const CORE_GAMES: CoreGameDef[] = [
  { slug: "valorant", name: "Valorant", description: "Тактический шутер Riot Games." },
  { slug: "dota-2", name: "Dota 2", description: "MOBA от Valve." },
  { slug: "cs2", name: "Counter-Strike 2", description: "Тактический шутер Valve." },
];

export function getGameCoverUrl(slug: string): string | undefined {
  return GAME_COVER_BY_SLUG[slug] ?? GAME_COVER_BY_SLUG[slug.toLowerCase()];
}

/** Тема фона и слоёв затемнения под обложку игры (панели, анкета). */
export type GameCoverDecor = {
  /** Класс фона контейнера (градиент), виден по краям и при ошибке картинки */
  panelBgClass: string;
  /** Доп. обводка/акцент для узкой полосы обложки (анкета) */
  stripRingClass: string;
  /** Слои поверх картинки, снизу вверх */
  overlayClasses: readonly string[];
};

const DEFAULT_COVER_DECOR: GameCoverDecor = {
  panelBgClass: "bg-gradient-to-br from-[#141414] via-[#1a1a1a] to-[#101010]",
  stripRingClass: "ring-inset ring-1 ring-white/10",
  overlayClasses: [
    "bg-gradient-to-t from-black via-black/75 to-black/25",
    "bg-gradient-to-br from-white/[0.05] to-transparent",
  ],
};

const VALORANT_DECOR: GameCoverDecor = {
  panelBgClass: "bg-gradient-to-br from-[#0a0e14] via-[#1a0f18] to-[#050810]",
  stripRingClass: "ring-inset ring-1 ring-[#ff4655]/35",
  overlayClasses: [
    "bg-gradient-to-t from-black via-black/82 to-black/20",
    "bg-[radial-gradient(ellipse_120%_85%_at_75%_15%,rgba(255,70,85,0.28),transparent_58%)]",
    "bg-gradient-to-tr from-[#ff4655]/18 via-transparent to-transparent",
  ],
};

const DOTA_DECOR: GameCoverDecor = {
  panelBgClass: "bg-gradient-to-br from-[#0c0806] via-[#1a120e] to-[#080504]",
  stripRingClass: "ring-inset ring-1 ring-[#c23a2e]/35",
  overlayClasses: [
    "bg-gradient-to-t from-black via-black/78 to-black/28",
    "bg-[radial-gradient(ellipse_95%_75%_at_82%_38%,rgba(194,58,46,0.22),transparent_55%)]",
    "bg-gradient-to-tl from-[#8b3a22]/14 via-transparent to-transparent",
  ],
};

const CS2_DECOR: GameCoverDecor = {
  panelBgClass: "bg-gradient-to-br from-[#0c1014] via-[#152028] to-[#080c10]",
  stripRingClass: "ring-inset ring-1 ring-[#d4a646]/30",
  overlayClasses: [
    "bg-gradient-to-t from-black via-black/80 to-black/22",
    "bg-[radial-gradient(ellipse_100%_72%_at_18%_32%,rgba(212,166,70,0.2),transparent_52%)]",
    "bg-gradient-to-bl from-transparent via-transparent to-[#3d7ea8]/14",
  ],
};

const GAME_COVER_DECOR_BY_SLUG: Record<string, GameCoverDecor> = {
  valorant: VALORANT_DECOR,
  "dota-2": DOTA_DECOR,
  cs2: CS2_DECOR,
  "counter-strike-2": CS2_DECOR,
};

function resolveCoverSlug(slug: string): string {
  if (GAME_COVER_BY_SLUG[slug]) return slug;
  const lower = slug.toLowerCase();
  if (GAME_COVER_BY_SLUG[lower]) return lower;
  return lower;
}

export function getGameCoverDecor(slug: string): GameCoverDecor {
  const key = resolveCoverSlug(slug);
  return GAME_COVER_DECOR_BY_SLUG[key] ?? DEFAULT_COVER_DECOR;
}
