import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { getPlaySetPrintLayoutMetrics } from "./playbook";
import type { PlayDocument, PlaySet } from "./types";

function createDoc(playSet: PlaySet, pageHeight: number) {
  const pageWidth = playSet.settings.print.width;
  return new jsPDF({
    orientation: pageWidth >= pageHeight ? "landscape" : "portrait",
    unit: playSet.settings.print.unit,
    format: [pageWidth, pageHeight],
  });
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
  const doc = createDoc(playSet, pageHeight);

  for (const [index, play] of orderedPlays.entries()) {
    const previewCard = previewCardMap[play.id];
    if (!previewCard) {
      continue;
    }

    const slot = index % playsPerPage;
    if (index > 0 && slot === 0) {
      doc.addPage([pageWidth, pageHeight], pageWidth >= pageHeight ? "landscape" : "portrait");
    }

    const row = Math.floor(slot / columnsPerPage);
    const column = slot % columnsPerPage;
    const x = column * (cardWidth + spacing);
    const y = row * (cardHeight + spacing);
    await drawPlayCard(doc, playSet, previewCard, x, y);
  }

  doc.save(`${playSet.name.replace(/\s+/g, "-").toLowerCase() || "play-set"}.pdf`);
}
