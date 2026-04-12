import { makeId } from "./id";
import type {
  FieldTheme,
  FieldLayout,
  PlayDisplaySettings,
  PlayDocument,
  PlayerCount,
  PlayerToken,
  Point,
  PrintSettings,
  RoutePath,
  PlaySet,
  PlaySetSettings,
  StoredPlayPayload,
} from "./types";

export const BOARD_LAYOUT: FieldLayout = {
  width: 120,
  height: 80,
  lineOfScrimmageY: 56,
  yardsBehindLine: 24,
  yardsInFront: 48,
};

export const CURRENT_PLAY_SCHEMA_VERSION = 1;

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

export const YARD_MARKER_OPTIONS = [0, 5, 10, 15];

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

export const DEFAULT_PLAY_SET_SETTINGS: PlaySetSettings = {
  roster: {
    playerCount: 7,
  },
  field: {
    theme: "white",
    backgroundColor: "#fff8ee",
  },
  print: {
    presetId: PRINT_PRESETS[1].id,
    width: PRINT_PRESETS[1].width,
    height: PRINT_PRESETS[1].height,
    unit: PRINT_PRESETS[1].unit,
  },
  layout: {
    playsPerPage: 4,
    cardAspectRatio: Number((PRINT_PRESETS[1].width / PRINT_PRESETS[1].height).toFixed(3)),
  },
  export: {
    includePlayNumber: true,
    includePlayName: true,
  },
};

export const DEFAULT_PLAY_DISPLAY_SETTINGS: PlayDisplaySettings = {
  yardMarkers: [...YARD_MARKER_OPTIONS],
  annotations: {
    showLineOfScrimmageLabel: true,
  },
};

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

export function clampPoint(point: Point, layout = BOARD_LAYOUT): Point {
  return {
    x: Math.min(layout.width - 4, Math.max(4, point.x)),
    y: Math.min(layout.height - 4, Math.max(4, point.y)),
  };
}

export function buildPolylinePoints(anchor: Point, path: RoutePath): Point[] {
  return [anchor, ...path.points];
}

export function createPlayers(playerCount: PlayerCount): PlayerToken[] {
  return PLAYER_LAYOUTS[playerCount].map((player) => ({
    ...player,
    id: makeId("player"),
  }));
}

export function normalizePlaySetSettings(input?: Partial<PlaySetSettings> | null): PlaySetSettings {
  const print = {
    ...DEFAULT_PLAY_SET_SETTINGS.print,
    ...(input?.print ?? {}),
  };

  const layout = {
    ...DEFAULT_PLAY_SET_SETTINGS.layout,
    ...(input?.layout ?? {}),
  };

  const resolvedRatio =
    Number.isFinite(layout.cardAspectRatio) && layout.cardAspectRatio > 0
      ? layout.cardAspectRatio
      : print.width / print.height;
  const resolvedHeight =
    Number.isFinite(print.height) && print.height > 0 ? print.height : Number((print.width / resolvedRatio).toFixed(2));

  return {
    roster: {
      ...DEFAULT_PLAY_SET_SETTINGS.roster,
      ...(input?.roster ?? {}),
    },
    field: {
      ...DEFAULT_PLAY_SET_SETTINGS.field,
      ...(input?.field ?? {}),
    },
    print: {
      ...print,
      height: resolvedHeight,
    },
    layout: {
      playsPerPage: Math.min(6, Math.max(1, Math.round(layout.playsPerPage))),
      cardAspectRatio: Number(resolvedRatio.toFixed(3)),
    },
    export: {
      ...DEFAULT_PLAY_SET_SETTINGS.export,
      ...(input?.export ?? {}),
    },
  };
}

export function normalizePlayDisplaySettings(
  input?: Partial<PlayDisplaySettings> | null,
): PlayDisplaySettings {
  const markers = (input?.yardMarkers ?? DEFAULT_PLAY_DISPLAY_SETTINGS.yardMarkers)
    .filter((value) => YARD_MARKER_OPTIONS.includes(value))
    .sort((a, b) => a - b);

  return {
    yardMarkers: markers.length > 0 ? markers : [...DEFAULT_PLAY_DISPLAY_SETTINGS.yardMarkers],
    annotations: {
      ...DEFAULT_PLAY_DISPLAY_SETTINGS.annotations,
      ...(input?.annotations ?? {}),
    },
  };
}

export function createPlaySet(name = "New Play Set"): PlaySet {
  const now = new Date().toISOString();

  return {
    id: makeId("play-set"),
    name,
    settings: normalizePlaySetSettings(),
    createdAt: now,
    updatedAt: now,
  };
}

interface CreatePlayDocumentOptions {
  playSetId: string;
  playNumber: number;
  settings: PlaySetSettings;
  name?: string;
}

export function createPlayDocument({
  playSetId,
  playNumber,
  settings,
  name,
}: CreatePlayDocumentOptions): PlayDocument {
  return {
    id: makeId("play"),
    playSetId,
    name: name ?? `Play ${playNumber}`,
    notes: "",
    playNumber,
    fieldLayout: BOARD_LAYOUT,
    players: createPlayers(settings.roster.playerCount),
    paths: [],
    handoffs: [],
    displaySettings: normalizePlayDisplaySettings(),
    updatedAt: new Date().toISOString(),
    schemaVersion: CURRENT_PLAY_SCHEMA_VERSION,
  };
}

interface ClonePlayOptions {
  playSetId: string;
  playNumber: number;
  name?: string;
}

export function clonePlayDocument(play: PlayDocument, options: ClonePlayOptions): PlayDocument {
  const playerIdMap = new Map<string, string>();
  const clonedPlayers = play.players.map((player) => {
    const nextId = makeId("player");
    playerIdMap.set(player.id, nextId);
    return {
      ...player,
      id: nextId,
    };
  });

  return {
    ...play,
    id: makeId("play"),
    playSetId: options.playSetId,
    playNumber: options.playNumber,
    name: options.name ?? `${play.name} copy`,
    players: clonedPlayers,
    paths: play.paths.map((path) => ({
      ...path,
      id: makeId("path"),
      playerId: playerIdMap.get(path.playerId) ?? path.playerId,
    })),
    handoffs: play.handoffs.map((handoff) => ({
      ...handoff,
      id: makeId("handoff"),
      fromPlayerId: playerIdMap.get(handoff.fromPlayerId) ?? handoff.fromPlayerId,
      toPlayerId: playerIdMap.get(handoff.toPlayerId) ?? handoff.toPlayerId,
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function touchPlay(play: PlayDocument): PlayDocument {
  return {
    ...play,
    updatedAt: new Date().toISOString(),
  };
}

export function touchPlaySet(playSet: PlaySet): PlaySet {
  return {
    ...playSet,
    updatedAt: new Date().toISOString(),
  };
}

export function renumberPlays(plays: PlayDocument[]): PlayDocument[] {
  return plays.map((play, index) =>
    touchPlay({
      ...play,
      playNumber: index + 1,
    }),
  );
}

export function remapFormation(play: PlayDocument, playerCount: PlayerCount): PlayDocument {
  return touchPlay({
    ...play,
    players: createPlayers(playerCount),
    paths: [],
    handoffs: [],
  });
}

export function applyPlaySetSettingsToPlay(play: PlayDocument, settings: PlaySetSettings): PlayDocument {
  const currentCount = play.players.length as PlayerCount;
  if (currentCount === settings.roster.playerCount) {
    return play;
  }

  return remapFormation(play, settings.roster.playerCount);
}

export function normalizeStoredPlayPayload(input?: StoredPlayPayload | null): StoredPlayPayload {
  return {
    fieldLayout: input?.fieldLayout ?? BOARD_LAYOUT,
    players: input?.players ?? [],
    paths: input?.paths ?? [],
    handoffs: input?.handoffs ?? [],
    displaySettings: normalizePlayDisplaySettings(input?.displaySettings),
    schemaVersion: input?.schemaVersion ?? CURRENT_PLAY_SCHEMA_VERSION,
  };
}

export function toStoredPlayPayload(play: PlayDocument): StoredPlayPayload {
  return {
    fieldLayout: play.fieldLayout,
    players: play.players,
    paths: play.paths,
    handoffs: play.handoffs,
    displaySettings: play.displaySettings,
    schemaVersion: play.schemaVersion,
  };
}
