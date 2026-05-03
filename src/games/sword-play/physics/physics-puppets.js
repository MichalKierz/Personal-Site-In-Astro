import {
  applyEnemyPuppetDrive,
  applyPlayerPuppetDrive,
  applyPlayerStandingDrive,
  getAnimatedOffsets,
  getPointGravity,
  updateGravityBoost,
} from "./physics-puppet-drives.js";

export function updateBodyTargets(state, deltaSeconds) {
  getBodies(state).forEach((body) => {
    if (body.dead) {
      return;
    }

    body.time += deltaSeconds;

    if (body.type === "enemy" && state.status === "playing" && !body.dying) {
      body.intentX += body.speed * deltaSeconds;
    }

    const root = getPoseRoot(body);
    const offsets = getAnimatedOffsets(body);

    Object.entries(body.points).forEach(([name, point]) => {
      const offset = offsets[name];
      point.targetX = root.x + offset[0];
      point.targetY = root.y + offset[1];
    });
  });
}

export function applyPuppetForces(state, deltaSeconds) {
  getBodies(state).forEach((body) => {
    if (body.dead) {
      return;
    }

    if (body.type === "player") {
      applyPlayerPuppetDrive(state, body, deltaSeconds);
      applyPlayerStandingDrive(state, body, deltaSeconds);
      return;
    }

    applyEnemyPuppetDrive(state, body, deltaSeconds);
  });
}

export function applyPointerForce(state, deltaSeconds) {
  const drag = state.input.drag;

  if (!state.input.active || !drag || state.player.dead) {
    return;
  }

  const targetX = state.input.x - drag.offsetX;
  const targetY = state.input.y - drag.offsetY;

  if (drag.kind === "point") {
    const point = state.player.points[drag.pointName];
    applyPointDrive(state, point, targetX, targetY, deltaSeconds);
    return;
  }

  const a = state.player.points[drag.a];
  const b = state.player.points[drag.b];

  let wa = 1 - drag.t;
  let wb = drag.t;

  if (
    drag.partName === "leftLowerLeg" ||
    drag.partName === "rightLowerLeg" ||
    drag.partName === "leftForearm" ||
    drag.partName === "rightForearm"
  ) {
    wa *= 0.28;
    wb = Math.max(wb, 0.9);
  }

  if (
    drag.partName === "leftThigh" ||
    drag.partName === "rightThigh" ||
    drag.partName === "leftUpperArm" ||
    drag.partName === "rightUpperArm"
  ) {
    wb = Math.max(wb, 0.8);
  }

  const total = Math.max(0.0001, wa + wb);

  wa /= total;
  wb /= total;

  const attachX = a.x * wa + b.x * wb;
  const attachY = a.y * wa + b.y * wb;
  const attachVx = a.vx * wa + b.vx * wb;
  const attachVy = a.vy * wa + b.vy * wb;

  const acceleration = capVector(
    (targetX - attachX) * state.physics.dragStrength -
      attachVx * state.physics.dragDamping,
    (targetY - attachY) * state.physics.dragStrength -
      attachVy * state.physics.dragDamping,
    state.physics.maxDragAcceleration
  );

  a.vx += (acceleration.x * wa / Math.max(0.85, a.mass)) * deltaSeconds;
  a.vy += (acceleration.y * wa / Math.max(0.85, a.mass)) * deltaSeconds;
  b.vx += (acceleration.x * wb / Math.max(0.85, b.mass)) * deltaSeconds;
  b.vy += (acceleration.y * wb / Math.max(0.85, b.mass)) * deltaSeconds;
}

export function integrateBodies(state, deltaSeconds) {
  const damping = Math.pow(state.physics.damping, deltaSeconds * 60);

  getBodies(state).forEach((body) => {
    if (body.dead) {
      return;
    }

    updateGravityBoost(state, body);

    Object.values(body.points).forEach((point) => {
      point.vy += getPointGravity(state, body) * deltaSeconds;
      point.vx *= damping;
      point.vy *= damping;

      const velocity = capVector(point.vx, point.vy, state.physics.maxVelocity);

      point.vx = velocity.x;
      point.vy = velocity.y;
      point.x += point.vx * deltaSeconds;
      point.y += point.vy * deltaSeconds;
    });
  });
}

export function solvePuppetConstraints(state, deltaSeconds) {
  getBodies(state).forEach((body) => {
    if (body.dead) {
      return;
    }

    body.constraints.forEach((constraint) => {
      const a = body.points[constraint.a];
      const b = body.points[constraint.b];

      solveDistanceConstraint(
        a,
        b,
        constraint.length,
        constraint.stiffness,
        deltaSeconds
      );
    });
  });
}

export function resolveFloorAndWalls(state) {
  const floor = state.physics.floor;
  const padding = state.physics.wallPadding;

  getBodies(state).forEach((body) => {
    if (body.dead) {
      return;
    }

    Object.values(body.points).forEach((point) => {
      const minY = padding + point.radius;

      if (point.y < minY) {
        point.y = minY;
        point.vy = Math.max(0, point.vy) * 0.12;
      }

      if (point.y > floor) {
        point.y = floor;
        point.vy = Math.min(0, point.vy) * 0.06;
        point.vx *= 0.9;
      }

      if (body.type === "player") {
        const minX = padding + point.radius;
        const maxX = state.width - padding - point.radius;

        if (point.x < minX) {
          point.x = minX;
          point.vx = Math.max(0, point.vx) * 0.14;
        }

        if (point.x > maxX) {
          point.x = maxX;
          point.vx = Math.min(0, point.vx) * 0.14;
        }
      }
    });

    if (body.type === "player" && isGrounded(state, body)) {
      body.gravityBoost = 0;
    }
  });
}

function applyPointDrive(state, point, targetX, targetY, deltaSeconds) {
  const acceleration = capVector(
    (targetX - point.x) * state.physics.dragStrength -
      point.vx * state.physics.dragDamping,
    (targetY - point.y) * state.physics.dragStrength -
      point.vy * state.physics.dragDamping,
    state.physics.maxDragAcceleration
  );

  point.vx += (acceleration.x / Math.max(0.85, point.mass)) * deltaSeconds;
  point.vy += (acceleration.y / Math.max(0.85, point.mass)) * deltaSeconds;
}

function getPoseRoot(body) {
  if (body.type === "player") {
    return {
      x: body.points.pelvis.x,
      y: body.points.pelvis.y,
    };
  }

  return {
    x: body.intentX,
    y: body.intentY,
  };
}

function solveDistanceConstraint(a, b, length, stiffness, deltaSeconds) {
  if (stiffness <= 0) {
    return;
  }

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 0.0001) {
    return;
  }

  const difference = (distance - length) / distance;
  const totalInvMass = a.invMass + b.invMass;

  if (totalInvMass <= 0) {
    return;
  }

  const correctionX = dx * difference * stiffness;
  const correctionY = dy * difference * stiffness;
  const ax = correctionX * (a.invMass / totalInvMass);
  const ay = correctionY * (a.invMass / totalInvMass);
  const bx = correctionX * (b.invMass / totalInvMass);
  const by = correctionY * (b.invMass / totalInvMass);

  a.x += ax;
  a.y += ay;
  b.x -= bx;
  b.y -= by;

  addCorrectionVelocity(a, ax, ay, deltaSeconds, 0.008);
  addCorrectionVelocity(b, -bx, -by, deltaSeconds, 0.008);
}

function addCorrectionVelocity(point, dx, dy, deltaSeconds, scale) {
  if (deltaSeconds <= 0) {
    return;
  }

  point.vx += (dx / deltaSeconds) * scale;
  point.vy += (dy / deltaSeconds) * scale;
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

function getBodies(state) {
  return [state.player, ...state.enemies].filter(Boolean);
}