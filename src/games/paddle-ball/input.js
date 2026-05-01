export function attachPaddleInput({
  canvas,
  state,
  onStartRequested,
  onInputChanged,
}) {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * (state.width / rect.width),
      y: (event.clientY - rect.top) * (state.height / rect.height),
    };
  }

  function isPointOnPaddle(point) {
    const paddle = state.paddle;

    const grabPaddingX = 26;
    const grabPaddingY = 24;

    const left = paddle.x - paddle.width / 2 - grabPaddingX;
    const right = paddle.x + paddle.width / 2 + grabPaddingX;
    const top = paddle.y - paddle.height / 2 - grabPaddingY;
    const bottom = paddle.y + paddle.height / 2 + grabPaddingY;

    return (
      point.x >= left &&
      point.x <= right &&
      point.y >= top &&
      point.y <= bottom
    );
  }

  function setPaddleTarget(point, { snap = false } = {}) {
    const paddle = state.paddle;

    const halfWidth = paddle.width / 2;
    const halfHeight = paddle.height / 2;

    paddle.targetX = clamp(point.x, halfWidth, state.width - halfWidth);
    paddle.targetY = clamp(point.y, halfHeight, state.height - halfHeight);

    if (snap || !state.running) {
      paddle.x = paddle.targetX;
      paddle.y = paddle.targetY;
      paddle.previousX = paddle.x;
      paddle.previousY = paddle.y;
    }

    onInputChanged?.();
  }

  canvas.addEventListener(
    "pointerdown",
    (event) => {
      event.preventDefault();

      const point = getCanvasPoint(event);

      if (!isPointOnPaddle(point)) {
        return;
      }

      canvas.setPointerCapture?.(event.pointerId);

      state.paddle.isGrabbed = true;
      setPaddleTarget(point, { snap: true });

      if (!state.running) {
        onStartRequested();
      }
    },
    { passive: false }
  );

  canvas.addEventListener(
    "pointermove",
    (event) => {
      event.preventDefault();

      if (!state.paddle.isGrabbed) {
        return;
      }

      setPaddleTarget(getCanvasPoint(event));
    },
    { passive: false }
  );

  canvas.addEventListener("pointerup", () => {
    state.paddle.isGrabbed = false;
  });

  canvas.addEventListener("pointercancel", () => {
    state.paddle.isGrabbed = false;
  });

  window.addEventListener("keydown", (event) => {
    const paddle = state.paddle;
    const step = event.shiftKey ? 72 : 42;

    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "ArrowUp" &&
      event.key !== "ArrowDown"
    ) {
      return;
    }

    event.preventDefault();

    if (!state.running) {
      onStartRequested();
    }

    if (event.key === "ArrowLeft") {
      paddle.targetX -= step;
    }

    if (event.key === "ArrowRight") {
      paddle.targetX += step;
    }

    if (event.key === "ArrowUp") {
      paddle.targetY -= step;
    }

    if (event.key === "ArrowDown") {
      paddle.targetY += step;
    }

    const halfWidth = paddle.width / 2;
    const halfHeight = paddle.height / 2;

    paddle.targetX = clamp(paddle.targetX, halfWidth, state.width - halfWidth);
    paddle.targetY = clamp(
      paddle.targetY,
      halfHeight,
      state.height - halfHeight
    );

    onInputChanged?.();
  });
}