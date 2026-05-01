const BEST_SCORE_KEY = "paddle-ball-best-score";

export function createPaddleBallState(canvas) {
  const width = canvas.width;
  const height = canvas.height;

  return {
    width,
    height,

    running: false,
    lastTime: 0,

    score: 0,
    best: Number(localStorage.getItem(BEST_SCORE_KEY) || 0),

    hitCooldown: 0,

    physics: {
      gravity: 2000,
      airDrag: 0.035,
      spinDrag: 1.45,
      magnusForce: 50,
      wallBounce: 0.9,
      paddleBounce: 0.9,
      minBallSpeed: 180,
      maxBallSpeed: 1080,
      maxPaddleSpeed: 2800,
    },

    paddle: {
      x: width / 2,
      y: height * 0.78,
      previousX: width / 2,
      previousY: height * 0.78,
      targetX: width / 2,
      targetY: height * 0.78,
      velocityX: 0,
      velocityY: 0,

      width: 80,
      height: 12,

      isGrabbed: false,
    },

    ball: {
      x: width / 2,
      y: height / 2,
      radius: 8,
      velocityX: 0,
      velocityY: 0,
      spin: 0,
    },
  };
}

export function resetRound(state) {
  state.running = false;
  state.score = 0;
  state.hitCooldown = 0.18;

  const paddle = state.paddle;
  const ball = state.ball;

  paddle.x = state.width / 2;
  paddle.y = state.height * 0.78;
  paddle.targetX = paddle.x;
  paddle.targetY = paddle.y;
  paddle.previousX = paddle.x;
  paddle.previousY = paddle.y;
  paddle.velocityX = 0;
  paddle.velocityY = 0;
  paddle.isGrabbed = false;

  ball.x = state.width / 2;
  ball.y = state.height / 2;
  ball.velocityX = 0;
  ball.velocityY = 0;
  ball.spin = 0;
}

export function startRound(state) {
  state.running = true;
  state.lastTime = performance.now();

  state.ball.x = state.width / 2;
  state.ball.y = state.height / 2;

  const launch = getRandomUpwardLaunch();

  state.ball.velocityX = launch.x;
  state.ball.velocityY = launch.y;
  state.ball.spin = randomBetween(-1.1, 1.1);
}

export function endRound(state) {
  state.running = false;

  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(BEST_SCORE_KEY, String(state.best));
  }
}

function getRandomUpwardLaunch() {
  const speed = randomBetween(360, 520);
  const direction = Math.random() < 0.5 ? -1 : 1;

  const horizontalRatio = randomBetween(0.25, 0.7) * direction;
  const verticalRatio = Math.sqrt(1 - horizontalRatio * horizontalRatio);

  return {
    x: speed * horizontalRatio,
    y: -speed * verticalRatio,
  };
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}