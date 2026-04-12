import { createPlayDocument } from "../lib/playbook";
import { STORAGE_KEY, loadPlaybook, parsePlaybook, savePlaybook, serializePlaybook } from "../lib/storage";

describe("storage helpers", () => {
  const legacyLayout = {
    width: 100,
    height: 140,
    lineOfScrimmageY: 92,
    yardsBehindLine: 48,
    yardsInFront: 92,
  };

  it("serializes and parses playbooks", () => {
    const play = createPlayDocument(5);
    const raw = serializePlaybook([play]);

    expect(parsePlaybook(raw)[0].id).toBe(play.id);
    expect(parsePlaybook(raw)[0].fieldTheme).toBe("white");
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

  it("migrates legacy plays to the corrected field orientation", () => {
    const legacyPlay = {
      ...createPlayDocument(7),
      schemaVersion: 1,
      fieldLayout: legacyLayout,
      players: [
        {
          id: "player-q",
          label: "Q",
          color: "#fff",
          x: 50,
          y: 68,
        },
      ],
      paths: [
        {
          id: "path-q",
          playerId: "player-q",
          kind: "route" as const,
          points: [{ x: 50, y: 138 }],
          arrowEnd: true,
        },
      ],
    };

    const parsed = parsePlaybook(JSON.stringify([legacyPlay]));

    expect(parsed[0].schemaVersion).toBe(4);
    expect(parsed[0].fieldTheme).toBe("white");
    expect(parsed[0].fieldLayout.height).toBe(80);
    expect(parsed[0].players[0].x).toBe(60);
    expect(parsed[0].players[0].y).toBe(68);
    expect(parsed[0].paths[0].points[0].x).toBe(60);
    expect(parsed[0].paths[0].points[0].y).toBe(32);
  });

  it("keeps schema 2 plays in the corrected orientation while adding the white field theme", () => {
    const correctedPlay = {
      ...createPlayDocument(7),
      schemaVersion: 2,
      fieldTheme: undefined,
      fieldLayout: legacyLayout,
      players: [
        {
          id: "player-q",
          label: "Q",
          color: "#fff",
          x: 50,
          y: 116,
        },
      ],
      paths: [
        {
          id: "path-q",
          playerId: "player-q",
          kind: "route" as const,
          points: [{ x: 50, y: 46 }],
          arrowEnd: true,
        },
      ],
    };

    const parsed = parsePlaybook(JSON.stringify([correctedPlay]));

    expect(parsed[0].schemaVersion).toBe(4);
    expect(parsed[0].fieldTheme).toBe("white");
    expect(parsed[0].fieldLayout.height).toBe(80);
    expect(parsed[0].players[0].x).toBe(60);
    expect(parsed[0].players[0].y).toBe(68);
    expect(parsed[0].paths[0].points[0].x).toBe(60);
    expect(parsed[0].paths[0].points[0].y).toBe(32);
  });
});
