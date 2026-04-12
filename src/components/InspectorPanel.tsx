import { FIELD_THEMES, PRINT_PRESETS, YARD_MARKER_OPTIONS } from "../lib/playbook";
import type {
  FieldTheme,
  PlayDisplaySettings,
  PlayDocument,
  PlaySet,
  PlayerCount,
  PlayerToken,
  RoutePath,
} from "../lib/types";

interface InspectorPanelProps {
  playSet: PlaySet | null;
  play: PlayDocument | null;
  playSets: PlaySet[];
  copyTargetPlaySetId: string;
  selectedPlayer: PlayerToken | null;
  selectedPath: RoutePath | null;
  isDraftingPath: boolean;
  onPlaySetNameChange: (name: string) => void;
  onPlayerCountChange: (count: PlayerCount) => void;
  onFieldThemeChange: (theme: FieldTheme) => void;
  onBackgroundColorChange: (backgroundColor: string) => void;
  onApplyPreset: (presetId: string) => void;
  onPrintSettingChange: (changes: Partial<PlaySet["settings"]["print"]>) => void;
  onLayoutSettingChange: (changes: Partial<PlaySet["settings"]["layout"]>) => void;
  onExportPlaySet: () => void;
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
  onPlaySetNameChange,
  onPlayerCountChange,
  onFieldThemeChange,
  onBackgroundColorChange,
  onApplyPreset,
  onPrintSettingChange,
  onLayoutSettingChange,
  onExportPlaySet,
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

  const previewAspect = playSet.settings.layout.cardAspectRatio;
  const copyTargets = playSets.filter((item) => item.id !== playSet.id);

  return (
    <aside className="glass-panel flex h-full flex-col gap-4 rounded-[28px] border border-white/70 p-4 shadow-panel">
      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg font-bold text-ink-950">Play Set</p>
            <p className="text-sm text-ink-950/65">Shared settings apply across every play in this set.</p>
          </div>
          <button
            className="rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-950/85"
            onClick={onExportPlaySet}
            type="button"
          >
            Export Set PDF
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-950/70">Set name</span>
            <input
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
              onChange={(event) => onPlaySetNameChange(event.target.value)}
              value={playSet.name}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Player count</span>
              <select
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                onChange={(event) => onPlayerCountChange(Number(event.target.value) as PlayerCount)}
                value={playSet.settings.roster.playerCount}
              >
                <option value={5}>5 players</option>
                <option value={7}>7 players</option>
                <option value={8}>8 players</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Field style</span>
              <select
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                onChange={(event) => onFieldThemeChange(event.target.value as FieldTheme)}
                value={playSet.settings.field.theme}
              >
                {Object.entries(FIELD_THEMES).map(([value, theme]) => (
                  <option key={value} value={value}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-950/70">Card background color</span>
            <input
              className="h-11 w-full rounded-2xl border border-black/10 bg-white/80 p-1"
              onChange={(event) => onBackgroundColorChange(event.target.value)}
              type="color"
              value={playSet.settings.field.backgroundColor}
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-base font-bold text-ink-950">Layout & Export</p>
            <p className="text-sm text-ink-950/60">These settings drive full-set PDF generation.</p>
          </div>
          {play ? (
            <button
              className="rounded-full border border-ink-950/15 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:border-ink-950/35"
              onClick={onExportPlay}
              type="button"
            >
              Export Play
            </button>
          ) : null}
        </div>

        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Plays per page</span>
              <input
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                min={1}
                max={6}
                onChange={(event) =>
                  onLayoutSettingChange({ playsPerPage: Number(event.target.value) || playSet.settings.layout.playsPerPage })
                }
                step={1}
                type="number"
                value={playSet.settings.layout.playsPerPage}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Card aspect ratio</span>
              <input
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                min={1}
                onChange={(event) =>
                  onLayoutSettingChange({
                    cardAspectRatio: Number(event.target.value) || playSet.settings.layout.cardAspectRatio,
                  })
                }
                step="0.05"
                type="number"
                value={playSet.settings.layout.cardAspectRatio}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-950/70">Preset size</span>
            <select
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
              onChange={(event) => onApplyPreset(event.target.value)}
              value={playSet.settings.print.presetId ?? "custom"}
            >
              <option value="custom">Custom</option>
              {PRINT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Width</span>
              <input
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                min={0.5}
                onChange={(event) =>
                  onPrintSettingChange({
                    presetId: null,
                    width: Number(event.target.value) || playSet.settings.print.width,
                  })
                }
                step="0.05"
                type="number"
                value={playSet.settings.print.width}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Height</span>
              <input
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                min={0.5}
                onChange={(event) =>
                  onPrintSettingChange({
                    presetId: null,
                    height: Number(event.target.value) || playSet.settings.print.height,
                  })
                }
                step="0.05"
                type="number"
                value={playSet.settings.print.height}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Unit</span>
              <select
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                onChange={(event) =>
                  onPrintSettingChange({
                    presetId: null,
                    unit: event.target.value as PlaySet["settings"]["print"]["unit"],
                  })
                }
                value={playSet.settings.print.unit}
              >
                <option value="in">Inches</option>
                <option value="mm">Millimeters</option>
              </select>
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-ink-950/70">Card preview</p>
            <div className="rounded-[24px] border border-dashed border-ink-950/15 bg-field-50/70 p-4">
              <div
                className="mx-auto rounded-2xl border border-ink-950/20 shadow-sm"
                style={{
                  aspectRatio: `${previewAspect}`,
                  backgroundColor: playSet.settings.field.backgroundColor,
                  maxWidth: "100%",
                  minHeight: 90,
                  width: previewAspect >= 1 ? "100%" : `${previewAspect * 100}%`,
                }}
              >
                <div className="flex h-full items-center justify-center text-center text-sm text-ink-950/60">
                  {playSet.settings.print.width} x {playSet.settings.print.height} {playSet.settings.print.unit}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {play ? (
        <section className="rounded-3xl border border-black/5 bg-white/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-base font-bold text-ink-950">Active Play</p>
              <p className="text-sm text-ink-950/60">Play #{play.playNumber} inside {playSet.name}.</p>
            </div>
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

