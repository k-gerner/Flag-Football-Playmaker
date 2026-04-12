import {
  applyPlaySetSettingsToPlay,
  clonePlayDocument,
  createPlayDocument,
  createPlaySet,
  getPlaySetCardDimensions,
  normalizePlayDisplaySettings,
  normalizePlaySetSettings,
  renumberPlays,
} from "../lib/playbook";

describe("playbook helpers", () => {
  it("normalizes Play Set settings and derives paging from rows and columns", () => {
    const settings = normalizePlaySetSettings({
      print: {
        presetId: null,
        width: 8,
        height: 10,
        unit: "in",
      },
      layout: {
        rowsPerPage: 2,
        columnsPerPage: 2,
        playsPerPage: 1,
        cardAspectRatio: 1,
      },
    });
    const card = getPlaySetCardDimensions(settings);

    expect(settings.layout.rowsPerPage).toBe(2);
    expect(settings.layout.columnsPerPage).toBe(2);
    expect(settings.layout.playsPerPage).toBe(4);
    expect(settings.layout.cardAspectRatio).toBe(Number((card.width / card.height).toFixed(3)));
    expect(settings.print.height).toBe(10);
  });

  it("creates a play from Play Set defaults", () => {
    const playSet = createPlaySet("Team A");
    const play = createPlayDocument({
      playSetId: playSet.id,
      playNumber: 3,
      settings: playSet.settings,
      name: "Trips Right",
    });

    expect(play.playSetId).toBe(playSet.id);
    expect(play.playNumber).toBe(3);
    expect(play.players).toHaveLength(playSet.settings.roster.playerCount);
    expect(play.displaySettings).toEqual(normalizePlayDisplaySettings());
  });

  it("renumbers plays densely after reordering", () => {
    const playSet = createPlaySet("Team A");
    const first = createPlayDocument({ playSetId: playSet.id, playNumber: 1, settings: playSet.settings });
    const second = createPlayDocument({ playSetId: playSet.id, playNumber: 2, settings: playSet.settings });
    const third = createPlayDocument({ playSetId: playSet.id, playNumber: 3, settings: playSet.settings });

    const renumbered = renumberPlays([third, first, second]);

    expect(renumbered.map((play) => play.playNumber)).toEqual([1, 2, 3]);
    expect(renumbered[0].id).toBe(third.id);
  });

  it("clones plays with rewired player references", () => {
    const playSet = createPlaySet("Team A");
    const source = createPlayDocument({ playSetId: playSet.id, playNumber: 1, settings: playSet.settings });
    const qb = source.players.find((player) => player.label === "Q");
    const rb = source.players.find((player) => player.label === "RB");
    if (!qb || !rb) {
      throw new Error("Expected seeded Q and RB players.");
    }

    const playWithLinks = {
      ...source,
      paths: [
        {
          id: "path-1",
          playerId: qb.id,
          kind: "route" as const,
          points: [{ x: 60, y: 40 }],
          arrowEnd: true,
        },
      ],
      handoffs: [
        {
          id: "handoff-1",
          fromPlayerId: qb.id,
          toPlayerId: rb.id,
        },
      ],
    };

    const cloned = clonePlayDocument(playWithLinks, {
      playSetId: playSet.id,
      playNumber: 2,
    });

    const clonedQb = cloned.players.find((player) => player.label === "Q");
    const clonedRb = cloned.players.find((player) => player.label === "RB");
    expect(clonedQb?.id).not.toBe(qb.id);
    expect(cloned.paths[0].playerId).toBe(clonedQb?.id);
    expect(cloned.handoffs[0].fromPlayerId).toBe(clonedQb?.id);
    expect(cloned.handoffs[0].toPlayerId).toBe(clonedRb?.id);
  });

  it("remaps a play when the Play Set player count changes", () => {
    const playSet = createPlaySet("Team A");
    const play = createPlayDocument({
      playSetId: playSet.id,
      playNumber: 1,
      settings: playSet.settings,
    });
    const updatedSettings = normalizePlaySetSettings({
      ...playSet.settings,
      roster: {
        playerCount: 5,
      },
    });

    const remapped = applyPlaySetSettingsToPlay(play, updatedSettings);

    expect(remapped.players).toHaveLength(5);
    expect(remapped.paths).toHaveLength(0);
    expect(remapped.handoffs).toHaveLength(0);
  });
});
