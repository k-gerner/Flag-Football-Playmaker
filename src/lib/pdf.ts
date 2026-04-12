import { jsPDF } from "jspdf";
import "svg2pdf.js";
import type { PlayDocument, PlaySet } from "./types";

function getSpacing(unit: PlaySet["settings"]["print"]["unit"]) {
  return unit === "in" ? 0.08 : 2;
}

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

async function drawPlayCard(
  doc: jsPDF,
  playSet: PlaySet,
  play: PlayDocument,
  svg: SVGSVGElement,
  x: number,
  y: number,
) {
  const cardWidth = playSet.settings.print.width;
  const cardHeight = playSet.settings.print.height;
  const spacing = getSpacing(playSet.settings.print.unit);
  const title = getCardTitle(playSet, play);
  const titleHeight = title ? cardHeight * 0.16 : 0;
  const boardMargin = spacing;

  doc.setFillColor(playSet.settings.field.backgroundColor);
  doc.roundedRect(x, y, cardWidth, cardHeight, spacing, spacing, "F");

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

export async function exportPlayToPdf(
  playSet: PlaySet,
  play: PlayDocument,
  svg: SVGSVGElement,
) {
  const doc = createDoc(playSet, playSet.settings.print.height);
  await drawPlayCard(doc, playSet, play, svg, 0, 0);
  doc.save(`${play.name.replace(/\s+/g, "-").toLowerCase() || "play"}.pdf`);
}

export async function exportPlaySetToPdf(
  playSet: PlaySet,
  plays: PlayDocument[],
  svgMap: Record<string, SVGSVGElement | null>,
) {
  const orderedPlays = [...plays].sort((a, b) => a.playNumber - b.playNumber);
  const spacing = getSpacing(playSet.settings.print.unit);
  const pageHeight =
    playSet.settings.print.height * playSet.settings.layout.playsPerPage +
    spacing * Math.max(0, playSet.settings.layout.playsPerPage - 1);

  const doc = createDoc(playSet, pageHeight);

  for (const [index, play] of orderedPlays.entries()) {
    const svg = svgMap[play.id];
    if (!svg) {
      continue;
    }

    const slot = index % playSet.settings.layout.playsPerPage;
    if (index > 0 && slot === 0) {
      doc.addPage([playSet.settings.print.width, pageHeight], playSet.settings.print.width >= pageHeight ? "landscape" : "portrait");
    }

    const y = slot * (playSet.settings.print.height + spacing);
    await drawPlayCard(doc, playSet, play, svg, 0, y);
  }

  doc.save(`${playSet.name.replace(/\s+/g, "-").toLowerCase() || "play-set"}.pdf`);
}

