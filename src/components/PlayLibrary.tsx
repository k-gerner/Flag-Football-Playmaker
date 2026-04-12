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
}

function CreateCard({ title, description, onClick, disabled = false }: CreateCardProps) {
  return (
    <button
      className="flex min-h-[184px] w-full max-w-[14.5rem] flex-col items-center justify-center rounded-[24px] border border-dashed border-ink-950/15 bg-white/45 p-4 text-center transition hover:border-ember-500/50 hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-ink-950/15 disabled:hover:bg-white/45"
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
  const tileClassName =
    "flex min-h-[184px] w-full max-w-[14.5rem] flex-col rounded-[24px] border p-4 transition";

  return (
    <aside className="glass-panel flex h-full flex-col rounded-[28px] border border-white/70 p-4 shadow-panel">
      <div className="mb-4">
        <p className="font-display text-lg font-bold text-ink-950">Play Sets</p>
        <p className="text-sm text-ink-950/65">Separate wristband groupings by opponent, team, or install.</p>
      </div>

      <div className="flex flex-wrap items-start gap-2 overflow-y-auto pr-0.5">
        {playSets.map((playSet) => {
          const active = playSet.id === activePlaySetId;
          return (
            <article
              className={`${tileClassName} ${
                active
                  ? "border-ember-500 bg-ember-300/15 shadow-sm"
                  : "border-black/5 bg-white/70 hover:border-ember-500/30"
              }`}
              key={playSet.id}
            >
              <button className="block w-full flex-1 text-left" onClick={() => onSelectPlaySet(playSet.id)} type="button">
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

        <CreateCard
          description="Start a fresh grouped install, opponent sheet, or wristband package."
          onClick={onCreatePlaySet}
          title="New Play Set"
        />
      </div>

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
