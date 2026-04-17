import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { getPlaySetPrintLayoutMetrics } from "./playbook";
import type { PlayDocument, PlaySet } from "./types";

function getLetterSheetSize(unit: PlaySet["settings"]["print"]["unit"], landscape: boolean) {
  const portraitWidth = unit === "in" ? 8.5 : 21.59;
  const portraitHeight = unit === "in" ? 11 : 27.94;

  return landscape
    ? { width: portraitHeight, height: portraitWidth }
    : { width: portraitWidth, height: portraitHeight };
}

function getPdfSheetLayout(
  pageWidth: number,
  pageHeight: number,
  unit: PlaySet["settings"]["print"]["unit"],
) {
  const landscape = pageWidth >= pageHeight;
  const letterSheet = getLetterSheetSize(unit, landscape);

  if (pageWidth <= letterSheet.width && pageHeight <= letterSheet.height) {
    return {
      width: letterSheet.width,
      height: letterSheet.height,
      offsetX: Number(((letterSheet.width - pageWidth) / 2).toFixed(3)),
      offsetY: Number(((letterSheet.height - pageHeight) / 2).toFixed(3)),
    };
  }

  return {
    width: pageWidth,
    height: pageHeight,
    offsetX: 0,
    offsetY: 0,
  };
}

function createDoc(
  playSet: PlaySet,
  sheetWidth: number,
  sheetHeight: number,
) {
  const doc = new jsPDF({
    orientation: sheetWidth >= sheetHeight ? "landscape" : "portrait",
    unit: playSet.settings.print.unit,
    format: [sheetWidth, sheetHeight],
  });

  // Preserve the exported page's physical dimensions when users print the PDF.
  doc.viewerPreferences({
    PrintScaling: "None",
  });

  return doc;
}

async function drawPlayCard(
  doc: jsPDF,
  playSet: PlaySet,
  previewCard: HTMLElement,
  x: number,
  y: number,
) {
  const { cardWidth, cardHeight } = getPlaySetPrintLayoutMetrics(playSet.settings);
  if ("fonts" in document) {
    await (document.fonts as FontFaceSet).ready;
  }

  const canvas = await html2canvas(previewCard, {
    backgroundColor: null,
    logging: false,
    scale: 2,
    useCORS: true,
  });
  const imageData = canvas.toDataURL("image/png");

  doc.addImage(imageData, "PNG", x, y, cardWidth, cardHeight, undefined, "FAST");
}

export async function exportPlaySetToPdf(
  playSet: PlaySet,
  plays: PlayDocument[],
  previewCardMap: Record<string, HTMLElement | null>,
) {
  const orderedPlays = [...plays].sort((a, b) => a.playNumber - b.playNumber);
  const { spacing, pageHeight, pageWidth, cardWidth, cardHeight, columnsPerPage, playsPerPage } =
    getPlaySetPrintLayoutMetrics(playSet.settings);
  const sheetLayout = getPdfSheetLayout(pageWidth, pageHeight, playSet.settings.print.unit);
  const doc = createDoc(playSet, sheetLayout.width, sheetLayout.height);

  for (const [index, play] of orderedPlays.entries()) {
    const previewCard = previewCardMap[play.id];
    if (!previewCard) {
      continue;
    }

    const slot = index % playsPerPage;
    if (index > 0 && slot === 0) {
      doc.addPage(
        [sheetLayout.width, sheetLayout.height],
        sheetLayout.width >= sheetLayout.height ? "landscape" : "portrait",
      );
    }

    const row = Math.floor(slot / columnsPerPage);
    const column = slot % columnsPerPage;
    const x = sheetLayout.offsetX + column * (cardWidth + spacing);
    const y = sheetLayout.offsetY + row * (cardHeight + spacing);
    await drawPlayCard(doc, playSet, previewCard, x, y);
  }

  doc.save(`${playSet.name.replace(/\s+/g, "-").toLowerCase() || "play-set"}.pdf`);
}
