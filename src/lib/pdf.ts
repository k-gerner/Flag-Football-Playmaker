import { jsPDF } from "jspdf";
import "svg2pdf.js";
import { getPlaySetPrintLayoutMetrics, getPrintCardInset } from "./playbook";
import type { PlayDocument, PlaySet } from "./types";

function getCardTitle(playSet: PlaySet, play: PlayDocument) {
  const bits: string[] = [];
  if (playSet.settings.export.includePlayNumber) {
    bits.push(`#${play.playNumber}`);
  }
  if (playSet.settings.export.includePlayName) {
    bits.push(play.name);
  }

  return bits.join(" ") || play.name;
}

function createDoc(playSet: PlaySet, pageHeight: number) {
  const pageWidth = playSet.settings.print.width;
  return new jsPDF({
    orientation: pageWidth >= pageHeight ? "landscape" : "portrait",
    unit: playSet.settings.print.unit,
    format: [pageWidth, pageHeight],
  });
}

function getPrintCardBorderWidth(playSet: PlaySet) {
  return playSet.settings.print.unit === "in" ? 0.005 : 0.015;
}

async function drawPlayCard(
  doc: jsPDF,
  playSet: PlaySet,
  play: PlayDocument,
  svg: SVGSVGElement,
  x: number,
  y: number,
) {
  const { cardWidth, cardHeight } = getPlaySetPrintLayoutMetrics(playSet.settings);
  const title = getCardTitle(playSet, play);
  const titleHeight = title ? cardHeight * 0.16 : 0;
  const boardMargin = getPrintCardInset(playSet.settings.print.unit);
  const borderWidth = getPrintCardBorderWidth(playSet);

  doc.setFillColor(playSet.settings.field.backgroundColor);
  doc.setDrawColor(24, 39, 48);
  doc.setLineWidth(borderWidth);
  doc.rect(x, y, cardWidth, cardHeight, "FD");

  if (title) {
    doc.setTextColor(24, 39, 48);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(playSet.settings.print.unit === "in" ? 9 : 10);
    doc.text(title, x + boardMargin, y + titleHeight - boardMargin * 0.2, {
      baseline: "bottom",
    });
  }

  const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  await doc.svg(clonedSvg, {
    x: x + boardMargin,
    y: y + titleHeight,
    width: cardWidth - boardMargin * 2,
    height: cardHeight - titleHeight - boardMargin,
  });
}

export async function exportPlaySetToPdf(
  playSet: PlaySet,
  plays: PlayDocument[],
  svgMap: Record<string, SVGSVGElement | null>,
) {
  const orderedPlays = [...plays].sort((a, b) => a.playNumber - b.playNumber);
  const { spacing, pageHeight, pageWidth, cardWidth, cardHeight, columnsPerPage, playsPerPage } =
    getPlaySetPrintLayoutMetrics(playSet.settings);
  const doc = createDoc(playSet, pageHeight);

  for (const [index, play] of orderedPlays.entries()) {
    const svg = svgMap[play.id];
    if (!svg) {
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
    await drawPlayCard(doc, playSet, play, svg, x, y);
  }

  doc.save(`${playSet.name.replace(/\s+/g, "-").toLowerCase() || "play-set"}.pdf`);
}
