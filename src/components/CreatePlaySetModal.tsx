import { useEffect, useState } from "react";
import { PageLayoutPreview } from "./PageLayoutPreview";
import { convertPrintMeasurement, isLandscapeCard, normalizePlaySetSettings } from "../lib/playbook";
import type { PartialPlaySetSettings, PlayerCount, Unit } from "../lib/types";

interface CreatePlaySetModalProps {
  open: boolean;
  defaultName: string;
  onClose: () => void;
  onSubmit: (payload: { name: string; settings: PartialPlaySetSettings }) => void;
}

export function CreatePlaySetModal({ open, defaultName, onClose, onSubmit }: CreatePlaySetModalProps) {
  const [name, setName] = useState(defaultName);
  const [playerCount, setPlayerCount] = useState<PlayerCount>(7);
  const [rowsPerPage, setRowsPerPage] = useState(4);
  const [columnsPerPage, setColumnsPerPage] = useState(1);
  const [pageWidth, setPageWidth] = useState(8.5);
  const [pageHeight, setPageHeight] = useState(11);
  const [printUnit, setPrintUnit] = useState<Unit>("in");

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(defaultName);
    const defaults = normalizePlaySetSettings();
    setPlayerCount(defaults.roster.playerCount);
    setRowsPerPage(defaults.layout.rowsPerPage);
    setColumnsPerPage(defaults.layout.columnsPerPage);
    setPageWidth(defaults.print.width);
    setPageHeight(defaults.print.height);
    setPrintUnit(defaults.print.unit);
  }, [defaultName, open]);

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
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const draftSettings = normalizePlaySetSettings({
    roster: {
      playerCount,
    },
    print: {
      presetId: null,
      width: pageWidth,
      height: pageHeight,
      unit: printUnit,
    },
    layout: {
      rowsPerPage,
      columnsPerPage,
      playsPerPage: rowsPerPage * columnsPerPage,
      cardAspectRatio: 1,
    },
  });
  const hasValidCardRatio = isLandscapeCard(draftSettings);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/45 px-4 py-6"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="glass-panel w-full max-w-2xl rounded-[32px] border border-white/70 p-6 shadow-panel"
        data-testid="create-play-set-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-2xl font-bold text-ink-950">Create Play Set</p>
            <p className="mt-1 text-sm text-ink-950/65">Set the roster size and export layout before you start diagramming.</p>
          </div>
          <button
            aria-label="Close create play set modal"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-950/15 bg-white/75 text-xl font-semibold text-ink-950 transition hover:border-ink-950/35 hover:bg-white"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink-950/70">Play Set name</span>
            <input
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Number of players</span>
              <select
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                onChange={(event) => setPlayerCount(Number(event.target.value) as PlayerCount)}
                value={playerCount}
              >
                <option value={5}>5 players</option>
                <option value={7}>7 players</option>
                <option value={8}>8 players</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-950/70">Rows per page</span>
                <input
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                  min={1}
                  onChange={(event) => setRowsPerPage(Number(event.target.value) || rowsPerPage)}
                  step={1}
                  type="number"
                  value={rowsPerPage}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-950/70">Columns per page</span>
                <input
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                  min={1}
                  onChange={(event) => setColumnsPerPage(Number(event.target.value) || columnsPerPage)}
                  step={1}
                  type="number"
                  value={columnsPerPage}
                />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Full page width</span>
              <input
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                min={1}
                onChange={(event) => setPageWidth(Number(event.target.value) || pageWidth)}
                step="0.1"
                type="number"
                value={pageWidth}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Full page height</span>
              <input
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                min={1}
                onChange={(event) => setPageHeight(Number(event.target.value) || pageHeight)}
                step="0.1"
                type="number"
                value={pageHeight}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-950/70">Unit</span>
              <select
                className="w-full rounded-2xl border border-black/10 bg-white/80 px-3 py-2 outline-none transition focus:border-ember-500"
                onChange={(event) => {
                  const nextUnit = event.target.value as Unit;
                  setPageWidth((current) => convertPrintMeasurement(current, printUnit, nextUnit));
                  setPageHeight((current) => convertPrintMeasurement(current, printUnit, nextUnit));
                  setPrintUnit(nextUnit);
                }}
                value={printUnit}
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
            onClick={() =>
              onSubmit({
                name: name.trim() || defaultName,
                settings: draftSettings,
              })
            }
            type="button"
          >
            Create Play Set
          </button>
        </div>
      </div>
    </div>
  );
}
