export type PlayerCount = 5 | 7 | 8;
export type ToolMode = "select" | "route" | "motion" | "handoff";
export type RouteKind = "route" | "motion";
export type Unit = "in" | "cm";

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

export interface PlaySetSettings {
  roster: {
    playerCount: PlayerCount;
  };
  field: {
    backgroundColor: string;
  };
  print: PrintSettings;
  layout: {
    rowsPerPage: number;
    columnsPerPage: number;
    playsPerPage: number;
    cardAspectRatio: number;
  };
  export: {
    includePlayNumber: boolean;
    includePlayName: boolean;
  };
}

export interface PlayDisplaySettings {
  yardMarkers: number[];
  annotations: {
    showLineOfScrimmageLabel: boolean;
  };
}

export interface PlayDocument {
  id: string;
  playSetId: string;
  name: string;
  notes: string;
  playNumber: number;
  fieldLayout: FieldLayout;
  players: PlayerToken[];
  paths: RoutePath[];
  handoffs: HandoffMark[];
  displaySettings: PlayDisplaySettings;
  updatedAt: string;
  schemaVersion: number;
}

export interface PlaySet {
  id: string;
  name: string;
  settings: PlaySetSettings;
  createdAt: string;
  updatedAt: string;
}

export interface DraftPath {
  playerId: string;
  kind: RouteKind;
  points: Point[];
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSessionState {
  status: "loading" | "signed_out" | "signed_in";
  user: AuthUser | null;
  error: string | null;
}

export interface StoredPlayPayload {
  fieldLayout?: FieldLayout;
  players?: PlayerToken[];
  paths?: RoutePath[];
  handoffs?: HandoffMark[];
  displaySettings?: Partial<PlayDisplaySettings>;
  schemaVersion?: number;
}
