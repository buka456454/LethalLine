export type BracketMatchStatus = "SCHEDULED" | "LIVE" | "FINISHED";

export type BracketMatch = {
  id: string;
  round: number;
  orderInRound: number;
  bracketSegment: string;
  participantA: string | null;
  participantB: string | null;
  scoreA: number;
  scoreB: number;
  status: BracketMatchStatus;
  winnerLabel: string | null;
};

export type RosterMember = {
  username: string;
  isCaptain: boolean;
};

export type ParticipantRoster = {
  label: string;
  kind: "solo" | "team";
  logoUrl?: string | null;
  members: RosterMember[];
};

export type Camera = {
  x: number;
  y: number;
  scale: number;
};

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LayoutNode = {
  id: string;
  match: BracketMatch;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LayoutEdge = {
  id: string;
  fromId: string;
  toId: string;
  winner: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type LayoutLabel = {
  id: string;
  text: string;
  x: number;
  y: number;
};

export type BracketLayout = {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  labels: LayoutLabel[];
  width: number;
  height: number;
};
