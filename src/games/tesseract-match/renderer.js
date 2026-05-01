import {
  projectVertex,
  tesseractEdges,
  tesseractVertices,
} from "./geometry.js";

import { getMatchInfo } from "./matching.js";

export function renderGame(context, state) {
  context.clearRect(0, 0, state.width, state.height);

  const matchInfo = getMatchInfo(state.current, state.target);

  drawBackground(context, state);

  drawTesseract({
    context,
    state,
    rotation: state.current,
    centerX: state.width * 0.25,
    centerY: state.height * 0.52,
    active: true,
    matchedEdges: matchInfo.matchedCurrentEdges,
  });

  drawTesseract({
    context,
    state,
    rotation: state.target,
    centerX: state.width * 0.75,
    centerY: state.height * 0.52,
    active: false,
    matchedEdges: matchInfo.matchedTargetEdges,
  });
}

function drawBackground(context, state) {
  context.save();

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, state.width, state.height);

  context.strokeStyle = "rgb(0 0 0 / 8%)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(state.width / 2, 0);
  context.lineTo(state.width / 2, state.height);
  context.stroke();

  context.restore();
}

function drawTesseract({
  context,
  state,
  rotation,
  centerX,
  centerY,
  active,
  matchedEdges,
}) {
  const projected = tesseractVertices.map((vertex) =>
    projectVertex(vertex, rotation)
  );

  const size = Math.min(state.width, state.height) * 0.082;

  context.save();
  context.translate(centerX, centerY);
  context.lineCap = "round";
  context.lineJoin = "round";

  drawEdges(context, projected, active, matchedEdges, false, size);
  drawEdges(context, projected, active, matchedEdges, true, size);
  drawPoints(context, projected, active, size);

  context.restore();
}

function drawEdges(context, projected, active, matchedEdges, matchedPass, size) {
  tesseractEdges.forEach(([a, b], index) => {
    const isMatched = matchedEdges?.has(index);

    if (matchedPass !== isMatched) {
      return;
    }

    const start = projected[a];
    const end = projected[b];
    const depth = (start.depth + end.depth) / 2;

    if (isMatched) {
      const depthMix = clamp(0.5 + depth * 0.35, 0, 1);
      const alpha = clamp(0.28 + depthMix * 0.55, 0.24, 0.86);

      const red = Math.round(lerp(150, 24, depthMix));
      const green = Math.round(lerp(215, 180, depthMix));
      const blue = Math.round(lerp(165, 82, depthMix));

      context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
      context.lineWidth = active ? 3.25 : 3;
    } else {
      const alpha = clamp(0.38 + depth * 0.12, 0.26, 0.92);

      context.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
      context.lineWidth = active ? 2.35 : 2.2;
    }

    context.beginPath();
    context.moveTo(start.x * size, start.y * size);
    context.lineTo(end.x * size, end.y * size);
    context.stroke();
  });
}

function drawPoints(context, projected, active, size) {
  projected.forEach((point) => {
    const alpha = clamp(0.5 + point.depth * 0.1, 0.3, 1);

    context.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    context.beginPath();
    context.arc(
      point.x * size,
      point.y * size,
      active ? 2.55 : 2.4,
      0,
      Math.PI * 2
    );
    context.fill();
  });
}

function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}