import { YARD_MARKER_OPTIONS } from "../lib/playbook";
import type { PlayDisplaySettings, PlayDocument, PlaySet, PlayerToken, RoutePath } from "../lib/types";

interface InspectorPanelProps {
  playSet: PlaySet | null;
  play: PlayDocument | null;
  playSets: PlaySet[];
  copyTargetPlaySetId: string;
  selectedPlayer: PlayerToken | null;
  selectedPath: RoutePath | null;
  isDraftingPath: boolean;
  onExportPlay: () => void;
  onPlayNameChange: (name: string) => void;
  onPlayNotesChange: (notes: string) => void;
  onPlayDisplaySettingsChange: (displaySettings: PlayDisplaySettings) => void;
  onCopyTargetPlaySetChange: (playSetId: string) => void;
  onCopyPlayToSet: () => void;
  onPlayerUpdate: (playerId: string, changes: Partial<Pick<PlayerToken, "label" | "color">>) => void;
  onDeleteSelectedPath: () => void;
}

export function InspectorPanel({
  playSet,
  play,
  playSets,
  copyTargetPlaySetId,
  selectedPlayer,
  selectedPath,
  isDraftingPath,
  onExportPlay,
  onPlayNameChange,
  onPlayNotesChange,
  onPlayDisplaySettingsChange,
  onCopyTargetPlaySetChange,
  onCopyPlayToSet,
  onPlayerUpdate,
  onDeleteSelectedPath,
}: InspectorPanelProps) {
  if (!playSet) {
    return (
      <aside className="glass-panel flex h-full flex-col gap-4 rounded-[28px] border border-white/70 p-4 shadow-panel">
        <p className="font-display text-lg font-bold text-ink-950">Inspector</p>
        <div className="rounded-3xl border border-dashed border-black/10 bg-white/60 p-4 text-sm text-ink-950/60">
          Create a Play Set to configure shared settings and start building grouped plays.
        </div>
      </aside>
    );
  }

  const copyTargets = playSets.filter((item) => item.id !== playSet.id);

  return (
    <aside className="glass-panel flex h-full flex-col gap-4 rounded-[28px] border border-white/70 p-4 shadow-panel">
      {play ? (
        <section className="rounded-3xl border border-black/5 bg-white/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-base font-bold text-ink-950">Active Play</p>
              <p className="text-sm text-ink-950/60">Play #{play.playNumber} inside {playSet.name}.</p>
            </div>
            <button
              className="rounded-full border border-ink-950/15 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:border-ink-950/35"
              onClick={onExportPlay}
              type="button"
            >
              Export Play
            </button>
          </div>

          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Play name</span>
              <input
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                onChange={(event) => onPlayNameChange(event.target.value)}
                value={play.name}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Coach notes</span>
              <textarea
                className="min-h-24 w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                onChange={(event) => onPlayNotesChange(event.target.value)}
                placeholder="Formation reminders, cadence, motion timing..."
                value={play.notes}
              />
            </label>

            <div>
              <p className="mb-2 text-sm font-semibold text-ink-950/70">Visible yard markers</p>
              <div className="flex flex-wrap gap-2">
                {YARD_MARKER_OPTIONS.map((marker) => {
                  const active = play.displaySettings.yardMarkers.includes(marker);
                  return (
                    <button
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                        active
                          ? "border-ember-500 bg-ember-300/20 text-ink-950"
                          : "border-ink-950/10 bg-white/80 text-ink-950/70"
                      }`}
                      key={marker}
                      onClick={() =>
                        onPlayDisplaySettingsChange({
                          ...play.displaySettings,
                          yardMarkers: active
                            ? play.displaySettings.yardMarkers.filter((value) => value !== marker)
                            : [...play.displaySettings.yardMarkers, marker].sort((a, b) => a - b),
                        })
                      }
                      type="button"
                    >
                      {marker}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/70 px-3 py-2">
              <input
                checked={play.displaySettings.annotations.showLineOfScrimmageLabel}
                onChange={(event) =>
                  onPlayDisplaySettingsChange({
                    ...play.displaySettings,
                    annotations: {
                      ...play.displaySettings.annotations,
                      showLineOfScrimmageLabel: event.target.checked,
                    },
                  })
                }
                type="checkbox"
              />
              <span className="text-sm font-semibold text-ink-950/75">Show line of scrimmage label</span>
            </label>

            {copyTargets.length > 0 ? (
              <div className="rounded-2xl border border-black/10 bg-white/70 p-3">
                <p className="mb-2 text-sm font-semibold text-ink-950/70">Copy play into another set</p>
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                    onChange={(event) => onCopyTargetPlaySetChange(event.target.value)}
                    value={copyTargetPlaySetId}
                  >
                    <option value="">Choose a target set</option>
                    {copyTargets.map((target) => (
                      <option key={target.id} value={target.id}>
                        {target.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded-full border border-ink-950/15 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:border-ink-950/35 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!copyTargetPlaySetId}
                    onClick={onCopyPlayToSet}
                    type="button"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-black/5 bg-white/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-base font-bold text-ink-950">Selected element</p>
            <p className="text-sm text-ink-950/60">
              {isDraftingPath
                ? "Route draft in progress"
                : selectedPlayer
                  ? `Player ${selectedPlayer.label}`
                  : selectedPath
                    ? `${selectedPath.kind} path`
                    : "Nothing selected"}
            </p>
          </div>
          {selectedPath ? (
            <button
              className="rounded-full border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
              onClick={onDeleteSelectedPath}
              type="button"
            >
              Delete path
            </button>
          ) : null}
        </div>

        {selectedPlayer ? (
          <div className="mt-3 grid gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Player label</span>
              <input
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                maxLength={4}
                onChange={(event) =>
                  onPlayerUpdate(selectedPlayer.id, { label: event.target.value.toUpperCase() })
                }
                value={selectedPlayer.label}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Player color</span>
              <input
                className="h-11 w-full rounded-2xl border border-black/10 bg-white/80 p-1"
                onChange={(event) => onPlayerUpdate(selectedPlayer.id, { color: event.target.value })}
                type="color"
                value={selectedPlayer.color}
              />
            </label>
          </div>
        ) : null}
      </section>
    </aside>
  );
}
