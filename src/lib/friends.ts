import { FriendshipStatus, type Friendship } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Отношение текущего пользователя к другому для UI-кнопок. */
export type FriendRelation =
  | { kind: "none" }
  | { kind: "friends"; friendshipId: string }
  | { kind: "outgoing"; friendshipId: string }
  | { kind: "incoming"; friendshipId: string };

export type FriendUserCard = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  rankLabel: string | null;
};

export type FriendshipListItem = {
  friendshipId: string;
  status: FriendshipStatus;
  createdAt: Date;
  respondedAt: Date | null;
  user: FriendUserCard;
};

const peerSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
};

type PeerUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

function toUserCard(user: PeerUser, rankLabel: string | null = null): FriendUserCard {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    rankLabel,
  };
}

async function rankLabelForUser(userId: string): Promise<string | null> {
  const profile = await prisma.userGameProfile.findFirst({
    where: {
      userId,
      OR: [{ rankLabel: { not: null } }, { verifiedRankLabel: { not: null } }],
    },
    orderBy: { updatedAt: "desc" },
    select: { rankLabel: true, verifiedRankLabel: true },
  });
  return profile?.verifiedRankLabel ?? profile?.rankLabel ?? null;
}

/** Чистые правила до записи в БД — их же покрывают unit-тесты. */
export function validateFriendRequest(viewerId: string, targetUserId: string): string | null {
  if (!targetUserId.trim()) return "Укажите пользователя";
  if (viewerId === targetUserId) return "Нельзя добавить себя в друзья";
  return null;
}

export function canAcceptFriendship(viewerId: string, friendship: Pick<Friendship, "addresseeId" | "status">) {
  return friendship.status === FriendshipStatus.PENDING && friendship.addresseeId === viewerId;
}

export function canDeclineFriendship(viewerId: string, friendship: Pick<Friendship, "addresseeId" | "status">) {
  return friendship.status === FriendshipStatus.PENDING && friendship.addresseeId === viewerId;
}

/** Отменить исходящую заявку или удалить принятую дружбу может любой из пары. */
export function canDeleteFriendship(
  viewerId: string,
  friendship: Pick<Friendship, "requesterId" | "addresseeId" | "status">,
) {
  const isParty = friendship.requesterId === viewerId || friendship.addresseeId === viewerId;
  if (!isParty) return false;
  if (friendship.status === FriendshipStatus.ACCEPTED) return true;
  return friendship.requesterId === viewerId;
}

export function relationFromFriendship(
  viewerId: string,
  friendship: Pick<Friendship, "id" | "requesterId" | "addresseeId" | "status"> | null,
): FriendRelation {
  if (!friendship) return { kind: "none" };
  if (friendship.status === FriendshipStatus.ACCEPTED) {
    return { kind: "friends", friendshipId: friendship.id };
  }
  if (friendship.requesterId === viewerId) {
    return { kind: "outgoing", friendshipId: friendship.id };
  }
  return { kind: "incoming", friendshipId: friendship.id };
}

export async function getFriendshipBetween(userAId: string, userBId: string) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userAId, addresseeId: userBId },
        { requesterId: userBId, addresseeId: userAId },
      ],
    },
  });
}

export async function getFriendRelation(viewerId: string, otherUserId: string): Promise<FriendRelation> {
  if (viewerId === otherUserId) return { kind: "none" };
  const friendship = await getFriendshipBetween(viewerId, otherUserId);
  return relationFromFriendship(viewerId, friendship);
}

export async function countIncomingFriendRequests(userId: string) {
  return prisma.friendship.count({
    where: { addresseeId: userId, status: FriendshipStatus.PENDING },
  });
}

export async function listFriendships(
  viewerId: string,
  tab: "friends" | "incoming" | "outgoing",
  take = 50,
  skip = 0,
): Promise<FriendshipListItem[]> {
  if (tab === "friends") {
    const rows = await prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: viewerId }, { addresseeId: viewerId }],
      },
      include: {
        requester: { select: peerSelect },
        addressee: { select: peerSelect },
      },
      orderBy: { respondedAt: "desc" },
      take,
      skip,
    });
    return Promise.all(
      rows.map(async (row) => {
        const peer = row.requesterId === viewerId ? row.addressee : row.requester;
        return {
          friendshipId: row.id,
          status: row.status,
          createdAt: row.createdAt,
          respondedAt: row.respondedAt,
          user: toUserCard(peer, await rankLabelForUser(peer.id)),
        };
      }),
    );
  }

  if (tab === "incoming") {
    const rows = await prisma.friendship.findMany({
      where: { addresseeId: viewerId, status: FriendshipStatus.PENDING },
      include: { requester: { select: peerSelect } },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });
    return Promise.all(
      rows.map(async (row) => ({
        friendshipId: row.id,
        status: row.status,
        createdAt: row.createdAt,
        respondedAt: row.respondedAt,
        user: toUserCard(row.requester, await rankLabelForUser(row.requester.id)),
      })),
    );
  }

  const rows = await prisma.friendship.findMany({
    where: { requesterId: viewerId, status: FriendshipStatus.PENDING },
    include: { addressee: { select: peerSelect } },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });
  return Promise.all(
    rows.map(async (row) => ({
      friendshipId: row.id,
      status: row.status,
      createdAt: row.createdAt,
      respondedAt: row.respondedAt,
      user: toUserCard(row.addressee, await rankLabelForUser(row.addressee.id)),
    })),
  );
}
