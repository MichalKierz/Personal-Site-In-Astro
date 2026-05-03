export function closestSegmentSegment(a, b, c, d) {
  const intersection = getSegmentIntersection(a, b, c, d);

  if (intersection) {
    return {
      distance: 0,
      t: intersection.t,
      u: intersection.u,
      ax: intersection.x,
      ay: intersection.y,
      bx: intersection.x,
      by: intersection.y,
    };
  }

  const candidates = [];
  const abFromC = closestPointOnSegment(c, a, b);
  const abFromD = closestPointOnSegment(d, a, b);
  const cdFromA = closestPointOnSegment(a, c, d);
  const cdFromB = closestPointOnSegment(b, c, d);

  candidates.push(makeCandidate(a, cdFromA, 0, cdFromA.t));
  candidates.push(makeCandidate(b, cdFromB, 1, cdFromB.t));
  candidates.push(makeCandidate(abFromC, c, abFromC.t, 0));
  candidates.push(makeCandidate(abFromD, d, abFromD.t, 1));

  candidates.sort((first, second) => first.distance - second.distance);

  return candidates[0];
}

export function closestPointOnSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= 0.0001) {
    return {
      x: a.x,
      y: a.y,
      t: 0,
    };
  }

  const t = clamp(
    ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared,
    0,
    1
  );

  return {
    x: a.x + dx * t,
    y: a.y + dy * t,
    t,
  };
}

export function getCollisionNormal(collision, first, second) {
  let nx = collision.ax - collision.bx;
  let ny = collision.ay - collision.by;
  let length = Math.hypot(nx, ny);

  if (length < 0.0001) {
    const sx = second.b.x - second.a.x;
    const sy = second.b.y - second.a.y;

    nx = -sy;
    ny = sx;
    length = Math.hypot(nx, ny);

    const firstMidX = (first.a.x + first.b.x) / 2;
    const firstMidY = (first.a.y + first.b.y) / 2;
    const secondMidX = (second.a.x + second.b.x) / 2;
    const secondMidY = (second.a.y + second.b.y) / 2;

    if ((firstMidX - secondMidX) * nx + (firstMidY - secondMidY) * ny < 0) {
      nx *= -1;
      ny *= -1;
    }
  }

  if (length < 0.0001) {
    return {
      x: 1,
      y: 0,
    };
  }

  return {
    x: nx / length,
    y: ny / length,
  };
}

export function applySegmentCorrection(a, b, t, dx, dy, deltaSeconds, velocityScale) {
  const wa = 1 - t;
  const wb = t;
  const denominator = wa * wa * a.invMass + wb * wb * b.invMass;

  if (denominator <= 0.0001) {
    return;
  }

  const ax = (dx * wa * a.invMass) / denominator;
  const ay = (dy * wa * a.invMass) / denominator;
  const bx = (dx * wb * b.invMass) / denominator;
  const by = (dy * wb * b.invMass) / denominator;

  a.x += ax;
  a.y += ay;
  b.x += bx;
  b.y += by;

  addCorrectionVelocity(a, ax, ay, deltaSeconds, velocityScale);
  addCorrectionVelocity(b, bx, by, deltaSeconds, velocityScale);
}

export function distancePointToSegment(point, a, b) {
  const closest = closestPointOnSegment(point, a, b);
  return Math.hypot(point.x - closest.x, point.y - closest.y);
}

export function addCorrectionVelocity(point, dx, dy, deltaSeconds, scale) {
  if (deltaSeconds <= 0) {
    return;
  }

  point.vx += (dx / deltaSeconds) * scale;
  point.vy += (dy / deltaSeconds) * scale;
}

function getSegmentIntersection(a, b, c, d) {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const denominator = cross(rx, ry, sx, sy);

  if (Math.abs(denominator) < 0.0001) {
    return null;
  }

  const qpx = c.x - a.x;
  const qpy = c.y - a.y;
  const t = cross(qpx, qpy, sx, sy) / denominator;
  const u = cross(qpx, qpy, rx, ry) / denominator;

  if (t < 0 || t > 1 || u < 0 || u > 1) {
    return null;
  }

  return {
    t,
    u,
    x: a.x + rx * t,
    y: a.y + ry * t,
  };
}

function makeCandidate(first, second, t, u) {
  return {
    distance: Math.hypot(first.x - second.x, first.y - second.y),
    t,
    u,
    ax: first.x,
    ay: first.y,
    bx: second.x,
    by: second.y,
  };
}

function cross(ax, ay, bx, by) {
  return ax * by - ay * bx;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}