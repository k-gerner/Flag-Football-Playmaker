import { act, fireEvent, render, screen } from "@testing-library/react";
import { AppShell } from "../App";
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

  it("switches formations from the inspector", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);

    const select = await screen.findByDisplayValue("7 players");
    await act(async () => {
      fireEvent.change(select, { target: { value: "5" } });
    });

    expect(screen.getAllByTestId(/player-/)).toHaveLength(5);
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

  it("creates a play set without auto-creating a play", async () => {
    render(<AppShell backend={createMemoryBackend({ initialPlaySets: [], initialPlays: [] })} />);

    expect(await screen.findByText("Start with a Play Set")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create your first Play Set" }));

    expect(await screen.findByText("Create your first play")).toBeInTheDocument();
    expect(screen.queryByTestId("playboard")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create new play" }));

    expect(await screen.findByTestId("playboard")).toBeInTheDocument();
  });

  it("creates a route and keeps it anchored when the player moves", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);
    await screen.findByDisplayValue("7 players");
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

  it("defaults to a white field and allows switching to green", async () => {
    render(<AppShell backend={createSeededMemoryBackend()} />);

    expect(await screen.findByTestId("field-surface")).toHaveAttribute("fill", "#fffdf7");

    fireEvent.change(screen.getByDisplayValue("Whiteboard"), {
      target: { value: "green" },
    });

    expect(screen.getByTestId("field-surface")).toHaveAttribute("fill", "rgba(255,255,255,0.02)");
  });
});
