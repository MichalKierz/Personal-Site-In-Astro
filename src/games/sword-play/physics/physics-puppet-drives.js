export function applyPlayerPuppetDrive(state, body, deltaSeconds) {
  const waitingToFade = body.dying && body.hitDelay > 0;
  const deathScale = body.dying ? (waitingToFade ? 0.92 : 0.64) : 1;

  Object.values(body.points).forEach((point) => {
    let poseScale = point.poseWeight * deathScale;

    if (point.name === "head") {
      poseScale *= 1.65;
    }

    if (
      point.name === "chest" ||
      point.name === "pelvis" ||
      point.name === "leftShoulder" ||
      point.name === "rightShoulder" ||
      point.name === "leftHip" ||
      point.name === "rightHip"
    ) {
      poseScale *= 1.14;
    }

    if (
      point.name === "leftElbow" ||
      point.name === "rightElbow" ||
      point.name === "leftKnee" ||
      point.name === "rightKnee"
    ) {
      poseScale *= 0.24;
    }

    if (
      point.name === "leftHand" ||
      point.name === "rightHand" ||
      point.name === "leftFoot" ||
      point.name === "rightFoot"
    ) {
      poseScale *= 0.34;
    }

    if (isPointUnderDirectDrag(state, body, point.name)) {
      poseScale *= 0.08;
    }

    const acceleration = capVector(
      (point.targetX - point.x) * state.physics.playerPoseStrength * poseScale -
        point.vx * state.physics.playerPoseDamping,
      (point.targetY - point.y) * state.physics.playerPoseStrength * poseScale -
        point.vy * state.physics.playerPoseDamping,
      state.physics.maxPoseAcceleration * Math.max(0.1, poseScale)
    );

    point.vx += (acceleration.x / point.mass) * deltaSeconds;
    point.vy += (acceleration.y / point.mass) * deltaSeconds;
  });
}

export function applyPlayerStandingDrive(state, body, deltaSeconds) {
  if (body.dying) {
    return;
  }

  const active = state.input.active && state.input.drag;
  const strength = active
    ? state.physics.standingActiveStrength
    : state.physics.standingStrength;
  const damping = active
    ? state.physics.standingActiveDamping
    : state.physics.standingDamping;
  const floor = state.physics.floor;
  const rootX = getStandingRootX(body, active);
  const rootY = floor - 76;

  driveStandingPoint(state, body, "pelvis", rootX, rootY, strength * 1, damping, deltaSeconds);
  driveStandingPoint(state, body, "chest", rootX, rootY - 62, strength * 0.96, damping, deltaSeconds);
  driveStandingPoint(state, body, "head", rootX, rootY - 79, strength * 0.78, damping, deltaSeconds);
  driveStandingPoint(state, body, "leftShoulder", rootX - 11, rootY - 61, strength * 0.46, damping, deltaSeconds);
  driveStandingPoint(state, body, "rightShoulder", rootX + 11, rootY - 61, strength * 0.46, damping, deltaSeconds);
  driveStandingPoint(state, body, "leftHip", rootX - 10, rootY, strength * 0.62, damping, deltaSeconds);
  driveStandingPoint(state, body, "rightHip", rootX + 10, rootY, strength * 0.62, damping, deltaSeconds);
  driveStandingPoint(state, body, "leftKnee", rootX - 34, rootY + 38, strength * 0.7, damping, deltaSeconds);
  driveStandingPoint(state, body, "rightKnee", rootX + 34, rootY + 38, strength * 0.7, damping, deltaSeconds);
  driveStandingPoint(state, body, "leftFoot", rootX - 16, floor, strength * 1, damping, deltaSeconds);
  driveStandingPoint(state, body, "rightFoot", rootX + 16, floor, strength * 1, damping, deltaSeconds);
}

export function applyEnemyPuppetDrive(state, body, deltaSeconds) {
  const waitingToFade = body.dying && body.hitDelay > 0;
  const deathScale = body.dying ? (waitingToFade ? 0.92 : 0.7) : 1;

  Object.values(body.points).forEach((point) => {
    let strength = state.physics.enemyPoseStrength;
    let damping = state.physics.enemyPoseDamping;
    let poseScale = point.poseWeight * deathScale;

    if (point.name === "head") {
      poseScale *= 1.38;
    }

    if (
      point.name === "chest" ||
      point.name === "pelvis" ||
      point.name === "leftShoulder" ||
      point.name === "rightShoulder" ||
      point.name === "leftHip" ||
      point.name === "rightHip"
    ) {
      poseScale *= 1.35;
      strength *= 1.22;
    }

    if (
      point.name === "leftElbow" ||
      point.name === "rightElbow" ||
      point.name === "leftKnee" ||
      point.name === "rightKnee"
    ) {
      poseScale *= 0.48;
    }

    if (
      point.name === body.weaponHand ||
      point.name === body.weaponElbow ||
      point.name === body.swordTip
    ) {
      strength = state.physics.enemyArmPoseStrength;
      damping *= 0.54;
      poseScale *= 2.25;
    }

    const acceleration = capVector(
      (point.targetX - point.x) * strength * poseScale - point.vx * damping,
      (point.targetY - point.y) * strength * poseScale - point.vy * damping,
      state.physics.maxPoseAcceleration * Math.max(0.14, poseScale)
    );

    point.vx += (acceleration.x / point.mass) * deltaSeconds;
    point.vy += (acceleration.y / point.mass) * deltaSeconds;
  });

  applyEnemyCoreDrive(state, body, deltaSeconds);
}

export function updateGravityBoost(state, body) {
  if (body.type !== "player") {
    return;
  }

  if (isGrounded(state, body)) {
    body.gravityBoost = 0;
    return;
  }

  if (isNearGround(state, body) && getLowestBodyVelocity(body) >= -40) {
    body.gravityBoost = 0;
    return;
  }

  const centerY =
    (body.points.head.y +
      body.points.chest.y +
      body.points.pelvis.y +
      body.points.leftFoot.y +
      body.points.rightFoot.y) /
    5;

  const feetY = Math.min(body.points.leftFoot.y, body.points.rightFoot.y);
  const heightFactor = getHeightFactor(state, centerY);
  const liftOffFactor = clamp((state.physics.floor - feetY - 20) / 150, 0, 0.65);
  const targetBoost = Math.max(heightFactor, liftOffFactor);

  body.gravityBoost = Math.max(body.gravityBoost || 0, targetBoost);
}

export function getPointGravity(state, body) {
  if (body.type !== "player") {
    return state.physics.gravity;
  }

  if (isNearGround(state, body)) {
    return state.physics.gravity;
  }

  const rawBoost = clamp(body.gravityBoost || 0, 0, 1);
  const boost = Math.pow(rawBoost, state.physics.highGravityPower);

  return state.physics.gravity +
    (state.physics.highGravity - state.physics.gravity) * boost;
}

export function getAnimatedOffsets(body) {
  const offsets = { ...body.baseOffsets };

  if (body.type === "enemy") {
    const shoulder = body.baseOffsets.leftShoulder;
    const baseElbow = body.baseOffsets.leftElbow;
    const baseHand = body.baseOffsets.leftHand;
    const waveTime = body.time * 3.3 + body.phase;
    const swing = Math.sin(waveTime);
    const verticalSwingDown = body.enemyVerticalSwingDown || 86;
    const verticalSwingUp = body.enemyVerticalSwingUp || 185;
    const verticalAngleDown = body.enemyVerticalAngleDown || 0.72;
    const verticalAngleUp = body.enemyVerticalAngleUp || 1.18;
    const verticalSwing = swing < 0 ? verticalSwingUp : verticalSwingDown;
    const verticalAngleAmount = swing < 0 ? verticalAngleUp : verticalAngleDown;
    const rawThrust = body.enemyThrustEnabled
      ? Math.sin(waveTime * body.enemyThrustSpeed + body.enemyThrustPhase)
      : 1;
    const thrust = body.enemyThrustEnabled ? (rawThrust + 1) * 0.5 : 1;
    const upperLength = distance(shoulder, baseElbow);
    const lowerLength = distance(baseElbow, baseHand);
    const thrustForArm = body.enemyUpperArmThrustEnabled ? thrust : 1;
    const thrustForElbow = body.enemyElbowThrustEnabled
      ? Math.pow(thrust, body.enemyElbowExtensionPower || 0.42)
      : 1;
    const verticalAngle = swing * verticalAngleAmount;
    const verticalOffset = swing * verticalSwing * 0.16;
    const upperAngleFromTorso = lerp(
      body.enemyUpperArmAngleMin,
      body.enemyUpperArmAngleMax,
      thrustForArm
    );
    const upperAngle = Math.PI * 0.5 + upperAngleFromTorso + verticalAngle * 0.22;
    const upperDirection = {
      x: Math.cos(upperAngle),
      y: Math.sin(upperAngle),
    };
    const elbow = {
      x: shoulder[0] + upperDirection.x * upperLength,
      y: shoulder[1] + upperDirection.y * upperLength + verticalOffset * 0.2,
    };
    const foldedForearmAngle = Math.PI + verticalAngle * 1.05;
    const straightForearmAngle = upperAngle + verticalAngle * 0.12;
    const forearmAngle = lerpAngle(
      foldedForearmAngle,
      straightForearmAngle,
      thrustForElbow
    );
    const forearmDirection = {
      x: Math.cos(forearmAngle),
      y: Math.sin(forearmAngle),
    };
    const hand = {
      x: elbow.x + forearmDirection.x * lowerLength,
      y: elbow.y + forearmDirection.y * lowerLength + verticalOffset * 0.8,
    };
    const swordReach = body.enemyThrustEnabled
      ? Math.max(0, rawThrust) * body.enemyThrustSwordReach
      : body.enemyThrustSwordReach;
    const bladeLength = (body.enemySwordBaseLength || 78) + swordReach;

    offsets.leftElbow = [elbow.x, elbow.y];
    offsets.leftHand = [hand.x, hand.y];
    offsets.swordTip = [
      hand.x + forearmDirection.x * bladeLength,
      hand.y + forearmDirection.y * bladeLength + verticalOffset * 0.35,
    ];
  }

  return offsets;
}

function applyEnemyCoreDrive(state, body, deltaSeconds) {
  if (body.dead) {
    return;
  }

  const rootX = body.intentX;
  const rootY = body.intentY;
  const strength = state.physics.enemyCoreStrength;
  const damping = state.physics.enemyCoreDamping;
  const deathScale = body.dying ? 0.55 : 1;

  driveEnemyPoint(state, body, "pelvis", rootX, rootY, strength * 1.08 * deathScale, damping, deltaSeconds);
  driveEnemyPoint(state, body, "chest", rootX, rootY - 62, strength * 1.18 * deathScale, damping, deltaSeconds);
  driveEnemyPoint(state, body, "head", rootX, rootY - 79, strength * 0.78 * deathScale, damping, deltaSeconds);
  driveEnemyPoint(state, body, "leftShoulder", rootX - 11, rootY - 61, strength * 0.68 * deathScale, damping, deltaSeconds);
  driveEnemyPoint(state, body, "rightShoulder", rootX + 11, rootY - 61, strength * 0.68 * deathScale, damping, deltaSeconds);
  driveEnemyPoint(state, body, "leftHip", rootX - 10, rootY, strength * 0.74 * deathScale, damping, deltaSeconds);
  driveEnemyPoint(state, body, "rightHip", rootX + 10, rootY, strength * 0.74 * deathScale, damping, deltaSeconds);
  driveEnemyPoint(state, body, "leftFoot", rootX - 16, state.physics.floor, strength * 0.95 * deathScale, damping, deltaSeconds);
  driveEnemyPoint(state, body, "rightFoot", rootX + 16, state.physics.floor, strength * 0.95 * deathScale, damping, deltaSeconds);
  driveEnemyPoint(state, body, "leftKnee", rootX - 34, rootY + 38, strength * 0.72 * deathScale, damping, deltaSeconds);
  driveEnemyPoint(state, body, "rightKnee", rootX + 34, rootY + 38, strength * 0.72 * deathScale, damping, deltaSeconds);
}

function driveStandingPoint(
  state,
  body,
  pointName,
  targetX,
  targetY,
  strength,
  damping,
  deltaSeconds
) {
  const point = body.points[pointName];
  const dragInfluence = getDragInfluence(state, pointName);
  const scale = 1 - dragInfluence * 0.82;

  if (scale <= 0.05) {
    return;
  }

  const acceleration = capVector(
    (targetX - point.x) * strength * scale - point.vx * damping * scale,
    (targetY - point.y) * strength * scale - point.vy * damping * scale,
    state.physics.maxPoseAcceleration * Math.max(0.16, scale)
  );

  point.vx += (acceleration.x / point.mass) * deltaSeconds;
  point.vy += (acceleration.y / point.mass) * deltaSeconds;
}

function driveEnemyPoint(
  state,
  body,
  pointName,
  targetX,
  targetY,
  strength,
  damping,
  deltaSeconds
) {
  const point = body.points[pointName];

  const acceleration = capVector(
    (targetX - point.x) * strength - point.vx * damping,
    (targetY - point.y) * strength - point.vy * damping,
    state.physics.maxPoseAcceleration
  );

  point.vx += (acceleration.x / point.mass) * deltaSeconds;
  point.vy += (acceleration.y / point.mass) * deltaSeconds;
}

function getStandingRootX(body, active) {
  const footMidX = (body.points.leftFoot.x + body.points.rightFoot.x) * 0.5;
  const coreX = body.points.pelvis.x * 0.6 + body.points.chest.x * 0.4;
  const lean = clamp(coreX - footMidX, -44, 44);
  const leanFollow = active ? 0.42 : 0.035;

  return footMidX + lean * leanFollow;
}

function getHeightFactor(state, y) {
  const start = state.physics.highGravityStart;
  const end = state.physics.highGravityEnd;
  const range = Math.max(1, start - end);

  return clamp((start - y) / range, 0, 1);
}

function isGrounded(state, body) {
  const floor = state.physics.floor - 1.2;

  return (
    body.points.leftFoot.y >= floor ||
    body.points.rightFoot.y >= floor ||
    body.points.leftKnee.y >= floor ||
    body.points.rightKnee.y >= floor
  );
}

function isNearGround(state, body) {
  const floor = state.physics.floor;
  const lowestY = Math.max(
    body.points.leftFoot.y,
    body.points.rightFoot.y,
    body.points.leftKnee.y,
    body.points.rightKnee.y
  );

  return lowestY >= floor - 16;
}

function getLowestBodyVelocity(body) {
  return Math.max(
    body.points.leftFoot.vy,
    body.points.rightFoot.vy,
    body.points.leftKnee.vy,
    body.points.rightKnee.vy
  );
}

function isPointUnderDirectDrag(state, body, pointName) {
  if (body.type !== "player" || !state.input.active || !state.input.drag) {
    return false;
  }

  const drag = state.input.drag;

  if (drag.kind === "point") {
    return drag.pointName === pointName;
  }

  return drag.a === pointName || drag.b === pointName;
}

function getDragInfluence(state, pointName) {
  if (!state.input.active || !state.input.drag) {
    return 0;
  }

  const drag = state.input.drag;

  if (drag.kind === "point") {
    return drag.pointName === pointName ? 1 : 0;
  }

  if (drag.a === pointName || drag.b === pointName) {
    return 1;
  }

  return 0;
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

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}