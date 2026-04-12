import { forwardRef, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { clientToBoardPoint } from "../lib/geometry";
import { FIELD_THEMES, buildPolylinePoints, clampPoint } from "../lib/playbook";
import type { DraftPath, PlayDocument, PlaySetSettings, Point, ToolMode } from "../lib/types";

interface PlayboardProps {
  play: PlayDocument;
  playSetSettings: PlaySetSettings;
  tool: ToolMode;
  selectedPlayerId: string | null;
  selectedPathId: string | null;
  draftPath: DraftPath | null;
  handoffSourceId: string | null;
  interactive?: boolean;
  accessibleLabel?: string | null;
  enableTestIds?: boolean;
  onPlayerPress?: (playerId: string) => void;
  onBoardPress?: (point: Point) => void;
  onBackgroundPress?: () => void;
  onPathPress?: (pathId: string) => void;
  onPlayerMove?: (playerId: string, point: Point) => void;
  onPathPointMove?: (pathId: string, pointIndex: number, point: Point) => void;
  onFinishDraftPath?: () => void;
}

type DragState =
  | { kind: "player"; playerId: string }
  | { kind: "point"; pathId: string; pointIndex: number }
  | null;

const markerId = "play-arrow";
const motionMarkerId = "motion-arrow";

function getMidpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export const Playboard = forwardRef<SVGSVGElement, PlayboardProps>(function Playboard(
  {
    play,
    playSetSettings,
    tool,
    selectedPlayerId,
    selectedPathId,
    draftPath,
    handoffSourceId,
    interactive = true,
    accessibleLabel = "Playboard",
    enableTestIds = interactive,
    onPlayerPress,
    onBoardPress,
    onBackgroundPress,
    onPathPress,
    onPlayerMove,
    onPathPointMove,
    onFinishDraftPath,
  },
  ref,
) {
  const localRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const theme = FIELD_THEMES[playSetSettings.field.theme];
  const layout = play.fieldLayout;

  useEffect(() => {
    if (!interactive || !dragState) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!localRef.current) {
        return;
      }

      const point = clampPoint(
        clientToBoardPoint(
          event.clientX,
          event.clientY,
          localRef.current.getBoundingClientRect(),
          layout,
        ),
        layout,
      );

      if (dragState.kind === "player") {
        onPlayerMove?.(dragState.playerId, point);
      } else {
        onPathPointMove?.(dragState.pathId, dragState.pointIndex, point);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      handlePointerMove(event as unknown as PointerEvent);
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [dragState, interactive, layout, onPathPointMove, onPlayerMove]);

  const handleBoardClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (!interactive || !localRef.current) {
      return;
    }

    const target = event.target as Element;
    if (target.closest("[data-stop-board-click='true']")) {
      return;
    }

    if ((tool === "route" || tool === "motion") && draftPath) {
      onBoardPress?.(
        clampPoint(
          clientToBoardPoint(event.clientX, event.clientY, localRef.current.getBoundingClientRect(), layout),
          layout,
        ),
      );
      return;
    }

    if (tool === "select") {
      onBackgroundPress?.();
    }
  };

  const handleDoubleClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    const target = event.target as Element;
    if (target.closest("[data-stop-board-click='true']")) {
      return;
    }

    if ((tool === "route" || tool === "motion") && draftPath && draftPath.points.length > 0) {
      onFinishDraftPath?.();
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-[36px] border border-white/20 shadow-panel"
      style={{ backgroundColor: playSetSettings.field.backgroundColor }}
    >
      <div className="absolute inset-0 opacity-30" style={{ background: theme.cardBackground }} />
      <div className="absolute inset-x-0 top-0 h-28" style={{ background: theme.overlay }} />
      <svg
        aria-label={accessibleLabel ?? undefined}
        className="relative z-10 block h-auto w-full"
        data-testid={enableTestIds ? "playboard" : undefined}
        onClick={handleBoardClick}
        onDoubleClick={handleDoubleClick}
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
          <marker id={markerId} markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="5" refY="3">
            <path d="M 0 0 L 6 3 L 0 6 z" fill={theme.route} />
          </marker>
          <marker id={motionMarkerId} markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="5" refY="3">
            <path d="M 0 0 L 6 3 L 0 6 z" fill={theme.motion} />
          </marker>
        </defs>

        <rect
          data-testid={enableTestIds ? "field-surface" : undefined}
          fill={theme.surface}
          height={layout.height}
          width={layout.width}
          x="0"
          y="0"
        />

        {play.displaySettings.yardMarkers.map((yards) => {
          const y = layout.lineOfScrimmageY - (yards / 15) * layout.yardsInFront;
          const isScrimmage = yards === 0;
          return (
            <g key={yards}>
              <line
                opacity={isScrimmage ? 0.95 : 0.3}
                stroke={isScrimmage ? theme.accent : theme.grid}
                strokeDasharray={isScrimmage ? undefined : "1.4 3"}
                strokeWidth={isScrimmage ? 1.2 : 0.35}
                x1="10"
                x2={layout.width - 5}
                y1={y}
                y2={y}
              />
              <text
                fill={isScrimmage ? theme.scrimmage : theme.gridText}
                fontSize="3"
                fontWeight={isScrimmage ? "700" : "600"}
                textAnchor="end"
                x="8"
                y={y + 1}
              >
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

          const points = buildPolylinePoints(player, path).map((point) => `${point.x},${point.y}`).join(" ");
          const selected = path.id === selectedPathId;
          return (
            <g key={path.id}>
              <polyline
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
                points={points}
                stroke={path.kind === "route" ? theme.route : theme.motion}
                strokeDasharray={path.kind === "motion" ? "3 2" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={selected ? 1 : 0.9}
                strokeWidth={selected ? 1.6 : 1.1}
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
                        setDragState({ kind: "point", pathId: path.id, pointIndex });
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

        {draftPath ? (() => {
          const player = play.players.find((item) => item.id === draftPath.playerId);
          if (!player) {
            return null;
          }

          const points = [player, ...draftPath.points].map((point) => `${point.x},${point.y}`).join(" ");
          return (
            <polyline
              data-testid={enableTestIds ? "draft-path" : undefined}
              fill="none"
              markerEnd={`url(#${draftPath.kind === "route" ? markerId : motionMarkerId})`}
              points={points}
              stroke={draftPath.kind === "route" ? theme.route : theme.motion}
              strokeDasharray={draftPath.kind === "motion" ? "3 2" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.8"
              strokeWidth="1.2"
            />
          );
        })() : null}

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
                  setDragState({ kind: "player", playerId: player.id });
                }
              }}
            >
              <circle
                cx={player.x}
                cy={player.y}
                fill={player.color}
                r="4.2"
                stroke={handoffSource ? theme.scrimmage : selected ? "#10231a" : "rgba(15, 23, 32, 0.55)"}
                strokeWidth={handoffSource ? 1.4 : selected ? 1.1 : 0.7}
              />
              <text fill="#10231a" fontSize="2.9" fontWeight="700" textAnchor="middle" x={player.x} y={player.y + 1}>
                {player.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

