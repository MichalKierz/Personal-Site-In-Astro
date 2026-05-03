const BEST_SCORE_KEY = "sword-play-best-score";
const START_MARGIN = 125;

const BODY_COLORS = {
  player: {
    fill: "#1f6df2",
    stroke: "#1143a3",
  },
  enemy: {
    fill: "#e12a2a",
    stroke: "#941818",
  },
};

const PLAYER_OFFSETS = {
  head: [0, -79],
  chest: [0, -62],
  pelvis: [0, 0],
  leftShoulder: [-11, -61],
  rightShoulder: [11, -61],
  leftElbow: [-34, -36],
  leftHand: [-38, -7],
  rightElbow: [56, -61],
  rightHand: [100, -61],
  leftHip: [-10, 0],
  rightHip: [10, 0],
  leftKnee: [-34, 38],
  rightKnee: [34, 38],
  leftFoot: [-16, 76],
  rightFoot: [16, 76],
  swordTip: [176, -61],
};

const ENEMY_OFFSETS = {
  head: [0, -79],
  chest: [0, -62],
  pelvis: [0, 0],
  leftShoulder: [-11, -61],
  rightShoulder: [11, -61],
  leftElbow: [-56, -61],
  leftHand: [-100, -61],
  rightElbow: [34, -36],
  rightHand: [38, -7],
  leftHip: [-10, 0],
  rightHip: [10, 0],
  leftKnee: [-34, 38],
  rightKnee: [34, 38],
  leftFoot: [-16, 76],
  rightFoot: [16, 76],
  swordTip: [-176, -61],
};

const POINT_SPECS = {
  head: { radius: 11.5, mass: 2.1, poseWeight: 1.55 },
  chest: { radius: 4, mass: 4.2, poseWeight: 1.42 },
  pelvis: { radius: 4.5, mass: 5, poseWeight: 1.42 },
  leftShoulder: { radius: 3.5, mass: 1.6, poseWeight: 1.05 },
  rightShoulder: { radius: 3.5, mass: 1.6, poseWeight: 1.05 },
  leftElbow: { radius: 3.5, mass: 1.22, poseWeight: 0.28 },
  rightElbow: { radius: 3.5, mass: 1.22, poseWeight: 0.28 },
  leftHand: { radius: 4, mass: 1.06, poseWeight: 0.22 },
  rightHand: { radius: 4, mass: 1.06, poseWeight: 0.22 },
  leftHip: { radius: 3.5, mass: 1.95, poseWeight: 1.08 },
  rightHip: { radius: 3.5, mass: 1.95, poseWeight: 1.08 },
  leftKnee: { radius: 3.5, mass: 1.5, poseWeight: 0.08 },
  rightKnee: { radius: 3.5, mass: 1.5, poseWeight: 0.08 },
  leftFoot: { radius: 4.5, mass: 2.4, poseWeight: 0.18 },
  rightFoot: { radius: 4.5, mass: 2.4, poseWeight: 0.18 },
  swordTip: { radius: 3, mass: 0.8, poseWeight: 0.62 },
};

const BODY_PARTS = [
  { name: "torso", a: "chest", b: "pelvis", radius: 5.4, startGap: 0.2, endGap: 0.6 },
  { name: "leftUpperArm", a: "leftShoulder", b: "leftElbow", radius: 3.5, startGap: 2.8, endGap: 1.1 },
  { name: "leftForearm", a: "leftElbow", b: "leftHand", radius: 3.2, startGap: 1.2, endGap: 0.8 },
  { name: "rightUpperArm", a: "rightShoulder", b: "rightElbow", radius: 3.5, startGap: 2.8, endGap: 1.1 },
  { name: "rightForearm", a: "rightElbow", b: "rightHand", radius: 3.2, startGap: 1.2, endGap: 0.8 },
  { name: "leftThigh", a: "leftHip", b: "leftKnee", radius: 3.9, startGap: 2.7, endGap: 1.2 },
  { name: "leftLowerLeg", a: "leftKnee", b: "leftFoot", radius: 3.5, startGap: 1.2, endGap: 0.8 },
  { name: "rightThigh", a: "rightHip", b: "rightKnee", radius: 3.9, startGap: 2.7, endGap: 1.2 },
  { name: "rightLowerLeg", a: "rightKnee", b: "rightFoot", radius: 3.5, startGap: 1.2, endGap: 0.8 },
];

const DISTANCE_CONSTRAINTS = [
  ["head", "chest", 1],
  ["head", "leftShoulder", 0.98],
  ["head", "rightShoulder", 0.98],
  ["chest", "pelvis", 1],
  ["chest", "leftShoulder", 1],
  ["chest", "rightShoulder", 1],
  ["pelvis", "leftHip", 1],
  ["pelvis", "rightHip", 1],
  ["leftShoulder", "rightShoulder", 1],
  ["leftHip", "rightHip", 1],
  ["leftShoulder", "leftElbow", 0.98],
  ["leftElbow", "leftHand", 0.98],
  ["rightShoulder", "rightElbow", 0.98],
  ["rightElbow", "rightHand", 0.98],
  ["leftHip", "leftKnee", 0.98],
  ["leftKnee", "leftFoot", 0.98],
  ["rightHip", "rightKnee", 0.98],
  ["rightKnee", "rightFoot", 0.98],
  ["leftShoulder", "leftHip", 0.84],
  ["rightShoulder", "rightHip", 0.84],
  ["leftShoulder", "rightHip", 0.72],
  ["rightShoulder", "leftHip", 0.72],
  ["leftElbow", "chest", 0.02],
  ["rightElbow", "chest", 0.02],
  ["leftHand", "leftShoulder", 0.01],
  ["rightHand", "rightShoulder", 0.01],
  ["leftKnee", "pelvis", 0],
  ["rightKnee", "pelvis", 0],
  ["leftFoot", "leftHip", 0],
  ["rightFoot", "rightHip", 0],
  ["leftKnee", "rightKnee", 0.04],
  ["leftFoot", "rightFoot", 0.04],
  ["leftFoot", "rightHip", 0],
  ["rightFoot", "leftHip", 0],
];

export function createSwordPlayState(canvas) {
  const width = canvas.width;
  const height = canvas.height;

  return {
    width,
    height,
    status: "idle",
    lastTime: 0,
    score: 0,
    best: Number(localStorage.getItem(BEST_SCORE_KEY) || 0),
    player: null,
    enemies: [],
    nextEnemyId: 1,
    spawnTimer: 0,
    resetTimer: 0,
    input: {
      active: false,
      pointerId: null,
      x: 0,
      y: 0,
      drag: null,
    },
    physics: {
      gravity: 145,
      highGravity: 1850,
      highGravityStart: height - 118,
      highGravityEnd: 55,
      highGravityPower: 0.68,
      standingStrength: 78,
      standingActiveStrength: 14,
      standingDamping: 15.5,
      standingActiveDamping: 7.2,
      damping: 0.993,
      floor: height - 58,
      wallPadding: 24,
      minStep: 1 / 150,
      maxSubsteps: 9,
      iterations: 32,
      playerPoseStrength: 14,
      playerPoseDamping: 7.8,
      enemyPoseStrength: 24,
      enemyPoseDamping: 9.2,
      enemyCoreStrength: 78,
      enemyCoreDamping: 14,
      enemyArmPoseStrength: 46,
      enemyThrustEnabled: true,
      enemyUpperArmThrustEnabled: true,
      enemyElbowThrustEnabled: true,
      enemyThrustStartScore: 0,
      enemyThrustDepth: 46,
      enemyThrustSpeed: 1.45,
      enemyThrustSwordReach: 48,
      enemyVerticalSwingDown: 86,
      enemyVerticalSwingUp: 185,
      enemyVerticalAngleDown: 0.72,
      enemyVerticalAngleUp: 1.18,
      enemyUpperArmAngleMin: 0.001,
      enemyUpperArmAngleMax: 1.7453,
      enemyElbowExtensionPower: 0.42,
      enemySwordBaseLength: 78,
      dragStrength: 110,
      dragDamping: 12.5,
      maxDragAcceleration: 9800,
      maxPoseAcceleration: 6200,
      maxVelocity: 1300,
      selfPush: 0,
      bodyPush: 0.32,
      swordPush: 1.08,
      swordBodyPush: 0.88,
      ownSwordBodyPush: 0.52,
      enemyOwnSwordBodyPush: 0.95,
      ownSwordThickness: 4.6,
      swordThickness: 5.4,
      swordHitPadding: 2,
      enemyHitDelay: 0.25,
      playerHitDelay: 0.25,
    },
  };
}

export function resetRound(state) {
  state.status = "idle";
  state.score = 0;
  state.enemies = [];
  state.nextEnemyId = 1;
  state.spawnTimer = 0;
  state.resetTimer = 0;
  state.input.active = false;
  state.input.pointerId = null;
  state.input.drag = null;
  state.player = createPlayer(state);
  state.enemies.push(createEnemyAt(state, getOpeningEnemyX(state)));
}

export function startRound(state) {
  state.status = "playing";
  state.lastTime = performance.now();
  state.spawnTimer = 2.1;
}

export function addScore(state) {
  state.score += 1;

  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(BEST_SCORE_KEY, String(state.best));
  }
}

export function killPlayer(state) {
  if (state.player.dying || state.player.dead) {
    return false;
  }

  state.status = "dying";
  state.resetTimer = 3;
  state.player.dying = true;
  state.player.hitDelay = state.physics.playerHitDelay;
  state.player.fadeSpeed = 2.05;
  state.player.alpha = 1;

  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(BEST_SCORE_KEY, String(state.best));
  }

  return true;
}

export function spawnEnemy(state) {
  const rootX = state.width + 185 + Math.random() * 70;
  state.enemies.push(createEnemyAt(state, rootX));
}

function createPlayer(state) {
  return createPuppet({
    id: 0,
    type: "player",
    rootX: getOpeningPlayerX(state),
    rootY: state.physics.floor - 76,
    speed: 0,
    phase: 0,
  });
}

function createEnemyAt(state, rootX) {
  const baseSpeed = 34 + Math.random() * 7;
  const scoreMultiplier = 1 + state.score * 0.2;
  const speed = -(baseSpeed * scoreMultiplier);

  const enemy = createPuppet({
    id: state.nextEnemyId,
    type: "enemy",
    rootX,
    rootY: state.physics.floor - 76,
    speed,
    phase: Math.random() * Math.PI * 2,
  });

  enemy.enemyThrustEnabled =
    state.physics.enemyThrustEnabled &&
    state.score >= state.physics.enemyThrustStartScore;
  enemy.enemyUpperArmThrustEnabled = state.physics.enemyUpperArmThrustEnabled;
  enemy.enemyElbowThrustEnabled = state.physics.enemyElbowThrustEnabled;
  enemy.enemyThrustDepth = state.physics.enemyThrustDepth;
  enemy.enemyThrustSpeed = state.physics.enemyThrustSpeed;
  enemy.enemyThrustSwordReach = state.physics.enemyThrustSwordReach;
  enemy.enemyVerticalSwingDown = state.physics.enemyVerticalSwingDown;
  enemy.enemyVerticalSwingUp = state.physics.enemyVerticalSwingUp;
  enemy.enemyVerticalAngleDown = state.physics.enemyVerticalAngleDown;
  enemy.enemyVerticalAngleUp = state.physics.enemyVerticalAngleUp;
  enemy.enemyUpperArmAngleMin = state.physics.enemyUpperArmAngleMin;
  enemy.enemyUpperArmAngleMax = state.physics.enemyUpperArmAngleMax;
  enemy.enemyElbowExtensionPower = state.physics.enemyElbowExtensionPower;
  enemy.enemySwordBaseLength = state.physics.enemySwordBaseLength;
  enemy.enemyThrustPhase = Math.random() * Math.PI * 2;

  state.nextEnemyId += 1;

  return enemy;
}

function createPuppet({ id, type, rootX, rootY, speed, phase }) {
  const baseOffsets = type === "player" ? PLAYER_OFFSETS : ENEMY_OFFSETS;
  const points = {};
  const weaponHand = type === "player" ? "rightHand" : "leftHand";
  const weaponElbow = type === "player" ? "rightElbow" : "leftElbow";

  Object.entries(baseOffsets).forEach(([name, offset]) => {
    const spec = POINT_SPECS[name];
    const x = rootX + offset[0];
    const y = rootY + offset[1];

    points[name] = {
      name,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: spec.radius,
      mass: spec.mass,
      invMass: 1 / spec.mass,
      poseWeight: spec.poseWeight,
      targetX: x,
      targetY: y,
    };
  });

  const constraints = DISTANCE_CONSTRAINTS.map(([a, b, stiffness]) => ({
    a,
    b,
    length: distance(points[a], points[b]),
    stiffness,
  }));

  constraints.push({
    a: weaponHand,
    b: "swordTip",
    length: distance(points[weaponHand], points.swordTip),
    stiffness: 1,
  });

  constraints.push({
    a: weaponElbow,
    b: "swordTip",
    length: distance(points[weaponElbow], points.swordTip),
    stiffness: 0.28,
  });

  return {
    id,
    type,
    alpha: 1,
    dying: false,
    dead: false,
    scored: false,
    softened: false,
    hitDelay: 0,
    fadeSpeed: 2.2,
    gravityBoost: 0,
    enemyThrustEnabled: false,
    enemyUpperArmThrustEnabled: false,
    enemyElbowThrustEnabled: false,
    enemyThrustDepth: 0,
    enemyThrustSpeed: 1,
    enemyThrustSwordReach: 0,
    enemyVerticalSwingDown: 86,
    enemyVerticalSwingUp: 185,
    enemyVerticalAngleDown: 0.72,
    enemyVerticalAngleUp: 1.18,
    enemyUpperArmAngleMin: 0.001,
    enemyUpperArmAngleMax: 1.7453,
    enemyElbowExtensionPower: 0.42,
    enemySwordBaseLength: 78,
    enemyThrustPhase: 0,
    colors: BODY_COLORS[type],
    phase,
    time: 0,
    speed,
    intentX: rootX,
    intentY: rootY,
    baseOffsets,
    points,
    constraints,
    parts: BODY_PARTS.map((part) => ({
      ...part,
      grabbable: true,
      bodyHit: true,
    })),
    weaponHand,
    weaponElbow,
    swordTip: "swordTip",
  };
}

function getOpeningPlayerX() {
  return START_MARGIN;
}

function getOpeningEnemyX(state) {
  return state.width - START_MARGIN;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}