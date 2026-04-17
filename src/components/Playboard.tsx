import { forwardRef, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  appendSampledPoint,
  buildSmoothPathData,
  clientToBoardPoint,
  FREEHAND_SAMPLE_MIN_DISTANCE,
} from "../lib/geometry";
import { BOARD_THEME, buildPolylinePoints, clampPoint, getPlayerCircleRadius, getRouteStrokeWidth } from "../lib/playbook";
import type { DraftPath, PlayDocument, PlaySetSettings, Point, RouteKind, ToolMode } from "../lib/types";

interface PlayboardProps {
  play: PlayDocument;
  playSetSettings: PlaySetSettings;
  tool: ToolMode;
  selectedPlayerId: string | null;
  selectedPathId: string | null;
  selectedTextId: string | null;
  draftPath: DraftPath | null;
  handoffSourceId: string | null;
  interactive?: boolean;
  accessibleLabel?: string | null;
  enableTestIds?: boolean;
  frameVariant?: "editor" | "export";
  onPlayerPress?: (playerId: string) => void;
  onBoardPress?: (point: Point) => void;
  onBackgroundPress?: () => void;
  onPathPress?: (pathId: string) => void;
  onTextPress?: (textId: string) => void;
  onPlayerMoveStart?: (playerId: string) => void;
  onPlayerMove?: (playerId: string, point: Point) => void;
  onPathPointMoveStart?: (pathId: string) => void;
  onPathPointMove?: (pathId: string, pointIndex: number, point: Point) => void;
  onTextMoveStart?: (textId: string) => void;
  onTextMove?: (textId: string, point: Point) => void;
  onStartDraftPath?: (playerId: string, kind: RouteKind) => void;
  onUpdateDraftPath?: (points: Point[]) => void;
  onCommitDraftPath?: (playerId: string, kind: RouteKind, points: Point[]) => void;
  onCancelDraftPath?: () => void;
}

type DragState =
  | { kind: "player"; playerId: string }
  | { kind: "point"; pathId: string; pointIndex: number }
  | { kind: "text"; textId: string }
  | { kind: "draft"; playerId: string; pathKind: RouteKind; points: Point[] }
  | null;

const markerId = "play-arrow";
const motionMarkerId = "motion-arrow";
const DEFAULT_ROUTE_COLOR = "#000000";
const PLAY_NUMBER_BANNER_HEIGHT = 11;
const PLAY_NUMBER_BANNER_CLEARANCE = 1;

function getMidpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function getTextBoundsWidth(text: string) {
  const displayText = text || "Text";
  return Math.max(10, displayText.length * 2.4 + 4);
}

function getRouteColor(playerColor: string, playSetSettings: PlaySetSettings) {
  return playSetSettings.field.matchRouteColorToPlayer ? playerColor : DEFAULT_ROUTE_COLOR;
}

export const Playboard = forwardRef<SVGSVGElement, PlayboardProps>(function Playboard(
  {
    play,
    playSetSettings,
    tool,
    selectedPlayerId,
    selectedPathId,
    selectedTextId,
    draftPath,
    handoffSourceId,
    interactive = true,
    accessibleLabel = "Playboard",
    enableTestIds = interactive,
    frameVariant = "editor",
    onPlayerPress,
    onBoardPress,
    onBackgroundPress,
    onPathPress,
    onTextPress,
    onPlayerMoveStart,
    onPlayerMove,
    onPathPointMoveStart,
    onPathPointMove,
    onTextMoveStart,
    onTextMove,
    onStartDraftPath,
    onUpdateDraftPath,
    onCommitDraftPath,
    onCancelDraftPath,
  },
  ref,
) {
  const localRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<DragState>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const theme = BOARD_THEME;
  const layout = play.fieldLayout;
  const playerCircleRadius = getPlayerCircleRadius(playSetSettings);
  const routeStrokeWidth = getRouteStrokeWidth(playSetSettings);
  const selectedRouteStrokeWidth = Number((routeStrokeWidth + 0.5).toFixed(2));
  const draftRouteStrokeWidth = Number((routeStrokeWidth + 0.1).toFixed(2));
  const boardBackgroundColor = playSetSettings.field.backgroundColor || theme.surface;
  const routeMarkerSize =
    playSetSettings.field.lineThickness === "thick"
      ? 4.1
      : playSetSettings.field.lineThickness === "thin"
        ? 3
        : 3.2;
  const routeMarkerCenter = Number((routeMarkerSize / 2).toFixed(2));
  const routeMarkerInset = Number((routeMarkerSize * 0.09).toFixed(2));
  const routeMarkerTipX = Number((routeMarkerSize - routeMarkerInset).toFixed(2));
  const routeMarkerPath = `M 0 ${routeMarkerInset} L ${routeMarkerTipX} ${routeMarkerCenter} L 0 ${
    routeMarkerSize - routeMarkerInset
  } z`;
  const frameClassName =
    frameVariant === "export"
      ? "relative overflow-hidden border border-black"
      : "relative overflow-hidden rounded-[36px] border border-white/20 shadow-panel";
  const minimumYardMarkerY = playSetSettings.field.showPlayNumberBanner
    ? PLAY_NUMBER_BANNER_HEIGHT + PLAY_NUMBER_BANNER_CLEARANCE
    : Number.NEGATIVE_INFINITY;

  const updateDragState = (nextDragState: DragState) => {
    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  };

  const getBoardPoint = (clientX: number, clientY: number) => {
    if (!localRef.current) {
      return null;
    }

    return clampPoint(
      clientToBoardPoint(clientX, clientY, localRef.current.getBoundingClientRect(), layout),
      layout,
    );
  };

  useEffect(() => {
    if (!interactive || !dragState) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent | MouseEvent) => {
      const currentDragState = dragStateRef.current;
      if (!currentDragState) {
        return;
      }

      const point = getBoardPoint(event.clientX, event.clientY);
      if (!point) {
        return;
      }

      if (currentDragState.kind === "player") {
        onPlayerMove?.(currentDragState.playerId, point);
        return;
      }

      if (currentDragState.kind === "point") {
        onPathPointMove?.(currentDragState.pathId, currentDragState.pointIndex, point);
        return;
      }

      if (currentDragState.kind === "text") {
        onTextMove?.(currentDragState.textId, point);
        return;
      }

      const nextPoints = appendSampledPoint(currentDragState.points, point, FREEHAND_SAMPLE_MIN_DISTANCE);
      if (nextPoints === currentDragState.points) {
        return;
      }

      updateDragState({
        ...currentDragState,
        points: nextPoints,
      });
      onUpdateDraftPath?.(nextPoints);
    };

    const handlePointerUp = (event: PointerEvent | MouseEvent) => {
      const currentDragState = dragStateRef.current;
      if (!currentDragState) {
        return;
      }

      if (currentDragState.kind === "draft") {
        const point = getBoardPoint(event.clientX, event.clientY);
        const finalPoints = point
          ? appendSampledPoint(currentDragState.points, point, FREEHAND_SAMPLE_MIN_DISTANCE, true)
          : currentDragState.points;

        if (finalPoints !== currentDragState.points) {
          onUpdateDraftPath?.(finalPoints);
        }

        onCommitDraftPath?.(currentDragState.playerId, currentDragState.pathKind, finalPoints);
      }

      updateDragState(null);
    };

    const handlePointerCancel = () => {
      if (dragStateRef.current?.kind === "draft") {
        onCancelDraftPath?.();
      }
      updateDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [
    dragState,
    interactive,
    layout,
    onCancelDraftPath,
    onCommitDraftPath,
    onPathPointMove,
    onPlayerMove,
    onTextMove,
    onUpdateDraftPath,
  ]);

  const handleBoardClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (!interactive) {
      return;
    }

    const target = event.target as Element;
    if (target.closest("[data-stop-board-click='true']")) {
      return;
    }

    const point = getBoardPoint(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    if (tool === "text") {
      onBoardPress?.(point);
      return;
    }

    if (tool === "select") {
      onBackgroundPress?.();
    }
  };

  return (
    <div
      className={frameClassName}
      style={{ backgroundColor: boardBackgroundColor }}
    >
      <div className="absolute inset-0 opacity-30" style={{ background: theme.cardBackground }} />
      <div className="absolute inset-x-0 top-0 h-28" style={{ background: theme.overlay }} />
      <svg
        aria-label={accessibleLabel ?? undefined}
        className="relative z-10 block h-auto w-full"
        data-testid={enableTestIds ? "playboard" : undefined}
        onClick={handleBoardClick}
        preserveAspectRatio="none"
        ref={(node) => {
          localRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
      >
        <defs>
          <marker
            id={markerId}
            markerHeight={routeMarkerSize}
            markerUnits="userSpaceOnUse"
            markerWidth={routeMarkerSize}
            orient="auto-start-reverse"
            refX="0"
            refY={routeMarkerCenter}
            viewBox={`0 0 ${routeMarkerSize} ${routeMarkerSize}`}
          >
            <path d={routeMarkerPath} fill="context-stroke" />
          </marker>
          <marker
            id={motionMarkerId}
            markerHeight={routeMarkerSize}
            markerUnits="userSpaceOnUse"
            markerWidth={routeMarkerSize}
            orient="auto-start-reverse"
            refX="0"
            refY={routeMarkerCenter}
            viewBox={`0 0 ${routeMarkerSize} ${routeMarkerSize}`}
          >
            <path d={routeMarkerPath} fill="context-stroke" />
          </marker>
        </defs>

        <rect
          data-testid={enableTestIds ? "field-surface" : undefined}
          fill={boardBackgroundColor}
          height={layout.height}
          width={layout.width}
          x="0"
          y="0"
        />

        {playSetSettings.field.showPlayNumberBanner ? (
          <g data-testid={enableTestIds ? "play-number-banner" : undefined}>
            <rect fill="#000000" height={PLAY_NUMBER_BANNER_HEIGHT} width={layout.width} x="0" y="0" />
            <text
              data-testid={enableTestIds ? "play-number-banner-text" : undefined}
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize="5.5"
              fontWeight="800"
              textAnchor="middle"
              x={layout.width / 2}
              y={PLAY_NUMBER_BANNER_HEIGHT / 2 + 0.35}
            >
              {play.playNumber}
            </text>
          </g>
        ) : null}

        <g>
          <line
            opacity={0.95}
            stroke={theme.accent}
            strokeWidth={1.2}
            x1="10"
            x2={layout.width - 5}
            y1={layout.lineOfScrimmageY}
            y2={layout.lineOfScrimmageY}
          />
        </g>

        {play.displaySettings.yardMarkers.map((yards) => {
          const y = Math.max(
            layout.lineOfScrimmageY - (yards / 15) * layout.yardsInFront,
            minimumYardMarkerY,
          );
          return (
            <g key={yards}>
              <line
                opacity={0.3}
                stroke={theme.grid}
                strokeDasharray="1.4 3"
                strokeWidth={0.35}
                x1="10"
                x2={layout.width - 5}
                y1={y}
                y2={y}
              />
              <text fill={theme.gridText} fontSize="3" fontWeight="600" textAnchor="end" x="8" y={y + 1}>
                {yards}
              </text>
            </g>
          );
        })}

        {play.displaySettings.annotations.showLineOfScrimmageLabel ? (
          <text
            fill={theme.scrimmage}
            fontSize="3"
            fontWeight="700"
            textAnchor="end"
            x={layout.width - 6}
            y={layout.lineOfScrimmageY - 2}
          >
            LOS
          </text>
        ) : null}

        {play.handoffs.map((handoff) => {
          const from = play.players.find((player) => player.id === handoff.fromPlayerId);
          const to = play.players.find((player) => player.id === handoff.toPlayerId);
          if (!from || !to) {
            return null;
          }

          const midpoint = getMidpoint(from, to);
          return (
            <g data-testid={enableTestIds ? `handoff-${handoff.id}` : undefined} key={handoff.id}>
              <line
                stroke={theme.handoff}
                strokeDasharray="3 2"
                strokeLinecap="round"
                strokeWidth="1.2"
                x1={from.x}
                x2={to.x}
                y1={from.y}
                y2={to.y}
              />
              <circle
                cx={midpoint.x}
                cy={midpoint.y}
                fill={theme.handoffFill}
                r="3.4"
                stroke={theme.handoff}
                strokeWidth="0.6"
              />
              <text fill={theme.handoff} fontSize="2.8" fontWeight="700" textAnchor="middle" x={midpoint.x} y={midpoint.y + 1}>
                H
              </text>
            </g>
          );
        })}

        {play.paths.map((path) => {
          const player = play.players.find((item) => item.id === path.playerId);
          if (!player) {
            return null;
          }

          const pathColor = getRouteColor(player.color, playSetSettings);
          const pathData = buildSmoothPathData(buildPolylinePoints(player, path));
          const selected = path.id === selectedPathId;
          return (
            <g key={path.id}>
              <path
                d={pathData}
                data-path-id={path.id}
                data-stop-board-click="true"
                data-testid={enableTestIds ? `path-${path.id}` : undefined}
                fill="none"
                markerEnd={`url(#${path.kind === "route" ? markerId : motionMarkerId})`}
                onClick={(event) => {
                  event.stopPropagation();
                  if (interactive && tool === "select") {
                    onPathPress?.(path.id);
                  }
                }}
                stroke={pathColor}
                strokeDasharray={path.kind === "motion" ? "3 2" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={selected ? 1 : 0.9}
                strokeWidth={selected ? selectedRouteStrokeWidth : routeStrokeWidth}
              />
              {selected && interactive && tool === "select"
                ? path.points.map((point, pointIndex) => (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      data-stop-board-click="true"
                      fill={theme.handleFill}
                      key={`${path.id}-${pointIndex}`}
                      onPointerDown={(event: ReactPointerEvent<SVGCircleElement>) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onPathPointMoveStart?.(path.id);
                        updateDragState({ kind: "point", pathId: path.id, pointIndex });
                      }}
                      r="1.8"
                      stroke={theme.handleStroke}
                      strokeWidth="0.6"
                    />
                  ))
                : null}
            </g>
          );
        })}

        {draftPath
          ? (() => {
              const player = play.players.find((item) => item.id === draftPath.playerId);
              if (!player) {
                return null;
              }

              const draftPathColor = getRouteColor(player.color, playSetSettings);
              const pathData = buildSmoothPathData([player, ...draftPath.points]);
              return (
                <path
                  d={pathData}
                  data-testid={enableTestIds ? "draft-path" : undefined}
                  fill="none"
                  markerEnd={`url(#${draftPath.kind === "route" ? markerId : motionMarkerId})`}
                  stroke={draftPathColor}
                  strokeDasharray={draftPath.kind === "motion" ? "3 2" : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.8"
                  strokeWidth={draftRouteStrokeWidth}
                />
              );
            })()
          : null}

        {play.textAnnotations.map((textAnnotation) => {
          const selected = textAnnotation.id === selectedTextId;
          const displayText = textAnnotation.text || "Text";
          const width = getTextBoundsWidth(displayText);
          return (
            <g
              data-stop-board-click="true"
              data-testid={enableTestIds ? `text-annotation-${textAnnotation.id}` : undefined}
              key={textAnnotation.id}
              onClick={(event) => {
                event.stopPropagation();
                if (interactive) {
                  onTextPress?.(textAnnotation.id);
                }
              }}
              onPointerDown={(event: ReactPointerEvent<SVGGElement>) => {
                event.preventDefault();
                event.stopPropagation();
                if (!interactive) {
                  return;
                }

                onTextPress?.(textAnnotation.id);
                if (tool === "select") {
                  onTextMoveStart?.(textAnnotation.id);
                  updateDragState({ kind: "text", textId: textAnnotation.id });
                }
              }}
            >
              <rect
                fill={selected ? "rgba(246, 232, 200, 0.9)" : "transparent"}
                height="6.6"
                rx="2"
                stroke={selected ? theme.handleStroke : "transparent"}
                strokeWidth="0.5"
                width={width}
                x={textAnnotation.x - width / 2}
                y={textAnnotation.y - 3.7}
              />
              <text
                dominantBaseline="middle"
                fill={theme.route}
                fontSize="3.5"
                fontWeight="700"
                textAnchor="middle"
                x={textAnnotation.x}
                y={textAnnotation.y}
              >
                {displayText}
              </text>
            </g>
          );
        })}

        {play.players.map((player) => {
          const selected = player.id === selectedPlayerId;
          const handoffSource = player.id === handoffSourceId;
          return (
            <g
              data-stop-board-click="true"
              data-testid={enableTestIds ? `player-${player.label}` : undefined}
              key={player.id}
              onPointerDown={(event: ReactPointerEvent<SVGGElement>) => {
                event.preventDefault();
                event.stopPropagation();
                if (!interactive) {
                  return;
                }

                onPlayerPress?.(player.id);

                if (tool === "select") {
                  onPlayerMoveStart?.(player.id);
                  updateDragState({ kind: "player", playerId: player.id });
                  return;
                }

                if (tool === "route" || tool === "motion") {
                  onStartDraftPath?.(player.id, tool);
                  updateDragState({ kind: "draft", playerId: player.id, pathKind: tool, points: [] });
                }
              }}
            >
              <circle
                cx={player.x}
                cy={player.y}
                fill={player.color}
                r={playerCircleRadius}
                stroke={handoffSource ? theme.scrimmage : selected ? "#10231a" : "rgba(15, 23, 32, 0.55)"}
                strokeWidth={handoffSource ? 1.4 : selected ? 1.1 : 0.7}
              />
              <text fill="#ffffff" fontSize="2.9" fontWeight="800" textAnchor="middle" x={player.x} y={player.y + 1}>
                {player.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});
