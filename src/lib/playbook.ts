import { makeId } from "./id";
import type {
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
  Unit,
} from "./types";

export const BOARD_LAYOUT: FieldLayout = {
  width: 120,
  height: 80,
  lineOfScrimmageY: 56,
  yardsBehindLine: 24,
  yardsInFront: 48,
};

export const CURRENT_PLAY_SCHEMA_VERSION = 1;

export const BOARD_THEME = {
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
const CENTIMETERS_PER_INCH = 2.54;

export const PRINT_PRESETS: Array<{
  id: string;
  label: string;
  width: number;
  height: number;
  unit: PrintSettings["unit"];
}> = [
  { id: "wristband-slim", label: "Slim wristband 3 x 1 in", width: 3, height: 1, unit: "in" },
  { id: "wristband-standard", label: "Standard wristband 3.5 x 1.25 in", width: 3.5, height: 1.25, unit: "in" },
  { id: "metric-compact", label: "Compact 9 x 3.5 cm", width: 9, height: 3.5, unit: "cm" },
];

export const DEFAULT_PLAY_SET_SETTINGS: PlaySetSettings = {
  roster: {
    playerCount: 7,
  },
  field: {
    backgroundColor: "#fff8ee",
  },
  print: {
    presetId: null,
    width: 8.5,
    height: 11,
    unit: "in",
  },
  layout: {
    rowsPerPage: 4,
    columnsPerPage: 1,
    playsPerPage: 4,
    cardAspectRatio: Number((8.5 / (11 / 4)).toFixed(3)),
  },
  export: {
    includePlayNumber: true,
    includePlayName: true,
  },
};

export function getPrintSpacing(unit: PrintSettings["unit"]) {
  return unit === "in" ? 0 : 0;
}

export function getPrintCardInset(unit: PrintSettings["unit"]) {
  return unit === "in" ? 0.04 : 0.1;
}

export function convertPrintMeasurement(value: number, fromUnit: Unit, toUnit: Unit) {
  if (!Number.isFinite(value)) {
    return value;
  }

  if (fromUnit === toUnit) {
    return Number(value.toFixed(1));
  }

  const inches = fromUnit === "in" ? value : value / CENTIMETERS_PER_INCH;
  const converted = toUnit === "in" ? inches : inches * CENTIMETERS_PER_INCH;
  return Number(converted.toFixed(1));
}

export function getPlaySetCardDimensions(settings: PlaySetSettings) {
  const spacing = getPrintSpacing(settings.print.unit);
  const columns = Math.max(1, settings.layout.columnsPerPage);
  const rows = Math.max(1, settings.layout.rowsPerPage);
  const width = Math.max(0.1, (settings.print.width - spacing * Math.max(0, columns - 1)) / columns);
  const height = Math.max(0.1, (settings.print.height - spacing * Math.max(0, rows - 1)) / rows);

  return {
    width: Number(width.toFixed(3)),
    height: Number(height.toFixed(3)),
  };
}

export function getPlaySetPrintLayoutMetrics(settings: PlaySetSettings) {
  const spacing = getPrintSpacing(settings.print.unit);
  const columnsPerPage = Math.max(1, settings.layout.columnsPerPage);
  const rowsPerPage = Math.max(1, settings.layout.rowsPerPage);
  const { width: cardWidth, height: cardHeight } = getPlaySetCardDimensions(settings);

  return {
    pageWidth: settings.print.width,
    pageHeight: settings.print.height,
    spacing,
    columnsPerPage,
    rowsPerPage,
    playsPerPage: rowsPerPage * columnsPerPage,
    cardWidth,
    cardHeight,
  };
}

export function isLandscapeCard(settings: PlaySetSettings) {
  const { width, height } = getPlaySetCardDimensions(settings);
  return width >= height;
}

export function getEditorFieldLayout(settings: PlaySetSettings): FieldLayout {
  const { width: cardWidth, height: cardHeight } = getPlaySetCardDimensions(settings);
  const width = BOARD_LAYOUT.width;
  const height = Number((width / Math.max(cardWidth / cardHeight, 0.1)).toFixed(3));

  return {
    width,
    height,
    lineOfScrimmageY: Number(((BOARD_LAYOUT.lineOfScrimmageY / BOARD_LAYOUT.height) * height).toFixed(3)),
    yardsBehindLine: Number(((BOARD_LAYOUT.yardsBehindLine / BOARD_LAYOUT.height) * height).toFixed(3)),
    yardsInFront: Number(((BOARD_LAYOUT.yardsInFront / BOARD_LAYOUT.height) * height).toFixed(3)),
  };
}

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

export function createPlayers(playerCount: PlayerCount, layout: FieldLayout = BOARD_LAYOUT): PlayerToken[] {
  return PLAYER_LAYOUTS[playerCount].map((player) => ({
    ...player,
    id: makeId("player"),
    x: scaleValue(player.x, BOARD_LAYOUT.width, layout.width),
    y: scaleValue(player.y, BOARD_LAYOUT.height, layout.height),
  }));
}

function scaleValue(value: number, fromMax: number, toMax: number) {
  if (!Number.isFinite(value) || !Number.isFinite(fromMax) || !Number.isFinite(toMax) || fromMax <= 0) {
    return value;
  }

  return Number(((value / fromMax) * toMax).toFixed(3));
}

function sameFieldLayout(a: FieldLayout, b: FieldLayout) {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.lineOfScrimmageY === b.lineOfScrimmageY &&
    a.yardsBehindLine === b.yardsBehindLine &&
    a.yardsInFront === b.yardsInFront
  );
}

export function normalizePlaySetSettings(input?: Partial<PlaySetSettings> | null): PlaySetSettings {
  const rawInputUnit = (input?.print as { unit?: string } | undefined)?.unit;
  const resolvedUnit =
    rawInputUnit === "in" || rawInputUnit === "cm"
      ? rawInputUnit
      : rawInputUnit === "mm"
        ? "cm"
        : DEFAULT_PLAY_SET_SETTINGS.print.unit;

  const print = {
    ...DEFAULT_PLAY_SET_SETTINGS.print,
    ...(input?.print ?? {}),
    unit: resolvedUnit,
  };

  const layout = {
    ...DEFAULT_PLAY_SET_SETTINGS.layout,
    ...(input?.layout ?? {}),
  };
  const rowsPerPage = Math.min(6, Math.max(1, Math.round(layout.rowsPerPage)));
  const columnsPerPage = Math.min(6, Math.max(1, Math.round(layout.columnsPerPage)));
  const playsPerPage = rowsPerPage * columnsPerPage;
  const normalizedWidthFromInput =
    rawInputUnit === "mm" && Number.isFinite(print.width) ? Number((print.width / 10).toFixed(1)) : print.width;
  const normalizedHeightFromInput =
    rawInputUnit === "mm" && Number.isFinite(print.height) ? Number((print.height / 10).toFixed(1)) : print.height;
  const resolvedWidth =
    Number.isFinite(normalizedWidthFromInput) && normalizedWidthFromInput > 0
      ? normalizedWidthFromInput
      : DEFAULT_PLAY_SET_SETTINGS.print.width;
  const resolvedHeight =
    Number.isFinite(normalizedHeightFromInput) && normalizedHeightFromInput > 0
      ? normalizedHeightFromInput
      : DEFAULT_PLAY_SET_SETTINGS.print.height;
  const cardDimensions = getPlaySetCardDimensions({
    ...DEFAULT_PLAY_SET_SETTINGS,
    print: {
      ...print,
      width: resolvedWidth,
      height: resolvedHeight,
    },
    layout: {
      ...layout,
      rowsPerPage,
      columnsPerPage,
      playsPerPage,
    },
  });

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
      width: Number(resolvedWidth.toFixed(2)),
      height: Number(resolvedHeight.toFixed(2)),
    },
    layout: {
      rowsPerPage,
      columnsPerPage,
      playsPerPage,
      cardAspectRatio: Number((cardDimensions.width / cardDimensions.height).toFixed(3)),
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
  const hasStoredYardMarkers = Array.isArray(input?.yardMarkers);
  const selectedMarkers = hasStoredYardMarkers ? (input?.yardMarkers ?? []) : DEFAULT_PLAY_DISPLAY_SETTINGS.yardMarkers;
  const markers = selectedMarkers
    .filter((value) => YARD_MARKER_OPTIONS.includes(value))
    .sort((a, b) => a - b);

  return {
    yardMarkers: hasStoredYardMarkers ? markers : [...DEFAULT_PLAY_DISPLAY_SETTINGS.yardMarkers],
    annotations: {
      ...DEFAULT_PLAY_DISPLAY_SETTINGS.annotations,
      ...(input?.annotations ?? {}),
    },
  };
}

export function createPlaySet(name = "New Play Set", settings?: Partial<PlaySetSettings> | null): PlaySet {
  const now = new Date().toISOString();

  return {
    id: makeId("play-set"),
    name,
    settings: normalizePlaySetSettings(settings),
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
  const fieldLayout = getEditorFieldLayout(settings);
  return {
    id: makeId("play"),
    playSetId,
    name: name ?? `Play ${playNumber}`,
    notes: "",
    playNumber,
    fieldLayout,
    players: createPlayers(settings.roster.playerCount, fieldLayout),
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

export function remapPlayToFieldLayout(play: PlayDocument, nextLayout: FieldLayout): PlayDocument {
  if (sameFieldLayout(play.fieldLayout, nextLayout)) {
    return play;
  }

  const currentLayout = play.fieldLayout;

  return touchPlay({
    ...play,
    fieldLayout: nextLayout,
    players: play.players.map((player) => ({
      ...player,
      x: scaleValue(player.x, currentLayout.width, nextLayout.width),
      y: scaleValue(player.y, currentLayout.height, nextLayout.height),
    })),
    paths: play.paths.map((path) => ({
      ...path,
      points: path.points.map((point) => ({
        x: scaleValue(point.x, currentLayout.width, nextLayout.width),
        y: scaleValue(point.y, currentLayout.height, nextLayout.height),
      })),
    })),
  });
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

export function remapFormation(play: PlayDocument, playerCount: PlayerCount, layout: FieldLayout = BOARD_LAYOUT): PlayDocument {
  return touchPlay({
    ...play,
    fieldLayout: layout,
    players: createPlayers(playerCount, layout),
    paths: [],
    handoffs: [],
  });
}

export function applyPlaySetSettingsToPlay(play: PlayDocument, settings: PlaySetSettings): PlayDocument {
  const nextLayout = getEditorFieldLayout(settings);
  const currentCount = play.players.length as PlayerCount;
  if (currentCount === settings.roster.playerCount) {
    return remapPlayToFieldLayout(play, nextLayout);
  }

  return remapFormation(play, settings.roster.playerCount, nextLayout);
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
