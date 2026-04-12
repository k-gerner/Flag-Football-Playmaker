import { useEffect } from "react";
import { FIELD_THEMES, PRINT_PRESETS } from "../lib/playbook";
import type { FieldTheme, PlaySet, PlayerCount } from "../lib/types";

interface PlaySetSettingsModalProps {
  playSet: PlaySet | null;
  open: boolean;
  onClose: () => void;
  onPlaySetNameChange: (name: string) => void;
  onPlayerCountChange: (count: PlayerCount) => void;
  onFieldThemeChange: (theme: FieldTheme) => void;
  onBackgroundColorChange: (backgroundColor: string) => void;
  onApplyPreset: (presetId: string) => void;
  onPrintSettingChange: (changes: Partial<PlaySet["settings"]["print"]>) => void;
  onLayoutSettingChange: (changes: Partial<PlaySet["settings"]["layout"]>) => void;
  onExportPlaySet: () => void;
}

export function PlaySetSettingsModal({
  playSet,
  open,
  onClose,
  onPlaySetNameChange,
  onPlayerCountChange,
  onFieldThemeChange,
  onBackgroundColorChange,
  onApplyPreset,
  onPrintSettingChange,
  onLayoutSettingChange,
  onExportPlaySet,
}: PlaySetSettingsModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || !playSet) {
    return null;
  }

  const previewAspect = playSet.settings.layout.cardAspectRatio;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/45 px-4 py-6"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="glass-panel max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-white/70 p-6 shadow-panel"
        data-testid="play-set-settings-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-2xl font-bold text-ink-950">Play Set Settings</p>
            <p className="mt-1 text-sm text-ink-950/65">Shared settings apply across every play in this set.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-950/85"
              onClick={onExportPlaySet}
              type="button"
            >
              Export Set PDF
            </button>
            <button
              aria-label="Close play set settings"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-950/15 bg-white/75 text-xl font-semibold text-ink-950 transition hover:border-ink-950/35 hover:bg-white"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="rounded-3xl border border-black/5 bg-white/60 p-4">
            <div>
              <p className="font-display text-base font-bold text-ink-950">Play Set</p>
              <p className="text-sm text-ink-950/60">Core roster and field styling for this set.</p>
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
            <div>
              <p className="font-display text-base font-bold text-ink-950">Layout & Export</p>
              <p className="text-sm text-ink-950/60">These settings drive full-set PDF generation.</p>
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
                      onLayoutSettingChange({
                        playsPerPage: Number(event.target.value) || playSet.settings.layout.playsPerPage,
                      })
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
        </div>
      </div>
    </div>
  );
}
