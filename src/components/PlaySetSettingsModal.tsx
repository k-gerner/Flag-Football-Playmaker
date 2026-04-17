import { useEffect, useState } from "react";
import { PageLayoutPreview } from "./PageLayoutPreview";
import { convertPrintMeasurement, isLandscapeCard, normalizePlaySetSettings } from "../lib/playbook";
import type { PlaySet } from "../lib/types";

interface PlaySetSettingsModalProps {
  playSet: PlaySet | null;
  open: boolean;
  exporting?: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; settings: PlaySet["settings"] }) => void;
  onExportPlaySet: () => void;
}

export function PlaySetSettingsModal({
  playSet,
  open,
  exporting = false,
  onClose,
  onSave,
  onExportPlaySet,
}: PlaySetSettingsModalProps) {
  const sections = [
    {
      id: "general",
      title: "General",
      description: "Core roster details and card styling for this set.",
    },
    {
      id: "layout-export",
      title: "Layout & Export",
      description: "These settings drive full-set PDF generation.",
    },
    {
      id: "appearance",
      title: "Appearance",
      description: "Update labels and colors here to sync every matching player across this entire set.",
    },
  ] as const;
  const [draftName, setDraftName] = useState("");
  const [draftSettings, setDraftSettings] = useState(() => normalizePlaySetSettings());
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]["id"]>("general");

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
    setActiveSection("general");
  }, [open, playSet]);

  if (!open || !playSet) {
    return null;
  }

  const hasValidCardRatio = isLandscapeCard(draftSettings);

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
              aria-busy={exporting}
              className="rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-950/85 disabled:cursor-not-allowed disabled:bg-ink-950/45"
              disabled={exporting}
              onClick={onExportPlaySet}
              type="button"
            >
              {exporting ? "Exporting PDF..." : "Export Set PDF"}
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

        <div className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-black/5 bg-white/60 p-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-950/45">Sections</p>
            <nav aria-label="Play set settings sections" className="space-y-1.5">
              {sections.map((section) => {
                const isActive = section.id === activeSection;

                return (
                  <button
                    aria-current={isActive ? "page" : undefined}
                    className={`w-full rounded-2xl px-3 py-3 text-left transition ${
                      isActive
                        ? "bg-ink-950 text-white shadow-[0_12px_30px_rgba(15,23,32,0.14)]"
                        : "bg-white/50 text-ink-950 hover:bg-white/80"
                    }`}
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    type="button"
                  >
                    <p className="font-display text-base font-bold">{section.title}</p>
                    <p className={`mt-1 text-xs leading-5 ${isActive ? "text-white/75" : "text-ink-950/55"}`}>
                      {section.description}
                    </p>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="rounded-3xl border border-black/5 bg-white/60 p-4">
            <div>
              <p className="font-display text-base font-bold text-ink-950">
                {sections.find((section) => section.id === activeSection)?.title}
              </p>
              <p className="text-sm text-ink-950/60">
                {sections.find((section) => section.id === activeSection)?.description}
              </p>
            </div>

            {activeSection === "general" ? (
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

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/75 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-ink-950/75">Match route color to player</p>
                    <p className="text-xs text-ink-950/55">When off, all routes and motions render in black.</p>
                  </div>
                  <button
                    aria-checked={draftSettings.field.matchRouteColorToPlayer}
                    aria-label="Toggle match route color to player"
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center overflow-hidden rounded-full p-0.5 transition focus:outline-none focus:ring-2 focus:ring-ember-500/40 ${
                      draftSettings.field.matchRouteColorToPlayer ? "bg-ember-500" : "bg-ink-950/15"
                    }`}
                    onClick={() =>
                      updateDraftSettings((current) => ({
                        ...current,
                        field: {
                          ...current.field,
                          matchRouteColorToPlayer: !current.field.matchRouteColorToPlayer,
                        },
                      }))
                    }
                    role="switch"
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={`block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,32,0.16)] transition-transform ${
                        draftSettings.field.matchRouteColorToPlayer ? "translate-x-[19px]" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/75 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-ink-950/75">Show play number on play</p>
                    <p className="text-xs text-ink-950/55">Adds a black banner across the top with the play number.</p>
                  </div>
                  <button
                    aria-checked={draftSettings.field.showPlayNumberBanner}
                    aria-label="Toggle show play number on play"
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center overflow-hidden rounded-full p-0.5 transition focus:outline-none focus:ring-2 focus:ring-ember-500/40 ${
                      draftSettings.field.showPlayNumberBanner ? "bg-ember-500" : "bg-ink-950/15"
                    }`}
                    onClick={() =>
                      updateDraftSettings((current) => ({
                        ...current,
                        field: {
                          ...current.field,
                          showPlayNumberBanner: !current.field.showPlayNumberBanner,
                        },
                      }))
                    }
                    role="switch"
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={`block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,32,0.16)] transition-transform ${
                        draftSettings.field.showPlayNumberBanner ? "translate-x-[19px]" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            ) : null}

            {activeSection === "layout-export" ? (
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
                  <PageLayoutPreview settings={draftSettings} />
                  {!hasValidCardRatio ? (
                    <p className="mt-2 text-sm font-semibold text-red-700">
                      Printable cards must be square or wider than tall. Adjust the page size or row/column count.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activeSection === "appearance" ? (
              <div className="mt-3 space-y-4">
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

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {draftSettings.roster.players.map((player, index) => (
                    <div
                      className="rounded-2xl border border-black/8 bg-white/75 p-3"
                      data-testid={`play-set-roster-player-${index}`}
                      key={`${playSet.id}-roster-player-${index}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ink-950">Player {index + 1}</p>
                        <span
                          aria-hidden="true"
                          className="h-4 w-4 rounded-full border border-black/10"
                          style={{ backgroundColor: player.color }}
                        />
                      </div>

                      <div className="mt-3 grid gap-3">
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-ink-950/50">
                            Label
                          </span>
                          <input
                            className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                            maxLength={4}
                            onChange={(event) =>
                              updateDraftSettings((current) => ({
                                ...current,
                                roster: {
                                  ...current.roster,
                                  players: current.roster.players.map((rosterPlayer, rosterIndex) =>
                                    rosterIndex === index
                                      ? { ...rosterPlayer, label: event.target.value.toUpperCase() }
                                      : rosterPlayer,
                                  ),
                                },
                              }))
                            }
                            value={player.label}
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-ink-950/50">
                            Color
                          </span>
                          <input
                            className="h-11 w-full rounded-2xl border border-black/10 bg-white/80 p-1"
                            onChange={(event) =>
                              updateDraftSettings((current) => ({
                                ...current,
                                roster: {
                                  ...current.roster,
                                  players: current.roster.players.map((rosterPlayer, rosterIndex) =>
                                    rosterIndex === index
                                      ? { ...rosterPlayer, color: event.target.value }
                                      : rosterPlayer,
                                  ),
                                },
                              }))
                            }
                            type="color"
                            value={player.color}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
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
            className="rounded-full bg-ember-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-ember-500/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasValidCardRatio}
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
