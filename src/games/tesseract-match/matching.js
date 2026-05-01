import { projectVertex, tesseractEdges, tesseractVertices } from "./geometry.js";

const EDGE_HIGHLIGHT_THRESHOLD = 0.032;
const EDGE_CLOSE_THRESHOLD = 0.052;

export function getMatchInfo(current, target) {
  const currentView = buildProjectedView(current);
  const targetView = buildProjectedView(target);

  const edgeResult = matchVisibleEdges(currentView.edges, targetView.edges);
  const pointScore = getBidirectionalPointScore(
    currentView.points,
    targetView.points
  );

  const ready =
    edgeResult.matchedCount === tesseractEdges.length &&
    edgeResult.averageCost < 0.026 &&
    edgeResult.maxCost < 0.045 &&
    pointScore < 0.035;

  const close =
    edgeResult.ratio >= 0.78 &&
    edgeResult.averageCost < 0.045 &&
    pointScore < 0.06;

  return {
    ready,
    close,
    ratio: edgeResult.ratio,
    averageCost: edgeResult.averageCost,
    maxCost: edgeResult.maxCost,
    pointScore,
    matchedCurrentEdges: edgeResult.matchedCurrentEdges,
    matchedTargetEdges: edgeResult.matchedTargetEdges,
  };
}

function buildProjectedView(rotation) {
  const rawPoints = tesseractVertices.map((vertex) =>
    projectVertex(vertex, rotation)
  );

  const points = normalizePoints(rawPoints);

  const edges = tesseractEdges.map(([a, b], index) => {
    const start = points[a];
    const end = points[b];

    return {
      index,
      ax: start.x,
      ay: start.y,
      bx: end.x,
      by: end.y,
      mx: (start.x + end.x) / 2,
      my: (start.y + end.y) / 2,
      length: Math.hypot(end.x - start.x, end.y - start.y),
      angle: normalizeVisualAngle(Math.atan2(end.y - start.y, end.x - start.x)),
    };
  });

  return {
    points,
    edges,
  };
}

function normalizePoints(points) {
  const bounds = getBounds(points);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const scale = Math.max(bounds.width, bounds.height, 0.001);

  return points.map((point) => ({
    x: (point.x - centerX) / scale,
    y: (point.y - centerY) / scale,
  }));
}

function matchVisibleEdges(currentEdges, targetEdges) {
  const candidates = [];

  currentEdges.forEach((currentEdge) => {
    targetEdges.forEach((targetEdge) => {
      const cost = getEdgeDistance(currentEdge, targetEdge);

      if (cost <= EDGE_CLOSE_THRESHOLD) {
        candidates.push({
          currentIndex: currentEdge.index,
          targetIndex: targetEdge.index,
          cost,
        });
      }
    });
  });

  candidates.sort((a, b) => a.cost - b.cost);

  const usedCurrent = new Set();
  const usedTarget = new Set();
  const matchedCurrentEdges = new Set();
  const matchedTargetEdges = new Set();
  const acceptedCosts = [];

  candidates.forEach((candidate) => {
    if (usedCurrent.has(candidate.currentIndex)) {
      return;
    }

    if (usedTarget.has(candidate.targetIndex)) {
      return;
    }

    usedCurrent.add(candidate.currentIndex);
    usedTarget.add(candidate.targetIndex);

    if (candidate.cost <= EDGE_HIGHLIGHT_THRESHOLD) {
      matchedCurrentEdges.add(candidate.currentIndex);
      matchedTargetEdges.add(candidate.targetIndex);
      acceptedCosts.push(candidate.cost);
    }
  });

  const matchedCount = matchedCurrentEdges.size;
  const ratio = matchedCount / tesseractEdges.length;

  const averageCost =
    acceptedCosts.length > 0
      ? acceptedCosts.reduce((sum, cost) => sum + cost, 0) / acceptedCosts.length
      : Infinity;

  const maxCost =
    acceptedCosts.length > 0 ? Math.max(...acceptedCosts) : Infinity;

  return {
    matchedCount,
    ratio,
    averageCost,
    maxCost,
    matchedCurrentEdges,
    matchedTargetEdges,
  };
}

function getEdgeDistance(a, b) {
  const direct =
    Math.hypot(a.ax - b.ax, a.ay - b.ay) +
    Math.hypot(a.bx - b.bx, a.by - b.by);

  const reversed =
    Math.hypot(a.ax - b.bx, a.ay - b.by) +
    Math.hypot(a.bx - b.ax, a.by - b.ay);

  const endpointCost = Math.min(direct, reversed) * 0.5;
  const midpointCost = Math.hypot(a.mx - b.mx, a.my - b.my);
  const lengthCost = Math.abs(a.length - b.length);
  const angleCost = getAngleDistance(a.angle, b.angle) / Math.PI;

  return (
    endpointCost * 0.62 +
    midpointCost * 0.2 +
    lengthCost * 0.1 +
    angleCost * 0.08
  );
}

function getBidirectionalPointScore(currentPoints, targetPoints) {
  return Math.max(
    getPointScore(currentPoints, targetPoints),
    getPointScore(targetPoints, currentPoints)
  );
}

function getPointScore(sourcePoints, targetPoints) {
  const total = sourcePoints.reduce((sum, point) => {
    let best = Infinity;

    targetPoints.forEach((targetPoint) => {
      const distance = Math.hypot(
        point.x - targetPoint.x,
        point.y - targetPoint.y
      );

      best = Math.min(best, distance);
    });

    return sum + best;
  }, 0);

  return total / sourcePoints.length;
}

function getAngleDistance(a, b) {
  const distance = Math.abs(a - b) % Math.PI;

  return Math.min(distance, Math.PI - distance);
}

function normalizeVisualAngle(angle) {
  let value = angle % Math.PI;

  if (value < 0) {
    value += Math.PI;
  }

  return value;
}

function getBounds(points) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}