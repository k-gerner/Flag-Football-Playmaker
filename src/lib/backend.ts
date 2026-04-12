import { createPlayDocument, createPlaySet, normalizePlayDisplaySettings, normalizePlaySetSettings, toStoredPlayPayload } from "./playbook";
import type {
  AuthSessionState,
  AuthUser,
  PlayDocument,
  PlaySet,
  PlaySetSettings,
  StoredPlayPayload,
} from "./types";
import { supabase } from "./supabase";

interface PlaySetRow {
  id: string;
  user_id: string;
  name: string;
  settings_json: PlaySetSettings;
  created_at: string;
  updated_at: string;
}

interface PlayRow {
  id: string;
  play_set_id: string;
  name: string;
  notes: string;
  play_number: number;
  play_data_json: StoredPlayPayload;
  created_at: string;
  updated_at: string;
}

export interface AppBackend {
  isConfigured: boolean;
  getInitialAuthState(): Promise<AuthSessionState>;
  subscribeToAuth(callback: (state: AuthSessionState) => void): () => void;
  signIn(email: string, password: string): Promise<AuthSessionState>;
  signUp(email: string, password: string): Promise<AuthSessionState>;
  signOut(): Promise<void>;
  listPlaySets(userId: string): Promise<PlaySet[]>;
  savePlaySet(userId: string, playSet: PlaySet): Promise<PlaySet>;
  deletePlaySet(playSetId: string): Promise<void>;
  listPlays(playSetId: string): Promise<PlayDocument[]>;
  savePlay(play: PlayDocument): Promise<PlayDocument>;
  savePlays(plays: PlayDocument[]): Promise<PlayDocument[]>;
  deletePlay(playId: string): Promise<void>;
}

function toSignedOut(error: string | null = null): AuthSessionState {
  return {
    status: "signed_out",
    user: null,
    error,
  };
}

function toSignedIn(user: AuthUser): AuthSessionState {
  return {
    status: "signed_in",
    user,
    error: null,
  };
}

function mapAuthUser(input: { id: string; email?: string | null }): AuthUser {
  return {
    id: input.id,
    email: input.email ?? "unknown@example.com",
  };
}

function mapPlaySetRow(row: PlaySetRow): PlaySet {
  return {
    id: row.id,
    name: row.name,
    settings: normalizePlaySetSettings(row.settings_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlayRow(row: PlayRow): PlayDocument {
  const payload = row.play_data_json;
  const displaySettings = normalizePlayDisplaySettings(payload?.displaySettings);

  return {
    id: row.id,
    playSetId: row.play_set_id,
    name: row.name,
    notes: row.notes ?? "",
    playNumber: row.play_number,
    fieldLayout: payload?.fieldLayout ?? createPlayDocument({
      playSetId: row.play_set_id,
      playNumber: row.play_number,
      settings: normalizePlaySetSettings(),
    }).fieldLayout,
    players: payload?.players ?? [],
    paths: payload?.paths ?? [],
    handoffs: payload?.handoffs ?? [],
    displaySettings,
    updatedAt: row.updated_at,
    schemaVersion: payload?.schemaVersion ?? 1,
  };
}

function toPlaySetRow(userId: string, playSet: PlaySet): PlaySetRow {
  return {
    id: playSet.id,
    user_id: userId,
    name: playSet.name,
    settings_json: normalizePlaySetSettings(playSet.settings),
    created_at: playSet.createdAt,
    updated_at: playSet.updatedAt,
  };
}

function toPlayRow(play: PlayDocument): PlayRow {
  const now = play.updatedAt;
  return {
    id: play.id,
    play_set_id: play.playSetId,
    name: play.name,
    notes: play.notes,
    play_number: play.playNumber,
    play_data_json: toStoredPlayPayload(play),
    created_at: now,
    updated_at: now,
  };
}

function assertConfigured() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

export const supabaseBackend: AppBackend = {
  isConfigured: Boolean(supabase),
  async getInitialAuthState() {
    const client = assertConfigured();
    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    if (error) {
      return toSignedOut(error.message);
    }

    if (!session?.user) {
      return toSignedOut();
    }

    return toSignedIn(mapAuthUser(session.user));
  },
  subscribeToAuth(callback) {
    if (!supabase) {
      return () => undefined;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        callback(toSignedIn(mapAuthUser(session.user)));
      } else {
        callback(toSignedOut());
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },
  async signIn(email, password) {
    const client = assertConfigured();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      return toSignedOut(error.message);
    }

    if (!data.user) {
      return toSignedOut("Unable to sign in.");
    }

    return toSignedIn(mapAuthUser(data.user));
  },
  async signUp(email, password) {
    const client = assertConfigured();
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) {
      return toSignedOut(error.message);
    }

    if (!data.user) {
      return toSignedOut("Unable to create account.");
    }

    return toSignedIn(mapAuthUser(data.user));
  },
  async signOut() {
    const client = assertConfigured();
    await client.auth.signOut();
  },
  async listPlaySets(userId) {
    const client = assertConfigured();
    const { data, error } = await client
      .from("play_sets")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data as PlaySetRow[]).map(mapPlaySetRow);
  },
  async savePlaySet(userId, playSet) {
    const client = assertConfigured();
    const { data, error } = await client
      .from("play_sets")
      .upsert(toPlaySetRow(userId, playSet))
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapPlaySetRow(data as PlaySetRow);
  },
  async deletePlaySet(playSetId) {
    const client = assertConfigured();
    const { error } = await client.from("play_sets").delete().eq("id", playSetId);
    if (error) {
      throw new Error(error.message);
    }
  },
  async listPlays(playSetId) {
    const client = assertConfigured();
    const { data, error } = await client
      .from("plays")
      .select("*")
      .eq("play_set_id", playSetId)
      .order("play_number", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data as PlayRow[]).map(mapPlayRow);
  },
  async savePlay(play) {
    const client = assertConfigured();
    const { data, error } = await client.from("plays").upsert(toPlayRow(play)).select("*").single();
    if (error) {
      throw new Error(error.message);
    }

    return mapPlayRow(data as PlayRow);
  },
  async savePlays(plays) {
    if (plays.length === 0) {
      return [];
    }

    const client = assertConfigured();
    const { data, error } = await client.from("plays").upsert(plays.map(toPlayRow)).select("*");
    if (error) {
      throw new Error(error.message);
    }

    return (data as PlayRow[]).map(mapPlayRow).sort((a, b) => a.playNumber - b.playNumber);
  },
  async deletePlay(playId) {
    const client = assertConfigured();
    const { error } = await client.from("plays").delete().eq("id", playId);
    if (error) {
      throw new Error(error.message);
    }
  },
};

interface MemoryBackendOptions {
  initialAuthState?: AuthSessionState;
  initialPlaySets?: PlaySet[];
  initialPlays?: PlayDocument[];
}

export function createMemoryBackend(options: MemoryBackendOptions = {}): AppBackend {
  let authState =
    options.initialAuthState ??
    toSignedIn({
      id: "user-demo",
      email: "coach@example.com",
    });
  let playSets = options.initialPlaySets ?? [];
  let plays = options.initialPlays ?? [];
  const authListeners = new Set<(state: AuthSessionState) => void>();

  const notify = () => {
    authListeners.forEach((listener) => listener(authState));
  };

  return {
    isConfigured: true,
    async getInitialAuthState() {
      return authState;
    },
    subscribeToAuth(callback) {
      authListeners.add(callback);
      return () => {
        authListeners.delete(callback);
      };
    },
    async signIn(email) {
      authState = toSignedIn({
        id: "user-demo",
        email,
      });
      notify();
      return authState;
    },
    async signUp(email) {
      authState = toSignedIn({
        id: "user-demo",
        email,
      });
      notify();
      return authState;
    },
    async signOut() {
      authState = toSignedOut();
      notify();
    },
    async listPlaySets() {
      return [...playSets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async savePlaySet(_userId, playSet) {
      playSets = playSets.some((item) => item.id === playSet.id)
        ? playSets.map((item) => (item.id === playSet.id ? playSet : item))
        : [playSet, ...playSets];
      return playSet;
    },
    async deletePlaySet(playSetId) {
      playSets = playSets.filter((item) => item.id !== playSetId);
      plays = plays.filter((play) => play.playSetId !== playSetId);
    },
    async listPlays(playSetId) {
      return plays.filter((play) => play.playSetId === playSetId).sort((a, b) => a.playNumber - b.playNumber);
    },
    async savePlay(play) {
      plays = plays.some((item) => item.id === play.id)
        ? plays.map((item) => (item.id === play.id ? play : item))
        : [...plays, play];
      return play;
    },
    async savePlays(nextPlays) {
      const incomingIds = new Set(nextPlays.map((play) => play.id));
      plays = [...plays.filter((play) => !incomingIds.has(play.id)), ...nextPlays];
      return nextPlays;
    },
    async deletePlay(playId) {
      plays = plays.filter((play) => play.id !== playId);
    },
  };
}

export function createSeededMemoryBackend(): AppBackend {
  const playSet = createPlaySet("Team A");
  const play = createPlayDocument({
    playSetId: playSet.id,
    playNumber: 1,
    settings: playSet.settings,
  });

  return createMemoryBackend({
    initialPlaySets: [playSet],
    initialPlays: [play],
  });
}
