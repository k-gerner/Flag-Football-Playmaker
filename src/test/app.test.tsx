import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "../App";

function mockBoardRect() {
  const board = screen.getByTestId("playboard");
  Object.defineProperty(board, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      width: 1000,
      height: 1400,
      right: 1000,
      bottom: 1400,
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
    fireEvent.pointerDown(screen.getByTestId("player-Q"), { clientX: 500, clientY: 760 });
    fireEvent.click(board, { clientX: 500, clientY: 320 });
    fireEvent.click(screen.getByRole("button", { name: "Finish path" }));

    const path = screen.getByTestId(/path-/);
    expect(path.getAttribute("points")).toContain("50,76");

    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    mockBoardRect();
    fireEvent.pointerDown(screen.getByTestId("player-Q"), { clientX: 500, clientY: 760 });
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 560, clientY: 820 }));
      window.dispatchEvent(new MouseEvent("mouseup"));
    });

    expect(path.getAttribute("points")).toMatch(/^56(?:\.0+1?)?,82/);
  });

  it("creates a handoff between two players", () => {
    render(<App />);
    mockBoardRect();

    fireEvent.click(screen.getByRole("button", { name: "Handoff" }));
    fireEvent.pointerDown(screen.getByTestId("player-Q"), { clientX: 500, clientY: 760 });
    fireEvent.pointerDown(screen.getByTestId("player-RB"), { clientX: 360, clientY: 720 });

    expect(screen.getByTestId(/handoff-/)).toBeInTheDocument();
  });
});
