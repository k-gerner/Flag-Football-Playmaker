import { clientToBoardPoint, getPdfFormat, getPreviewAspectRatio } from "../lib/geometry";

describe("geometry helpers", () => {
  it("converts screen coordinates into board coordinates", () => {
    expect(
      clientToBoardPoint(500, 700, {
        left: 0,
        top: 0,
        width: 1000,
        height: 1400,
      }),
    ).toEqual({ x: 50, y: 70 });
  });

  it("calculates preview ratio and pdf sizing from print settings", () => {
    const printSettings = { presetId: null, width: 3.5, height: 1.25, unit: "in" as const };
    expect(getPreviewAspectRatio(printSettings)).toBeCloseTo(2.8);
    expect(getPdfFormat(printSettings)).toEqual([3.5, 1.25]);
  });
});
