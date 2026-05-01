export function attachTesseractInput({
  canvas,
  slider,
  state,
  onStartRequested,
  onRestartRequested,
}) {
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      event.preventDefault();

      if (state.matched) {
        onRestartRequested();
        return;
      }

      const point = getCanvasPoint(canvas, state, event);

      if (!isInsidePlayerSide(point, state)) {
        return;
      }

      state.input.dragging = true;
      state.input.pointerId = event.pointerId;
      state.input.lastVector = getArcballVector(point, state);

      canvas.setPointerCapture?.(event.pointerId);
    },
    { passive: false }
  );

  document.addEventListener(
    "pointermove",
    (event) => {
      if (!state.input.dragging || state.matched) {
        return;
      }

      if (state.input.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();

      const point = getCanvasPoint(canvas, state, event);
      const currentVector = getArcballVector(point, state);

      const dragRotation = quaternionFromVectors(
        state.input.lastVector,
        currentVector
      );

      state.current.orientation = normalizeQuaternion(
        multiplyQuaternions(dragRotation, state.current.orientation)
      );

      state.input.lastVector = currentVector;

      onStartRequested();
    },
    { passive: false }
  );

  document.addEventListener("pointerup", (event) => {
    if (state.input.pointerId !== event.pointerId) {
      return;
    }

    endDrag(state);
  });

  document.addEventListener("pointercancel", (event) => {
    if (state.input.pointerId !== event.pointerId) {
      return;
    }

    endDrag(state);
  });

  window.addEventListener("blur", () => {
    endDrag(state);
  });

  slider.addEventListener("pointerdown", () => {
    if (state.matched) {
      onRestartRequested();
    }
  });

  slider.addEventListener("input", () => {
    if (state.matched) {
      return;
    }

    onStartRequested();
    state.current.w = Number(slider.value);
  });
}

function endDrag(state) {
  state.input.dragging = false;
  state.input.pointerId = null;
  state.input.lastVector = null;
}

function getCanvasPoint(canvas, state, event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) * (state.width / rect.width),
    y: (event.clientY - rect.top) * (state.height / rect.height),
  };
}

function isInsidePlayerSide(point, state) {
  return point.x < state.width / 2;
}

function getArcballVector(point, state) {
  const centerX = state.width * 0.25;
  const centerY = state.height * 0.52;
  const radius = Math.min(state.width, state.height) * 0.24;

  const x = (point.x - centerX) / radius;
  const y = (point.y - centerY) / radius;
  const distance = Math.hypot(x, y);

  if (distance < 0.70710678118) {
    return normalizeVector({
      x,
      y,
      z: Math.sqrt(1 - distance * distance),
    });
  }

  return normalizeVector({
    x,
    y,
    z: 0.5 / Math.max(distance, 0.001),
  });
}

function quaternionFromVectors(from, to) {
  const dotValue = clamp(dot(from, to), -1, 1);

  if (dotValue > 0.999999) {
    return {
      x: 0,
      y: 0,
      z: 0,
      w: 1,
    };
  }

  if (dotValue < -0.999999) {
    const axis =
      Math.abs(from.x) < 0.9
        ? normalizeVector(cross(from, { x: 1, y: 0, z: 0 }))
        : normalizeVector(cross(from, { x: 0, y: 1, z: 0 }));

    return {
      x: axis.x,
      y: axis.y,
      z: axis.z,
      w: 0,
    };
  }

  const axis = cross(from, to);

  return normalizeQuaternion({
    x: axis.x,
    y: axis.y,
    z: axis.z,
    w: 1 + dotValue,
  });
}

function multiplyQuaternions(a, b) {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

function normalizeQuaternion(quaternion) {
  const length =
    Math.hypot(quaternion.x, quaternion.y, quaternion.z, quaternion.w) || 1;

  return {
    x: quaternion.x / length,
    y: quaternion.y / length,
    z: quaternion.z / length,
    w: quaternion.w / length,
  };
}

function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}