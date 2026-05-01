const HANDLE_WIDTH_RATIO = 0.34;
const HANDLE_HEIGHT_RATIO = 0.72;

export function renderGame(context, state) {
  clearBoard(context, state);
  drawBoundary(context, state);
  drawPaddle(context, state);
  drawBall(context, state);
}

function clearBoard(context, state) {
  context.clearRect(0, 0, state.width, state.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, state.width, state.height);
}

function drawBoundary(context, state) {
  context.save();

  context.strokeStyle = "rgba(0, 0, 0, 0.08)";
  context.lineWidth = 2;
  roundRect(context, 14, 14, state.width - 28, state.height - 28, 28);
  context.stroke();

  context.restore();
}

function drawPaddle(context, state) {
  const paddle = state.paddle;

  const left = paddle.x - paddle.width / 2;
  const top = paddle.y - paddle.height / 2;

  const radius = Math.max(4, paddle.height / 2);

  context.save();

  context.fillStyle = "#d62828";
  context.strokeStyle = "#961919";
  context.lineWidth = 2;

  roundRect(context, left, top, paddle.width, paddle.height, radius);
  context.fill();
  context.stroke();

  const handleWidth = Math.max(20, paddle.width * HANDLE_WIDTH_RATIO);
  const handleHeight = Math.max(7, paddle.height * HANDLE_HEIGHT_RATIO);

  const handleLeft = paddle.x - handleWidth / 2;
  const handleTop = paddle.y - handleHeight / 2;

  context.fillStyle = "#8b5a2b";
  context.strokeStyle = "#5f3918";
  context.lineWidth = 1;

  roundRect(
    context,
    handleLeft,
    handleTop,
    handleWidth,
    handleHeight,
    Math.max(2, handleHeight / 2)
  );

  context.fill();
  context.stroke();

  context.restore();
}

function drawBall(context, state) {
  const ball = state.ball;

  const gradient = context.createRadialGradient(
    ball.x - ball.radius * 0.35,
    ball.y - ball.radius * 0.35,
    2,
    ball.x,
    ball.y,
    ball.radius
  );

  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.7, "#fafafa");
  gradient.addColorStop(1, "#dfdfdf");

  context.save();

  context.beginPath();
  context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.fill();

  context.lineWidth = 1.4;
  context.strokeStyle = "rgba(0, 0, 0, 0.18)";
  context.stroke();

  context.beginPath();
  context.arc(
    ball.x - ball.radius * 0.22,
    ball.y - ball.radius * 0.22,
    ball.radius * 0.24,
    0,
    Math.PI * 2
  );
  context.fillStyle = "rgba(255, 255, 255, 0.9)";
  context.fill();

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