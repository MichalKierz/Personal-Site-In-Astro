export function renderGame(context, state) {
  clearBoard(context, state);
  drawBoundary(context, state);
  drawBodies(context, state.enemies);
  drawBodies(context, [state.player]);
}

function clearBoard(context, state) {
  context.clearRect(0, 0, state.width, state.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, state.width, state.height);
}

function drawBoundary(context, state) {
  context.save();
  context.strokeStyle = "rgba(0, 0, 0, 0.07)";
  context.lineWidth = 2;
  roundRect(context, 14, 14, state.width - 28, state.height - 28, 28);
  context.stroke();
  context.restore();
}

function drawBodies(context, bodies) {
  bodies.filter(Boolean).forEach((body) => {
    if (body.dead) {
      return;
    }

    context.save();
    context.globalAlpha = body.alpha;
    drawBody(context, body);
    drawHead(context, body);
    drawSword(context, body);
    context.restore();
  });
}

function drawBody(context, body) {
  const order = [
    "leftThigh",
    "rightThigh",
    "leftLowerLeg",
    "rightLowerLeg",
    "torso",
    "leftUpperArm",
    "leftForearm",
    "rightUpperArm",
    "rightForearm",
  ];

  order.forEach((partName) => {
    const part = body.parts.find((item) => item.name === partName);

    if (!part) {
      return;
    }

    drawSeparatedPart(
      context,
      body.points[part.a],
      body.points[part.b],
      part.radius,
      body.colors.stroke,
      body.colors.fill,
      part.startGap,
      part.endGap
    );
  });
}

function drawHead(context, body) {
  const head = body.points.head;

  context.save();
  context.fillStyle = body.colors.fill;
  context.strokeStyle = body.colors.stroke;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(head.x, head.y, head.radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawSeparatedPart(
  context,
  a,
  b,
  radius,
  strokeColor,
  fillColor,
  startGap = 0,
  endGap = 0
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);

  if (length < 0.0001) {
    return;
  }

  const ux = dx / length;
  const uy = dy / length;
  const startTrim = Math.min(radius * 0.28 + startGap, length * 0.26);
  const endTrim = Math.min(radius * 0.28 + endGap, length * 0.26);

  const start = {
    x: a.x + ux * startTrim,
    y: a.y + uy * startTrim,
  };

  const end = {
    x: b.x - ux * endTrim,
    y: b.y - uy * endTrim,
  };

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";

  context.strokeStyle = strokeColor;
  context.lineWidth = radius * 2 + 1.8;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();

  context.strokeStyle = fillColor;
  context.lineWidth = radius * 2;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();

  context.restore();
}

function drawSword(context, body) {
  const hand = body.points[body.weaponHand];
  const tip = body.points[body.swordTip];
  const dx = tip.x - hand.x;
  const dy = tip.y - hand.y;
  const length = Math.hypot(dx, dy);

  if (length < 0.0001) {
    return;
  }

  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;

  const handleEnd = {
    x: hand.x - ux * 11,
    y: hand.y - uy * 11,
  };

  const guardA = {
    x: hand.x + px * 7.5,
    y: hand.y + py * 7.5,
  };

  const guardB = {
    x: hand.x - px * 7.5,
    y: hand.y - py * 7.5,
  };

  const bladeStart = {
    x: hand.x + ux * 3,
    y: hand.y + uy * 3,
  };

  const bladeBaseA = {
    x: bladeStart.x + px * 2.5,
    y: bladeStart.y + py * 2.5,
  };

  const bladeBaseB = {
    x: bladeStart.x - px * 2.5,
    y: bladeStart.y - py * 2.5,
  };

  const bladeMid = {
    x: hand.x + ux * (length * 0.78),
    y: hand.y + uy * (length * 0.78),
  };

  const bladeMidA = {
    x: bladeMid.x + px * 1.35,
    y: bladeMid.y + py * 1.35,
  };

  const bladeMidB = {
    x: bladeMid.x - px * 1.35,
    y: bladeMid.y - py * 1.35,
  };

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";

  context.strokeStyle = "rgba(28, 28, 28, 0.72)";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(handleEnd.x, handleEnd.y);
  context.lineTo(hand.x, hand.y);
  context.stroke();

  context.strokeStyle = body.colors.stroke;
  context.lineWidth = 3.1;
  context.beginPath();
  context.moveTo(guardA.x, guardA.y);
  context.lineTo(guardB.x, guardB.y);
  context.stroke();

  context.fillStyle = "#eef2f6";
  context.strokeStyle = "rgba(55, 55, 55, 0.48)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(bladeBaseA.x, bladeBaseA.y);
  context.lineTo(bladeMidA.x, bladeMidA.y);
  context.lineTo(tip.x, tip.y);
  context.lineTo(bladeMidB.x, bladeMidB.y);
  context.lineTo(bladeBaseB.x, bladeBaseB.y);
  context.closePath();
  context.fill();
  context.stroke();

  context.restore();
}

function roundRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}