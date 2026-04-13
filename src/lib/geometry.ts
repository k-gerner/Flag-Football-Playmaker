import { BOARD_LAYOUT } from "./playbook";
import type { FieldLayout, Point, PrintSettings } from "./types";

export const FREEHAND_SAMPLE_MIN_DISTANCE = 1.25;
export const FREEHAND_RESAMPLE_SPACING = 1.6;
export const FREEHAND_SMOOTHING_FACTOR = 0.12;
export const FREEHAND_SMOOTHING_PASSES = 1;
export const FREEHAND_SIMPLIFY_TOLERANCE = 0.22;
export const MIN_FREEHAND_PATH_LENGTH = 6;
export const SHARP_CORNER_ANGLE_THRESHOLD_DEGREES = 135;

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

export function getDistance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

export function getCornerAngleDegrees(previous: Point, current: Point, following: Point) {
  const vectorA = {
    x: previous.x - current.x,
    y: previous.y - current.y,
  };
  const vectorB = {
    x: following.x - current.x,
    y: following.y - current.y,
  };

  const magnitudeA = Math.hypot(vectorA.x, vectorA.y);
  const magnitudeB = Math.hypot(vectorB.x, vectorB.y);
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 180;
  }

  const dotProduct = vectorA.x * vectorB.x + vectorA.y * vectorB.y;
  const cosine = Math.max(-1, Math.min(1, dotProduct / (magnitudeA * magnitudeB)));
  return toDegrees(Math.acos(cosine));
}

export function isSharpCorner(
  previous: Point,
  current: Point,
  following: Point,
  threshold = SHARP_CORNER_ANGLE_THRESHOLD_DEGREES,
) {
  return getCornerAngleDegrees(previous, current, following) <= threshold;
}

export function getPathLength(points: Point[]) {
  if (points.length < 2) {
    return 0;
  }

  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += getDistance(points[index - 1], points[index]);
  }
  return total;
}

export function appendSampledPoint(
  points: Point[],
  point: Point,
  minDistance = FREEHAND_SAMPLE_MIN_DISTANCE,
  force = false,
) {
  if (points.length === 0) {
    return [point];
  }

  const lastPoint = points[points.length - 1];
  if (!force && getDistance(lastPoint, point) < minDistance) {
    return points;
  }

  if (getDistance(lastPoint, point) === 0) {
    return points;
  }

  return [...points, point];
}

export function resampleStroke(points: Point[], spacing = FREEHAND_RESAMPLE_SPACING) {
  if (points.length < 2 || spacing <= 0) {
    return [...points];
  }

  const totalLength = getPathLength(points);
  if (totalLength <= spacing) {
    return [...points];
  }

  const resampled: Point[] = [points[0]];
  let accumulated = 0;
  let nextTarget = spacing;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const segmentLength = getDistance(start, end);

    if (segmentLength === 0) {
      continue;
    }

    while (accumulated + segmentLength >= nextTarget) {
      const ratio = (nextTarget - accumulated) / segmentLength;
      resampled.push({
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      });
      nextTarget += spacing;
    }

    accumulated += segmentLength;
  }

  const lastPoint = points[points.length - 1];
  const lastResampledPoint = resampled[resampled.length - 1];
  if (getDistance(lastResampledPoint, lastPoint) > 0) {
    resampled.push(lastPoint);
  }

  return resampled;
}

export function smoothStroke(
  points: Point[],
  factor = FREEHAND_SMOOTHING_FACTOR,
  passes = FREEHAND_SMOOTHING_PASSES,
) {
  if (points.length < 3 || factor <= 0 || passes <= 0) {
    return [...points];
  }

  let nextPoints = [...points];

  for (let pass = 0; pass < passes; pass += 1) {
    const smoothed = [nextPoints[0]];

    for (let index = 1; index < nextPoints.length - 1; index += 1) {
      const previous = nextPoints[index - 1];
      const current = nextPoints[index];
      const following = nextPoints[index + 1];
      if (isSharpCorner(previous, current, following)) {
        smoothed.push(current);
        continue;
      }

      const midpoint = {
        x: (previous.x + following.x) / 2,
        y: (previous.y + following.y) / 2,
      };

      smoothed.push({
        x: current.x * (1 - factor) + midpoint.x * factor,
        y: current.y * (1 - factor) + midpoint.y * factor,
      });
    }

    smoothed.push(nextPoints[nextPoints.length - 1]);
    nextPoints = smoothed;
  }

  return nextPoints;
}

function getPerpendicularDistance(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return getDistance(point, start);
  }

  const ratio = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const projection = {
    x: start.x + dx * clampedRatio,
    y: start.y + dy * clampedRatio,
  };

  return getDistance(point, projection);
}

function simplifyDouglasPeucker(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) {
    return [...points];
  }

  let maxDistance = 0;
  let splitIndex = 0;

  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = getPerpendicularDistance(points[index], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      splitIndex = index;
    }
  }

  if (maxDistance <= tolerance) {
    return [points[0], points[points.length - 1]];
  }

  const left = simplifyDouglasPeucker(points.slice(0, splitIndex + 1), tolerance);
  const right = simplifyDouglasPeucker(points.slice(splitIndex), tolerance);

  return [...left.slice(0, -1), ...right];
}

export function simplifyStroke(points: Point[], tolerance = FREEHAND_SIMPLIFY_TOLERANCE) {
  if (points.length < 3 || tolerance <= 0) {
    return [...points];
  }

  const simplified = simplifyDouglasPeucker(points, tolerance);
  return points.filter((point, index) => {
    if (index === 0 || index === points.length - 1) {
      return true;
    }

    const keptBySimplifier = simplified.some((item) => item.x === point.x && item.y === point.y);
    if (keptBySimplifier) {
      return true;
    }

    return isSharpCorner(points[index - 1], point, points[index + 1]);
  });
}

export function processFreehandStroke(points: Point[]) {
  if (points.length < 2) {
    return [...points];
  }

  const sampled = points.reduce<Point[]>(
    (result, point, index) =>
      appendSampledPoint(result, point, FREEHAND_SAMPLE_MIN_DISTANCE, index === points.length - 1),
    [],
  );

  if (sampled.length < 2) {
    return sampled;
  }

  const resampled = resampleStroke(sampled, FREEHAND_RESAMPLE_SPACING);
  const smoothed = smoothStroke(resampled, FREEHAND_SMOOTHING_FACTOR, FREEHAND_SMOOTHING_PASSES);
  const simplified = simplifyStroke(smoothed, FREEHAND_SIMPLIFY_TOLERANCE);

  if (simplified.length >= 2) {
    return simplified;
  }

  return [sampled[0], sampled[sampled.length - 1]];
}

function formatCoordinate(value: number) {
  return Number(value.toFixed(3)).toString();
}

export function buildSmoothPathData(points: Point[]) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return `M ${formatCoordinate(points[0].x)} ${formatCoordinate(points[0].y)}`;
  }

  if (points.length === 2) {
    return `M ${formatCoordinate(points[0].x)} ${formatCoordinate(points[0].y)} L ${formatCoordinate(points[1].x)} ${formatCoordinate(points[1].y)}`;
  }

  let pathData = `M ${formatCoordinate(points[0].x)} ${formatCoordinate(points[0].y)}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const isLastControlPoint = index === points.length - 2;
    const cornerIsSharp = isSharpCorner(points[index - 1], current, points[index + 1]);

    if (isLastControlPoint) {
      if (cornerIsSharp) {
        pathData += ` L ${formatCoordinate(current.x)} ${formatCoordinate(current.y)}`;
        pathData += ` L ${formatCoordinate(points[index + 1].x)} ${formatCoordinate(points[index + 1].y)}`;
      } else {
        pathData += ` Q ${formatCoordinate(current.x)} ${formatCoordinate(current.y)} ${formatCoordinate(points[index + 1].x)} ${formatCoordinate(points[index + 1].y)}`;
      }
      break;
    }

    if (cornerIsSharp) {
      pathData += ` L ${formatCoordinate(current.x)} ${formatCoordinate(current.y)}`;
      continue;
    }

    const midpoint = {
      x: (current.x + points[index + 1].x) / 2,
      y: (current.y + points[index + 1].y) / 2,
    };
    pathData += ` Q ${formatCoordinate(current.x)} ${formatCoordinate(current.y)} ${formatCoordinate(midpoint.x)} ${formatCoordinate(midpoint.y)}`;
  }

  return pathData;
}
