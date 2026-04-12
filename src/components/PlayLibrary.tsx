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

  return (
    <aside className="glass-panel flex h-full flex-col rounded-[28px] border border-white/70 p-4 shadow-panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold text-ink-950">Play Sets</p>
          <p className="text-sm text-ink-950/65">Separate wristband groupings by opponent, team, or install.</p>
        </div>
        <button
          className="rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-950/85"
          onClick={onCreatePlaySet}
          type="button"
        >
          New set
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto pr-1">
        {playSets.map((playSet) => {
          const active = playSet.id === activePlaySetId;
          return (
            <article
              className={`rounded-3xl border p-3 transition ${
                active
                  ? "border-ember-500 bg-ember-300/15 shadow-sm"
                  : "border-black/5 bg-white/70 hover:border-ember-500/30"
              }`}
              key={playSet.id}
            >
              <button className="block w-full text-left" onClick={() => onSelectPlaySet(playSet.id)} type="button">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-base font-bold text-ink-950">{playSet.name}</p>
                  <span className="rounded-full bg-field-100 px-3 py-1 text-xs font-semibold text-field-700">
                    {playSet.settings.layout.playsPerPage}/page
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ink-950/45">Last edited</p>
                <p className="text-sm text-ink-950/70">{formatTimestamp(playSet.updatedAt)}</p>
              </button>

              <div className="mt-3 flex gap-2">
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

      <div className="mt-5 border-t border-black/8 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg font-bold text-ink-950">Plays</p>
            <p className="text-sm text-ink-950/65">
              {activePlaySet ? `Inside ${activePlaySet.name}` : "Choose a Play Set to edit plays."}
            </p>
          </div>
          <button
            className="rounded-full bg-ember-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ember-500/90 disabled:cursor-not-allowed disabled:bg-ember-500/40"
            disabled={!activePlaySet}
            onClick={onCreatePlay}
            type="button"
          >
            New play
          </button>
        </div>

        {activePlaySet ? (
          <div className="space-y-3 overflow-y-auto pr-1">
            {plays.map((play, index) => {
              const active = play.id === activePlayId;
              return (
                <article
                  className={`rounded-3xl border p-3 transition ${
                    active
                      ? "border-ember-500 bg-ember-300/15 shadow-sm"
                      : "border-black/5 bg-white/70 hover:border-ember-500/30"
                  }`}
                  key={play.id}
                >
                  <button className="block w-full text-left" onClick={() => onSelectPlay(play.id)} type="button">
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

                  <div className="mt-3 flex flex-wrap gap-2">
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
              <div className="rounded-3xl border border-dashed border-black/10 bg-white/60 p-4 text-sm text-ink-950/60">
                This Play Set doesn&apos;t have any plays yet.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-black/10 bg-white/60 p-4 text-sm text-ink-950/60">
            Create or choose a Play Set to start building grouped wristband plays.
          </div>
        )}
      </div>
    </aside>
  );
}

