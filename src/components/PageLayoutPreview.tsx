import { getPlaySetPrintLayoutMetrics } from "../lib/playbook";
import type { PlaySetSettings } from "../lib/types";

interface PageLayoutPreviewProps {
  settings: PlaySetSettings;
}

const CENTIMETERS_PER_INCH = 2.54;
const PREVIEW_PIXELS_PER_INCH = 48;
const PREVIEW_MAX_WIDTH = 520;
const PREVIEW_MAX_HEIGHT = 240;

export function PageLayoutPreview({ settings }: PageLayoutPreviewProps) {
  const { unit } = settings.print;
  const { rowsPerPage, columnsPerPage, pageWidth, pageHeight, spacing, playsPerPage, cardWidth, cardHeight } =
    getPlaySetPrintLayoutMetrics(settings);
  const previewCards = Array.from({ length: playsPerPage }, (_, index) => index);
  const pageWidthInches = unit === "in" ? pageWidth : pageWidth / CENTIMETERS_PER_INCH;
  const pageHeightInches = unit === "in" ? pageHeight : pageHeight / CENTIMETERS_PER_INCH;
  const rawPreviewWidth = pageWidthInches * PREVIEW_PIXELS_PER_INCH;
  const rawPreviewHeight = pageHeightInches * PREVIEW_PIXELS_PER_INCH;
  const previewScale = Math.min(1, PREVIEW_MAX_WIDTH / rawPreviewWidth, PREVIEW_MAX_HEIGHT / rawPreviewHeight);
  const previewWidth = Number((rawPreviewWidth * previewScale).toFixed(2));
  const previewHeight = Number((rawPreviewHeight * previewScale).toFixed(2));

  return (
    <div className="rounded-[24px] border border-dashed border-ink-950/15 bg-field-50/70 p-4">
      <div className="flex justify-center">
        <div
          className="mx-auto overflow-hidden bg-white/90"
          data-testid="page-layout-preview"
          style={{
            height: `${previewHeight}px`,
            width: `${previewWidth}px`,
          }}
        >
          <div
            className="grid h-full w-full"
            style={{
              columnGap: `${(spacing / pageWidth) * 100}%`,
              gridTemplateColumns: `repeat(${columnsPerPage}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rowsPerPage}, minmax(0, 1fr))`,
              rowGap: `${(spacing / pageHeight) * 100}%`,
            }}
          >
            {previewCards.map((cardIndex) => (
              <div
                data-testid="page-layout-preview-card"
                key={cardIndex}
                style={{
                  backgroundColor: settings.field.backgroundColor,
                  border: "0.5px solid rgba(15, 23, 42, 0.12)",
                  marginLeft: cardIndex % columnsPerPage === 0 ? "0" : "-0.5px",
                  marginTop: cardIndex < columnsPerPage ? "0" : "-0.5px",
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 text-center text-sm text-ink-950/60">
        <p>
          {rowsPerPage} rows × {columnsPerPage} cols
        </p>
        <p>
          {cardWidth} x {cardHeight} {unit} per card
        </p>
      </div>
    </div>
  );
}
