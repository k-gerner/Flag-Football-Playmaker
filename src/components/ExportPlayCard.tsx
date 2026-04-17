import { forwardRef } from "react";
import { getPlaySetCardDimensions } from "../lib/playbook";
import type { PlayDocument, PlaySet } from "../lib/types";
import { Playboard } from "./Playboard";

interface ExportPlayCardProps {
  play: PlayDocument;
  playSet: PlaySet;
}

const EXPORT_PREVIEW_MAX_WIDTH = 1200;

export const ExportPlayCard = forwardRef<HTMLDivElement, ExportPlayCardProps>(function ExportPlayCard(
  { play, playSet },
  ref,
) {
  const { width: cardWidth, height: cardHeight } = getPlaySetCardDimensions(playSet.settings);
  const aspectRatio = Math.max(cardWidth / cardHeight, 1);
  const previewWidth = EXPORT_PREVIEW_MAX_WIDTH;
  const previewHeight = previewWidth / aspectRatio;

  return (
    <div
      className="bg-white"
      ref={ref}
      style={{
        width: `${previewWidth}px`,
        height: `${previewHeight}px`,
      }}
    >
      <Playboard
        accessibleLabel={null}
        draftPath={null}
        enableTestIds={false}
        frameVariant="export"
        handoffSourceId={null}
        interactive={false}
        play={play}
        playSetSettings={playSet.settings}
        selectedPathId={null}
        selectedPlayerId={null}
        selectedTextId={null}
        tool="select"
      />
    </div>
  );
});
