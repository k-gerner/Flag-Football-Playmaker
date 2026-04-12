import type { PlayDocument } from "../lib/types";

interface PlayLibraryProps {
  plays: PlayDocument[];
  activePlayId: string;
  onCreate: () => void;
  onSelect: (playId: string) => void;
  onDuplicate: (playId: string) => void;
  onDelete: (playId: string) => void;
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Just now" : date.toLocaleString();
}

export function PlayLibrary({
  plays,
  activePlayId,
  onCreate,
  onSelect,
  onDuplicate,
  onDelete,
}: PlayLibraryProps) {
  return (
    <aside className="glass-panel flex h-full flex-col rounded-[28px] border border-white/70 p-4 shadow-panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold text-ink-950">Play Library</p>
          <p className="text-sm text-ink-950/65">Local plays saved right in this browser.</p>
        </div>
        <button
          className="rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-950/85"
          onClick={onCreate}
          type="button"
        >
          New play
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto pr-1">
        {plays.map((play) => {
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
              <button
                className="block w-full text-left"
                onClick={() => onSelect(play.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-base font-bold text-ink-950">{play.name}</p>
                  <span className="rounded-full bg-field-100 px-3 py-1 text-xs font-semibold text-field-700">
                    {play.playerCount} players
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

              <div className="mt-3 flex gap-2">
                <button
                  className="rounded-full border border-ink-950/10 px-3 py-1.5 text-sm font-semibold text-ink-950 transition hover:border-ink-950/30"
                  onClick={() => onDuplicate(play.id)}
                  type="button"
                >
                  Duplicate
                </button>
                <button
                  className="rounded-full border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  onClick={() => onDelete(play.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
