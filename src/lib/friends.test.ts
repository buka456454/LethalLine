import { describe, expect, it } from "vitest";
import {
  canAcceptFriendship,
  canDeclineFriendship,
  canDeleteFriendship,
  relationFromFriendship,
  validateFriendRequest,
} from "./friends";

const pending = {
  id: "f1",
  requesterId: "user-a",
  addresseeId: "user-b",
  status: "PENDING" as const,
};

const accepted = {
  id: "f2",
  requesterId: "user-a",
  addresseeId: "user-b",
  status: "ACCEPTED" as const,
};

describe("validateFriendRequest", () => {
  it("rejects empty target", () => {
    expect(validateFriendRequest("me", "")).toBeTruthy();
  });
  it("rejects self", () => {
    expect(validateFriendRequest("me", "me")).toBe("Нельзя добавить себя в друзья");
  });
  it("allows other user", () => {
    expect(validateFriendRequest("me", "other")).toBeNull();
  });
});

describe("accept / decline rights", () => {
  it("only addressee can accept pending", () => {
    expect(canAcceptFriendship("user-b", pending)).toBe(true);
    expect(canAcceptFriendship("user-a", pending)).toBe(false);
    expect(canAcceptFriendship("user-b", accepted)).toBe(false);
  });
  it("only addressee can decline pending", () => {
    expect(canDeclineFriendship("user-b", pending)).toBe(true);
    expect(canDeclineFriendship("user-a", pending)).toBe(false);
  });
});

describe("delete / cancel rights", () => {
  it("requester can cancel outgoing pending", () => {
    expect(canDeleteFriendship("user-a", pending)).toBe(true);
    expect(canDeleteFriendship("user-b", pending)).toBe(false);
  });
  it("either party can remove accepted friendship", () => {
    expect(canDeleteFriendship("user-a", accepted)).toBe(true);
    expect(canDeleteFriendship("user-b", accepted)).toBe(true);
    expect(canDeleteFriendship("stranger", accepted)).toBe(false);
  });
});

describe("relationFromFriendship", () => {
  it("maps none / friends / outgoing / incoming", () => {
    expect(relationFromFriendship("user-a", null)).toEqual({ kind: "none" });
    expect(relationFromFriendship("user-a", accepted)).toEqual({ kind: "friends", friendshipId: "f2" });
    expect(relationFromFriendship("user-a", pending)).toEqual({ kind: "outgoing", friendshipId: "f1" });
    expect(relationFromFriendship("user-b", pending)).toEqual({ kind: "incoming", friendshipId: "f1" });
  });
});
