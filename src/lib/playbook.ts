import { makeId } from "./id";
import type {
  FieldLayout,
  PlayDocument,
  PlayerCount,
  PlayerToken,
  Point,
  PrintSettings,
  RoutePath,
} from "./types";

export const BOARD_LAYOUT: FieldLayout = {
  width: 100,
  height: 140,
  lineOfScrimmageY: 92,
  yardsBehindLine: 48,
  yardsInFront: 92,
};

export const PLAYER_COLORS = [
  "#f4b16d",
  "#65d0b3",
  "#ffef9c",
  "#ff8f8f",
  "#95b3ff",
  "#d3a7ff",
  "#a7f0a5",
  "#f5d0fe",
];

export const PRINT_PRESETS: Array<{
  id: string;
  label: string;
  width: number;
  height: number;
  unit: PrintSettings["unit"];
}> = [
  { id: "wristband-slim", label: "Slim wristband 3 x 1 in", width: 3, height: 1, unit: "in" },
  { id: "wristband-standard", label: "Standard wristband 3.5 x 1.25 in", width: 3.5, height: 1.25, unit: "in" },
  { id: "metric-compact", label: "Compact 90 x 35 mm", width: 90, height: 35, unit: "mm" },
];

const PLAYER_LAYOUTS: Record<PlayerCount, Array<Omit<PlayerToken, "id">>> = {
  5: [
    { label: "X", color: PLAYER_COLORS[0], x: 18, y: 93 },
    { label: "C", color: PLAYER_COLORS[2], x: 50, y: 94 },
    { label: "Z", color: PLAYER_COLORS[4], x: 82, y: 93 },
    { label: "Q", color: PLAYER_COLORS[1], x: 50, y: 76 },
    { label: "RB", color: PLAYER_COLORS[6], x: 34, y: 72 },
  ],
  7: [
    { label: "X", color: PLAYER_COLORS[0], x: 14, y: 93 },
    { label: "Y", color: PLAYER_COLORS[3], x: 32, y: 93 },
    { label: "C", color: PLAYER_COLORS[2], x: 50, y: 94 },
    { label: "H", color: PLAYER_COLORS[5], x: 68, y: 93 },
    { label: "Z", color: PLAYER_COLORS[4], x: 86, y: 93 },
    { label: "Q", color: PLAYER_COLORS[1], x: 50, y: 76 },
    { label: "RB", color: PLAYER_COLORS[6], x: 36, y: 72 },
  ],
  8: [
    { label: "X", color: PLAYER_COLORS[0], x: 10, y: 93 },
    { label: "Y", color: PLAYER_COLORS[3], x: 25, y: 93 },
    { label: "C", color: PLAYER_COLORS[2], x: 50, y: 94 },
    { label: "H", color: PLAYER_COLORS[5], x: 65, y: 93 },
    { label: "Z", color: PLAYER_COLORS[4], x: 80, y: 93 },
    { label: "F", color: PLAYER_COLORS[7], x: 92, y: 93 },
    { label: "Q", color: PLAYER_COLORS[1], x: 50, y: 76 },
    { label: "RB", color: PLAYER_COLORS[6], x: 35, y: 72 },
  ],
};

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  presetId: PRINT_PRESETS[1].id,
  width: PRINT_PRESETS[1].width,
  height: PRINT_PRESETS[1].height,
  unit: PRINT_PRESETS[1].unit,
};

export function createPlayers(playerCount: PlayerCount): PlayerToken[] {
  return PLAYER_LAYOUTS[playerCount].map((player) => ({
    ...player,
    id: makeId("player"),
  }));
}

export function createPlayDocument(playerCount: PlayerCount = 7): PlayDocument {
  return {
    id: makeId("play"),
    name: `${playerCount}-player concept`,
    playerCount,
    fieldLayout: BOARD_LAYOUT,
    players: createPlayers(playerCount),
    paths: [],
    handoffs: [],
    notes: "",
    printSettings: DEFAULT_PRINT_SETTINGS,
    updatedAt: new Date().toISOString(),
    schemaVersion: 1,
  };
}

export function clonePlayDocument(play: PlayDocument): PlayDocument {
  return {
    ...play,
    id: makeId("play"),
    name: `${play.name} copy`,
    players: play.players.map((player) => ({ ...player, id: makeId("player") })),
    paths: [],
    handoffs: [],
    updatedAt: new Date().toISOString(),
  };
}

export function remapFormation(play: PlayDocument, playerCount: PlayerCount): PlayDocument {
  return {
    ...play,
    playerCount,
    players: createPlayers(playerCount),
    paths: [],
    handoffs: [],
    updatedAt: new Date().toISOString(),
  };
}

export function clampPoint(point: Point, layout = BOARD_LAYOUT): Point {
  return {
    x: Math.min(layout.width - 4, Math.max(4, point.x)),
    y: Math.min(layout.height - 4, Math.max(4, point.y)),
  };
}

export function buildPolylinePoints(anchor: Point, path: RoutePath): Point[] {
  return [anchor, ...path.points];
}

export function touchPlay(play: PlayDocument): PlayDocument {
  return {
    ...play,
    updatedAt: new Date().toISOString(),
  };
}
