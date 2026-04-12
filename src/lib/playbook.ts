import { makeId } from "./id";
import type {
  FieldTheme,
  FieldLayout,
  PlayDocument,
  PlayerCount,
  PlayerToken,
  Point,
  PrintSettings,
  RoutePath,
} from "./types";

export const BOARD_LAYOUT: FieldLayout = {
  width: 120,
  height: 80,
  lineOfScrimmageY: 56,
  yardsBehindLine: 24,
  yardsInFront: 48,
};

const LEGACY_BOARD_LAYOUT: FieldLayout = {
  width: 100,
  height: 140,
  lineOfScrimmageY: 92,
  yardsBehindLine: 48,
  yardsInFront: 92,
};

export const CURRENT_SCHEMA_VERSION = 4;

export const FIELD_THEMES: Record<
  FieldTheme,
  {
    label: string;
    cardBackground: string;
    overlay: string;
    surface: string;
    grid: string;
    gridText: string;
    scrimmage: string;
    accent: string;
    route: string;
    motion: string;
    handoff: string;
    handoffFill: string;
    handleFill: string;
    handleStroke: string;
  }
> = {
  white: {
    label: "Whiteboard",
    cardBackground:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(243, 239, 230, 0.98))",
    overlay: "linear-gradient(180deg, rgba(0, 0, 0, 0.04), transparent)",
    surface: "#fffdf7",
    grid: "rgba(31, 41, 55, 0.38)",
    gridText: "rgba(31, 41, 55, 0.45)",
    scrimmage: "#d97706",
    accent: "#92400e",
    route: "#111827",
    motion: "#c2410c",
    handoff: "#9a3412",
    handoffFill: "#fffaf0",
    handleFill: "#f6e8c8",
    handleStroke: "#111827",
  },
  green: {
    label: "Grass field",
    cardBackground:
      "linear-gradient(180deg, rgba(95, 125, 83, 0.92), rgba(47, 79, 61, 0.96)), linear-gradient(0deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.03))",
    overlay: "linear-gradient(180deg, rgba(0, 0, 0, 0.25), transparent)",
    surface: "rgba(255,255,255,0.02)",
    grid: "rgba(255,255,255,0.65)",
    gridText: "rgba(255,255,255,0.4)",
    scrimmage: "#fff4d6",
    accent: "#ffe5b8",
    route: "#fff8e7",
    motion: "#f4b16d",
    handoff: "#f7d8ab",
    handoffFill: "#10231a",
    handleFill: "#fff4d6",
    handleStroke: "#10231a",
  },
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
    { label: "X", color: PLAYER_COLORS[0], x: 22, y: 62 },
    { label: "C", color: PLAYER_COLORS[2], x: 60, y: 63 },
    { label: "Z", color: PLAYER_COLORS[4], x: 98, y: 62 },
    { label: "Q", color: PLAYER_COLORS[1], x: 60, y: 70 },
    { label: "RB", color: PLAYER_COLORS[6], x: 41, y: 75 },
  ],
  7: [
    { label: "X", color: PLAYER_COLORS[0], x: 17, y: 62 },
    { label: "Y", color: PLAYER_COLORS[3], x: 38, y: 62 },
    { label: "C", color: PLAYER_COLORS[2], x: 60, y: 63 },
    { label: "H", color: PLAYER_COLORS[5], x: 82, y: 62 },
    { label: "Z", color: PLAYER_COLORS[4], x: 103, y: 62 },
    { label: "Q", color: PLAYER_COLORS[1], x: 60, y: 70 },
    { label: "RB", color: PLAYER_COLORS[6], x: 43, y: 75 },
  ],
  8: [
    { label: "X", color: PLAYER_COLORS[0], x: 12, y: 62 },
    { label: "Y", color: PLAYER_COLORS[3], x: 30, y: 62 },
    { label: "C", color: PLAYER_COLORS[2], x: 60, y: 63 },
    { label: "H", color: PLAYER_COLORS[5], x: 78, y: 62 },
    { label: "Z", color: PLAYER_COLORS[4], x: 96, y: 62 },
    { label: "F", color: PLAYER_COLORS[7], x: 110, y: 62 },
    { label: "Q", color: PLAYER_COLORS[1], x: 60, y: 70 },
    { label: "RB", color: PLAYER_COLORS[6], x: 42, y: 75 },
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
    fieldTheme: "white",
    players: createPlayers(playerCount),
    paths: [],
    handoffs: [],
    notes: "",
    printSettings: DEFAULT_PRINT_SETTINGS,
    updatedAt: new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

export function clonePlayDocument(play: PlayDocument): PlayDocument {
  return {
    ...play,
    id: makeId("play"),
    name: `${play.name} copy`,
    fieldTheme: play.fieldTheme ?? "white",
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

export function flipPointAcrossLine(point: Point, layout = BOARD_LAYOUT): Point {
  return clampPoint(
    {
      x: point.x,
      y: layout.lineOfScrimmageY * 2 - point.y,
    },
    layout,
  );
}

export function remapPointToLayout(point: Point, fromLayout: FieldLayout, toLayout = BOARD_LAYOUT): Point {
  const x = (point.x / fromLayout.width) * toLayout.width;

  if (point.y <= fromLayout.lineOfScrimmageY) {
    const distanceInFront = fromLayout.lineOfScrimmageY - point.y;
    const ratio = fromLayout.yardsInFront === 0 ? 0 : distanceInFront / fromLayout.yardsInFront;
    return clampPoint(
      {
        x,
        y: toLayout.lineOfScrimmageY - ratio * toLayout.yardsInFront,
      },
      toLayout,
    );
  }

  const distanceBehind = point.y - fromLayout.lineOfScrimmageY;
  const ratio = fromLayout.yardsBehindLine === 0 ? 0 : distanceBehind / fromLayout.yardsBehindLine;
  return clampPoint(
    {
      x,
      y: toLayout.lineOfScrimmageY + ratio * toLayout.yardsBehindLine,
    },
    toLayout,
  );
}

export function migratePlayDocument(play: PlayDocument): PlayDocument {
  if ((play.schemaVersion ?? 1) >= CURRENT_SCHEMA_VERSION) {
    return {
      ...play,
      fieldLayout: BOARD_LAYOUT,
      fieldTheme: play.fieldTheme ?? "white",
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
  }

  const layout = play.fieldLayout ?? LEGACY_BOARD_LAYOUT;

  if ((play.schemaVersion ?? 1) >= 2) {
    return {
      ...play,
      fieldLayout: BOARD_LAYOUT,
      fieldTheme: play.fieldTheme ?? "white",
      schemaVersion: CURRENT_SCHEMA_VERSION,
      players: play.players.map((player) => ({
        ...player,
        ...remapPointToLayout(player, layout, BOARD_LAYOUT),
      })),
      paths: play.paths.map((path) => ({
        ...path,
        points: path.points.map((point) => remapPointToLayout(point, layout, BOARD_LAYOUT)),
      })),
    };
  }

  return {
    ...play,
    fieldLayout: BOARD_LAYOUT,
    fieldTheme: "white",
    players: play.players.map((player) => ({
      ...player,
      ...remapPointToLayout(flipPointAcrossLine(player, layout), layout, BOARD_LAYOUT),
    })),
    paths: play.paths.map((path) => ({
      ...path,
      points: path.points.map((point) =>
        remapPointToLayout(flipPointAcrossLine(point, layout), layout, BOARD_LAYOUT),
      ),
    })),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

export function touchPlay(play: PlayDocument): PlayDocument {
  return {
    ...play,
    updatedAt: new Date().toISOString(),
  };
}
