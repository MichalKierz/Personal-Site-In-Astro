export function attachSwordPlayInput({
  canvas,
  state,
  onStartRequested,
  onInputChanged,
}) {
  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * (state.width / rect.width),
      y: (event.clientY - rect.top) * (state.height / rect.height),
    };
  }

  function findGrabTarget(point) {
    const player = state.player;

    if (!player || player.dead) {
      return null;
    }

    let bestTarget = null;
    let bestDistance = Infinity;

    const head = player.points.head;
    const headDistance = Math.hypot(point.x - head.x, point.y - head.y);

    if (headDistance <= head.radius + 8) {
      bestTarget = {
        kind: "point",
        pointName: "head",
        offsetX: point.x - head.x,
        offsetY: point.y - head.y,
      };
      bestDistance = headDistance;
    }

    player.parts.forEach((part) => {
      const a = player.points[part.a];
      const b = player.points[part.b];
      const closest = closestPointOnSegment(point, a, b);
      const distance = Math.hypot(point.x - closest.x, point.y - closest.y);

      if (distance <= part.radius + 8 && distance < bestDistance) {
        bestTarget = {
          kind: "segment",
          partName: part.name,
          a: part.a,
          b: part.b,
          t: closest.t,
          offsetX: point.x - closest.x,
          offsetY: point.y - closest.y,
        };
        bestDistance = distance;
      }
    });

    return bestTarget;
  }

  function startDrag(event) {
    const point = getCanvasPoint(event);
    const target = findGrabTarget(point);

    if (!target) {
      return;
    }

    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);

    state.input.active = true;
    state.input.pointerId = event.pointerId;
    state.input.x = point.x;
    state.input.y = point.y;
    state.input.drag = target;

    onInputChanged?.();

    if (state.status === "idle") {
      onStartRequested?.();
    }
  }

  function moveDrag(event) {
    if (!state.input.active || state.input.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const point = getCanvasPoint(event);

    state.input.x = point.x;
    state.input.y = point.y;

    onInputChanged?.();
  }

  function endDrag(event) {
    if (!state.input.active || state.input.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    canvas.releasePointerCapture?.(event.pointerId);

    state.input.active = false;
    state.input.pointerId = null;
    state.input.drag = null;

    onInputChanged?.();
  }

  canvas.addEventListener("pointerdown", startDrag);
  canvas.addEventListener("pointermove", moveDrag);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("pointerleave", endDrag);
}

function closestPointOnSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= 0.0001) {
    return {
      x: a.x,
      y: a.y,
      t: 0,
    };
  }

  const t = clamp(
    ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared,
    0,
    1
  );

  return {
    x: a.x + dx * t,
    y: a.y + dy * t,
    t,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}