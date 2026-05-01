const BEST_TIME_KEY = "tesseract-match-best-time";

export function createTesseractMatchState(canvas) {
  const width = canvas.width;
  const height = canvas.height;

  return {
    width,
    height,

    time: 0,
    best: Number(localStorage.getItem(BEST_TIME_KEY) || 0),

    current: createStartRotation(),
    target: createTargetRotation(),

    running: false,
    matched: false,
    matchedAt: 0,
    canRestartAt: 0,
    matchReadySince: 0,
    matchHoldDuration: 500,
    lastTime: performance.now(),

    input: {
      dragging: false,
      pointerId: null,
      lastVector: null,
    },
  };
}

export function startChallenge(state) {
  if (state.running || state.matched) {
    return;
  }

  state.running = true;
  state.lastTime = performance.now();
}

export function nextChallenge(state) {
  state.time = 0;
  state.current = createStartRotation();
  state.target = createTargetRotation();
  state.running = false;
  state.matched = false;
  state.matchedAt = 0;
  state.canRestartAt = 0;
  state.matchReadySince = 0;
  state.lastTime = performance.now();

  state.input.dragging = false;
  state.input.pointerId = null;
  state.input.lastVector = null;
}

export function markChallengeMatched(state) {
  state.running = false;
  state.matched = true;
  state.matchedAt = performance.now();
  state.canRestartAt = state.matchedAt + 1000;
  state.matchReadySince = 0;

  if (state.best === 0 || state.time < state.best) {
    state.best = state.time;
    localStorage.setItem(BEST_TIME_KEY, String(state.best));
  }
}

function createStartRotation() {
  return {
    orientation: normalizeQuaternion({
      x: randomBetween(-0.08, 0.08),
      y: randomBetween(-0.08, 0.08),
      z: randomBetween(-0.08, 0.08),
      w: 1,
    }),
    w: 0,
  };
}

function createTargetRotation() {
  return {
    orientation: randomQuaternion(),
    w: randomStrongFourthRotation(),
  };
}

function randomStrongFourthRotation() {
  const direction = Math.random() < 0.5 ? -1 : 1;

  return randomBetween(0.9, 1.55) * direction;
}

function randomQuaternion() {
  const axis = normalizeVector({
    x: randomBetween(-1, 1),
    y: randomBetween(-1, 1),
    z: randomBetween(-1, 1),
  });

  const angle = randomBetween(-1.4, 1.4);
  const half = angle / 2;
  const sin = Math.sin(half);

  return normalizeQuaternion({
    x: axis.x * sin,
    y: axis.y * sin,
    z: axis.z * sin,
    w: Math.cos(half),
  });
}

function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
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

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}