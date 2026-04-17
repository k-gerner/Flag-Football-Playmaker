import {
  BOARD_LAYOUT,
  applyPlaySetSettingsToPlay,
  clonePlayDocument,
  createPlayDocument,
  createPlaySet,
  getEditorFieldLayout,
  getPlaySetCardDimensions,
  getPlayerCircleRadius,
  getPlaySetPrintLayoutMetrics,
  getRouteStrokeWidth,
  isLandscapeCard,
  normalizePlayDisplaySettings,
  normalizePlaySetSettings,
  normalizeStoredPlayPayload,
  remapPlayToFieldLayout,
  renumberPlays,
} from "../lib/playbook";

describe("playbook helpers", () => {
  it("normalizes Play Set settings and derives paging from rows and columns", () => {
    const settings = normalizePlaySetSettings({
      field: {
        matchRouteColorToPlayer: true,
      },
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
    expect(settings.field.matchRouteColorToPlayer).toBe(true);
    expect(settings.field.playerSize).toBe("M");
    expect(settings.field.lineThickness).toBe("medium");
  });

  it("normalizes player size and line thickness values", () => {
    const settings = normalizePlaySetSettings({
      field: {
        playerSize: "L",
        lineThickness: "thick",
      },
    });

    expect(settings.field.playerSize).toBe("L");
    expect(settings.field.lineThickness).toBe("thick");
    expect(getPlayerCircleRadius(settings)).toBe(4.9);
    expect(getRouteStrokeWidth(settings)).toBe(1.8);
  });

  it("flags portrait printable cards as invalid", () => {
    const squareSettings = normalizePlaySetSettings({
      print: {
        presetId: null,
        width: 3,
        height: 2,
        unit: "in",
      },
      layout: {
        rowsPerPage: 2,
        columnsPerPage: 3,
        playsPerPage: 1,
        cardAspectRatio: 1,
      },
    });
    const portraitSettings = normalizePlaySetSettings({
      print: {
        presetId: null,
        width: 2,
        height: 3,
        unit: "in",
      },
      layout: {
        rowsPerPage: 1,
        columnsPerPage: 1,
        playsPerPage: 1,
        cardAspectRatio: 1,
      },
    });

    expect(isLandscapeCard(squareSettings)).toBe(true);
    expect(isLandscapeCard(portraitSettings)).toBe(false);
  });

  it("derives the editor layout from the printable card ratio", () => {
    const settings = normalizePlaySetSettings({
      print: {
        presetId: null,
        width: 3,
        height: 2,
        unit: "in",
      },
      layout: {
        rowsPerPage: 2,
        columnsPerPage: 3,
        playsPerPage: 1,
        cardAspectRatio: 1,
      },
    });

    const layout = getEditorFieldLayout(settings);

    expect(layout.width).toBe(120);
    expect(layout.height).toBe(120);
    expect(layout.lineOfScrimmageY).toBe(84);
  });

  it("shares print layout metrics across preview and export math", () => {
    const settings = normalizePlaySetSettings({
      print: {
        presetId: null,
        width: 3.5,
        height: 1,
        unit: "in",
      },
      layout: {
        rowsPerPage: 3,
        columnsPerPage: 3,
        playsPerPage: 1,
        cardAspectRatio: 1,
      },
    });

    expect(getPlaySetPrintLayoutMetrics(settings)).toEqual({
      pageWidth: 3.5,
      pageHeight: 1,
      spacing: 0,
      columnsPerPage: 3,
      rowsPerPage: 3,
      playsPerPage: 9,
      cardWidth: 1.167,
      cardHeight: 0.333,
    });
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
    expect(play.fieldLayout).toEqual(getEditorFieldLayout(playSet.settings));
    expect(play.textAnnotations).toEqual([]);
  });

  it("applies set-level roster labels and colors to matching players", () => {
    const playSet = createPlaySet("Team A");
    const play = createPlayDocument({
      playSetId: playSet.id,
      playNumber: 1,
      settings: playSet.settings,
    });
    const updatedSettings = normalizePlaySetSettings({
      ...playSet.settings,
      roster: {
        ...playSet.settings.roster,
        players: playSet.settings.roster.players.map((player, index) =>
          index === 0 ? { ...player, label: "FL", color: "#123456" } : player,
        ),
      },
    });

    const remapped = applyPlaySetSettingsToPlay(play, updatedSettings);

    expect(remapped.players[0].id).toBe(play.players[0].id);
    expect(remapped.players[0].label).toBe("FL");
    expect(remapped.players[0].color).toBe("#123456");
    expect(remapped.players[1].label).toBe(playSet.settings.roster.players[1].label);
  });

  it("preserves an explicitly hidden yard-line setting", () => {
    const settings = normalizePlayDisplaySettings({
      yardMarkers: [],
    });

    expect(settings.yardMarkers).toEqual([]);
    expect(settings.annotations.showLineOfScrimmageLabel).toBe(true);
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
      textAnnotations: [
        {
          id: "text-1",
          x: 50,
          y: 45,
          text: "Alert",
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
    expect(cloned.textAnnotations[0].id).not.toBe(playWithLinks.textAnnotations[0].id);
    expect(cloned.textAnnotations[0].text).toBe("Alert");
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
    expect(remapped.fieldLayout).toEqual(getEditorFieldLayout(updatedSettings));
  });

  it("rescales existing play coordinates into a new editor layout", () => {
    const playSet = createPlaySet("Team A");
    const play = createPlayDocument({
      playSetId: playSet.id,
      playNumber: 1,
      settings: playSet.settings,
    });
    const remapped = remapPlayToFieldLayout(
      {
        ...play,
        fieldLayout: BOARD_LAYOUT,
        players: play.players.map((player) =>
          player.label === "Q" ? { ...player, x: 60, y: 70 } : player,
        ),
        paths: [
          {
            id: "path-1",
            playerId: play.players[0].id,
            kind: "route",
            points: [{ x: 60, y: 40 }],
            arrowEnd: true,
          },
        ],
      },
      {
        width: 120,
        height: 120,
        lineOfScrimmageY: 84,
        yardsBehindLine: 36,
        yardsInFront: 72,
      },
    );

    const qb = remapped.players.find((player) => player.label === "Q");
    expect(qb?.x).toBe(60);
    expect(qb?.y).toBe(105);
    expect(remapped.paths[0].points[0]).toEqual({ x: 60, y: 60 });
  });

  it("normalizes legacy payloads without text annotations", () => {
    const payload = normalizeStoredPlayPayload({
      players: [],
      paths: [],
      handoffs: [],
    });

    expect(payload.textAnnotations).toEqual([]);
    expect(payload.schemaVersion).toBe(2);
  });
});
