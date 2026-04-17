import type { DraftPath, ToolMode } from "../lib/types";

interface ToolbarProps {
  tool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  draftPath: DraftPath | null;
}

const TOOL_LABELS: Array<{ mode: ToolMode; label: string; helper: string }> = [
  { mode: "select", label: "Select", helper: "Move players and edit points" },
  { mode: "route", label: "Route", helper: "Drag from a player to freehand a route" },
  { mode: "motion", label: "Motion", helper: "Drag from a player to draw motion" },
  { mode: "handoff", label: "Handoff", helper: "Pick two players" },
  { mode: "text", label: "Text", helper: "Click the board to drop a note" },
];

export function Toolbar({ tool, onToolChange, draftPath }: ToolbarProps) {
  return (
    <section className="glass-panel rounded-[28px] border border-white/70 p-4 shadow-panel">
      <div className="flex flex-wrap items-center gap-2">
        {TOOL_LABELS.map((item) => (
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tool === item.mode
                ? "bg-ink-950 text-white"
                : "bg-white/80 text-ink-950 hover:bg-field-100"
            }`}
            key={item.mode}
            onClick={() => onToolChange(item.mode)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-950/70">
          {draftPath
            ? "Release to create the path."
            : TOOL_LABELS.find((item) => item.mode === tool)?.helper}
        </p>
      </div>
    </section>
  );
}
