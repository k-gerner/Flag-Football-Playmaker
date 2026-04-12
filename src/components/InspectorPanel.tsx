import { FIELD_THEMES, PRINT_PRESETS } from "../lib/playbook";
import type { FieldTheme, PlayDocument, PlayerCount, PlayerToken, RoutePath } from "../lib/types";

interface InspectorPanelProps {
  play: PlayDocument;
  selectedPlayer: PlayerToken | null;
  selectedPath: RoutePath | null;
  isDraftingPath: boolean;
  onNameChange: (name: string) => void;
  onNotesChange: (notes: string) => void;
  onPlayerCountChange: (count: PlayerCount) => void;
  onFieldThemeChange: (theme: FieldTheme) => void;
  onPlayerUpdate: (playerId: string, changes: Partial<Pick<PlayerToken, "label" | "color">>) => void;
  onDeleteSelectedPath: () => void;
  onApplyPreset: (presetId: string) => void;
  onPrintSettingChange: (changes: Partial<PlayDocument["printSettings"]>) => void;
  onExportPdf: () => void;
}

export function InspectorPanel({
  play,
  selectedPlayer,
  selectedPath,
  isDraftingPath,
  onNameChange,
  onNotesChange,
  onPlayerCountChange,
  onFieldThemeChange,
  onPlayerUpdate,
  onDeleteSelectedPath,
  onApplyPreset,
  onPrintSettingChange,
  onExportPdf,
}: InspectorPanelProps) {
  const previewAspect = play.printSettings.width / play.printSettings.height;

  return (
    <aside className="glass-panel flex h-full flex-col gap-4 rounded-[28px] border border-white/70 p-4 shadow-panel">
      <section>
        <p className="font-display text-lg font-bold text-ink-950">Play Setup</p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-950/70">Play name</span>
            <input
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none ring-0 transition focus:border-ember-500"
              onChange={(event) => onNameChange(event.target.value)}
              value={play.name}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-950/70">Offensive personnel</span>
            <select
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
              onChange={(event) => onPlayerCountChange(Number(event.target.value) as PlayerCount)}
              value={play.playerCount}
            >
              <option value={5}>5 players</option>
              <option value={7}>7 players</option>
              <option value={8}>8 players</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-950/70">Coach notes</span>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Formation reminders, cadence, motion timing..."
              value={play.notes}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-950/70">Field style</span>
            <select
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
              onChange={(event) => onFieldThemeChange(event.target.value as FieldTheme)}
              value={play.fieldTheme}
            >
              {Object.entries(FIELD_THEMES).map(([value, theme]) => (
                <option key={value} value={value}>
                  {theme.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

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

      <section className="rounded-3xl border border-black/5 bg-white/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-base font-bold text-ink-950">Print & PDF</p>
            <p className="text-sm text-ink-950/60">Dial in exact wristband size before exporting.</p>
          </div>
          <button
            className="rounded-full bg-ember-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ember-500/90"
            onClick={onExportPdf}
            type="button"
          >
            Export PDF
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-950/70">Preset size</span>
            <select
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
              onChange={(event) => onApplyPreset(event.target.value)}
              value={play.printSettings.presetId ?? "custom"}
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
                    width: Number(event.target.value) || play.printSettings.width,
                  })
                }
                step="0.05"
                type="number"
                value={play.printSettings.width}
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
                    height: Number(event.target.value) || play.printSettings.height,
                  })
                }
                step="0.05"
                type="number"
                value={play.printSettings.height}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Unit</span>
              <select
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                onChange={(event) =>
                  onPrintSettingChange({
                    presetId: null,
                    unit: event.target.value as PlayDocument["printSettings"]["unit"],
                  })
                }
                value={play.printSettings.unit}
              >
                <option value="in">Inches</option>
                <option value="mm">Millimeters</option>
              </select>
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-ink-950/70">Live card preview</p>
            <div className="rounded-[24px] border border-dashed border-ink-950/15 bg-field-50/70 p-4">
              <div
                className="mx-auto rounded-2xl border border-ink-950/20 bg-white shadow-sm"
                style={{
                  aspectRatio: `${previewAspect}`,
                  maxWidth: "100%",
                  minHeight: 90,
                  width: previewAspect >= 1 ? "100%" : `${previewAspect * 100}%`,
                }}
              >
                <div className="flex h-full items-center justify-center text-center text-sm text-ink-950/60">
                  {play.printSettings.width} x {play.printSettings.height} {play.printSettings.unit}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}
