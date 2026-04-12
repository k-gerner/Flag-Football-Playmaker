import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { AppShell } from "../App";
import { PlayLibrary } from "../components/PlayLibrary";
import { createMemoryBackend, createSeededMemoryBackend } from "../lib/backend";
import { createPlaySet } from "../lib/playbook";

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
      target: { value: "2" },
    });
    fireEvent.change(screen.getByDisplayValue("8.5"), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByDisplayValue("11"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Play Set" }));

    expect(await screen.findByText("Create your first play")).toBeInTheDocument();
    expect(screen.getByTestId("play-set-picker-trigger")).toHaveTextContent("Red Zone");

    fireEvent.click(screen.getByTestId("play-set-picker-trigger"));
    const rail = await screen.findByTestId("play-set-picker-rail");
    expect(within(rail).getByText("5 players")).toBeInTheDocument();
    expect(within(rail).getByText("4/page")).toBeInTheDocument();
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

  it("creates a route and keeps it anchored when the player moves", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);
    await screen.findByTestId("playboard");
    const board = await mockBoardRect();

    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    fireEvent.pointerDown(screen.getByTestId("player-Q"), { clientX: 600, clientY: 700 });
    fireEvent.click(board, { clientX: 600, clientY: 200 });
    fireEvent.click(screen.getByRole("button", { name: "Finish path" }));

    const path = screen.getByTestId(/path-/);
    expect(path.getAttribute("points")).toContain("60,70");

    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    await mockBoardRect();
    fireEvent.pointerDown(screen.getByTestId("player-Q"), { clientX: 600, clientY: 700 });
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 560, clientY: 720 }));
      window.dispatchEvent(new MouseEvent("mouseup"));
    });

    expect(path.getAttribute("points")).toMatch(/^56(?:\.0+1?)?,72/);
  });

  it("renders the default field surface without a field-style picker", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);

    expect(await screen.findByTestId("field-surface")).toHaveAttribute("fill", "#fffdf7");
    fireEvent.click(screen.getByRole("button", { name: "Open play set settings" }));
    expect(screen.queryByText("Field style")).not.toBeInTheDocument();
  });
});
