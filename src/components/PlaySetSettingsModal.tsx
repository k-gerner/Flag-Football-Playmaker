import { useEffect, useState } from "react";
import { convertPrintMeasurement, getPlaySetCardDimensions, normalizePlaySetSettings } from "../lib/playbook";
import type { PlaySet } from "../lib/types";

interface PlaySetSettingsModalProps {
  playSet: PlaySet | null;
  open: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; settings: PlaySet["settings"] }) => void;
  onExportPlaySet: () => void;
}

export function PlaySetSettingsModal({
  playSet,
  open,
  onClose,
  onSave,
  onExportPlaySet,
}: PlaySetSettingsModalProps) {
  const [draftName, setDraftName] = useState("");
  const [draftSettings, setDraftSettings] = useState(() => normalizePlaySetSettings());

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

  useEffect(() => {
    if (!open || !playSet) {
      return;
    }

    setDraftName(playSet.name);
    setDraftSettings(normalizePlaySetSettings(playSet.settings));
  }, [open, playSet]);

  if (!open || !playSet) {
    return null;
  }

  const cardDimensions = getPlaySetCardDimensions(draftSettings);
  const previewAspect = cardDimensions.width / cardDimensions.height;

  function updateDraftSettings(updater: (current: PlaySet["settings"]) => PlaySet["settings"]) {
    setDraftSettings((current) => normalizePlaySetSettings(updater(current)));
  }

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
              <p className="text-sm text-ink-950/60">Core roster details and card styling for this set.</p>
            </div>

            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-950/70">Set name</span>
                <input
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                  onChange={(event) => setDraftName(event.target.value)}
                  value={draftName}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-950/70">Player count</span>
                <div className="flex h-[42px] items-center rounded-2xl border border-black/10 bg-white/80 px-3">
                  <span className="rounded-full bg-field-100 px-3 py-1 text-sm font-semibold text-field-700">
                    {draftSettings.roster.playerCount} players
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-950/70">Card background color</span>
                <input
                  className="h-11 w-full rounded-2xl border border-black/10 bg-white/80 p-1"
                  onChange={(event) =>
                    updateDraftSettings((current) => ({
                      ...current,
                      field: {
                        ...current.field,
                        backgroundColor: event.target.value,
                      },
                    }))
                  }
                  type="color"
                  value={draftSettings.field.backgroundColor}
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
                  <span className="mb-1 block text-sm font-semibold text-ink-950/70">Rows per page</span>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                    min={1}
                    onChange={(event) =>
                      updateDraftSettings((current) => ({
                        ...current,
                        layout: {
                          ...current.layout,
                          rowsPerPage: Number(event.target.value) || current.layout.rowsPerPage,
                        },
                      }))
                    }
                    step={1}
                    type="number"
                    value={draftSettings.layout.rowsPerPage}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-ink-950/70">Columns per page</span>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                    min={1}
                    onChange={(event) =>
                      updateDraftSettings((current) => ({
                        ...current,
                        layout: {
                          ...current.layout,
                          columnsPerPage: Number(event.target.value) || current.layout.columnsPerPage,
                        },
                      }))
                    }
                    step={1}
                    type="number"
                    value={draftSettings.layout.columnsPerPage}
                  />
                </label>
              </div>

              <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-ink-950/70">Full page width</span>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                    min={0.5}
                    onChange={(event) =>
                      updateDraftSettings((current) => ({
                        ...current,
                        print: {
                          ...current.print,
                          presetId: null,
                          width: Number(event.target.value) || current.print.width,
                        },
                      }))
                    }
                    step="0.05"
                    type="number"
                    value={draftSettings.print.width}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-ink-950/70">Full page height</span>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                    min={0.5}
                    onChange={(event) =>
                      updateDraftSettings((current) => ({
                        ...current,
                        print: {
                          ...current.print,
                          presetId: null,
                          height: Number(event.target.value) || current.print.height,
                        },
                      }))
                    }
                    step="0.05"
                    type="number"
                    value={draftSettings.print.height}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-ink-950/70">Unit</span>
                  <select
                    className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                    onChange={(event) =>
                      updateDraftSettings((current) => {
                        const nextUnit = event.target.value as PlaySet["settings"]["print"]["unit"];
                        return {
                          ...current,
                          print: {
                            ...current.print,
                            presetId: null,
                            width: convertPrintMeasurement(current.print.width, current.print.unit, nextUnit),
                            height: convertPrintMeasurement(current.print.height, current.print.unit, nextUnit),
                            unit: nextUnit,
                          },
                        };
                      })
                    }
                    value={draftSettings.print.unit}
                  >
                    <option value="in">Inches</option>
                    <option value="cm">Centimeters</option>
                  </select>
                </label>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-ink-950/70">Page preview</p>
                <div className="rounded-[24px] border border-dashed border-ink-950/15 bg-field-50/70 p-4">
                  <div
                    className="mx-auto rounded-2xl border border-ink-950/20 shadow-sm"
                    style={{
                      aspectRatio: `${previewAspect}`,
                      backgroundColor: draftSettings.field.backgroundColor,
                      maxWidth: "100%",
                      minHeight: 90,
                      width: previewAspect >= 1 ? "100%" : `${previewAspect * 100}%`,
                    }}
                  >
                    <div className="flex h-full items-center justify-center text-center text-sm text-ink-950/60">
                      {draftSettings.layout.rowsPerPage} rows × {draftSettings.layout.columnsPerPage} cols
                      <br />
                      {draftSettings.print.width} x {draftSettings.print.height} {draftSettings.print.unit}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-full border border-ink-950/15 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:border-ink-950/35"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-full bg-ember-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-ember-500/90"
            onClick={() => onSave({ name: draftName.trim() || playSet.name, settings: draftSettings })}
            type="button"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
