import { jsPDF } from "jspdf";
import "svg2pdf.js";
import { getPdfFormat } from "./geometry";
import type { PlayDocument } from "./types";

export async function exportPlayToPdf(play: PlayDocument, svg: SVGSVGElement) {
  const format = getPdfFormat(play.printSettings);
  const doc = new jsPDF({
    orientation: play.printSettings.width >= play.printSettings.height ? "landscape" : "portrait",
    unit: play.printSettings.unit,
    format,
  });

  const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  await doc.svg(clonedSvg, {
    x: 0,
    y: 0,
    width: play.printSettings.width,
    height: play.printSettings.height,
  });

  doc.save(`${play.name.replace(/\s+/g, "-").toLowerCase() || "play"}.pdf`);
}
