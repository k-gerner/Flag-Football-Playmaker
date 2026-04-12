import { clientToBoardPoint, getPdfFormat, getPreviewAspectRatio } from "../lib/geometry";
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
});
