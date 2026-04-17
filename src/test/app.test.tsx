import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import { AppShell } from "../App";
import { PlayLibrary } from "../components/PlayLibrary";
import { createMemoryBackend, createSeededMemoryBackend } from "../lib/backend";
import { createPlayDocument, createPlaySet, getEditorFieldLayout, normalizePlaySetSettings } from "../lib/playbook";

async function mockBoardRect() {
  const board = await screen.findByTestId("playboard");
  Object.defineProperty(board, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      width: 1200,
      height: 800,
      right: 1200,
      bottom: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  return board;
}

function drawGesture(target: Element, points: Array<{ clientX: number; clientY: number }>) {
  fireEvent.pointerDown(target, points[0]);

  act(() => {
    points.slice(1).forEach((point) => {
      window.dispatchEvent(new MouseEvent("mousemove", point));
    });
    window.dispatchEvent(new MouseEvent("mouseup", points[points.length - 1]));
  });
}

describe("AppShell", () => {
  it("shows the auth gate when signed out", async () => {
    const backend = createMemoryBackend({
      initialAuthState: {
        status: "signed_out",
        user: null,
        error: null,
      },
    });

    render(<AppShell backend={backend} />);

    expect(await screen.findByText("Sign in to manage cloud-saved Play Sets.")).toBeInTheDocument();
  });

  it("shows player count as a locked value in play set settings", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);

    await screen.findByTestId("play-set-picker-trigger");
    fireEvent.click(await screen.findByRole("button", { name: "Open play set settings" }));
    const modal = await screen.findByTestId("play-set-settings-modal");

    expect(modal).toHaveTextContent(/7\s*players/i);
    expect(within(modal).queryByText("Locked after creation")).not.toBeInTheDocument();
    expect(within(modal).queryByDisplayValue("Whiteboard")).not.toBeInTheDocument();
  });

  it("prompts for a play set before creating a play", async () => {
    const playSet = createPlaySet("Play Set 1");
    render(
      <AppShell
        backend={createMemoryBackend({
          initialPlaySets: [playSet],
          initialPlays: [],
        })}
      />,
    );

    expect(await screen.findByText("Create a play in Play Set 1 to unlock the field tools and start drawing.")).toBeInTheDocument();
    expect(screen.getByText("Create your first play")).toBeInTheDocument();
    expect(screen.queryByTestId("playboard")).not.toBeInTheDocument();
  });

  it("shows the selected play set in the collapsed picker and expands into a horizontal rail", async () => {
    const playSet1 = {
      ...createPlaySet("Play Set 1"),
      createdAt: "2026-04-12T15:00:00.000Z",
      updatedAt: "2026-04-12T15:00:00.000Z",
    };
    const playSet2 = {
      ...createPlaySet("Play Set 2"),
      createdAt: "2026-04-12T16:00:00.000Z",
      updatedAt: "2026-04-12T16:00:00.000Z",
    };

    render(
      <AppShell
        backend={createMemoryBackend({
          initialPlaySets: [playSet1, playSet2],
          initialPlays: [],
        })}
      />,
    );

    const trigger = await screen.findByTestId("play-set-picker-trigger");
    expect(trigger).toHaveTextContent("Play Set 2");
    expect(screen.queryByTestId("play-set-picker-rail")).not.toBeInTheDocument();

    fireEvent.click(trigger);

    const rail = await screen.findByTestId("play-set-picker-rail");
    const newCard = within(rail).getByTestId("new-play-set-card");
    const existingCard = within(rail).getByTestId(`play-set-card-${playSet2.id}`);

    expect(newCard.compareDocumentPosition(existingCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(within(rail).getByRole("button", { name: "Play Set 1" }));

    expect(screen.queryByTestId("play-set-picker-rail")).not.toBeInTheDocument();
    expect(screen.getByTestId("play-set-picker-trigger")).toHaveTextContent("Play Set 1");
  });

  it("shows a fallback play set label and supports creating a new set from the picker rail", async () => {
    render(<AppShell backend={createMemoryBackend({ initialPlaySets: [], initialPlays: [] })} />);

    const trigger = await screen.findByTestId("play-set-picker-trigger");
    expect(trigger).toHaveTextContent("Select a Play Set");

    fireEvent.click(trigger);
    const rail = await screen.findByTestId("play-set-picker-rail");
    fireEvent.click(within(rail).getByRole("button", { name: "New Play Set" }));

    expect(await screen.findByTestId("create-play-set-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create Play Set" }));

    expect(await screen.findByText("Create your first play")).toBeInTheDocument();
    expect(screen.getByTestId("play-set-picker-trigger")).toHaveTextContent("Play Set 1");
  });

  it("opens play set settings in a modal from the gear button", async () => {
    const playSet = createPlaySet("Play Set 1");
    render(
      <AppShell
        backend={createMemoryBackend({
          initialPlaySets: [playSet],
          initialPlays: [],
        })}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Open play set settings" }));

    expect(await screen.findByTestId("play-set-settings-modal")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Play Set 1")).toBeInTheDocument();
  });

  it("keeps play set changes local until save is clicked", async () => {
    const playSet = createPlaySet("Play Set 1");
    render(
      <AppShell
        backend={createMemoryBackend({
          initialPlaySets: [playSet],
          initialPlays: [],
        })}
      />,
    );

    fireEvent.click(await screen.findByTestId("play-set-picker-trigger"));
    const rail = await screen.findByTestId("play-set-picker-rail");
    expect(within(rail).getByText("4x1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open play set settings" }));
    const modal = await screen.findByTestId("play-set-settings-modal");
    const rowsInput = within(modal).getByDisplayValue("4");
    const columnsInput = within(modal).getByDisplayValue("1");
    const widthInput = within(modal).getByDisplayValue("8.5");
    const heightInput = within(modal).getByDisplayValue("11");

    fireEvent.change(rowsInput, { target: { value: "2" } });
    fireEvent.change(columnsInput, { target: { value: "3" } });
    fireEvent.change(widthInput, { target: { value: "3" } });
    fireEvent.change(heightInput, { target: { value: "2" } });

    expect(within(modal).getByText(/2 rows × 3 cols/i)).toBeInTheDocument();
    expect(within(modal).getAllByTestId("page-layout-preview-card")).toHaveLength(6);
    expect(within(rail).getByText("4x1")).toBeInTheDocument();
    expect(within(rail).queryByText("2x3")).not.toBeInTheDocument();

    fireEvent.click(within(modal).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByTestId("play-set-settings-modal")).not.toBeInTheDocument();
    });
    expect(within(rail).getByText("2x3")).toBeInTheDocument();
  });

  it("syncs roster labels and colors from play set settings across the whole set", async () => {
    const playSet = createPlaySet("Play Set 1");
    const firstPlay = createPlayDocument({
      playSetId: playSet.id,
      playNumber: 1,
      settings: playSet.settings,
    });
    const secondPlay = createPlayDocument({
      playSetId: playSet.id,
      playNumber: 2,
      settings: playSet.settings,
      name: "Counter",
    });

    render(
      <AppShell
        backend={createMemoryBackend({
          initialPlaySets: [playSet],
          initialPlays: [firstPlay, secondPlay],
        })}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Open play set settings" }));
    const modal = await screen.findByTestId("play-set-settings-modal");
    const firstRosterPlayer = within(modal).getByTestId("play-set-roster-player-0");

    fireEvent.change(within(firstRosterPlayer).getByDisplayValue("X"), {
      target: { value: "FL" },
    });
    fireEvent.change(within(firstRosterPlayer).getByDisplayValue("#f4b16d"), {
      target: { value: "#123456" },
    });
    fireEvent.click(within(modal).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByTestId("play-set-settings-modal")).not.toBeInTheDocument();
    });

    const firstPlayPlayer = await screen.findByTestId("player-FL");
    expect(firstPlayPlayer.querySelector("circle")).toHaveAttribute("fill", "#123456");

    fireEvent.click(screen.getByRole("button", { name: /Counter/ }));
    const secondPlayPlayer = await screen.findByTestId("player-FL");
    expect(secondPlayPlayer.querySelector("circle")).toHaveAttribute("fill", "#123456");

    fireEvent.click(screen.getByRole("button", { name: "New Play" }));
    const thirdPlayPlayer = await screen.findByTestId("player-FL");
    expect(thirdPlayPlayer.querySelector("circle")).toHaveAttribute("fill", "#123456");
  });

  it("blocks saving a portrait card layout in play set settings", async () => {
    const playSet = createPlaySet("Play Set 1");
    render(
      <AppShell
        backend={createMemoryBackend({
          initialPlaySets: [playSet],
          initialPlays: [],
        })}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Open play set settings" }));
    const modal = await screen.findByTestId("play-set-settings-modal");
    const inputs = within(modal).getAllByRole("spinbutton");
    const saveButton = within(modal).getByRole("button", { name: "Save" });

    fireEvent.change(inputs[0], { target: { value: "1" } });
    fireEvent.change(inputs[1], { target: { value: "1" } });
    fireEvent.change(inputs[2], { target: { value: "2" } });
    fireEvent.change(inputs[3], { target: { value: "3" } });

    expect(within(modal).getByText(/Printable cards must be square or wider than tall/i)).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
  });

  it("converts page dimensions when the print unit changes", async () => {
    const playSet = createPlaySet("Play Set 1");
    render(
      <AppShell
        backend={createMemoryBackend({
          initialPlaySets: [playSet],
          initialPlays: [],
        })}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Open play set settings" }));
    const modal = await screen.findByTestId("play-set-settings-modal");
    const unitSelect = within(modal).getByRole("combobox");

    expect(within(modal).getByDisplayValue("8.5")).toBeInTheDocument();
    expect(within(modal).getByDisplayValue("11")).toBeInTheDocument();

    fireEvent.change(unitSelect, {
      target: { value: "cm" },
    });

    expect(within(modal).getByDisplayValue("21.6")).toBeInTheDocument();
    expect(within(modal).getByDisplayValue("27.9")).toBeInTheDocument();

    fireEvent.change(unitSelect, {
      target: { value: "in" },
    });

    expect(within(modal).getByDisplayValue("8.5")).toBeInTheDocument();
    expect(within(modal).getByDisplayValue("11")).toBeInTheDocument();
  });

  it("rescales the active playboard when saved play set settings change the card ratio", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);

    const defaultLayout = getEditorFieldLayout(normalizePlaySetSettings());
    const playboard = await screen.findByTestId("playboard");
    expect(playboard.getAttribute("viewBox")).toBe(`0 0 ${defaultLayout.width} ${defaultLayout.height}`);

    fireEvent.click(screen.getByRole("button", { name: "Open play set settings" }));
    const modal = await screen.findByTestId("play-set-settings-modal");
    const inputs = within(modal).getAllByRole("spinbutton");

    fireEvent.change(inputs[0], { target: { value: "2" } });
    fireEvent.change(inputs[1], { target: { value: "3" } });
    fireEvent.change(inputs[2], { target: { value: "3" } });
    fireEvent.change(inputs[3], { target: { value: "2" } });
    fireEvent.click(within(modal).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByTestId("playboard")).toHaveAttribute("viewBox", "0 0 120 120");
    });
  });

  it("toggles yard-line visibility from the inspector", async () => {
    const backend = createSeededMemoryBackend();
    const savePlaySpy = vi.spyOn(backend, "savePlay");

    render(<AppShell backend={backend} />);

    const board = await screen.findByTestId("playboard");
    const getBoardText = () => Array.from(board.querySelectorAll("text")).map((node) => node.textContent);

    savePlaySpy.mockClear();
    expect(getBoardText()).toContain("15");

    fireEvent.click(screen.getByRole("switch", { name: "Toggle yard lines" }));
    await waitFor(() => {
      expect(getBoardText()).not.toContain("15");
    });
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 600));
    });
    expect(savePlaySpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(savePlaySpy).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("switch", { name: "Toggle yard lines" }));
    await waitFor(() => {
      expect(getBoardText()).toContain("15");
    });
  });

  it("shows saved and unsaved play status in the active play header", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);

    expect(await screen.findByText("Saved")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Play name" }), {
      target: { value: "Trips Right" },
    });

    expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("creates a play set from the setup modal with roster and page layout details", async () => {
    render(<AppShell backend={createMemoryBackend({ initialPlaySets: [], initialPlays: [] })} />);

    fireEvent.click(await screen.findByRole("button", { name: "Create your first Play Set" }));

    expect(await screen.findByTestId("create-play-set-modal")).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("Play Set 1"), {
      target: { value: "Red Zone" },
    });
    fireEvent.change(screen.getByDisplayValue("7 players"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByDisplayValue("4"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByDisplayValue("1"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByDisplayValue("8.5"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByDisplayValue("11"), {
      target: { value: "2" },
    });
    expect(screen.getAllByTestId("page-layout-preview-card")).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Create Play Set" }));

    expect(await screen.findByText("Create your first play")).toBeInTheDocument();
    expect(screen.getByTestId("play-set-picker-trigger")).toHaveTextContent("Red Zone");

    fireEvent.click(screen.getByTestId("play-set-picker-trigger"));
    const rail = await screen.findByTestId("play-set-picker-rail");
    expect(within(rail).getByText("5 players")).toBeInTheDocument();
    expect(within(rail).getByText("2x3")).toBeInTheDocument();
  });

  it("blocks creating a play set when the card would be taller than wide", async () => {
    render(<AppShell backend={createMemoryBackend({ initialPlaySets: [], initialPlays: [] })} />);

    fireEvent.click(await screen.findByRole("button", { name: "Create your first Play Set" }));
    const modal = await screen.findByTestId("create-play-set-modal");
    const inputs = within(modal).getAllByRole("spinbutton");
    const createButton = within(modal).getByRole("button", { name: "Create Play Set" });

    fireEvent.change(inputs[0], { target: { value: "1" } });
    fireEvent.change(inputs[1], { target: { value: "1" } });
    fireEvent.change(inputs[2], { target: { value: "2" } });
    fireEvent.change(inputs[3], { target: { value: "3" } });

    expect(within(modal).getByText(/Printable cards must be square or wider than tall/i)).toBeInTheDocument();
    expect(createButton).toBeDisabled();
  });

  it("shows overlay arrows for an overflowing play set rail and scrolls by one tile", async () => {
    const playSets = ["Play Set 1", "Play Set 2", "Play Set 3"].map((name, index) => ({
      ...createPlaySet(name),
      createdAt: `2026-04-12T1${index}:00:00.000Z`,
      updatedAt: `2026-04-12T1${index}:00:00.000Z`,
    }));

    render(
      <PlayLibrary
        activePlayId={null}
        activePlaySet={playSets[0]}
        activePlaySetId={playSets[0].id}
        onCreatePlay={() => undefined}
        onCreatePlaySet={() => undefined}
        onDeletePlay={() => undefined}
        onDeletePlaySet={() => undefined}
        onDuplicatePlay={() => undefined}
        onDuplicatePlaySet={() => undefined}
        onMovePlay={() => undefined}
        onOpenPlaySetSettings={() => undefined}
        onSelectPlay={() => undefined}
        onSelectPlaySet={() => undefined}
        playSets={playSets}
        plays={[]}
      />,
    );

    fireEvent.click(screen.getByTestId("play-set-picker-trigger"));

    const rail = await screen.findByTestId("play-set-picker-rail");
    const newPlaySetCard = screen.getByTestId("new-play-set-card");
    const scrollBy = vi.fn();

    Object.defineProperty(rail, "clientWidth", { configurable: true, value: 320 });
    Object.defineProperty(rail, "scrollWidth", { configurable: true, value: 960 });
    Object.defineProperty(rail, "scrollLeft", { configurable: true, writable: true, value: 0 });
    Object.defineProperty(rail, "scrollBy", { configurable: true, value: scrollBy });
    Object.defineProperty(newPlaySetCard, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        width: 232,
        height: 184,
        top: 0,
        left: 0,
        right: 232,
        bottom: 184,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    fireEvent.click(await screen.findByRole("button", { name: "Scroll play sets right" }));

    expect(scrollBy).toHaveBeenCalledWith({ behavior: "smooth", left: 240 });
  });

  it("creates a play set without auto-creating a play", async () => {
    render(<AppShell backend={createMemoryBackend({ initialPlaySets: [], initialPlays: [] })} />);

    expect(await screen.findByText("Start with a Play Set")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create your first Play Set" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create Play Set" }));

    expect(await screen.findByText("Create your first play")).toBeInTheDocument();
    expect(screen.queryByTestId("playboard")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create new play" }));

    expect(await screen.findByTestId("playboard")).toBeInTheDocument();
  });

  it("creates a route with a freehand drag and moves it with the player", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);
    await screen.findByTestId("playboard");
    await mockBoardRect();
    const layout = getEditorFieldLayout(normalizePlaySetSettings());
    const initialQuarterbackY = Number(((70 / 80) * layout.height).toFixed(3));
    const routeTargetY = Number(((200 / 800) * layout.height).toFixed(3));
    const movedQuarterbackY = Number(Math.min(layout.height - 4, (720 / 800) * layout.height).toFixed(3));
    const routeDeltaY = Number((movedQuarterbackY - initialQuarterbackY).toFixed(3));
    const movedRouteTargetY = Number((routeTargetY + routeDeltaY).toFixed(3));

    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    drawGesture(screen.getByTestId("player-Q"), [
      { clientX: 600, clientY: 700 },
      { clientX: 620, clientY: 520 },
      { clientX: 610, clientY: 340 },
      { clientX: 600, clientY: 200 },
    ]);

    const path = screen.getByTestId(/path-/);
    expect(path.getAttribute("d")).toContain(`M 60 ${initialQuarterbackY}`);
    expect(path.getAttribute("d")).toContain(`60 ${routeTargetY}`);

    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    await mockBoardRect();
    drawGesture(screen.getByTestId("player-Q"), [
      { clientX: 600, clientY: 700 },
      { clientX: 560, clientY: 720 },
    ]);

    expect(path.getAttribute("d")).toContain(`M 56 ${movedQuarterbackY}`);
    expect(path.getAttribute("d")).toContain(`56 ${movedRouteTargetY}`);
  });

  it("draws motion paths with the same freehand gesture flow", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);
    await mockBoardRect();

    fireEvent.click(screen.getByRole("button", { name: "Motion" }));
    drawGesture(screen.getByTestId("player-Q"), [
      { clientX: 600, clientY: 700 },
      { clientX: 700, clientY: 660 },
      { clientX: 760, clientY: 620 },
    ]);

    const path = screen.getByTestId(/path-/);
    expect(path).toHaveAttribute("stroke-dasharray", "3 2");
  });

  it("matches route color to the player color when enabled in play set settings", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);
    await mockBoardRect();

    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    drawGesture(screen.getByTestId("player-Q"), [
      { clientX: 600, clientY: 700 },
      { clientX: 620, clientY: 520 },
      { clientX: 600, clientY: 240 },
    ]);

    const path = screen.getByTestId(/path-/);
    const quarterback = screen.getByTestId("player-Q").querySelector("circle");

    expect(path).toHaveAttribute("stroke", "#000000");
    expect(quarterback).toHaveAttribute("fill", "#65d0b3");

    fireEvent.click(screen.getByRole("button", { name: "Open play set settings" }));
    const modal = await screen.findByTestId("play-set-settings-modal");
    fireEvent.click(within(modal).getByRole("switch", { name: "Toggle match route color to player" }));
    fireEvent.click(within(modal).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByTestId("play-set-settings-modal")).not.toBeInTheDocument();
    });
    expect(path).toHaveAttribute("stroke", "#65d0b3");
  });

  it("ignores tiny accidental route drags", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);
    await mockBoardRect();

    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    drawGesture(screen.getByTestId("player-Q"), [
      { clientX: 600, clientY: 700 },
      { clientX: 603, clientY: 698 },
      { clientX: 604, clientY: 697 },
    ]);

    expect(screen.queryByTestId(/path-/)).not.toBeInTheDocument();
  });

  it("supports undo and redo for route creation and player movement", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);
    await mockBoardRect();

    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    drawGesture(screen.getByTestId("player-Q"), [
      { clientX: 600, clientY: 700 },
      { clientX: 620, clientY: 520 },
      { clientX: 600, clientY: 240 },
    ]);

    expect(screen.getByTestId(/path-/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByTestId(/path-/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByTestId(/path-/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    const player = screen.getByTestId("player-Q");
    drawGesture(player, [
      { clientX: 600, clientY: 700 },
      { clientX: 560, clientY: 720 },
    ]);

    const movedPlayerCircle = player.querySelector("circle");
    expect(movedPlayerCircle).toHaveAttribute("cx", "56");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(movedPlayerCircle).toHaveAttribute("cx", "60");
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(movedPlayerCircle).toHaveAttribute("cx", "56");
  });

  it("creates, edits, moves, and deletes text notes", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);
    const board = await mockBoardRect();
    const layout = getEditorFieldLayout(normalizePlaySetSettings());
    const movedTextY = String((320 / 800) * layout.height);

    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    fireEvent.click(board, { clientX: 320, clientY: 300 });

    const textInput = screen.getByRole("textbox", { name: "Board text" });
    expect(textInput).toHaveValue("Text");
    expect(textInput).toHaveFocus();

    fireEvent.change(textInput, { target: { value: "Screen" } });
    expect(screen.getByDisplayValue("Screen")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    const textAnnotation = screen.getByTestId(/text-annotation-/);
    drawGesture(textAnnotation, [
      { clientX: 320, clientY: 300 },
      { clientX: 360, clientY: 320 },
    ]);

    const annotationText = within(textAnnotation).getByText("Screen");
    expect(annotationText).toHaveAttribute("x", "36");
    expect(annotationText).toHaveAttribute("y", movedTextY);

    fireEvent.click(screen.getByRole("button", { name: "Delete note" }));
    expect(screen.queryByTestId(/text-annotation-/)).not.toBeInTheDocument();
  });

  it("ignores undo shortcuts while typing in board text", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);
    const board = await mockBoardRect();

    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    fireEvent.click(board, { clientX: 320, clientY: 300 });

    const textInput = screen.getByRole("textbox", { name: "Board text" });
    fireEvent.change(textInput, { target: { value: "Screen" } });
    fireEvent.keyDown(textInput, { key: "z", metaKey: true });

    expect(screen.getByDisplayValue("Screen")).toBeInTheDocument();
    expect(within(screen.getByTestId(/text-annotation-/)).getByText("Screen")).toBeInTheDocument();
  });

  it("renders the default field surface without a field-style picker", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);

    expect(await screen.findByTestId("field-surface")).toHaveAttribute("fill", "#fffdf7");
    fireEvent.click(screen.getByRole("button", { name: "Open play set settings" }));
    expect(screen.queryByText("Field style")).not.toBeInTheDocument();
  });
});
