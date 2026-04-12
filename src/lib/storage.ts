import { createPlayDocument, migratePlayDocument } from "./playbook";
import type { PlayDocument } from "./types";

export const STORAGE_KEY = "flag-football-playmaker::plays";

export function serializePlaybook(plays: PlayDocument[]) {
  return JSON.stringify(plays);
}

export function parsePlaybook(input: string | null): PlayDocument[] {
  if (!input) {
    return [createPlayDocument()];
  }

  try {
    const parsed = JSON.parse(input) as PlayDocument[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createPlayDocument()];
    }

    const cleaned = parsed
      .filter((play) => typeof play?.id === "string" && Array.isArray(play.players))
      .map((play) => migratePlayDocument(play));
    return cleaned.length > 0 ? cleaned : [createPlayDocument()];
  } catch {
    return [createPlayDocument()];
  }
}

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function loadPlaybook(storage?: Pick<Storage, "getItem">) {
  const source = storage ?? getBrowserStorage();
  return parsePlaybook(source?.getItem(STORAGE_KEY) ?? null);
}

export function savePlaybook(
  plays: PlayDocument[],
  storage?: Pick<Storage, "setItem">,
) {
  const target = storage ?? getBrowserStorage();
  target?.setItem(STORAGE_KEY, serializePlaybook(plays));
}
