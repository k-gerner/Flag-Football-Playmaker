import { useEffect, useRef, useState } from "react";
import type { PlayDocument, PlaySet } from "../lib/types";

interface PlayLibraryProps {
  playSets: PlaySet[];
  activePlaySetId: string | null;
  plays: PlayDocument[];
  activePlayId: string | null;
  onCreatePlaySet: () => void;
  onSelectPlaySet: (playSetId: string) => void;
  onDuplicatePlaySet: (playSetId: string) => void;
  onDeletePlaySet: (playSetId: string) => void;
  onCreatePlay: () => void;
  onSelectPlay: (playId: string) => void;
  onDuplicatePlay: (playId: string) => void;
  onDeletePlay: (playId: string) => void;
  onMovePlay: (playId: string, direction: "up" | "down") => void;
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Just now" : date.toLocaleString();
}

interface CreateCardProps {
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
  railItem?: boolean;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function ScrollArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      {direction === "left" ? (
        <path d="M15 6L9 12L15 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      ) : (
        <path d="M9 6L15 12L9 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      )}
    </svg>
  );
}

function CreateCard({ title, description, onClick, disabled = false, testId, railItem = false }: CreateCardProps) {
  return (
    <button
      aria-label={title}
      className="flex min-h-[184px] w-full max-w-[14.5rem] flex-col items-center justify-center rounded-[24px] border border-dashed border-ink-950/15 bg-white/45 p-4 text-center transition hover:border-ember-500/50 hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-ink-950/15 disabled:hover:bg-white/45"
      data-play-set-rail-item={railItem ? "true" : undefined}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ink-950/10 bg-white/80 text-3xl leading-none text-ember-500">
        +
      </span>
      <p className="mt-4 font-display text-base font-bold text-ink-950">{title}</p>
      <p className="mt-2 text-sm text-ink-950/65">{description}</p>
    </button>
  );
}

export function PlayLibrary({
  playSets,
  activePlaySetId,
  plays,
  activePlayId,
  onCreatePlaySet,
  onSelectPlaySet,
  onDuplicatePlaySet,
  onDeletePlaySet,
  onCreatePlay,
  onSelectPlay,
  onDuplicatePlay,
  onDeletePlay,
  onMovePlay,
}: PlayLibraryProps) {
  const activePlaySet = playSets.find((playSet) => playSet.id === activePlaySetId) ?? null;
  const [isPlaySetPickerOpen, setIsPlaySetPickerOpen] = useState(false);
  const [canScrollPlaySetsLeft, setCanScrollPlaySetsLeft] = useState(false);
  const [canScrollPlaySetsRight, setCanScrollPlaySetsRight] = useState(false);
  const playSetRailRef = useRef<HTMLDivElement | null>(null);

  const tileClassName =
    "flex min-h-[184px] w-[14.5rem] flex-none flex-col rounded-[24px] border p-4 transition";
  const playSetPickerLabel = activePlaySet?.name ?? "Select a Play Set";

  function updatePlaySetRailScrollState() {
    const rail = playSetRailRef.current;
    if (!rail || !isPlaySetPickerOpen) {
      setCanScrollPlaySetsLeft(false);
      setCanScrollPlaySetsRight(false);
      return;
    }

    const maxScrollLeft = Math.max(rail.scrollWidth - rail.clientWidth, 0);
    setCanScrollPlaySetsLeft(rail.scrollLeft > 4);
    setCanScrollPlaySetsRight(maxScrollLeft - rail.scrollLeft > 4);
  }

  function scrollPlaySetRail(direction: "left" | "right") {
    const rail = playSetRailRef.current;
    if (!rail) {
      return;
    }

    const firstRailItem = rail.querySelector<HTMLElement>("[data-play-set-rail-item='true']");
    const step = firstRailItem ? firstRailItem.getBoundingClientRect().width + 8 : 240;
    rail.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  }

  function handlePlaySetSelect(playSetId: string) {
    onSelectPlaySet(playSetId);
    setIsPlaySetPickerOpen(false);
  }

  function handleCreatePlaySetClick() {
    onCreatePlaySet();
    setIsPlaySetPickerOpen(false);
  }

  useEffect(() => {
    if (!isPlaySetPickerOpen) {
      setCanScrollPlaySetsLeft(false);
      setCanScrollPlaySetsRight(false);
      return;
    }

    const frameId = window.requestAnimationFrame(updatePlaySetRailScrollState);
    window.addEventListener("resize", updatePlaySetRailScrollState);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updatePlaySetRailScrollState);
    };
  }, [isPlaySetPickerOpen, playSets.length]);

  return (
    <aside className="glass-panel flex h-full min-w-0 flex-col overflow-hidden rounded-[28px] border border-white/70 p-4 shadow-panel">
      <div className="mb-4">
        <p className="font-display text-lg font-bold text-ink-950">Play Sets</p>
        <p className="text-sm text-ink-950/65">Separate wristband groupings by opponent, team, or install.</p>
      </div>

      <button
        aria-controls="play-set-picker-rail"
        aria-expanded={isPlaySetPickerOpen}
        className="flex w-full items-center justify-between rounded-[22px] border border-black/8 bg-white/75 px-4 py-3 text-left transition hover:border-ember-500/35 hover:bg-white"
        data-testid="play-set-picker-trigger"
        onClick={() => setIsPlaySetPickerOpen((current) => !current)}
        type="button"
      >
        <span className="font-display text-base font-bold text-ink-950">{playSetPickerLabel}</span>
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-950/65">
          {playSets.length} set{playSets.length === 1 ? "" : "s"}
          <ChevronIcon open={isPlaySetPickerOpen} />
        </span>
      </button>

      {isPlaySetPickerOpen ? (
        <div className="relative mt-3">
          {canScrollPlaySetsLeft ? (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[rgba(247,242,232,0.96)] to-transparent" />
              <button
                aria-label="Scroll play sets left"
                className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 text-ink-950 shadow-sm transition hover:border-ember-500/35 hover:bg-white"
                onClick={() => scrollPlaySetRail("left")}
                type="button"
              >
                <ScrollArrowIcon direction="left" />
              </button>
            </>
          ) : null}

          <div
            className="w-full max-w-full overflow-x-auto overflow-y-hidden pb-1"
            data-testid="play-set-picker-rail"
            id="play-set-picker-rail"
            onScroll={updatePlaySetRailScrollState}
            ref={playSetRailRef}
          >
            <div className="inline-flex min-w-max items-start gap-2 pr-0.5">
              <CreateCard
                description="Start a fresh grouped install, opponent sheet, or wristband package."
                onClick={handleCreatePlaySetClick}
                railItem
                testId="new-play-set-card"
                title="New Play Set"
              />

              {playSets.map((playSet) => {
                const active = playSet.id === activePlaySetId;
                return (
                  <article
                    className={`${tileClassName} ${
                      active
                        ? "border-ember-500 bg-ember-300/15 shadow-sm"
                        : "border-black/5 bg-white/70 hover:border-ember-500/30"
                    }`}
                    data-play-set-rail-item="true"
                    data-testid={`play-set-card-${playSet.id}`}
                    key={playSet.id}
                  >
                    <button
                      aria-label={playSet.name}
                      className="block w-full flex-1 text-left"
                      onClick={() => handlePlaySetSelect(playSet.id)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-display text-base font-bold text-ink-950">{playSet.name}</p>
                        <span className="rounded-full bg-field-100 px-3 py-1 text-xs font-semibold text-field-700">
                          {playSet.settings.layout.playsPerPage}/page
                        </span>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ink-950/45">Last edited</p>
                      <p className="text-sm text-ink-950/70">{formatTimestamp(playSet.updatedAt)}</p>
                    </button>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="rounded-full border border-ink-950/10 px-3 py-1.5 text-sm font-semibold text-ink-950 transition hover:border-ink-950/30"
                        onClick={() => onDuplicatePlaySet(playSet.id)}
                        type="button"
                      >
                        Duplicate
                      </button>
                      <button
                        className="rounded-full border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                        onClick={() => onDeletePlaySet(playSet.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {canScrollPlaySetsRight ? (
            <>
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[rgba(247,242,232,0.96)] to-transparent" />
              <button
                aria-label="Scroll play sets right"
                className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 text-ink-950 shadow-sm transition hover:border-ember-500/35 hover:bg-white"
                onClick={() => scrollPlaySetRail("right")}
                type="button"
              >
                <ScrollArrowIcon direction="right" />
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 border-t border-black/8 pt-4">
        <div className="mb-3">
          <p className="font-display text-lg font-bold text-ink-950">Plays</p>
          <p className="text-sm text-ink-950/65">
            {activePlaySet ? `Inside ${activePlaySet.name}` : "Choose a Play Set to edit plays."}
          </p>
        </div>

        {activePlaySet ? (
          <div className="flex flex-wrap items-start gap-2 overflow-y-auto pr-0.5">
            {plays.map((play, index) => {
              const active = play.id === activePlayId;
              return (
                <article
                  className={`${tileClassName} ${
                    active
                      ? "border-ember-500 bg-ember-300/15 shadow-sm"
                      : "border-black/5 bg-white/70 hover:border-ember-500/30"
                  }`}
                  key={play.id}
                >
                  <button className="block w-full flex-1 text-left" onClick={() => onSelectPlay(play.id)} type="button">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-display text-base font-bold text-ink-950">{play.name}</p>
                      <span className="rounded-full bg-ink-950 px-3 py-1 text-xs font-semibold text-white">
                        #{play.playNumber}
                      </span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ink-950/45">Last edited</p>
                    <p className="text-sm text-ink-950/70">{formatTimestamp(play.updatedAt)}</p>
                    {play.notes ? (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-950/60">{play.notes}</p>
                    ) : (
                      <p className="mt-2 text-sm italic text-ink-950/45">No notes yet.</p>
                    )}
                  </button>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="rounded-full border border-ink-950/10 px-3 py-1.5 text-sm font-semibold text-ink-950 transition hover:border-ink-950/30 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={index === 0}
                      onClick={() => onMovePlay(play.id, "up")}
                      type="button"
                    >
                      Up
                    </button>
                    <button
                      className="rounded-full border border-ink-950/10 px-3 py-1.5 text-sm font-semibold text-ink-950 transition hover:border-ink-950/30 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={index === plays.length - 1}
                      onClick={() => onMovePlay(play.id, "down")}
                      type="button"
                    >
                      Down
                    </button>
                    <button
                      className="rounded-full border border-ink-950/10 px-3 py-1.5 text-sm font-semibold text-ink-950 transition hover:border-ink-950/30"
                      onClick={() => onDuplicatePlay(play.id)}
                      type="button"
                    >
                      Duplicate
                    </button>
                    <button
                      className="rounded-full border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                      onClick={() => onDeletePlay(play.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}

            {plays.length === 0 ? (
              <div className="w-full rounded-[24px] border border-dashed border-black/10 bg-white/60 p-4 text-sm text-ink-950/60">
                This Play Set doesn&apos;t have any plays yet.
              </div>
            ) : null}

            <CreateCard
              description={`Add a new diagram to ${activePlaySet.name} and start drawing assignments.`}
              onClick={onCreatePlay}
              title="New Play"
            />
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-black/10 bg-white/60 p-4 text-sm text-ink-950/60">
            Create or choose a Play Set to start building grouped wristband plays.
          </div>
        )}
      </div>
    </aside>
  );
}
