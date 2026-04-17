import { useEffect, useMemo, useRef, useState } from "react";
import { AuthPanel } from "./components/AuthPanel";
import { CreatePlaySetModal } from "./components/CreatePlaySetModal";
import { ExportPlayCard } from "./components/ExportPlayCard";
import { InspectorPanel } from "./components/InspectorPanel";
import { PlayLibrary } from "./components/PlayLibrary";
import { Playboard } from "./components/Playboard";
import { PlaySetSettingsModal } from "./components/PlaySetSettingsModal";
import { Toolbar } from "./components/Toolbar";
import { createMemoryBackend, supabaseBackend, type AppBackend } from "./lib/backend";
import { getPathLength, MIN_FREEHAND_PATH_LENGTH, processFreehandStroke } from "./lib/geometry";
import { exportPlaySetToPdf } from "./lib/pdf";
import { makeId } from "./lib/id";
import {
  applyPlaySetSettingsToPlay,
  clonePlayDocument,
  createPlayDocument,
  createPlaySet,
  normalizePlayDisplaySettings,
  normalizePlaySetSettings,
  renumberPlays,
  touchPlay,
  touchPlaySet,
} from "./lib/playbook";
import type {
  AuthSessionState,
  DraftPath,
  HandoffMark,
  PartialPlaySetSettings,
  PlayDocument,
  PlaySet,
  PlayerToken,
  Point,
  RoutePath,
  RouteKind,
  TextAnnotation,
  ToolMode,
} from "./lib/types";

interface AppShellProps {
  backend: AppBackend;
}

type PlayInspectorDraft = Pick<PlayDocument, "name" | "notes" | "displaySettings">;
type BoardSnapshot = Pick<PlayDocument, "players" | "paths" | "handoffs" | "textAnnotations">;
type BoardHistoryState = {
  past: BoardSnapshot[];
  future: BoardSnapshot[];
};

const BOARD_HISTORY_LIMIT = 50;

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

function mergeInspectorDraft(play: PlayDocument, draft?: PlayInspectorDraft | null): PlayDocument {
  if (!draft) {
    return play;
  }

  return {
    ...play,
    name: draft.name,
    notes: draft.notes,
    displaySettings: normalizePlayDisplaySettings(draft.displaySettings),
  };
}

function hasInspectorDraftChanges(play: PlayDocument, draft: PlayInspectorDraft) {
  const normalizedDisplaySettings = normalizePlayDisplaySettings(draft.displaySettings);

  return (
    play.name !== draft.name ||
    play.notes !== draft.notes ||
    play.displaySettings.annotations.showLineOfScrimmageLabel !==
      normalizedDisplaySettings.annotations.showLineOfScrimmageLabel ||
    play.displaySettings.yardMarkers.length !== normalizedDisplaySettings.yardMarkers.length ||
    play.displaySettings.yardMarkers.some((value, index) => normalizedDisplaySettings.yardMarkers[index] !== value)
  );
}

function cloneBoardSnapshot(snapshot: BoardSnapshot): BoardSnapshot {
  return {
    players: snapshot.players.map((player) => ({ ...player })),
    paths: snapshot.paths.map((path) => ({
      ...path,
      points: path.points.map((point) => ({ ...point })),
    })),
    handoffs: snapshot.handoffs.map((handoff) => ({ ...handoff })),
    textAnnotations: snapshot.textAnnotations.map((textAnnotation) => ({ ...textAnnotation })),
  };
}

function getBoardSnapshot(play: PlayDocument): BoardSnapshot {
  return cloneBoardSnapshot({
    players: play.players,
    paths: play.paths,
    handoffs: play.handoffs,
    textAnnotations: play.textAnnotations,
  });
}

function boardSnapshotsEqual(a: BoardSnapshot | null | undefined, b: BoardSnapshot | null | undefined) {
  if (!a || !b) {
    return false;
  }

  return JSON.stringify(a) === JSON.stringify(b);
}

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function movePlayerAndAttachedPaths(play: PlayDocument, playerId: string, point: Point): PlayDocument {
  const player = play.players.find((item) => item.id === playerId);
  if (!player) {
    return play;
  }

  const deltaX = point.x - player.x;
  const deltaY = point.y - player.y;

  return {
    ...play,
    players: play.players.map((item) => (item.id === playerId ? { ...item, ...point } : item)),
    paths: play.paths.map((path) =>
      path.playerId === playerId
        ? {
            ...path,
            points: path.points.map((pathPoint) => ({
              x: Number((pathPoint.x + deltaX).toFixed(3)),
              y: Number((pathPoint.y + deltaY).toFixed(3)),
            })),
          }
        : path,
    ),
  };
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
  const [playInspectorDrafts, setPlayInspectorDrafts] = useState<Record<string, PlayInspectorDraft>>({});
  const [pendingPlaySaveIds, setPendingPlaySaveIds] = useState<Record<string, boolean>>({});
  const [activePlaySetId, setActivePlaySetId] = useState<string | null>(null);
  const [activePlayId, setActivePlayId] = useState<string | null>(null);
  const [copyTargetPlaySetId, setCopyTargetPlaySetId] = useState("");
  const [isCreatePlaySetOpen, setIsCreatePlaySetOpen] = useState(false);
  const [isPlaySetSettingsOpen, setIsPlaySetSettingsOpen] = useState(false);
  const [isExportingPlaySet, setIsExportingPlaySet] = useState(false);
  const [tool, setTool] = useState<ToolMode>("select");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [draftPath, setDraftPath] = useState<DraftPath | null>(null);
  const [handoffSourceId, setHandoffSourceId] = useState<string | null>(null);
  const [selectedTextFocusToken, setSelectedTextFocusToken] = useState(0);

  const playSaveTimers = useRef<Record<string, number>>({});
  const playSetSaveTimers = useRef<Record<string, number>>({});
  const exportPreviewRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const boardHistoryRef = useRef<Record<string, BoardHistoryState>>({});
  const activeTextEditRef = useRef<{ playId: string | null; textId: string | null }>({
    playId: null,
    textId: null,
  });

  const activePlaySet = playSets.find((playSet) => playSet.id === activePlaySetId) ?? null;
  const activeSetPlays = activePlaySetId ? playsBySetId[activePlaySetId] ?? [] : [];
  const displayedSetPlays = activeSetPlays.map((play) => mergeInspectorDraft(play, playInspectorDrafts[play.id]));
  const persistedActivePlay = activeSetPlays.find((play) => play.id === activePlayId) ?? activeSetPlays[0] ?? null;
  const activePlay = persistedActivePlay
    ? mergeInspectorDraft(persistedActivePlay, playInspectorDrafts[persistedActivePlay.id])
    : null;
  const selectedPlayer = activePlay?.players.find((player) => player.id === selectedPlayerId) ?? null;
  const selectedPath = activePlay?.paths.find((path) => path.id === selectedPathId) ?? null;
  const selectedText = activePlay?.textAnnotations.find((textAnnotation) => textAnnotation.id === selectedTextId) ?? null;
  const hasPlaySets = playSets.length > 0;
  const activeBoardHistory = persistedActivePlay ? boardHistoryRef.current[persistedActivePlay.id] : null;
  const canUndo = (activeBoardHistory?.past.length ?? 0) > 0;
  const canRedo = (activeBoardHistory?.future.length ?? 0) > 0;
  const hasPendingActivePlaySave = Boolean(persistedActivePlay && pendingPlaySaveIds[persistedActivePlay.id]);
  const hasUnsavedActivePlayChanges =
    Boolean(persistedActivePlay && playInspectorDrafts[persistedActivePlay.id]) || hasPendingActivePlaySave;

  const userId = authState.user?.id ?? null;

  const resetActiveTextEdit = () => {
    activeTextEditRef.current = {
      playId: null,
      textId: null,
    };
  };

  const clearTransientState = () => {
    setSelectedPlayerId(null);
    setSelectedPathId(null);
    setSelectedTextId(null);
    setDraftPath(null);
    setHandoffSourceId(null);
    resetActiveTextEdit();
  };

  const clearSaveTimers = () => {
    Object.values(playSaveTimers.current).forEach((timerId) => window.clearTimeout(timerId));
    Object.values(playSetSaveTimers.current).forEach((timerId) => window.clearTimeout(timerId));
    playSaveTimers.current = {};
    playSetSaveTimers.current = {};
    setPendingPlaySaveIds({});
  };

  const markPlaySavePending = (playId: string) => {
    setPendingPlaySaveIds((current) => (current[playId] ? current : { ...current, [playId]: true }));
  };

  const markPlaySaveSettled = (playId: string) => {
    setPendingPlaySaveIds((current) => {
      if (!current[playId]) {
        return current;
      }

      const next = { ...current };
      delete next[playId];
      return next;
    });
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
      setPlayInspectorDrafts({});
      setPendingPlaySaveIds({});
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

    markPlaySavePending(play.id);
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
        markPlaySaveSettled(saved.id);
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
        setPendingPlaySaveIds((current) => {
          const next = { ...current };
          saved.forEach((play) => {
            delete next[play.id];
          });
          return next;
        });
      }
    } catch (error) {
      setWorkspaceError(getErrorMessage(error));
    }
  }

  function getBoardHistoryState(playId: string): BoardHistoryState {
    const existing = boardHistoryRef.current[playId];
    if (existing) {
      return existing;
    }

    const created: BoardHistoryState = {
      past: [],
      future: [],
    };
    boardHistoryRef.current[playId] = created;
    return created;
  }

  function pushBoardHistorySnapshot(play = persistedActivePlay) {
    if (!play) {
      return;
    }

    const history = getBoardHistoryState(play.id);
    const snapshot = getBoardSnapshot(play);
    const lastSnapshot = history.past[history.past.length - 1];

    if (boardSnapshotsEqual(lastSnapshot, snapshot)) {
      history.future = [];
      return;
    }

    history.past = [...history.past.slice(-(BOARD_HISTORY_LIMIT - 1)), cloneBoardSnapshot(snapshot)];
    history.future = [];
  }

  function applyBoardSnapshot(snapshot: BoardSnapshot) {
    resetActiveTextEdit();
    updateActivePlay((play) => ({
      ...play,
      players: snapshot.players.map((player) => ({ ...player })),
      paths: snapshot.paths.map((path) => ({
        ...path,
        points: path.points.map((point) => ({ ...point })),
      })),
      handoffs: snapshot.handoffs.map((handoff) => ({ ...handoff })),
      textAnnotations: snapshot.textAnnotations.map((textAnnotation) => ({ ...textAnnotation })),
    }));
  }

  function handleUndoBoardChange() {
    if (!persistedActivePlay) {
      return;
    }

    const history = getBoardHistoryState(persistedActivePlay.id);
    const previousSnapshot = history.past.pop();
    if (!previousSnapshot) {
      return;
    }

    history.future = [getBoardSnapshot(persistedActivePlay), ...history.future].slice(0, BOARD_HISTORY_LIMIT);
    applyBoardSnapshot(previousSnapshot);
    setDraftPath(null);
    setHandoffSourceId(null);
  }

  function handleRedoBoardChange() {
    if (!persistedActivePlay) {
      return;
    }

    const history = getBoardHistoryState(persistedActivePlay.id);
    const nextSnapshot = history.future.shift();
    if (!nextSnapshot) {
      return;
    }

    history.past = [...history.past.slice(-(BOARD_HISTORY_LIMIT - 1)), getBoardSnapshot(persistedActivePlay)];
    applyBoardSnapshot(nextSnapshot);
    setDraftPath(null);
    setHandoffSourceId(null);
  }

  function beginTextEditSession(textId: string) {
    if (!persistedActivePlay) {
      return;
    }

    const activeSession = activeTextEditRef.current;
    if (activeSession.playId === persistedActivePlay.id && activeSession.textId === textId) {
      return;
    }

    pushBoardHistorySnapshot();
    activeTextEditRef.current = {
      playId: persistedActivePlay.id,
      textId,
    };
  }

  function endTextEditSession(textId?: string) {
    if (textId && activeTextEditRef.current.textId !== textId) {
      return;
    }

    resetActiveTextEdit();
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
      setPlayInspectorDrafts({});
      setPendingPlaySaveIds({});
      boardHistoryRef.current = {};
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

  useEffect(() => {
    const validPlayIds = new Set(Object.values(playsBySetId).flat().map((play) => play.id));
    setPlayInspectorDrafts((current) => Object.fromEntries(Object.entries(current).filter(([playId]) => validPlayIds.has(playId))));
    setPendingPlaySaveIds((current) => Object.fromEntries(Object.entries(current).filter(([playId]) => validPlayIds.has(playId))));
  }, [playsBySetId]);

  useEffect(() => {
    if (!activePlay) {
      setSelectedPlayerId(null);
      setSelectedPathId(null);
      setSelectedTextId(null);
      resetActiveTextEdit();
      return;
    }

    if (selectedPlayerId && !activePlay.players.some((player) => player.id === selectedPlayerId)) {
      setSelectedPlayerId(null);
    }

    if (selectedPathId && !activePlay.paths.some((path) => path.id === selectedPathId)) {
      setSelectedPathId(null);
    }

    if (selectedTextId && !activePlay.textAnnotations.some((textAnnotation) => textAnnotation.id === selectedTextId)) {
      setSelectedTextId(null);
      endTextEditSession();
    }
  }, [activePlay, selectedPathId, selectedPlayerId, selectedTextId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableShortcutTarget(event.target)) {
        return;
      }

      const hasModifier = event.metaKey || event.ctrlKey;
      if (!hasModifier) {
        return;
      }

      const lowerKey = event.key.toLowerCase();
      if (lowerKey === "z" && event.shiftKey) {
        event.preventDefault();
        handleRedoBoardChange();
        return;
      }

      if (lowerKey === "z") {
        event.preventDefault();
        handleUndoBoardChange();
        return;
      }

      if (lowerKey === "y" && event.ctrlKey) {
        event.preventDefault();
        handleRedoBoardChange();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [persistedActivePlay]);

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
    if (!persistedActivePlay || !activePlaySetId) {
      return;
    }

    setPlaysBySetId((current) => {
      const nextPlays = (current[activePlaySetId] ?? []).map((play) => {
        if (play.id !== persistedActivePlay.id) {
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

  function updateActivePlayInspectorDraft(updater: (play: PlayDocument) => PlayDocument) {
    if (!persistedActivePlay) {
      return;
    }

    setPlayInspectorDrafts((current) => {
      const nextPlay = updater(mergeInspectorDraft(persistedActivePlay, current[persistedActivePlay.id]));
      const nextDraft: PlayInspectorDraft = {
        name: nextPlay.name,
        notes: nextPlay.notes,
        displaySettings: normalizePlayDisplaySettings(nextPlay.displaySettings),
      };

      if (!hasInspectorDraftChanges(persistedActivePlay, nextDraft)) {
        const { [persistedActivePlay.id]: _removed, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [persistedActivePlay.id]: nextDraft,
      };
    });
  }

  async function handleSaveActivePlaySettings() {
    if (!persistedActivePlay) {
      return;
    }

    const draft = playInspectorDrafts[persistedActivePlay.id];
    if (!draft) {
      return;
    }

    const existingTimer = playSaveTimers.current[persistedActivePlay.id];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      delete playSaveTimers.current[persistedActivePlay.id];
    }

    markPlaySavePending(persistedActivePlay.id);
    const nextPlay = touchPlay(mergeInspectorDraft(persistedActivePlay, draft));

    try {
      const saved = await backend.savePlay(nextPlay);
      setPlaysBySetId((current) => ({
        ...current,
        [saved.playSetId]: (current[saved.playSetId] ?? [])
          .map((play) => (play.id === saved.id ? saved : play))
          .sort((a, b) => a.playNumber - b.playNumber),
      }));
      setPlayInspectorDrafts((current) => {
        const { [saved.id]: _removed, ...rest } = current;
        return rest;
      });
      markPlaySaveSettled(saved.id);
    } catch (error) {
      setWorkspaceError(getErrorMessage(error));
    }
  }

  async function handleCreatePlaySet(input?: { name: string; settings: PartialPlaySetSettings }) {
    if (!userId) {
      return;
    }

    const newPlaySet = createPlaySet(input?.name ?? `Play Set ${playSets.length + 1}`, input?.settings);

    try {
      const savedPlaySet = await backend.savePlaySet(userId, newPlaySet);
      setPlaySets((current) => [savedPlaySet, ...current]);
      setPlaysBySetId((current) => ({
        ...current,
        [savedPlaySet.id]: [],
      }));
      setActivePlaySetId(savedPlaySet.id);
      setActivePlayId(null);
      setIsCreatePlaySetOpen(false);
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
      const deletedPlayIds = new Set((playsBySetId[playSetId] ?? []).map((play) => play.id));
      await backend.deletePlaySet(playSetId);
      setPlaySets((current) => current.filter((playSet) => playSet.id !== playSetId));
      setPlaysBySetId((current) => {
        const next = { ...current };
        delete next[playSetId];
        return next;
      });
      setPlayInspectorDrafts((current) =>
        Object.fromEntries(Object.entries(current).filter(([playId]) => !deletedPlayIds.has(playId))),
      );
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

    const sourcePlay = displayedSetPlays.find((play) => play.id === playId);
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
      setPlayInspectorDrafts((current) => {
        const { [playId]: _removed, ...rest } = current;
        return rest;
      });
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
      setSelectedTextId(null);
      return;
    }

    if (tool === "route" || tool === "motion") {
      setSelectedPlayerId(playerId);
      setSelectedPathId(null);
      setSelectedTextId(null);
      setHandoffSourceId(null);
      return;
    }

    if (!handoffSourceId) {
      setHandoffSourceId(playerId);
      setSelectedPlayerId(playerId);
      setSelectedPathId(null);
      setSelectedTextId(null);
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

    pushBoardHistorySnapshot();
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
    if (!activePlay || tool !== "text") {
      return;
    }

    const nextTextAnnotation: TextAnnotation = {
      id: makeId("text"),
      x: point.x,
      y: point.y,
      text: "Text",
    };

    pushBoardHistorySnapshot();
    updateActivePlay((play) => ({
      ...play,
      textAnnotations: [...play.textAnnotations, nextTextAnnotation],
    }));
    setSelectedPlayerId(null);
    setSelectedPathId(null);
    setSelectedTextId(nextTextAnnotation.id);
    setSelectedTextFocusToken((current) => current + 1);
    setHandoffSourceId(null);
  }

  function handleStartDraftPath(playerId: string, kind: RouteKind) {
    setDraftPath({ playerId, kind, points: [] });
  }

  function handleUpdateDraftPath(points: Point[]) {
    setDraftPath((current) => (current ? { ...current, points } : null));
  }

  function handleCommitDraftPath(playerId: string, kind: RouteKind, points: Point[]) {
    if (!activePlay) {
      setDraftPath(null);
      return;
    }

    const player = activePlay.players.find((item) => item.id === playerId);
    if (!player) {
      setDraftPath(null);
      return;
    }

    const processedStroke = processFreehandStroke([player, ...points]);
    if (processedStroke.length < 2 || getPathLength(processedStroke) < MIN_FREEHAND_PATH_LENGTH) {
      setDraftPath(null);
      return;
    }

    const nextPoints = processedStroke.slice(1);
    if (nextPoints.length === 0) {
      setDraftPath(null);
      return;
    }

    const nextPath: RoutePath = {
      id: makeId("path"),
      playerId,
      kind,
      points: nextPoints,
      arrowEnd: true,
    };

    pushBoardHistorySnapshot();
    updateActivePlay((play) => ({
      ...play,
      paths: [...play.paths.filter((path) => path.playerId !== playerId), nextPath],
    }));
    setDraftPath(null);
    setSelectedPlayerId(nextPath.playerId);
    setSelectedPathId(nextPath.id);
    setSelectedTextId(null);
  }

  function handleCancelDraft() {
    setDraftPath(null);
  }

  function handleStartMovePlayer() {
    pushBoardHistorySnapshot();
  }

  function handleMovePlayer(playerId: string, point: Point) {
    updateActivePlay((play) => movePlayerAndAttachedPaths(play, playerId, point));
  }

  function handleStartMovePathPoint() {
    pushBoardHistorySnapshot();
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

  function handleSelectText(textId: string) {
    setSelectedTextId(textId);
    setSelectedPlayerId(null);
    setSelectedPathId(null);
  }

  function handleStartMoveText() {
    pushBoardHistorySnapshot();
  }

  function handleMoveText(textId: string, point: Point) {
    updateActivePlay((play) => ({
      ...play,
      textAnnotations: play.textAnnotations.map((textAnnotation) =>
        textAnnotation.id === textId ? { ...textAnnotation, ...point } : textAnnotation,
      ),
    }));
  }

  function handlePlayerUpdate(playerId: string, changes: Partial<Pick<PlayerToken, "label" | "color">>) {
    pushBoardHistorySnapshot();
    updateActivePlay((play) => ({
      ...play,
      players: play.players.map((player) => (player.id === playerId ? { ...player, ...changes } : player)),
    }));
  }

  function handleTextAnnotationChange(textId: string, text: string) {
    updateActivePlay((play) => ({
      ...play,
      textAnnotations: play.textAnnotations.map((textAnnotation) =>
        textAnnotation.id === textId ? { ...textAnnotation, text } : textAnnotation,
      ),
    }));
  }

  function handleDeleteSelectedPath() {
    if (!selectedPathId) {
      return;
    }

    pushBoardHistorySnapshot();
    updateActivePlay((play) => ({
      ...play,
      paths: play.paths.filter((path) => path.id !== selectedPathId),
    }));
    setSelectedPathId(null);
  }

  function handleDeleteSelectedText() {
    if (!selectedTextId) {
      return;
    }

    pushBoardHistorySnapshot();
    updateActivePlay((play) => ({
      ...play,
      textAnnotations: play.textAnnotations.filter((textAnnotation) => textAnnotation.id !== selectedTextId),
    }));
    setSelectedTextId(null);
    endTextEditSession(selectedTextId);
  }

  async function handleExportPlaySet() {
    if (!activePlaySet || isExportingPlaySet) {
      return;
    }

    setIsExportingPlaySet(true);

    try {
      await exportPlaySetToPdf(activePlaySet, activeSetPlays, exportPreviewRefs.current);
    } finally {
      setIsExportingPlaySet(false);
    }
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
              onCreatePlaySet={() => setIsCreatePlaySetOpen(true)}
              onDeletePlay={handleDeletePlay}
              onDeletePlaySet={handleDeletePlaySet}
              onDuplicatePlay={handleDuplicatePlay}
              onDuplicatePlaySet={handleDuplicatePlaySet}
              onExportPlaySet={handleExportPlaySet}
              onMovePlay={handleMovePlay}
              onOpenPlaySetSettings={() => setIsPlaySetSettingsOpen(true)}
              onSelectPlay={(playId) => {
                setActivePlayId(playId);
                clearTransientState();
              }}
              onSelectPlaySet={handleSelectPlaySet}
              playSets={setScopedPlaySets}
              plays={displayedSetPlays}
            />
          </div>

          <main className="flex min-w-0 flex-col gap-5">
            {activePlay ? (
              <Toolbar
                canRedo={canRedo}
                canUndo={canUndo}
                draftPath={draftPath}
                onRedo={handleRedoBoardChange}
                onToolChange={(nextTool) => {
                  setTool(nextTool);
                  setHandoffSourceId(null);
                  if (nextTool !== "route" && nextTool !== "motion") {
                    setDraftPath(null);
                  }
                }}
                onUndo={handleUndoBoardChange}
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
              <section className="relative grid gap-4 rounded-[38px] bg-ink-950/80 p-4 shadow-panel sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        hasUnsavedActivePlayChanges
                          ? "bg-red-500/20 text-red-200 ring-1 ring-inset ring-red-400/35"
                          : "bg-emerald-500/20 text-emerald-200 ring-1 ring-inset ring-emerald-400/35"
                      }`}
                    >
                      {hasUnsavedActivePlayChanges ? "Unsaved Changes" : "Saved"}
                    </div>
                    <p className="mt-2 font-display text-xl font-bold text-white">{activePlay.name}</p>
                  </div>
                  <div className="shrink-0 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/85">
                    Play #{activePlay.playNumber}
                  </div>
                </div>

                <Playboard
                  draftPath={draftPath}
                  handoffSourceId={handoffSourceId}
                  onBackgroundPress={() => {
                    setSelectedPathId(null);
                    setSelectedPlayerId(null);
                    setSelectedTextId(null);
                  }}
                  onBoardPress={handleBoardPress}
                  onCancelDraftPath={handleCancelDraft}
                  onCommitDraftPath={handleCommitDraftPath}
                  onPathPointMove={handleMovePathPoint}
                  onPathPointMoveStart={handleStartMovePathPoint}
                  onPathPress={(pathId) => {
                    setSelectedPathId(pathId);
                    setSelectedPlayerId(null);
                    setSelectedTextId(null);
                  }}
                  onPlayerMove={handleMovePlayer}
                  onPlayerMoveStart={handleStartMovePlayer}
                  onPlayerPress={handlePlayerPress}
                  onStartDraftPath={handleStartDraftPath}
                  onTextMove={handleMoveText}
                  onTextMoveStart={handleStartMoveText}
                  onTextPress={handleSelectText}
                  onUpdateDraftPath={handleUpdateDraftPath}
                  play={activePlay}
                  playSetSettings={activePlaySet.settings}
                  selectedPathId={selectedPathId}
                  selectedPlayerId={selectedPlayerId}
                  selectedTextId={selectedTextId}
                  tool={tool}
                />
                <p className="text-sm text-white/70">
                  {draftPath
                    ? "Release to commit the path."
                    : tool === "handoff"
                      ? handoffSourceId
                        ? "Choose the receiving player to create the handoff."
                        : "Choose the ball carrier, then the receiving player."
                      : tool === "text"
                        ? "Click anywhere on the board to drop a note."
                        : "Use select mode to drag players and edit route handles."}
                </p>
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
                    onClick={() => setIsCreatePlaySetOpen(true)}
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
              onDeleteSelectedText={handleDeleteSelectedText}
              onSavePlaySettings={() => void handleSaveActivePlaySettings()}
              onPlayDisplaySettingsChange={(displaySettings) => {
                updateActivePlayInspectorDraft((play) => ({
                  ...play,
                  displaySettings: normalizePlayDisplaySettings(displaySettings),
                }));
              }}
              onPlayNameChange={(name) => updateActivePlayInspectorDraft((play) => ({ ...play, name }))}
              onPlayNotesChange={(notes) => updateActivePlayInspectorDraft((play) => ({ ...play, notes }))}
              onPlayerUpdate={handlePlayerUpdate}
              onTextAnnotationChange={handleTextAnnotationChange}
              onTextEditEnd={endTextEditSession}
              onTextEditStart={beginTextEditSession}
              playSettingsDirty={Boolean(persistedActivePlay && playInspectorDrafts[persistedActivePlay.id])}
              play={activePlay}
              playSet={activePlaySet}
              playSets={playSets}
              selectedPath={selectedPath}
              selectedPlayer={selectedPlayer}
              selectedText={selectedText}
              selectedTextFocusToken={selectedTextFocusToken}
            />
          </div>
        </div>
      </div>

      <CreatePlaySetModal
        defaultName={`Play Set ${playSets.length + 1}`}
        onClose={() => setIsCreatePlaySetOpen(false)}
        onSubmit={(payload) => void handleCreatePlaySet(payload)}
        open={isCreatePlaySetOpen}
      />

      <PlaySetSettingsModal
        exporting={isExportingPlaySet}
        onClose={() => setIsPlaySetSettingsOpen(false)}
        onExportPlaySet={handleExportPlaySet}
        onSave={async ({ name, settings }) => {
          if (!activePlaySet || !userId) {
            return;
          }

          const normalizedSettings = normalizePlaySetSettings(settings);
          const nextPlays = activeSetPlays.map((play) => applyPlaySetSettingsToPlay(play, normalizedSettings));
          const nextPlaySet = touchPlaySet({
            ...activePlaySet,
            name,
            settings: normalizedSettings,
          });

          const existingPlaySetTimer = playSetSaveTimers.current[nextPlaySet.id];
          if (existingPlaySetTimer) {
            window.clearTimeout(existingPlaySetTimer);
            delete playSetSaveTimers.current[nextPlaySet.id];
          }

          nextPlays.forEach((play) => {
            const timer = playSaveTimers.current[play.id];
            if (timer) {
              window.clearTimeout(timer);
              delete playSaveTimers.current[play.id];
            }
          });

          try {
            const savedPlaySet = await backend.savePlaySet(userId, nextPlaySet);
            const savedPlays = nextPlays.length > 0 ? await backend.savePlays(nextPlays) : [];

            setPlaySets((current) => current.map((item) => (item.id === savedPlaySet.id ? savedPlaySet : item)));
            setPlaysBySetId((current) => ({
              ...current,
              [savedPlaySet.id]: savedPlays,
            }));
            setIsPlaySetSettingsOpen(false);
          } catch (error) {
            setWorkspaceError(getErrorMessage(error));
          }
        }}
        open={isPlaySetSettingsOpen}
        playSet={activePlaySet}
      />

      {activePlaySet ? (
        <div className="pointer-events-none absolute -left-[99999px] top-0 flex flex-col gap-6" aria-hidden="true">
          {displayedSetPlays.map((play) => (
            <ExportPlayCard
              key={play.id}
              play={play}
              ref={(node) => {
                exportPreviewRefs.current[play.id] = node;
              }}
              playSet={activePlaySet}
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
