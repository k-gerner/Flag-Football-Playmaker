import { BOARD_LAYOUT } from "./playbook";
import type { FieldLayout, Point, PrintSettings } from "./types";

export function clientToBoardPoint(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  layout: FieldLayout = BOARD_LAYOUT,
): Point {
  const x = ((clientX - rect.left) / rect.width) * layout.width;
  const y = ((clientY - rect.top) / rect.height) * layout.height;

  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  };
}

export function getPreviewAspectRatio(printSettings: PrintSettings) {
  return printSettings.width / printSettings.height;
}

export function getPdfFormat(printSettings: PrintSettings): [number, number] {
  return [printSettings.width, printSettings.height];
}
