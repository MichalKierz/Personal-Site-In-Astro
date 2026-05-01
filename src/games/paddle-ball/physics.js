const MAX_FRAME_SECONDS = 0.033;
const MAX_SIMULATION_STEP = 0.006;
const MAX_PADDLE_STEP = 8;
const MAX_SUBSTEPS = 72;

export function updatePhysics(state, deltaSeconds, events) {
  const safeDeltaSeconds = Math.min(MAX_FRAME_SECONDS, deltaSeconds);

  const paddleMoveDistance = Math.hypot(
    state.paddle.targetX - state.paddle.x,
    state.paddle.targetY - state.paddle.y
  );

  const timeSubsteps = Math.ceil(safeDeltaSeconds / MAX_SIMULATION_STEP);
  const paddleSubsteps = Math.ceil(paddleMoveDistance / MAX_PADDLE_STEP);

  const substeps = Math.min(
    MAX_SUBSTEPS,
    Math.max(1, timeSubsteps, paddleSubsteps)
  );

  const step = safeDeltaSeconds / substeps;

  for (let index = 0; index < substeps; index += 1) {
    updatePaddle(state, step);
    updateBall(state, step);
    resolveWallCollisions(state);
    resolvePaddleCollision(state, events);

    if (state.hitCooldown > 0) {
      state.hitCooldown = Math.max(0, state.hitCooldown - step);
    }

    if (state.ball.y - state.ball.radius > state.height + 32) {
      events.onGameOver?.();
      return;
    }

    if (!state.running) {
      return;
    }
  }
}

function updatePaddle(state, deltaSeconds) {
  const paddle = state.paddle;

  paddle.previousX = paddle.x;
  paddle.previousY = paddle.y;

  const follow = 1 - Math.exp(-38 * deltaSeconds);

  paddle.x += (paddle.targetX - paddle.x) * follow;
  paddle.y += (paddle.targetY - paddle.y) * follow;

  const halfWidth = paddle.width / 2;
  const halfHeight = paddle.height / 2;

  paddle.x = clamp(paddle.x, halfWidth, state.width - halfWidth);
  paddle.y = clamp(paddle.y, halfHeight, state.height - halfHeight);

  paddle.velocityX =
    (paddle.x - paddle.previousX) / Math.max(deltaSeconds, 0.001);

  paddle.velocityY =
    (paddle.y - paddle.previousY) / Math.max(deltaSeconds, 0.001);

  const capped = capVector(
    paddle.velocityX,
    paddle.velocityY,
    state.physics.maxPaddleSpeed
  );

  paddle.velocityX = capped.x;
  paddle.velocityY = capped.y;
}

function updateBall(state, deltaSeconds) {
  const ball = state.ball;
  const physics = state.physics;

  ball.velocityY += physics.gravity * deltaSeconds;
  ball.velocityX += ball.spin * physics.magnusForce * deltaSeconds;

  const drag = 1 / (1 + physics.airDrag * deltaSeconds);

  ball.velocityX *= drag;
  ball.velocityY *= drag;
  ball.spin *= 1 / (1 + physics.spinDrag * deltaSeconds);

  const cappedVelocity = capVector(
    ball.velocityX,
    ball.velocityY,
    physics.maxBallSpeed
  );

  ball.velocityX = cappedVelocity.x;
  ball.velocityY = cappedVelocity.y;

  ball.x += ball.velocityX * deltaSeconds;
  ball.y += ball.velocityY * deltaSeconds;
}

function resolveWallCollisions(state) {
  const ball = state.ball;
  const bounce = state.physics.wallBounce;

  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.velocityX = Math.abs(ball.velocityX) * bounce;
    ball.spin *= 0.82;
  }

  if (ball.x + ball.radius > state.width) {
    ball.x = state.width - ball.radius;
    ball.velocityX = -Math.abs(ball.velocityX) * bounce;
    ball.spin *= 0.82;
  }

  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.velocityY = Math.abs(ball.velocityY) * bounce;
    ball.spin *= 0.82;
  }
}

function resolvePaddleCollision(state, events) {
  const ball = state.ball;
  const paddle = state.paddle;
  const physics = state.physics;

  const collision = getCircleRectCollision({
    circleX: ball.x,
    circleY: ball.y,
    circleRadius: ball.radius,
    rectX: paddle.x,
    rectY: paddle.y,
    rectWidth: paddle.width,
    rectHeight: paddle.height,
  });

  if (!collision) {
    return;
  }

  ball.x += collision.normalX * collision.penetration;
  ball.y += collision.normalY * collision.penetration;

  const relativeVelocityX = ball.velocityX - paddle.velocityX;
  const relativeVelocityY = ball.velocityY - paddle.velocityY;

  const incomingSpeed =
    relativeVelocityX * collision.normalX +
    relativeVelocityY * collision.normalY;

  if (incomingSpeed < 0) {
    const reflectedRelativeX =
      relativeVelocityX -
      (1 + physics.paddleBounce) * incomingSpeed * collision.normalX;

    const reflectedRelativeY =
      relativeVelocityY -
      (1 + physics.paddleBounce) * incomingSpeed * collision.normalY;

    ball.velocityX = reflectedRelativeX + paddle.velocityX;
    ball.velocityY = reflectedRelativeY + paddle.velocityY;
  } else {
    ball.velocityX += paddle.velocityX * 0.22;
    ball.velocityY += paddle.velocityY * 0.22;
  }

  const tangentX = -collision.normalY;
  const tangentY = collision.normalX;

  const paddleTangentSpeed =
    paddle.velocityX * tangentX + paddle.velocityY * tangentY;

  ball.velocityX += tangentX * paddleTangentSpeed * 0.18;
  ball.velocityY += tangentY * paddleTangentSpeed * 0.18;

  ball.spin += paddleTangentSpeed * 0.028;
  ball.spin = clamp(ball.spin, -26, 26);

  const speed = Math.hypot(ball.velocityX, ball.velocityY);

  if (speed < physics.minBallSpeed) {
    const scale = physics.minBallSpeed / Math.max(speed, 0.001);

    ball.velocityX *= scale;
    ball.velocityY *= scale;
  }

  const cappedVelocity = capVector(
    ball.velocityX,
    ball.velocityY,
    physics.maxBallSpeed
  );

  ball.velocityX = cappedVelocity.x;
  ball.velocityY = cappedVelocity.y;

  if (state.hitCooldown <= 0) {
    state.hitCooldown = 0.1;
    events.onHit?.();
  }
}

function getCircleRectCollision({
  circleX,
  circleY,
  circleRadius,
  rectX,
  rectY,
  rectWidth,
  rectHeight,
}) {
  const left = rectX - rectWidth / 2;
  const right = rectX + rectWidth / 2;
  const top = rectY - rectHeight / 2;
  const bottom = rectY + rectHeight / 2;

  const closestX = clamp(circleX, left, right);
  const closestY = clamp(circleY, top, bottom);

  let normalX = circleX - closestX;
  let normalY = circleY - closestY;

  let distance = Math.hypot(normalX, normalY);

  if (distance > circleRadius) {
    return null;
  }

  if (distance < 0.0001) {
    const distances = [
      { value: Math.abs(circleX - left), x: -1, y: 0 },
      { value: Math.abs(right - circleX), x: 1, y: 0 },
      { value: Math.abs(circleY - top), x: 0, y: -1 },
      { value: Math.abs(bottom - circleY), x: 0, y: 1 },
    ].sort((a, b) => a.value - b.value);

    normalX = distances[0].x;
    normalY = distances[0].y;
    distance = 0;
  } else {
    normalX /= distance;
    normalY /= distance;
  }

  return {
    normalX,
    normalY,
    penetration: circleRadius - distance,
  };
}

function capVector(x, y, maxLength) {
  const length = Math.hypot(x, y);

  if (length <= maxLength || length === 0) {
    return { x, y };
  }

  const scale = maxLength / length;

  return {
    x: x * scale,
    y: y * scale,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}