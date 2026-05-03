import {
  addCorrectionVelocity,
  applySegmentCorrection,
  closestPointOnSegment,
  closestSegmentSegment,
  getCollisionNormal,
} from "./physics-geometry.js";

export function resolveSelfCollisions(body, deltaSeconds, strength) {
  if (!body || body.dead || strength <= 0) {
    return;
  }

  resolveHeadAgainstOwnBody(body, deltaSeconds, strength);
  resolveOwnBodyParts(body, deltaSeconds, strength);
}

export function resolveInterBodyCollisions(first, second, deltaSeconds, strength) {
  if (!first || !second || first.dead || second.dead || strength <= 0) {
    return;
  }

  resolvePointCollision(
    first.points.head,
    second.points.head,
    strength,
    deltaSeconds
  );

  first.parts.forEach((part) => {
    resolvePointCapsuleCollision(
      second.points.head,
      first.points[part.a],
      first.points[part.b],
      second.points.head.radius,
      part.radius,
      strength,
      deltaSeconds
    );
  });

  second.parts.forEach((part) => {
    resolvePointCapsuleCollision(
      first.points.head,
      second.points[part.a],
      second.points[part.b],
      first.points.head.radius,
      part.radius,
      strength,
      deltaSeconds
    );
  });

  first.parts.forEach((partA) => {
    second.parts.forEach((partB) => {
      resolveCapsuleCollision(
        first.points[partA.a],
        first.points[partA.b],
        partA.radius,
        second.points[partB.a],
        second.points[partB.b],
        partB.radius,
        strength,
        deltaSeconds
      );
    });
  });
}

function resolveHeadAgainstOwnBody(body, deltaSeconds, strength) {
  body.parts.forEach((part) => {
    if (
      part.a === "head" ||
      part.b === "head" ||
      part.a === "chest" ||
      part.b === "chest"
    ) {
      return;
    }

    resolvePointCapsuleCollision(
      body.points.head,
      body.points[part.a],
      body.points[part.b],
      body.points.head.radius,
      part.radius,
      strength,
      deltaSeconds
    );
  });
}

function resolveOwnBodyParts(body, deltaSeconds, strength) {
  for (let index = 0; index < body.parts.length; index += 1) {
    for (let other = index + 1; other < body.parts.length; other += 1) {
      const first = body.parts[index];
      const second = body.parts[other];

      if (partsShareJoint(first, second)) {
        continue;
      }

      if (areAllowedToOverlap(first, second)) {
        continue;
      }

      resolveCapsuleCollision(
        body.points[first.a],
        body.points[first.b],
        first.radius,
        body.points[second.a],
        body.points[second.b],
        second.radius,
        strength,
        deltaSeconds
      );
    }
  }
}

function partsShareJoint(first, second) {
  return (
    first.a === second.a ||
    first.a === second.b ||
    first.b === second.a ||
    first.b === second.b
  );
}

function areAllowedToOverlap(first, second) {
  const pair = `${first.name}:${second.name}`;

  return (
    pair === "torso:leftUpperArm" ||
    pair === "torso:rightUpperArm" ||
    pair === "torso:leftThigh" ||
    pair === "torso:rightThigh" ||
    pair === "leftUpperArm:torso" ||
    pair === "rightUpperArm:torso" ||
    pair === "leftThigh:torso" ||
    pair === "rightThigh:torso"
  );
}

function resolvePointCollision(a, b, strength, deltaSeconds) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let distance = Math.hypot(dx, dy);
  const minDistance = a.radius + b.radius;

  if (distance >= minDistance) {
    return;
  }

  if (distance < 0.0001) {
    dx = 1;
    dy = 0;
    distance = 1;
  }

  const penetration = (minDistance - distance) * strength;
  const nx = dx / distance;
  const ny = dy / distance;
  const totalInvMass = a.invMass + b.invMass;

  if (totalInvMass <= 0) {
    return;
  }

  const ax = -nx * penetration * (a.invMass / totalInvMass);
  const ay = -ny * penetration * (a.invMass / totalInvMass);
  const bx = nx * penetration * (b.invMass / totalInvMass);
  const by = ny * penetration * (b.invMass / totalInvMass);

  a.x += ax;
  a.y += ay;
  b.x += bx;
  b.y += by;

  addCorrectionVelocity(a, ax, ay, deltaSeconds, 0.18);
  addCorrectionVelocity(b, bx, by, deltaSeconds, 0.18);
}

function resolvePointCapsuleCollision(
  point,
  a,
  b,
  pointRadius,
  capsuleRadius,
  strength,
  deltaSeconds
) {
  const closest = closestPointOnSegment(point, a, b);
  let dx = closest.x - point.x;
  let dy = closest.y - point.y;
  let distance = Math.hypot(dx, dy);
  const minDistance = pointRadius + capsuleRadius;

  if (distance >= minDistance) {
    return;
  }

  if (distance < 0.0001) {
    dx = 1;
    dy = 0;
    distance = 1;
  }

  const penetration = (minDistance - distance) * strength;
  const nx = dx / distance;
  const ny = dy / distance;
  const pointPush = penetration * 0.5;
  const segmentPush = penetration * 0.5;

  point.x -= nx * pointPush;
  point.y -= ny * pointPush;

  addCorrectionVelocity(
    point,
    -nx * pointPush,
    -ny * pointPush,
    deltaSeconds,
    0.18
  );

  applySegmentCorrection(
    a,
    b,
    closest.t,
    nx * segmentPush,
    ny * segmentPush,
    deltaSeconds,
    0.18
  );
}

function resolveCapsuleCollision(
  a1,
  a2,
  radiusA,
  b1,
  b2,
  radiusB,
  strength,
  deltaSeconds
) {
  const collision = closestSegmentSegment(a1, a2, b1, b2);
  const minDistance = radiusA + radiusB;

  if (collision.distance >= minDistance) {
    return;
  }

  const normal = getCollisionNormal(collision, { a: a1, b: a2 }, { a: b1, b: b2 });
  const penetration = (minDistance - collision.distance) * strength;
  const dx = normal.x * penetration * 0.5;
  const dy = normal.y * penetration * 0.5;

  applySegmentCorrection(a1, a2, collision.t, dx, dy, deltaSeconds, 0.18);
  applySegmentCorrection(b1, b2, collision.u, -dx, -dy, deltaSeconds, 0.18);
}