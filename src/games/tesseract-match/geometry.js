export const tesseractVertices = createVertices();
export const tesseractEdges = createEdges(tesseractVertices);

export function projectVertex(vertex, rotation) {
  let point = { ...vertex };

  point = rotatePlane(point, "x", "w", rotation.w);
  point = rotatePlane(point, "y", "w", rotation.w * 0.55);

  const distance4 = 3.15;
  const factor4 = distance4 / (distance4 - point.w);

  let projected3D = {
    x: point.x * factor4,
    y: point.y * factor4,
    z: point.z * factor4,
  };

  projected3D = rotateVectorByQuaternion(projected3D, rotation.orientation);

  const distance3 = 6.2;
  const factor3 = distance3 / (distance3 - projected3D.z);

  return {
    x: projected3D.x * factor3,
    y: projected3D.y * factor3,
    depth: projected3D.z + point.w * 0.18,
  };
}

export function rotatePlane(point, first, second, angle) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const a = point[first];
  const b = point[second];

  return {
    ...point,
    [first]: a * cos - b * sin,
    [second]: a * sin + b * cos,
  };
}

function rotateVectorByQuaternion(vector, quaternion) {
  const qx = quaternion.x;
  const qy = quaternion.y;
  const qz = quaternion.z;
  const qw = quaternion.w;

  const ix = qw * vector.x + qy * vector.z - qz * vector.y;
  const iy = qw * vector.y + qz * vector.x - qx * vector.z;
  const iz = qw * vector.z + qx * vector.y - qy * vector.x;
  const iw = -qx * vector.x - qy * vector.y - qz * vector.z;

  return {
    x: ix * qw + iw * -qx + iy * -qz - iz * -qy,
    y: iy * qw + iw * -qy + iz * -qx - ix * -qz,
    z: iz * qw + iw * -qz + ix * -qy - iy * -qx,
  };
}

function createVertices() {
  const values = [-1, 1];
  const result = [];

  values.forEach((x) => {
    values.forEach((y) => {
      values.forEach((z) => {
        values.forEach((w) => {
          result.push({ x, y, z, w });
        });
      });
    });
  });

  return result;
}

function createEdges(points) {
  const result = [];

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const distance =
        Math.abs(points[i].x - points[j].x) +
        Math.abs(points[i].y - points[j].y) +
        Math.abs(points[i].z - points[j].z) +
        Math.abs(points[i].w - points[j].w);

      if (distance === 2) {
        result.push([i, j]);
      }
    }
  }

  return result;
}