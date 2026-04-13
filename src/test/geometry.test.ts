import {
  buildSmoothPathData,
  clientToBoardPoint,
  getPdfFormat,
  getPreviewAspectRatio,
  processFreehandStroke,
} from "../lib/geometry";
import { BOARD_LAYOUT } from "../lib/playbook";

describe("geometry helpers", () => {
  it("converts screen coordinates into board coordinates", () => {
    expect(
      clientToBoardPoint(600, 400, {
        left: 0,
        top: 0,
        width: 1200,
        height: 800,
      }),
    ).toEqual({ x: BOARD_LAYOUT.width / 2, y: BOARD_LAYOUT.height / 2 });
  });

  it("calculates preview ratio and pdf sizing from print settings", () => {
    const printSettings = { presetId: null, width: 3.5, height: 1.25, unit: "in" as const };
    expect(getPreviewAspectRatio(printSettings)).toBeCloseTo(2.8);
    expect(getPdfFormat(printSettings)).toEqual([3.5, 1.25]);
  });

  it("smooths and simplifies freehand strokes while preserving endpoints", () => {
    const rawStroke = [
      { x: 10, y: 10 },
      { x: 11, y: 10.8 },
      { x: 12, y: 9.4 },
      { x: 13, y: 10.5 },
      { x: 16, y: 12.8 },
      { x: 20, y: 16 },
    ];

    const processedStroke = processFreehandStroke(rawStroke);

    expect(processedStroke[0]).toEqual(rawStroke[0]);
    expect(processedStroke[processedStroke.length - 1]).toEqual(rawStroke[rawStroke.length - 1]);
    expect(processedStroke.length).toBeLessThan(rawStroke.length);
    expect(processedStroke.length).toBeGreaterThanOrEqual(2);
  });

  it("builds curved svg path data for gentle turns", () => {
    expect(
      buildSmoothPathData([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 2 },
        { x: 30, y: 5 },
      ]),
    ).toBe("M 0 0 Q 10 0 15 1 Q 20 2 30 5");
  });

  it("preserves sharp corners in svg path data", () => {
    expect(
      buildSmoothPathData([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 10 },
        { x: 30, y: 10 },
      ]),
    ).toBe("M 0 0 L 10 0 L 20 10 L 30 10");
  });
});
