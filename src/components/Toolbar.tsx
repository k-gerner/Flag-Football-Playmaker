import type { DraftPath, ToolMode } from "../lib/types";

interface ToolbarProps {
  tool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  draftPath: DraftPath | null;
  onFinishDraft: () => void;
  onCancelDraft: () => void;
}

const TOOL_LABELS: Array<{ mode: ToolMode; label: string; helper: string }> = [
  { mode: "select", label: "Select", helper: "Move players and edit points" },
  { mode: "route", label: "Route", helper: "Click player, then click field" },
  { mode: "motion", label: "Motion", helper: "Draw dashed pre-snap motion" },
  { mode: "handoff", label: "Handoff", helper: "Pick two players" },
];

export function Toolbar({ tool, onToolChange, draftPath, onFinishDraft, onCancelDraft }: ToolbarProps) {
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
          {TOOL_LABELS.find((item) => item.mode === tool)?.helper}
        </p>

        {draftPath ? (
          <div className="flex gap-2">
            <button
              className="rounded-full bg-field-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-field-700/85"
              onClick={onFinishDraft}
              type="button"
            >
              Finish path
            </button>
            <button
              className="rounded-full border border-ink-950/15 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:border-ink-950/30"
              onClick={onCancelDraft}
              type="button"
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
