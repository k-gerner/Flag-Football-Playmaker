import { useEffect, useMemo, useRef, useState } from "react";
import { AuthPanel } from "./components/AuthPanel";
import { InspectorPanel } from "./components/InspectorPanel";
import { PlayLibrary } from "./components/PlayLibrary";
import { Playboard } from "./components/Playboard";
import { PlaySetSettingsModal } from "./components/PlaySetSettingsModal";
import { Toolbar } from "./components/Toolbar";
import { createMemoryBackend, supabaseBackend, type AppBackend } from "./lib/backend";
import { exportPlaySetToPdf, exportPlayToPdf } from "./lib/pdf";
import { makeId } from "./lib/id";
import {
  PRINT_PRESETS,
  applyPlaySetSettingsToPlay,
  clonePlayDocument,
  createPlayDocument,
  createPlaySet,
  normalizePlayDisplaySettings,
  normalizePlaySetSettings,
  remapFormation,
  renumberPlays,
  touchPlay,
  touchPlaySet,
} from "./lib/playbook";
import type {
  AuthSessionState,
  DraftPath,
  HandoffMark,
  PlayDocument,
  PlaySet,
  PlayerCount,
  PlayerToken,
  Point,
  RoutePath,
  ToolMode,
} from "./lib/types";

interface AppShellProps {
  backend: AppBackend;
}

function SetupPanel() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-5 py-8 lg:px-8">
      <div className="glass-panel w-full rounded-[32px] border border-white/70 p-6 shadow-panel">
        <p className="font-display text-sm font-bold uppercase tracking-[0.28em] text-ember-500">Supabase Setup</p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-ink-950">
          Connect Supabase to enable Play Sets and saved accounts.
        </h1>
        <div className="mt-4 space-y-3 text-sm leading-6 text-ink-950/75">
          <p>Add these environment variables before running the app:</p>
          <pre className="overflow-x-auto rounded-3xl bg-ink-950 p-4 text-white">
{`VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...`}
          </pre>
          <p>
            After that, restart the dev server and the app will use Supabase Auth and Postgres for Play Sets,
            grouped plays, and whole-set PDF exports.
          </p>
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function AppShell({ backend }: AppShellProps) {
  const [authState, setAuthState] = useState<AuthSessionState>({
    status: "loading",
    user: null,
    error: null,
  });
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [playSets, setPlaySets] = useState<PlaySet[]>([]);
  const [playsBySetId, setPlaysBySetId] = useState<Record<string, PlayDocument[]>>({});
  const [activePlaySetId, setActivePlaySetId] = useState<string | null>(null);
  const [activePlayId, setActivePlayId] = useState<string | null>(null);
  const [copyTargetPlaySetId, setCopyTargetPlaySetId] = useState("");
  const [isPlaySetSettingsOpen, setIsPlaySetSettingsOpen] = useState(false);
  const [tool, setTool] = useState<ToolMode>("select");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [draftPath, setDraftPath] = useState<DraftPath | null>(null);
  const [handoffSourceId, setHandoffSourceId] = useState<string | null>(null);

  const playSaveTimers = useRef<Record<string, number>>({});
  const playSetSaveTimers = useRef<Record<string, number>>({});
  const exportSvgRefs = useRef<Record<string, SVGSVGElement | null>>({});

  const activePlaySet = playSets.find((playSet) => playSet.id === activePlaySetId) ?? null;
  const activeSetPlays = activePlaySetId ? playsBySetId[activePlaySetId] ?? [] : [];
  const activePlay = activeSetPlays.find((play) => play.id === activePlayId) ?? activeSetPlays[0] ?? null;
  const selectedPlayer = activePlay?.players.find((player) => player.id === selectedPlayerId) ?? null;
  const selectedPath = activePlay?.paths.find((path) => path.id === selectedPathId) ?? null;
  const hasPlaySets = playSets.length > 0;

  const userId = authState.user?.id ?? null;

  const clearTransientState = () => {
    setSelectedPlayerId(null);
    setSelectedPathId(null);
    setDraftPath(null);
    setHandoffSourceId(null);
  };

  const clearSaveTimers = () => {
    Object.values(playSaveTimers.current).forEach((timerId) => window.clearTimeout(timerId));
    Object.values(playSetSaveTimers.current).forEach((timerId) => window.clearTimeout(timerId));
    playSaveTimers.current = {};
    playSetSaveTimers.current = {};
  };

  async function loadWorkspace(nextUserId: string) {
    setWorkspaceBusy(true);
    setWorkspaceError(null);

    try {
      const nextPlaySets = await backend.listPlaySets(nextUserId);
      const playEntries = await Promise.all(
        nextPlaySets.map(async (playSet) => [playSet.id, await backend.listPlays(playSet.id)] as const),
      );
      const nextPlaysBySetId = Object.fromEntries(playEntries);

      setPlaySets(nextPlaySets);
      setPlaysBySetId(nextPlaysBySetId);
      setActivePlaySetId((current) =>
        current && nextPlaySets.some((playSet) => playSet.id === current) ? current : nextPlaySets[0]?.id ?? null,
      );
    } catch (error) {
      setWorkspaceError(getErrorMessage(error));
    } finally {
      setWorkspaceBusy(false);
    }
  }

  function schedulePlaySave(play: PlayDocument) {
    if (!userId) {
      return;
    }

    const existingTimer = playSaveTimers.current[play.id];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    playSaveTimers.current[play.id] = window.setTimeout(async () => {
      try {
        const saved = await backend.savePlay(play);
        setPlaysBySetId((current) => ({
          ...current,
          [saved.playSetId]: (current[saved.playSetId] ?? [])
            .map((item) => (item.id === saved.id ? saved : item))
            .sort((a, b) => a.playNumber - b.playNumber),
        }));
      } catch (error) {
        setWorkspaceError(getErrorMessage(error));
      }
    }, 450);
  }

  function schedulePlaySetSave(playSet: PlaySet) {
    if (!userId) {
      return;
    }

    const existingTimer = playSetSaveTimers.current[playSet.id];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    playSetSaveTimers.current[playSet.id] = window.setTimeout(async () => {
      try {
        const saved = await backend.savePlaySet(userId, playSet);
        setPlaySets((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      } catch (error) {
        setWorkspaceError(getErrorMessage(error));
      }
    }, 450);
  }

  async function persistPlaysImmediately(nextPlays: PlayDocument[]) {
    if (!userId || nextPlays.length === 0) {
      return;
    }

    nextPlays.forEach((play) => {
      const timer = playSaveTimers.current[play.id];
      if (timer) {
        window.clearTimeout(timer);
      }
      delete playSaveTimers.current[play.id];
    });

    try {
      const saved = await backend.savePlays(nextPlays);
      if (saved.length > 0) {
        setPlaysBySetId((current) => ({
          ...current,
          [saved[0].playSetId]: saved,
        }));
      }
    } catch (error) {
      setWorkspaceError(getErrorMessage(error));
    }
  }

  useEffect(() => {
    let active = true;

    backend.getInitialAuthState().then((state) => {
      if (active) {
        setAuthState(state);
      }
    });

    const unsubscribe = backend.subscribeToAuth((state) => {
      setAuthState(state);
    });

    return () => {
      active = false;
      clearSaveTimers();
      unsubscribe();
    };
  }, [backend]);

  useEffect(() => {
    if (authState.status !== "signed_in" || !userId) {
      clearSaveTimers();
      setPlaySets([]);
      setPlaysBySetId({});
      setActivePlaySetId(null);
      setActivePlayId(null);
      clearTransientState();
      return;
    }

    void loadWorkspace(userId);
  }, [authState.status, userId]);

  useEffect(() => {
    if (!activePlaySetId) {
      setActivePlayId(null);
      return;
    }

    const plays = playsBySetId[activePlaySetId] ?? [];
    if (!plays.some((play) => play.id === activePlayId)) {
      setActivePlayId(plays[0]?.id ?? null);
      clearTransientState();
    }
  }, [activePlayId, activePlaySetId, playsBySetId]);

  useEffect(() => {
    if (!copyTargetPlaySetId || playSets.some((playSet) => playSet.id === copyTargetPlaySetId)) {
      return;
    }

    setCopyTargetPlaySetId("");
  }, [copyTargetPlaySetId, playSets]);

  useEffect(() => {
    if (!activePlaySet) {
      setIsPlaySetSettingsOpen(false);
    }
  }, [activePlaySet]);

  const setScopedPlaySets = useMemo(() => playSets, [playSets]);

  async function handleAuthSubmit(mode: "sign_in" | "sign_up", email: string, password: string) {
    setAuthBusy(true);
    setAuthError(null);

    try {
      const nextState =
        mode === "sign_in" ? await backend.signIn(email, password) : await backend.signUp(email, password);
      setAuthState(nextState);
      setAuthError(nextState.error);
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }

  function updateActivePlay(updater: (play: PlayDocument) => PlayDocument) {
    if (!activePlay || !activePlaySetId) {
      return;
    }

    setPlaysBySetId((current) => {
      const nextPlays = (current[activePlaySetId] ?? []).map((play) => {
        if (play.id !== activePlay.id) {
          return play;
        }

        const updated = touchPlay(updater(play));
        schedulePlaySave(updated);
        return updated;
      });

      return {
        ...current,
        [activePlaySetId]: nextPlays,
      };
    });
  }

  function updateActivePlaySet(updater: (playSet: PlaySet) => PlaySet) {
    if (!activePlaySet) {
      return;
    }

    setPlaySets((current) =>
      current.map((playSet) => {
        if (playSet.id !== activePlaySet.id) {
          return playSet;
        }

        const updated = touchPlaySet(updater(playSet));
        schedulePlaySetSave(updated);
        return updated;
      }),
    );
  }

  function handlePlaySetSettingsCommit(nextSettings: PlaySet["settings"]) {
    if (!activePlaySet) {
      return;
    }

    const normalizedSettings = normalizePlaySetSettings(nextSettings);
    const nextPlaySet = touchPlaySet({
      ...activePlaySet,
      settings: normalizedSettings,
    });

    setPlaySets((current) => current.map((item) => (item.id === nextPlaySet.id ? nextPlaySet : item)));
    schedulePlaySetSave(nextPlaySet);
  }

  async function handleCreatePlaySet() {
    if (!userId) {
      return;
    }

    const newPlaySet = createPlaySet(`Play Set ${playSets.length + 1}`);

    try {
      const savedPlaySet = await backend.savePlaySet(userId, newPlaySet);
      setPlaySets((current) => [savedPlaySet, ...current]);
      setPlaysBySetId((current) => ({
        ...current,
        [savedPlaySet.id]: [],
      }));
      setActivePlaySetId(savedPlaySet.id);
      setActivePlayId(null);
      clearTransientState();
    } catch (error) {
      setWorkspaceError(getErrorMessage(error));
    }
  }

  async function handleDuplicatePlaySet(playSetId: string) {
    if (!userId) {
      return;
    }

    const sourceSet = playSets.find((playSet) => playSet.id === playSetId);
    if (!sourceSet) {
      return;
    }

    const sourcePlays = playsBySetId[playSetId] ?? [];
    const nextPlaySet = touchPlaySet({
      ...createPlaySet(`${sourceSet.name} copy`),
      settings: normalizePlaySetSettings(sourceSet.settings),
    });
    const clonedPlays = sourcePlays.map((play) =>
      clonePlayDocument(play, {
        playSetId: nextPlaySet.id,
        playNumber: play.playNumber,
      }),
    );

    try {
      const savedPlaySet = await backend.savePlaySet(userId, nextPlaySet);
      const savedPlays = await backend.savePlays(clonedPlays);
      setPlaySets((current) => [savedPlaySet, ...current]);
      setPlaysBySetId((current) => ({
        ...current,
        [savedPlaySet.id]: savedPlays,
      }));
      setActivePlaySetId(savedPlaySet.id);
      setActivePlayId(savedPlays[0]?.id ?? null);
      clearTransientState();
    } catch (error) {
      setWorkspaceError(getErrorMessage(error));
    }
  }

  async function handleDeletePlaySet(playSetId: string) {
    try {
      await backend.deletePlaySet(playSetId);
      setPlaySets((current) => current.filter((playSet) => playSet.id !== playSetId));
      setPlaysBySetId((current) => {
        const next = { ...current };
        delete next[playSetId];
        return next;
      });
      if (activePlaySetId === playSetId) {
        const fallback = playSets.find((playSet) => playSet.id !== playSetId) ?? null;
        setActivePlaySetId(fallback?.id ?? null);
        setActivePlayId(null);
        clearTransientState();
      }
    } catch (error) {
      setWorkspaceError(getErrorMessage(error));
    }
  }

  function handleSelectPlaySet(playSetId: string) {
    setActivePlaySetId(playSetId);
    setActivePlayId((playsBySetId[playSetId] ?? [])[0]?.id ?? null);
    clearTransientState();
  }

  async function handleCreatePlay() {
    if (!activePlaySet) {
      return;
    }

    const nextPlay = createPlayDocument({
      playSetId: activePlaySet.id,
      playNumber: activeSetPlays.length + 1,
      settings: activePlaySet.settings,
    });

    try {
      const saved = await backend.savePlay(nextPlay);
      setPlaysBySetId((current) => ({
        ...current,
        [activePlaySet.id]: [...(current[activePlaySet.id] ?? []), saved],
      }));
      setActivePlayId(saved.id);
      clearTransientState();
    } catch (error) {
      setWorkspaceError(getErrorMessage(error));
    }
  }

  async function handleDuplicatePlay(playId: string) {
    if (!activePlaySet) {
      return;
    }

    const sourcePlay = activeSetPlays.find((play) => play.id === playId);
    if (!sourcePlay) {
      return;
    }

    const duplicate = clonePlayDocument(sourcePlay, {
      playSetId: activePlaySet.id,
      playNumber: activeSetPlays.length + 1,
    });

    try {
      const saved = await backend.savePlay(duplicate);
      setPlaysBySetId((current) => ({
        ...current,
        [activePlaySet.id]: [...(current[activePlaySet.id] ?? []), saved],
      }));
      setActivePlayId(saved.id);
      clearTransientState();
    } catch (error) {
      setWorkspaceError(getErrorMessage(error));
    }
  }

  async function handleDeletePlay(playId: string) {
    if (!activePlaySetId) {
      return;
    }

    const remaining = renumberPlays(activeSetPlays.filter((play) => play.id !== playId));
    setPlaysBySetId((current) => ({
      ...current,
      [activePlaySetId]: remaining,
    }));

    try {
      await backend.deletePlay(playId);
      await persistPlaysImmediately(remaining);
      if (activePlayId === playId) {
        setActivePlayId(remaining[0]?.id ?? null);
        clearTransientState();
      }
    } catch (error) {
      setWorkspaceError(getErrorMessage(error));
    }
  }

  async function handleMovePlay(playId: string, direction: "up" | "down") {
    if (!activePlaySetId) {
      return;
    }

    const currentIndex = activeSetPlays.findIndex((play) => play.id === playId);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= activeSetPlays.length) {
      return;
    }

    const reordered = [...activeSetPlays];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const renumbered = renumberPlays(reordered);

    setPlaysBySetId((current) => ({
      ...current,
      [activePlaySetId]: renumbered,
    }));
    await persistPlaysImmediately(renumbered);
  }

  async function handleCopyPlayToSet() {
    if (!activePlay || !copyTargetPlaySetId) {
      return;
    }

    const targetPlaySet = playSets.find((playSet) => playSet.id === copyTargetPlaySetId);
    if (!targetPlaySet) {
      return;
    }

    const targetPlays = playsBySetId[targetPlaySet.id] ?? [];
    const copied = applyPlaySetSettingsToPlay(
      clonePlayDocument(activePlay, {
        playSetId: targetPlaySet.id,
        playNumber: targetPlays.length + 1,
      }),
      targetPlaySet.settings,
    );

    try {
      const saved = await backend.savePlay(copied);
      setPlaysBySetId((current) => ({
        ...current,
        [targetPlaySet.id]: [...(current[targetPlaySet.id] ?? []), saved],
      }));
      setCopyTargetPlaySetId("");
    } catch (error) {
      setWorkspaceError(getErrorMessage(error));
    }
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
    if (!draftPath || !activePlay) {
      return;
    }

    setDraftPath((current) =>
      current
        ? {
            ...current,
            points: [...current.points, point],
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
        player.id === playerId ? { ...player, ...point } : player,
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
              points: path.points.map((pathPoint, index) => (index === pointIndex ? point : pathPoint)),
            }
          : path,
      ),
    }));
  }

  function handlePlayerUpdate(playerId: string, changes: Partial<Pick<PlayerToken, "label" | "color">>) {
    updateActivePlay((play) => ({
      ...play,
      players: play.players.map((player) => (player.id === playerId ? { ...player, ...changes } : player)),
    }));
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

  async function handleExportPlaySet() {
    if (!activePlaySet) {
      return;
    }

    await exportPlaySetToPdf(activePlaySet, activeSetPlays, exportSvgRefs.current);
  }

  async function handleExportPlay() {
    if (!activePlaySet || !activePlay) {
      return;
    }

    const svg = exportSvgRefs.current[activePlay.id];
    if (!svg) {
      return;
    }

    await exportPlayToPdf(activePlaySet, activePlay, svg);
  }

  if (authState.status === "loading" || workspaceBusy) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 py-8 lg:px-8">
        <div className="glass-panel rounded-[32px] border border-white/70 px-6 py-4 text-sm font-semibold text-ink-950/70 shadow-panel">
          Loading your playbook...
        </div>
      </div>
    );
  }

  if (authState.status !== "signed_in") {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(216,116,49,0.22),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(95,125,83,0.18),_transparent_26%),linear-gradient(180deg,_#f7f2e8_0%,_#ebe2cf_100%)] px-5 py-8 text-ink-950 lg:px-8">
        <AuthPanel busy={authBusy} error={authError ?? authState.error} onSubmit={handleAuthSubmit} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(216,116,49,0.22),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(95,125,83,0.18),_transparent_26%),linear-gradient(180deg,_#f7f2e8_0%,_#ebe2cf_100%)] px-5 py-6 text-ink-950 lg:px-8">
      <div className="mx-auto max-w-[1720px]">
        <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.28em] text-ember-500">Flag Football Playmaker</p>
            <h1 className="font-display text-4xl font-black tracking-tight text-ink-950 sm:text-5xl">
              Build grouped wristband installs with cloud-saved Play Sets.
            </h1>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm text-ink-950/70 lg:items-end">
            <p>{authState.user?.email}</p>
            <button
              className="rounded-full border border-ink-950/15 px-4 py-2 font-semibold text-ink-950 transition hover:border-ink-950/35"
              onClick={() => void backend.signOut()}
              type="button"
            >
              Sign out
            </button>
          </div>
        </header>

        {workspaceError ? (
          <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {workspaceError}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)_390px]">
          <div className="min-h-[720px] min-w-0 xl:sticky xl:top-6">
            <PlayLibrary
              activePlayId={activePlay?.id ?? null}
              activePlaySet={activePlaySet}
              activePlaySetId={activePlaySet?.id ?? null}
              onCreatePlay={handleCreatePlay}
              onCreatePlaySet={handleCreatePlaySet}
              onDeletePlay={handleDeletePlay}
              onDeletePlaySet={handleDeletePlaySet}
              onDuplicatePlay={handleDuplicatePlay}
              onDuplicatePlaySet={handleDuplicatePlaySet}
              onMovePlay={handleMovePlay}
              onOpenPlaySetSettings={() => setIsPlaySetSettingsOpen(true)}
              onSelectPlay={(playId) => {
                setActivePlayId(playId);
                clearTransientState();
              }}
              onSelectPlaySet={handleSelectPlaySet}
              playSets={setScopedPlaySets}
              plays={activeSetPlays}
            />
          </div>

          <main className="flex min-w-0 flex-col gap-5">
            {activePlay ? (
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
            ) : (
              <section className="glass-panel rounded-[28px] border border-white/70 px-5 py-4 shadow-panel">
                <p className="text-sm font-semibold text-ink-950/80">
                  {activePlaySet
                    ? `Create a play in ${activePlaySet.name} to unlock the field tools and start drawing.`
                    : hasPlaySets
                      ? "Open an existing Play Set or create a new one before you build a play."
                      : "Create a new Play Set before you build your first play."}
                </p>
              </section>
            )}

            {activePlaySet && activePlay ? (
              <section className="grid gap-4 rounded-[38px] bg-ink-950/80 p-4 shadow-panel sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 text-white/80">
                  <div>
                    <p className="font-display text-xl font-bold text-white">
                      {activePlaySet.name}: {activePlay.name}
                    </p>
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
                    Play #{activePlay.playNumber}
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
                  playSetSettings={activePlaySet.settings}
                  selectedPathId={selectedPathId}
                  selectedPlayerId={selectedPlayerId}
                  tool={tool}
                />
              </section>
            ) : activePlaySet ? (
              <section className="grid gap-4 rounded-[38px] bg-ink-950/80 p-8 text-center text-white/80 shadow-panel">
                <p className="font-display text-2xl font-bold text-white">Create your first play</p>
                <p className="mx-auto max-w-2xl text-sm text-white/70">
                  {activePlaySet.name} is ready. Add a play to start drawing formations, routes, and wristband cards.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    className="rounded-full bg-ember-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ember-500/90"
                    onClick={handleCreatePlay}
                    type="button"
                  >
                    Create new play
                  </button>
                </div>
              </section>
            ) : (
              <section className="grid gap-4 rounded-[38px] bg-ink-950/80 p-8 text-center text-white/80 shadow-panel">
                <p className="font-display text-2xl font-bold text-white">
                  {hasPlaySets ? "Open a Play Set before you create a play" : "Start with a Play Set"}
                </p>
                <p className="mx-auto max-w-2xl text-sm text-white/70">
                  {hasPlaySets
                    ? "Choose a Play Set from the library or create a fresh one before you start building plays."
                    : "Create your first Play Set to group plays by team or install package, then build cloud-saved wristband exports around it."}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    className="rounded-full bg-ember-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ember-500/90"
                    onClick={handleCreatePlaySet}
                    type="button"
                  >
                    {hasPlaySets ? "Create a new Play Set" : "Create your first Play Set"}
                  </button>
                </div>
              </section>
            )}
          </main>

          <div className="min-h-[720px] xl:sticky xl:top-6">
            <InspectorPanel
              copyTargetPlaySetId={copyTargetPlaySetId}
              isDraftingPath={Boolean(draftPath)}
              onCopyPlayToSet={handleCopyPlayToSet}
              onCopyTargetPlaySetChange={setCopyTargetPlaySetId}
              onDeleteSelectedPath={handleDeleteSelectedPath}
              onExportPlay={handleExportPlay}
              onPlayDisplaySettingsChange={(displaySettings) => {
                updateActivePlay((play) => ({
                  ...play,
                  displaySettings: normalizePlayDisplaySettings(displaySettings),
                }));
              }}
              onPlayNameChange={(name) => updateActivePlay((play) => ({ ...play, name }))}
              onPlayNotesChange={(notes) => updateActivePlay((play) => ({ ...play, notes }))}
              onPlayerUpdate={handlePlayerUpdate}
              play={activePlay}
              playSet={activePlaySet}
              playSets={playSets}
              selectedPath={selectedPath}
              selectedPlayer={selectedPlayer}
            />
          </div>
        </div>
      </div>

      <PlaySetSettingsModal
        onApplyPreset={(presetId) => {
          if (!activePlaySet) {
            return;
          }

          if (presetId === "custom") {
            handlePlaySetSettingsCommit({
              ...activePlaySet.settings,
              print: {
                ...activePlaySet.settings.print,
                presetId: null,
              },
            });
            return;
          }

          const preset = PRINT_PRESETS.find((item) => item.id === presetId);
          if (!preset) {
            return;
          }

          handlePlaySetSettingsCommit({
            ...activePlaySet.settings,
            print: {
              presetId: preset.id,
              width: preset.width,
              height: preset.height,
              unit: preset.unit,
            },
            layout: {
              ...activePlaySet.settings.layout,
              cardAspectRatio: Number((preset.width / preset.height).toFixed(3)),
            },
          });
        }}
        onBackgroundColorChange={(backgroundColor) => {
          if (!activePlaySet) {
            return;
          }

          handlePlaySetSettingsCommit({
            ...activePlaySet.settings,
            field: {
              ...activePlaySet.settings.field,
              backgroundColor,
            },
          });
        }}
        onClose={() => setIsPlaySetSettingsOpen(false)}
        onExportPlaySet={handleExportPlaySet}
        onFieldThemeChange={(theme) => {
          if (!activePlaySet) {
            return;
          }

          handlePlaySetSettingsCommit({
            ...activePlaySet.settings,
            field: {
              ...activePlaySet.settings.field,
              theme,
            },
          });
        }}
        onLayoutSettingChange={(changes) => {
          if (!activePlaySet) {
            return;
          }

          const nextLayout = {
            ...activePlaySet.settings.layout,
            ...changes,
          };
          const ratio =
            typeof nextLayout.cardAspectRatio === "number" && nextLayout.cardAspectRatio > 0
              ? nextLayout.cardAspectRatio
              : activePlaySet.settings.layout.cardAspectRatio;

          handlePlaySetSettingsCommit({
            ...activePlaySet.settings,
            layout: {
              ...nextLayout,
              cardAspectRatio: Number(ratio.toFixed(3)),
            },
            print: {
              ...activePlaySet.settings.print,
              height: Number((activePlaySet.settings.print.width / ratio).toFixed(2)),
            },
          });
        }}
        onPlaySetNameChange={(name) =>
          updateActivePlaySet((playSet) => ({
            ...playSet,
            name,
          }))
        }
        onPlayerCountChange={(count) => {
          if (!activePlaySet) {
            return;
          }

          const nextSettings = normalizePlaySetSettings({
            ...activePlaySet.settings,
            roster: {
              ...activePlaySet.settings.roster,
              playerCount: count,
            },
          });
          const nextPlaySet = touchPlaySet({
            ...activePlaySet,
            settings: nextSettings,
          });
          const remappedPlays = renumberPlays(activeSetPlays.map((play) => remapFormation(play, count)));

          setPlaySets((current) => current.map((item) => (item.id === nextPlaySet.id ? nextPlaySet : item)));
          setPlaysBySetId((current) => ({
            ...current,
            [nextPlaySet.id]: remappedPlays,
          }));
          clearTransientState();
          schedulePlaySetSave(nextPlaySet);
          void persistPlaysImmediately(remappedPlays);
        }}
        onPrintSettingChange={(changes) => {
          if (!activePlaySet) {
            return;
          }

          const nextPrint = {
            ...activePlaySet.settings.print,
            ...changes,
          };
          handlePlaySetSettingsCommit({
            ...activePlaySet.settings,
            print: nextPrint,
            layout: {
              ...activePlaySet.settings.layout,
              cardAspectRatio: Number((nextPrint.width / nextPrint.height).toFixed(3)),
            },
          });
        }}
        open={isPlaySetSettingsOpen}
        playSet={activePlaySet}
      />

      {activePlaySet ? (
        <div className="absolute -left-[99999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
          {activeSetPlays.map((play) => (
            <Playboard
              accessibleLabel={null}
              draftPath={null}
              enableTestIds={false}
              handoffSourceId={null}
              interactive={false}
              key={play.id}
              play={play}
              playSetSettings={activePlaySet.settings}
              ref={(node) => {
                exportSvgRefs.current[play.id] = node;
              }}
              selectedPathId={null}
              selectedPlayerId={null}
              tool="select"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function App() {
  if (!supabaseBackend.isConfigured) {
    return <SetupPanel />;
  }

  return <AppShell backend={supabaseBackend} />;
}

export default App;

export { createMemoryBackend };
