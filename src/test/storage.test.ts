import { createPlayDocument } from "../lib/playbook";
import { STORAGE_KEY, loadPlaybook, parsePlaybook, savePlaybook, serializePlaybook } from "../lib/storage";

describe("storage helpers", () => {
  it("serializes and parses playbooks", () => {
    const play = createPlayDocument(5);
    const raw = serializePlaybook([play]);

    expect(parsePlaybook(raw)[0].id).toBe(play.id);
  });

  it("falls back to a default play when the payload is invalid", () => {
    const parsed = parsePlaybook("nope");
    expect(parsed).toHaveLength(1);
    expect(parsed[0].players.length).toBeGreaterThan(0);
  });

  it("loads and saves through a storage adapter", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    const play = createPlayDocument(7);
    savePlaybook([play], storage);

    expect(values.has(STORAGE_KEY)).toBe(true);
    expect(loadPlaybook(storage)[0].id).toBe(play.id);
  });
});
