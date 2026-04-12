import { useEffect, useRef, useState } from "react";
import { InspectorPanel } from "./components/InspectorPanel";
import { PlayLibrary } from "./components/PlayLibrary";
import { Playboard } from "./components/Playboard";
import { Toolbar } from "./components/Toolbar";
import { exportPlayToPdf } from "./lib/pdf";
import { makeId } from "./lib/id";
import { PRINT_PRESETS, clampPoint, clonePlayDocument, createPlayDocument, remapFormation, touchPlay } from "./lib/playbook";
import { loadPlaybook, savePlaybook } from "./lib/storage";
import type { DraftPath, HandoffMark, PlayDocument, PlayerCount, PlayerToken, Point, RoutePath, ToolMode } from "./lib/types";

function App() {
  const [plays, setPlays] = useState<PlayDocument[]>(() => loadPlaybook());
  const [activePlayId, setActivePlayId] = useState<string>(() => loadPlaybook()[0]?.id ?? createPlayDocument().id);
  const [tool, setTool] = useState<ToolMode>("select");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [draftPath, setDraftPath] = useState<DraftPath | null>(null);
  const [handoffSourceId, setHandoffSourceId] = useState<string | null>(null);
  const exportSvgRef = useRef<SVGSVGElement | null>(null);

  const activePlay = plays.find((play) => play.id === activePlayId) ?? plays[0];
  const selectedPlayer = activePlay?.players.find((player) => player.id === selectedPlayerId) ?? null;
  const selectedPath = activePlay?.paths.find((path) => path.id === selectedPathId) ?? null;

  useEffect(() => {
    if (activePlay && activePlay.id !== activePlayId) {
      setActivePlayId(activePlay.id);
    }
  }, [activePlay, activePlayId]);

  useEffect(() => {
    savePlaybook(plays);
  }, [plays]);

  function resetTransientState() {
    setSelectedPlayerId(null);
    setSelectedPathId(null);
    setDraftPath(null);
    setHandoffSourceId(null);
  }

  function updateActivePlay(updater: (play: PlayDocument) => PlayDocument) {
    setPlays((current) =>
      current.map((play) => {
        if (play.id !== activePlayId) {
          return play;
        }

        return touchPlay(updater(play));
      }),
    );
  }

  function handleCreatePlay() {
    const next = createPlayDocument(activePlay?.playerCount ?? 7);
    setPlays((current) => [...current, next]);
    setActivePlayId(next.id);
    resetTransientState();
  }

  function handleDuplicatePlay(playId: string) {
    const target = plays.find((play) => play.id === playId);
    if (!target) {
      return;
    }

    const duplicate = clonePlayDocument(target);
    setPlays((current) => [...current, duplicate]);
    setActivePlayId(duplicate.id);
    resetTransientState();
  }

  function handleDeletePlay(playId: string) {
    const remaining = plays.filter((play) => play.id !== playId);
    if (remaining.length === 0) {
      const replacement = createPlayDocument();
      setPlays([replacement]);
      setActivePlayId(replacement.id);
      resetTransientState();
      return;
    }

    setPlays(remaining);
    if (activePlayId === playId) {
      setActivePlayId(remaining[0].id);
      resetTransientState();
    }
  }

  function handleSelectPlay(playId: string) {
    setActivePlayId(playId);
    resetTransientState();
  }

  function handlePlayerPress(playerId: string) {
    if (!activePlay) {
      return;
    }

    if (tool === "select") {
      setSelectedPlayerId(playerId);
      setSelectedPathId(null);
      return;
    }

    if (tool === "route" || tool === "motion") {
      setSelectedPlayerId(playerId);
      setSelectedPathId(null);
      setHandoffSourceId(null);
      setDraftPath({ playerId, kind: tool, points: [] });
      return;
    }

    if (!handoffSourceId) {
      setHandoffSourceId(playerId);
      setSelectedPlayerId(playerId);
      setSelectedPathId(null);
      return;
    }

    if (handoffSourceId === playerId) {
      setHandoffSourceId(null);
      return;
    }

    const mark: HandoffMark = {
      id: makeId("handoff"),
      fromPlayerId: handoffSourceId,
      toPlayerId: playerId,
    };

    updateActivePlay((play) => ({
      ...play,
      handoffs: [
        ...play.handoffs.filter(
          (handoff) =>
            !(
              (handoff.fromPlayerId === mark.fromPlayerId && handoff.toPlayerId === mark.toPlayerId) ||
              (handoff.fromPlayerId === mark.toPlayerId && handoff.toPlayerId === mark.fromPlayerId)
            ),
        ),
        mark,
      ],
    }));
    setHandoffSourceId(null);
  }

  function handleBoardPress(point: Point) {
    if (!draftPath) {
      return;
    }

    setDraftPath((current) =>
      current
        ? {
            ...current,
            points: [...current.points, clampPoint(point)],
          }
        : null,
    );
  }

  function handleFinishDraft() {
    if (!activePlay || !draftPath || draftPath.points.length === 0) {
      return;
    }

    const nextPath: RoutePath = {
      id: makeId("path"),
      playerId: draftPath.playerId,
      kind: draftPath.kind,
      points: draftPath.points,
      arrowEnd: true,
    };

    updateActivePlay((play) => ({
      ...play,
      paths: [...play.paths.filter((path) => path.playerId !== draftPath.playerId), nextPath],
    }));
    setDraftPath(null);
    setSelectedPlayerId(nextPath.playerId);
    setSelectedPathId(nextPath.id);
  }

  function handleCancelDraft() {
    setDraftPath(null);
  }

  function handleMovePlayer(playerId: string, point: Point) {
    updateActivePlay((play) => ({
      ...play,
      players: play.players.map((player) =>
        player.id === playerId ? { ...player, ...clampPoint(point) } : player,
      ),
    }));
  }

  function handleMovePathPoint(pathId: string, pointIndex: number, point: Point) {
    updateActivePlay((play) => ({
      ...play,
      paths: play.paths.map((path) =>
        path.id === pathId
          ? {
              ...path,
              points: path.points.map((pathPoint, index) =>
                index === pointIndex ? clampPoint(point) : pathPoint,
              ),
            }
          : path,
      ),
    }));
  }

  function handlePlayerUpdate(playerId: string, changes: Partial<Pick<PlayerToken, "label" | "color">>) {
    updateActivePlay((play) => ({
      ...play,
      players: play.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              ...changes,
            }
          : player,
      ),
    }));
  }

  function handlePlayerCountChange(count: PlayerCount) {
    updateActivePlay((play) => remapFormation(play, count));
    resetTransientState();
  }

  function handleDeleteSelectedPath() {
    if (!selectedPathId) {
      return;
    }

    updateActivePlay((play) => ({
      ...play,
      paths: play.paths.filter((path) => path.id !== selectedPathId),
    }));
    setSelectedPathId(null);
  }

  function handleApplyPreset(presetId: string) {
    if (presetId === "custom") {
      updateActivePlay((play) => ({
        ...play,
        printSettings: {
          ...play.printSettings,
          presetId: null,
        },
      }));
      return;
    }

    const preset = PRINT_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    updateActivePlay((play) => ({
      ...play,
      printSettings: {
        presetId: preset.id,
        width: preset.width,
        height: preset.height,
        unit: preset.unit,
      },
    }));
  }

  async function handleExportPdf() {
    if (!activePlay || !exportSvgRef.current) {
      return;
    }

    await exportPlayToPdf(activePlay, exportSvgRef.current);
  }

  if (!activePlay) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(216,116,49,0.22),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(95,125,83,0.18),_transparent_26%),linear-gradient(180deg,_#f7f2e8_0%,_#ebe2cf_100%)] px-5 py-6 text-ink-950 lg:px-8">
      <div className="mx-auto max-w-[1680px]">
        <header className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.28em] text-ember-500">Flag Football Playmaker</p>
            <h1 className="font-display text-4xl font-black tracking-tight text-ink-950 sm:text-5xl">
              Build printable wristband plays without leaving the browser.
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-ink-950/70">
            Choose a formation, drag players into place, sketch routes on the board, and export a sized PDF that is ready for print.
          </p>
        </header>

        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <div className="min-h-[720px] xl:sticky xl:top-6">
            <PlayLibrary
              activePlayId={activePlay.id}
              onCreate={handleCreatePlay}
              onDelete={handleDeletePlay}
              onDuplicate={handleDuplicatePlay}
              onSelect={handleSelectPlay}
              plays={plays}
            />
          </div>

          <main className="flex min-w-0 flex-col gap-5">
            <Toolbar
              draftPath={draftPath}
              onCancelDraft={handleCancelDraft}
              onFinishDraft={handleFinishDraft}
              onToolChange={(nextTool) => {
                setTool(nextTool);
                setHandoffSourceId(null);
                if (nextTool === "select") {
                  setDraftPath(null);
                }
              }}
              tool={tool}
            />

            <section className="grid gap-4 rounded-[38px] bg-ink-950/80 p-4 shadow-panel sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-white/80">
                <div>
                  <p className="font-display text-xl font-bold text-white">{activePlay.name}</p>
                  <p className="text-sm text-white/70">
                    {draftPath
                      ? "Click on the board to add route points, then finish the path."
                      : tool === "handoff"
                        ? handoffSourceId
                          ? "Choose the receiving player to create the handoff."
                          : "Choose the ball carrier, then the receiving player."
                        : "Use select mode to drag players and edit route handles."}
                  </p>
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/85">
                  {activePlay.playerCount} offensive players
                </div>
              </div>

              <Playboard
                draftPath={draftPath}
                handoffSourceId={handoffSourceId}
                onBackgroundPress={() => {
                  setSelectedPathId(null);
                  setSelectedPlayerId(null);
                }}
                onBoardPress={handleBoardPress}
                onFinishDraftPath={handleFinishDraft}
                onPathPointMove={handleMovePathPoint}
                onPathPress={(pathId) => {
                  setSelectedPathId(pathId);
                  setSelectedPlayerId(null);
                }}
                onPlayerMove={handleMovePlayer}
                onPlayerPress={handlePlayerPress}
                play={activePlay}
                selectedPathId={selectedPathId}
                selectedPlayerId={selectedPlayerId}
                tool={tool}
              />
            </section>
          </main>

          <div className="min-h-[720px] xl:sticky xl:top-6">
            <InspectorPanel
              isDraftingPath={Boolean(draftPath)}
              onApplyPreset={handleApplyPreset}
              onDeleteSelectedPath={handleDeleteSelectedPath}
              onExportPdf={handleExportPdf}
              onNameChange={(name) => updateActivePlay((play) => ({ ...play, name }))}
              onNotesChange={(notes) => updateActivePlay((play) => ({ ...play, notes }))}
              onPlayerCountChange={handlePlayerCountChange}
              onPlayerUpdate={handlePlayerUpdate}
              onPrintSettingChange={(changes) =>
                updateActivePlay((play) => ({
                  ...play,
                  printSettings: {
                    ...play.printSettings,
                    ...changes,
                  },
                }))
              }
              play={activePlay}
              selectedPath={selectedPath}
              selectedPlayer={selectedPlayer}
            />
          </div>
        </div>
      </div>

      <div className="absolute -left-[99999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
        <Playboard
          accessibleLabel={null}
          draftPath={null}
          enableTestIds={false}
          handoffSourceId={null}
          interactive={false}
          play={activePlay}
          ref={exportSvgRef}
          selectedPathId={null}
          selectedPlayerId={null}
          tool="select"
        />
      </div>
    </div>
  );
}

export default App;
