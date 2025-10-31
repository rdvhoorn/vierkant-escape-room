import Phaser from "phaser";

export type Face = {
  id: number;
  center: Phaser.Math.Vector2;
  rotation: number; // radians
  radius: number;   // circumradius
  points: Phaser.Math.Vector2[]; // world-space polygon points (clockwise)
  neighbors: number[]; // length 5, -1 if none
};

export type DodecaNet = {
  faces: Face[];
  bounds: Phaser.Geom.Rectangle;
};

function regularPentagonPoints(center: Phaser.Math.Vector2, R: number, rotationRad: number): Phaser.Math.Vector2[] {
  // Vertex-up look is nice; rotate so a flat edge is at the top (optional). We'll start pointing up.
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 5; i++) {
    const ang = rotationRad + Phaser.Math.DegToRad(-90) + (i * (2 * Math.PI / 5));
    pts.push(new Phaser.Math.Vector2(center.x + Math.cos(ang) * R, center.y + Math.sin(ang) * R));
  }
  return pts;
}

// Get the outward normal of edge i for a clockwise pentagon
function edgeNormal(points: Phaser.Math.Vector2[], i: number): Phaser.Math.Vector2 {
  const a = points[i];
  const b = points[(i + 1) % points.length];
  const edge = new Phaser.Math.Vector2(b.x - a.x, b.y - a.y);
  // Clockwise polygon -> outward normal is edge rotated +90° (y, -x)
  const n = new Phaser.Math.Vector2(edge.y, -edge.x).normalize();
  return n;
}

// Move a new face so that its edge 'attachEdgeIndex' aligns & touches base face's edge 'baseEdgeIndex' (outside)
function attachFace(base: Face, baseEdgeIndex: number, newId: number, R: number, rotationRad: number): Face {
  // Build a temporary pentagon centered at origin
  const temp = {
    id: newId,
    center: new Phaser.Math.Vector2(0, 0),
    rotation: rotationRad,
    radius: R,
    points: regularPentagonPoints(new Phaser.Math.Vector2(0, 0), R, rotationRad),
    neighbors: [-1, -1, -1, -1, -1],
  } as Face;

  // Compute base edge mid and outward normal
  // const pA = base.points[baseEdgeIndex];
  // const pB = base.points[(baseEdgeIndex + 1) % 5];
  // const mid = new Phaser.Math.Vector2((pA.x + pB.x) / 2, (pA.y + pB.y) / 2);
  const n = edgeNormal(base.points, baseEdgeIndex); // outward

  // For a regular pentagon: apothem a = R * cos(36°)
  const a = R * Math.cos(Phaser.Math.DegToRad(36));
  // Place new face so its center is 'a + a' away from base center along outward normal (two apothems back-to-back)
  // BUT: we need the new face to share that edge; we’ll simply translate by 2a along outward normal.
  const translate = new Phaser.Math.Vector2(n.x * (2 * a), n.y * (2 * a));

  // Now position the new center around the edge midpoint
  temp.center = new Phaser.Math.Vector2(base.center.x + translate.x, base.center.y + translate.y);

  // Recompute points in world-space
  temp.points = regularPentagonPoints(temp.center, R, rotationRad);
  return temp;
}

// Build a simple, readable dodecahedron net (one of many valid nets)
// Layout idea: 1 center, ring of 5 around it, another ring of 5 outside, plus one tail face.
// Not the only possible net, but contiguous and intuitive to roam.
export function buildDodecaNet(cx: number, cy: number, R: number): DodecaNet {
  const faces: Face[] = [];
  const center: Face = {
    id: 1,
    center: new Phaser.Math.Vector2(cx, cy),
    rotation: 0,
    radius: R,
    points: regularPentagonPoints(new Phaser.Math.Vector2(cx, cy), R, 0),
    neighbors: [-1, -1, -1, -1, -1],
  };
  faces.push(center);

  // Attach 5 around the center on each edge (edges 0..4)
  const ring1: Face[] = [];
  for (let e = 0; e < 5; e++) {
    const f = attachFace(center, e, 2 + e, R, 0);
    faces.push(f);
    ring1.push(f);
    // Record neighbor linkage on the shared edges
    center.neighbors[e] = f.id;
    f.neighbors[(e + 2) % 5] = center.id; // Opposite edge index relative to alignment
  }

  // For each ring1 face, attach one outward face on the edge opposite the center (edge index 2)
  const ring2: Face[] = [];
  for (let i = 0; i < 5; i++) {
    const base = ring1[i];
    const outer = attachFace(base, 2, 7 + i, R, 0);
    faces.push(outer);
    ring2.push(outer);
    base.neighbors[2] = outer.id;
    outer.neighbors[(2 + 2) % 5] = base.id;
  }

  // Add one more tail on ring1[2] edge 1 (arbitrary) to reach 12 faces
  const tailBase = ring1[2];
  const tail = attachFace(tailBase, 1, 12, R, 0);
  faces.push(tail);
  tailBase.neighbors[1] = tail.id;
  tail.neighbors[(1 + 2) % 5] = tailBase.id;

  // Compute bounds
  const xs: number[] = [];
  const ys: number[] = [];
  faces.forEach(f => f.points.forEach(p => { xs.push(p.x); ys.push(p.y); }));
  const bounds = new Phaser.Geom.Rectangle(
    Math.min(...xs) - 60,
    Math.min(...ys) - 60,
    Math.max(...xs) - Math.min(...xs) + 120,
    Math.max(...ys) - Math.min(...ys) + 120
  );

  return { faces, bounds };
}

// Point-in-polygon — ray casting (works for convex/concave; pentagon is convex)
export function pointInPolygon(point: Phaser.Math.Vector2, poly: Phaser.Math.Vector2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Find which face contains a point; return its id or -1
export function locateFace(point: Phaser.Math.Vector2, faces: Face[]): number {
  for (const f of faces) {
    if (pointInPolygon(point, f.points)) return f.id;
  }
  return -1;
}
