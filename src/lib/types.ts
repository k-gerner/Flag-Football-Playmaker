export type PlayerCount = 5 | 7 | 8;
export type ToolMode = "select" | "route" | "motion" | "handoff";
export type RouteKind = "route" | "motion";
export type Unit = "in" | "mm";

export interface Point {
  x: number;
  y: number;
}

export interface FieldLayout {
  width: number;
  height: number;
  lineOfScrimmageY: number;
  yardsBehindLine: number;
  yardsInFront: number;
}

export interface PlayerToken {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
}

export interface RoutePath {
  id: string;
  playerId: string;
  kind: RouteKind;
  points: Point[];
  arrowEnd: boolean;
}

export interface HandoffMark {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
}

export interface PrintSettings {
  presetId: string | null;
  width: number;
  height: number;
  unit: Unit;
}

export interface PlayDocument {
  id: string;
  name: string;
  playerCount: PlayerCount;
  fieldLayout: FieldLayout;
  players: PlayerToken[];
  paths: RoutePath[];
  handoffs: HandoffMark[];
  notes: string;
  printSettings: PrintSettings;
  updatedAt: string;
  schemaVersion: number;
}

export interface DraftPath {
  playerId: string;
  kind: RouteKind;
  points: Point[];
}
