import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "../App";

function mockBoardRect() {
  const board = screen.getByTestId("playboard");
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

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("switches formations from the inspector", () => {
    render(<App />);

    const select = screen.getByDisplayValue("7 players");
    fireEvent.change(select, { target: { value: "5" } });

    expect(screen.getAllByTestId(/player-/)).toHaveLength(5);
  });

  it("creates a route and keeps it anchored when the player moves", () => {
    render(<App />);
    const board = mockBoardRect();

    fireEvent.click(screen.getByRole("button", { name: "Route" }));
    fireEvent.pointerDown(screen.getByTestId("player-Q"), { clientX: 600, clientY: 700 });
    fireEvent.click(board, { clientX: 600, clientY: 200 });
    fireEvent.click(screen.getByRole("button", { name: "Finish path" }));

    const path = screen.getByTestId(/path-/);
    expect(path.getAttribute("points")).toContain("60,70");

    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    mockBoardRect();
    fireEvent.pointerDown(screen.getByTestId("player-Q"), { clientX: 600, clientY: 700 });
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 560, clientY: 720 }));
      window.dispatchEvent(new MouseEvent("mouseup"));
    });

    expect(path.getAttribute("points")).toMatch(/^56(?:\.0+1?)?,72/);
  });

  it("creates a handoff between two players", () => {
    render(<App />);
    mockBoardRect();

    fireEvent.click(screen.getByRole("button", { name: "Handoff" }));
    fireEvent.pointerDown(screen.getByTestId("player-Q"), { clientX: 600, clientY: 700 });
    fireEvent.pointerDown(screen.getByTestId("player-RB"), { clientX: 430, clientY: 750 });

    expect(screen.getByTestId(/handoff-/)).toBeInTheDocument();
  });

  it("defaults to a white field and allows switching to green", () => {
    render(<App />);

    expect(screen.getByTestId("field-surface")).toHaveAttribute("fill", "#fffdf7");

    fireEvent.change(screen.getByDisplayValue("Whiteboard"), {
      target: { value: "green" },
    });

    expect(screen.getByTestId("field-surface")).toHaveAttribute("fill", "rgba(255,255,255,0.02)");
  });
});
