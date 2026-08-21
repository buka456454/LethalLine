import { describe, expect, it } from "vitest";
import { buildParticipantRosters } from "@/lib/participant-roster";

describe("buildParticipantRosters", () => {
  it("maps solo registrations to username rosters", () => {
    const rosters = buildParticipantRosters({
      teamSize: 1,
      registrations: [{ user: { username: "alice", avatarUrl: "/a.png" } }],
      teamApplications: [],
    });
    expect(rosters.alice).toEqual({
      label: "alice",
      kind: "solo",
      logoUrl: "/a.png",
      members: [{ username: "alice", isCaptain: true }],
    });
  });

  it("maps team applications to teamName with captain first", () => {
    const rosters = buildParticipantRosters({
      teamSize: 5,
      registrations: [],
      teamApplications: [
        {
          teamName: "Alpha",
          teamLogoUrl: "/logo.png",
          captain: { username: "cap", avatarUrl: null },
          members: [
            { username: "p2", isCaptain: false },
            { username: "cap", isCaptain: true },
          ],
        },
      ],
    });
    expect(rosters.Alpha?.kind).toBe("team");
    expect(rosters.Alpha?.members.map((m) => m.username)).toEqual(["cap", "p2"]);
  });
});
