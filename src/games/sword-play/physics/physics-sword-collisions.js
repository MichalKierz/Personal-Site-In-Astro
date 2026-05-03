import {
  addCorrectionVelocity,
  applySegmentCorrection,
  closestPointOnSegment,
  closestSegmentSegment,
  distancePointToSegment,
  getCollisionNormal,
} from "./physics-geometry.js";

export function resolveSwordAgainstEnemies(state, deltaSeconds) {
  const player = state.player;

  if (!player || player.dead) {
    return;
  }

  state.enemies.forEach((enemy) => {
    if (enemy.dead) {
      return;
    }

    const playerSword = getSword(player);
    const enemySword = getSword(enemy);

    resolveOwnSwordBodyResistance(
      playerSword,
      player,
      state.physics.ownSwordThickness,
      state.physics.ownSwordBodyPush,
      deltaSeconds
    );

    resolveOwnSwordBodyResistance(
      enemySword,
      enemy,
      state.physics.ownSwordThickness,
      state.physics.ownSwordBodyPush,
      deltaSeconds
    );

    if (enemy.dying) {
      resolveSwordBodyResistance(
        playerSword,
        enemy,
        state.physics.swordThickness,
        state.physics.swordBodyPush,
        deltaSeconds
      );
    }

    if (player.dying) {
      resolveSwordBodyResistance(
        enemySword,
        player,
        state.physics.swordThickness,
        state.physics.swordBodyPush,
        deltaSeconds
      );
    }

    const collision = closestSegmentSegment(
      playerSword.a,
      playerSword.b,
      enemySword.a,
      enemySword.b
    );

    if (collision.distance >= state.physics.swordThickness) {
      return;
    }

    const resistance = enemy.dying || player.dying ? 0.88 : 1;
    const penetration =
      (state.physics.swordThickness - collision.distance) *
      state.physics.swordPush *
      resistance;

    const normal = getCollisionNormal(collision, playerSword, enemySword);

    applySegmentCorrection(
      playerSword.a,
      playerSword.b,
      collision.t,
      normal.x * penetration * 0.5,
      normal.y * penetration * 0.5,
      deltaSeconds,
      0.68
    );

    applySegmentCorrection(
      enemySword.a,
      enemySword.b,
      collision.u,
      -normal.x * penetration * 0.5,
      -normal.y * penetration * 0.5,
      deltaSeconds,
      0.68
    );
  });
}

export function swordTouchesBody(attacker, target, padding) {
  const sword = getSword(attacker);
  const headDistance = distancePointToSegment(target.points.head, sword.a, sword.b);

  if (headDistance <= target.points.head.radius + padding) {
    return true;
  }

  for (const part of target.parts) {
    const collision = closestSegmentSegment(
      sword.a,
      sword.b,
      target.points[part.a],
      target.points[part.b]
    );

    if (collision.distance <= part.radius + padding) {
      return true;
    }
  }

  return false;
}

export function softenBody(body) {
  if (body.softened) {
    return;
  }

  body.constraints.forEach((constraint) => {
    constraint.stiffness *= 0.96;
  });

  body.softened = true;
}

function resolveOwnSwordBodyResistance(
  sword,
  owner,
  swordThickness,
  strength,
  deltaSeconds
) {
  const ignoredParts = getOwnSwordIgnoredParts(owner);

  resolveSwordHeadResistance(
    sword,
    owner.points.head,
    swordThickness,
    strength * 0.42,
    deltaSeconds
  );

  owner.parts.forEach((part) => {
    if (ignoredParts.has(part.name)) {
      return;
    }

    resolveSwordPartResistance(
      sword,
      owner.points[part.a],
      owner.points[part.b],
      part.radius,
      swordThickness,
      strength,
      deltaSeconds
    );
  });
}

function resolveSwordBodyResistance(sword, target, swordThickness, strength, deltaSeconds) {
  const resistance = target.hitDelay > 0 ? 0.95 : 0.78;

  resolveSwordHeadResistance(
    sword,
    target.points.head,
    swordThickness,
    strength * resistance,
    deltaSeconds
  );

  target.parts.forEach((part) => {
    resolveSwordPartResistance(
      sword,
      target.points[part.a],
      target.points[part.b],
      part.radius,
      swordThickness,
      strength * resistance,
      deltaSeconds
    );
  });
}

function resolveSwordHeadResistance(
  sword,
  head,
  swordThickness,
  strength,
  deltaSeconds
) {
  const closest = closestPointOnSegment(head, sword.a, sword.b);
  let nx = closest.x - head.x;
  let ny = closest.y - head.y;
  let distance = Math.hypot(nx, ny);
  const minDistance = head.radius + swordThickness;

  if (distance >= minDistance) {
    return;
  }

  if (distance < 0.0001) {
    const sx = sword.b.x - sword.a.x;
    const sy = sword.b.y - sword.a.y;
    nx = -sy;
    ny = sx;
    distance = Math.hypot(nx, ny) || 1;
  }

  nx /= distance;
  ny /= distance;

  const penetration = (minDistance - distance) * strength;

  applySegmentCorrection(
    sword.a,
    sword.b,
    closest.t,
    nx * penetration * 0.58,
    ny * penetration * 0.58,
    deltaSeconds,
    0.48
  );

  head.x -= nx * penetration * 0.42;
  head.y -= ny * penetration * 0.42;

  addCorrectionVelocity(
    head,
    -nx * penetration * 0.42,
    -ny * penetration * 0.42,
    deltaSeconds,
    0.28
  );
}

function resolveSwordPartResistance(
  sword,
  a,
  b,
  partRadius,
  swordThickness,
  strength,
  deltaSeconds
) {
  const collision = closestSegmentSegment(sword.a, sword.b, a, b);
  const minDistance = partRadius + swordThickness;

  if (collision.distance >= minDistance) {
    return;
  }

  const normal = getCollisionNormal(collision, sword, { a, b });
  const penetration = (minDistance - collision.distance) * strength;

  applySegmentCorrection(
    sword.a,
    sword.b,
    collision.t,
    normal.x * penetration * 0.58,
    normal.y * penetration * 0.58,
    deltaSeconds,
    0.48
  );

  applySegmentCorrection(
    a,
    b,
    collision.u,
    -normal.x * penetration * 0.42,
    -normal.y * penetration * 0.42,
    deltaSeconds,
    0.28
  );
}

function getOwnSwordIgnoredParts(body) {
  if (body.type === "player") {
    return new Set(["rightUpperArm", "rightForearm"]);
  }

  return new Set(["leftUpperArm", "leftForearm"]);
}

function getSword(body) {
  return {
    a: body.points[body.weaponHand],
    b: body.points[body.swordTip],
  };
}