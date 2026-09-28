// Builds real B-rep CAD models of the three demo parts with the OpenCascade kernel
// (replicad + replicad-opencascadejs, WASM) and exports them as STEP AP214, binary
// STL, binary glTF (fine tessellation + vertex normals) and CAD feature-edge lines.
//
// Run with `npm run cad`. Outputs:
//   public/models/parts/{bearing,bracket,cover}.{stl,glb,edges.json}
//   public/models/parts/<PartNumber>_<Name>_Rev<X>.step   (the STEP, under its app file name)
//   public/models/parts/manifest.json
//
// Frame: millimetres, +Y up, origin at the bounding-box centre. The STEP files use the
// same frame as the meshes, so the edge lines and the solids line up one-to-one.
// Dimensions come from the part data the app displays (src/lib/costing/agents.ts,
// the original demo STEP headers); see the per-part notes below.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import opencascade from "replicad-opencascadejs";
import * as R from "replicad";
import { BufferAttribute, BufferGeometry, Mesh, MeshStandardMaterial, Scene } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "models", "parts");

// Mesh quality for GLB/STL (chordal tolerance in mm, angular tolerance in rad).
const MESH = { tolerance: 0.05, angularTolerance: 0.1 };
// Two faces meeting at more than this angle count as a sharp CAD edge.
const SHARP_EDGE_DEG = 18;

// --------------------------------------------------------------------------
// Kernel bootstrap. OpenCascade prints transfer statistics to stdout; keep it quiet.
// --------------------------------------------------------------------------
const OC = await opencascade({
  wasmBinary: await readFile(require.resolve("replicad-opencascadejs/wasm")),
  print: () => {},
  printErr: () => {},
});
R.setOC(OC);

// GLTFExporter reads its Blobs back through FileReader, which Node lacks.
if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class FileReader {
    result = null;
    onload = null;
    onloadend = null;
    onerror = null;
    #finish(promise) {
      promise.then(
        (value) => {
          this.result = value;
          this.onload?.({ target: this });
          this.onloadend?.({ target: this });
        },
        (error) => this.onerror?.(error),
      );
    }
    readAsArrayBuffer(blob) {
      this.#finish(blob.arrayBuffer());
    }
    readAsDataURL(blob) {
      this.#finish(
        blob
          .arrayBuffer()
          .then((buf) => `data:${blob.type || "application/octet-stream"};base64,${Buffer.from(buf).toString("base64")}`),
      );
    }
  };
}

// --------------------------------------------------------------------------
// Modelling helpers
// --------------------------------------------------------------------------
const DEG = Math.PI / 180;
const DRAFT_2 = Math.tan(2 * DEG);

const box = (x0, y0, z0, x1, y1, z1) => R.makeBox([x0, y0, z0], [x1, y1, z1]);
/** Cylinder along +Z from z0 to z1, optionally tapered to r1 at z1 (draft). */
const cylZ = (r, z0, z1, x = 0, y = 0, r1 = r) =>
  r1 === r
    ? R.makeCylinder(r, z1 - z0, [x, y, z0], [0, 0, 1])
    : R.drawCircle(r)
        .sketchOnPlane("XY", [x, y, z0])
        .extrude(z1 - z0, { extrusionProfile: { profile: "linear", endFactor: r1 / r } });
/** Cylinder along +Y from y0 to y1, optionally tapered to r1 at y1. */
const cylY = (r, y0, y1, x = 0, z = 0, r1 = r) =>
  r1 === r
    ? R.makeCylinder(r, y1 - y0, [x, y0, z], [0, 1, 0])
    : R.drawCircle(r)
        .sketchOnPlane("ZX", [x, y0, z])
        .extrude(y1 - y0, { extrusionProfile: { profile: "linear", endFactor: r1 / r } });
/** Cylinder along +X from x0 to x1. */
const cylX = (r, x0, x1, y = 0, z = 0) => R.makeCylinder(r, x1 - x0, [x0, y, z], [1, 0, 0]);
const polyDraw = (pts) => {
  let pen = R.draw(pts[0]);
  for (const p of pts.slice(1)) pen = pen.lineTo(p);
  return pen.close();
};
/** Prism from an (x, y) polygon, extruded along +Z from z0 to z1. */
const prismXY = (pts, z0, z1) => polyDraw(pts).sketchOnPlane("XY", z0).extrude(z1 - z0);
/** Prism from a (y, z) polygon, extruded along +X from x0 to x1. */
const prismYZ = (pts, x0, x1) => polyDraw(pts).sketchOnPlane("YZ", x0).extrude(x1 - x0);
/** Slot (stadium) along X, centred at (cx, cz), extruded along +Y from y0 to y1. */
const slotY = (cx, cz, length, width, y0, y1) =>
  fuseAll([
    box(cx - length / 2, y0, cz - width / 2, cx + length / 2, y1, cz + width / 2),
    cylY(width / 2, y0, y1, cx - length / 2, cz),
    cylY(width / 2, y0, y1, cx + length / 2, cz),
  ]);

const fuseAll = (shapes) => shapes.reduce((acc, s) => acc.fuse(s));
const cutAll = (base, shapes) => shapes.reduce((acc, s) => acc.cut(s), base);

const warnings = [];
/** True when the shape is a single, valid, non-empty solid. */
function isGoodSolid(shape, minVolume = 0) {
  try {
    if (!shape || shape.wrapped.IsNull()) return false;
    if ([...R.iterTopo(shape.wrapped, "solid")].length !== 1) return false;
    const check = new OC.BRepCheck_Analyzer(shape.wrapped, true, false, false);
    const valid = check.IsValid();
    check.delete();
    return valid && R.measureVolume(shape) > minVolume;
  } catch {
    return false;
  }
}
/** Fillet/chamfer that logs and skips instead of aborting when OCC can't build it. */
function tryOp(label, shape, fn) {
  try {
    const out = fn(shape);
    if (!isGoodSolid(out, R.measureVolume(shape) * 0.9)) throw new Error("invalid result");
    return out;
  } catch (error) {
    warnings.push(`${label}: ${error?.message ?? error}`);
    return shape;
  }
}
const near = (a, b, tol = 0.05) => Math.abs(a - b) <= tol;

/**
 * Fillets the edges matching `pick` (a predicate on replicad edges). Tries them all at
 * once; if OCC refuses, falls back to one edge at a time and keeps whatever succeeds.
 */
function filletWhere(label, shape, radius, pick) {
  const all = shape.edges.filter(pick);
  if (!all.length) {
    warnings.push(`${label}: no edges matched`);
    return shape;
  }
  const v0 = R.measureVolume(shape);
  try {
    const out = shape.fillet(radius, (f) => f.inList(all));
    if (isGoodSolid(out, v0 * 0.9)) return out;
  } catch {
    /* fall through */
  }
  let current = shape;
  let done = 0;
  let failed = 0;
  // Edges are re-found by their midpoint after every successful fillet.
  const mids = all.map((e) => e.pointAt(0.5));
  for (const m of mids) {
    const target = current.edges.find((e) => pick(e) && e.pointAt(0.5).sub(m).Length < 0.05);
    if (!target) continue;
    try {
      const out = current.fillet(radius, (f) => f.inList([target]));
      if (!isGoodSolid(out, v0 * 0.9)) throw new Error("invalid");
      current = out;
      done++;
    } catch {
      failed++;
    }
  }
  if (failed) warnings.push(`${label}: ${done}/${all.length} edges filleted, ${failed} failed`);
  return current;
}

// --------------------------------------------------------------------------
// 1. Bearing housing DTV-HSG-0431 Rev B: sand-cast EN-GJL-250 (GG25)
//    Envelope 248 x 186 x 94, bore Ø120 through (axis Z, at the envelope centre),
//    6 x M12 on PCD 168 at 0/60/.../300 deg, walls 8 to 22 mm, 2 cored pockets, 2° draft.
//    Built with the bore axis at x = y = 0 and z from 0 (rear) to 94 (front),
//    matching the original STEP envelope (-124,-93,0)..(124,93,94).
// --------------------------------------------------------------------------
function buildBearing() {
  const BORE_R = 60; // Ø120
  const PCD_R = 84; // PCD 168
  const BODY_R = P.bearing.bodyR; // barrel wall over the bore at the crown (range 8 to 22)
  const Y_BASE = -93;
  const BASE_T = P.bearing.baseT;
  const Y_BASE_TOP = Y_BASE + BASE_T;
  const Z_FRONT = 86; // front flange face; the register spigot runs on to 94
  const Z_REAR = 4; // rear face; the rear seal hub runs back to 0
  const rTip = (r, len) => r - len * DRAFT_2;
  const boltXY = (i) => [PCD_R * Math.cos(i * 60 * DEG), PCD_R * Math.sin(i * 60 * DEG)];

  // Barrel, drafted 2° each way from the parting plane (z = 45).
  const zMid = 45;
  const barrel = fuseAll([
    cylZ(BODY_R, zMid, Z_FRONT, 0, 0, rTip(BODY_R, Z_FRONT - zMid)),
    cylZ(rTip(BODY_R, zMid - Z_REAR), Z_REAR, zMid, 0, 0, BODY_R),
  ]);

  // Front bolting flange: Ø168 disc with six lugs, concave corners blended R10 in the sketch.
  let flangeOutline = R.drawCircle(P.bearing.flangeR);
  for (let i = 0; i < 6; i++) flangeOutline = flangeOutline.fuse(R.drawCircle(13).translate(...boltXY(i)));
  flangeOutline = flangeOutline.fillet(10);
  const FL_T = P.bearing.flangeT;
  const flange = flangeOutline
    .sketchOnPlane("XY", Z_FRONT - FL_T)
    .extrude(FL_T, { extrusionProfile: { profile: "linear", endFactor: 1 } });

  // Rear flange: same lobed outline (cast-on lugs, not drilled), drafted towards the front.
  const rearRim = flangeOutline
    .sketchOnPlane("XY", Z_REAR)
    .extrude(P.bearing.rimT, { extrusionProfile: { profile: "linear", endFactor: 1 - (P.bearing.rimT * DRAFT_2) / 90 } });

  // Front register spigot Ø140 x 8 and rear seal hub Ø146 x 4.
  const spigot = cylZ(70, Z_FRONT - 0.5, 94);
  const rearHub = cylZ(73, 0, Z_REAR + 0.5);

  // Pedestal web between barrel and foot (sloped flanks ≈ draft + load path).
  const pedestal = prismXY(
    [
      [-106, Y_BASE_TOP - 1],
      [106, Y_BASE_TOP - 1],
      [80, -20],
      [-80, -20],
    ],
    P.bearing.pedZ0,
    P.bearing.pedZ1,
  );

  // Base foot, rounded plan corners.
  const base = R.drawRoundedRectangle(248, P.bearing.baseDepth, 16)
    .sketchOnPlane("XZ", [0, Y_BASE_TOP, Z_FRONT - P.bearing.baseDepth / 2])
    .extrude(BASE_T);

  // Side gussets from the foot out to the barrel equator, between the foot slots.
  const gusset = (sx) => {
    const pts = [
      [sx * 60, Y_BASE_TOP - 1],
      [sx * 116, Y_BASE_TOP - 1],
      [sx * 116, Y_BASE_TOP + 4],
      [sx * 77, -6],
      [sx * 60, -6],
    ];
    return prismXY(sx > 0 ? pts : pts.reverse(), 45 - P.bearing.gussetT / 2, 45 + P.bearing.gussetT / 2);
  };

  // Grease-nipple boss on the crown (reaches the top of the 186 envelope).
  const greaseBoss = cylY(12, 60, 93, 0, 45, 12 - 33 * DRAFT_2);

  let body = fuseAll([barrel, flange, rearRim, spigot, rearHub, pedestal, base, gusset(1), gusset(-1), greaseBoss]);

  // Cast fillets: every concave edge along the top of the foot (pedestal + gussets).
  const onFootTop = (e) => {
    const b = e.boundingBox.bounds;
    return (
      near(b[0][1], Y_BASE_TOP, 0.01) &&
      near(b[1][1], Y_BASE_TOP, 0.01) &&
      b[0][0] > -118 && b[1][0] < 118 && b[0][2] > Z_FRONT - P.bearing.baseDepth + 1 && b[1][2] < Z_FRONT - 1
    );
  };
  body = filletWhere("bearing: foot fillet", body, 5, onFootTop);
  // Gusset / pedestal blends into the barrel and flange.
  body = filletWhere("bearing: web fillet", body, 4, (e) => {
    const b = e.boundingBox.bounds;
    return b[0][1] > Y_BASE_TOP + 1 && b[1][1] < 10 && b[0][2] > 5 && b[1][2] < 85 && e.geomType !== "CIRCLE";
  });

  // Machined bore Ø120 through.
  body = body.cut(cylZ(BORE_R, -1, 95));
  // Grease groove in the bore + grease feed Ø8.5 from the crown boss, with spot face.
  body = body.cut(cylZ(63.5, 37, 53));
  body = body.cut(cylY(4.25, 30, 94, 0, 45));
  body = body.cut(cylY(9, 92, 94, 0, 45));

  // 6 x M12 tapped holes (tap drill Ø10.2 x 26 deep, Ø13.2 thread-start counterbore).
  const taps = [];
  for (let i = 0; i < 6; i++) {
    const [x, y] = boltXY(i);
    taps.push(cylZ(5.1, Z_FRONT - 26, 95, x, y));
    taps.push(cylZ(6.6, Z_FRONT - 1.5, 95, x, y));
  }
  body = cutAll(body, taps);

  // Foot mounting: 4 x slot 14 x 24 along X, with Ø26 spot faces.
  const feet = [];
  for (const sx of [-1, 1]) {
    for (const z of [45 - P.bearing.slotZ, 45 + P.bearing.slotZ]) {
      feet.push(slotY(sx * 104, z, 10, 14, Y_BASE - 1, Y_BASE_TOP + 20));
      feet.push(slotY(sx * 104, z, 10, 26, Y_BASE_TOP - 1.5, Y_BASE_TOP + 20));
    }
  }
  body = cutAll(body, feet);

  // Two cored pockets in the underside of the foot/pedestal (sand cores), drafted.
  const pocket = (sx) =>
    R.drawRoundedRectangle(P.bearing.pocketW, P.bearing.pocketD, 8)
      .sketchOnPlane("XZ", [sx * P.bearing.pocketX, P.bearing.pocketTop, 45])
      .extrude(P.bearing.pocketTop - Y_BASE + 1, {
        extrusionProfile: { profile: "linear", endFactor: 1 + ((P.bearing.pocketTop - Y_BASE) * DRAFT_2 * 2) / P.bearing.pocketW },
      });
  body = body.cut(pocket(1)).cut(pocket(-1));

  // Chamfers on the machined bore ends and the register.
  for (const z of [0, 94]) {
    body = tryOp(`bearing: bore chamfer z=${z}`, body, (s) =>
      s.chamfer(2, (e) => e.ofCurveType("CIRCLE").atDistance(BORE_R, [0, 0, z], 0.01)),
    );
  }
  body = tryOp("bearing: spigot chamfer", body, (s) =>
    s.chamfer(1.5, (e) => e.ofCurveType("CIRCLE").atDistance(70, [0, 0, 94], 0.01)),
  );
  body = filletWhere("bearing: foot edge round", body, 2, (e) => {
    const b = e.boundingBox.bounds;
    return near(b[0][1], Y_BASE_TOP, 0.01) && near(b[1][1], Y_BASE_TOP, 0.01) && (b[0][0] < -120 || b[1][0] > 120 || b[0][2] < Z_FRONT - P.bearing.baseDepth + 0.5 || b[1][2] > Z_FRONT - 0.5);
  });

  return body;
}

// Tunable dimensions (tuned so volume x density lands on the stated net mass).
const P = {
  bearing: {
    bodyR: 82,
    baseT: 38,
    baseDepth: 84,
    flangeR: 86,
    flangeT: 42,
    rimT: 26,
    pedZ0: 3,
    pedZ1: 85,
    gussetT: 26,
    slotZ: 27,
    pocketW: 32,
    pocketD: 34,
    pocketX: 40,
    pocketTop: -72,
  },
  cover: {
    flangeTop: 26,
    domeTop: 43,
    domeRise: 2.5,
    lipR: 95,
    lipH: 2.5,
    landInnerR: 76,
    bodyR: 92,
    bossR: 70,
    ribH: 4,
    ribT: 2.2,
    seatZ: 28,
    sealDepth: 9,
    recessR: 50,
    recessDepth: 8,
  },
  bracket: {
    flangeA: 58,
    flangeB: 54,
    dartW: 10,
    dartL: 20,
    flangeHoleZ: 28,
  },
};

// --------------------------------------------------------------------------
// 2. Cab mount bracket DTV-BRK-0117 Rev B: stamped HC340LA, t = 2.5 mm
// --------------------------------------------------------------------------
function buildBracket() {
  const T = 2.5; // sheet thickness
  const RI = 4; // inside bend radius (R/t 1.6)
  const DEPTH = 92; // along the bend lines (Z)
  const H = 64; // formed height
  const JOG = 6; // flange B sits 6 mm above flange A (joggled flange)
  const LEAN = Math.tan(4 * DEG); // walls lean in 4° (die clearance / spring-back)
  const X0 = -93;
  const X1 = 93;
  // Mould-line corners of the sheet centreline (x, y). Flange lengths follow the
  // blank's bend-line spacing (64 / 62 / 72 / 56 / 58), scaled into the 186 envelope.
  const yc0 = T / 2;
  const ycTop = H - T / 2;
  const ycB = JOG + T / 2;
  const xA0 = X0 + P.bracket.flangeA;
  const xA1 = xA0 + (ycTop - yc0) * LEAN;
  const xB0 = X1 - P.bracket.flangeB;
  const xB1 = xB0 - (ycTop - ycB) * LEAN;
  const centre = [
    [X0, yc0],
    [xA0, yc0],
    [xA1, ycTop],
    [xB1, ycTop],
    [xB0, ycB],
    [X1, ycB],
  ];
  // Offset the centreline ±T/2 (mitred), then round each corner with the inside
  // radius on the inner side of the bend and RI + T on the outer side.
  const offsetLine = (pts, d) =>
    pts.map((p, i) => {
      const segN = (a, b) => {
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const l = Math.hypot(dx, dy);
        return [-dy / l, dx / l]; // left normal
      };
      if (i === 0) {
        const n = segN(pts[0], pts[1]);
        return [p[0] + n[0] * d, p[1] + n[1] * d];
      }
      if (i === pts.length - 1) {
        const n = segN(pts[i - 1], pts[i]);
        return [p[0] + n[0] * d, p[1] + n[1] * d];
      }
      const n1 = segN(pts[i - 1], p);
      const n2 = segN(p, pts[i + 1]);
      const m = [n1[0] + n2[0], n1[1] + n2[1]];
      const ml = Math.hypot(...m);
      const cosHalf = (m[0] * n1[0] + m[1] * n1[1]) / ml;
      return [p[0] + (m[0] / ml) * (d / cosHalf), p[1] + (m[1] / ml) * (d / cosHalf)];
    });
  const turn = centre.map((p, i) => {
    if (i === 0 || i === centre.length - 1) return 0;
    const a = centre[i - 1];
    const b = centre[i + 1];
    return Math.sign((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])); // +1 = left turn
  });
  const left = offsetLine(centre, T / 2);
  const right = offsetLine(centre, -T / 2);
  let pen = R.draw(left[0]);
  for (let i = 1; i < left.length; i++) {
    pen = pen.lineTo(left[i]);
    if (i < left.length - 1) pen = pen.customCorner(turn[i] > 0 ? RI : RI + T);
  }
  pen = pen.lineTo(right[right.length - 1]);
  for (let i = right.length - 2; i >= 0; i--) {
    pen = pen.lineTo(right[i]);
    if (i > 0) pen = pen.customCorner(turn[i] > 0 ? RI + T : RI);
  }
  let body = pen.close().sketchOnPlane("XY", -DEPTH / 2).extrude(DEPTH);

  // Two formed darts: stiffening ribs pressed across the flange-to-wall bends (z = 0).
  // Modelled as a rounded wedge on the outside of each bend.
  const dart = (xWallFoot, yFloor, dir) => {
    const w = P.bracket.dartW;
    const L = P.bracket.dartL;
    // Sits on the flange and the wall, stepping round the bend's inside radius so it
    // never breaks through the outside of the bend.
    const tri = [
      [xWallFoot - dir * L, yFloor - 0.6],
      [xWallFoot - dir * RI, yFloor - 0.6],
      [xWallFoot + dir * 0.6, yFloor + RI],
      [xWallFoot + dir * (0.6 + L * LEAN), yFloor + L],
    ];
    const wedge = prismXY(dir > 0 ? tri : [...tri].reverse(), -w / 2, w / 2);
    // Full-round the ridge (the two hypotenuse edges) so it reads as a pressed dart.
    return filletWhere("bracket: dart ridge", wedge, w / 2 - 1.2, (e) => {
      const b = e.boundingBox.bounds;
      return b[1][0] - b[0][0] > 8 && b[1][1] - b[0][1] > 8;
    });
  };
  // Outer faces of the walls at the flange level.
  const wallAOut = (y) => xA0 - T / 2 + (y - yc0) * LEAN;
  const wallBOut = (y) => xB0 + T / 2 - (y - ycB) * LEAN;
  body = body.fuse(dart(wallAOut(T), T, 1)).fuse(dart(wallBOut(JOG + T), JOG + T, -1));

  // Edge trims: R10 corner rounds on the four flange corners.
  body = filletWhere("bracket: flange corners", body, 10, (e) => {
    const b = e.boundingBox.bounds;
    return (near(b[0][0], X0, 0.01) || near(b[1][0], X1, 0.01)) && near(b[1][1] - b[0][1], T, 0.05) && (near(b[0][2], -DEPTH / 2, 0.01) || near(b[1][2], DEPTH / 2, 0.01));
  });

  // Pierced holes (8): 4 x Ø14 in the flanges, 2 x Ø10.5 in the crown, 2 x Ø12 through the walls,
  // plus the crown slot 14 x 34.
  const holes = [];
  const xFa = (X0 + wallAOut(T)) / 2 - 2;
  const xFb = (X1 + wallBOut(JOG + T)) / 2 + 2;
  for (const z of [-P.bracket.flangeHoleZ, P.bracket.flangeHoleZ]) {
    holes.push(cylY(7, -1, H, xFa, z));
    holes.push(cylY(7, -1, H, xFb, z));
  }
  const xCrown = (xA1 + xB1) / 2;
  for (const z of [-32, 32]) holes.push(cylY(5.25, H - 10, H + 1, xCrown, z));
  holes.push(cylX(6, X0 + 20, X1 - 20, 38, 0));
  holes.push(
    fuseAll([
      box(xCrown - 7, H - 10, -17, xCrown + 7, H + 1, 17),
      cylY(7, H - 10, H + 1, xCrown, -17),
      cylY(7, H - 10, H + 1, xCrown, 17),
    ]),
  );
  body = cutAll(body, holes);

  // Drawn stiffening bead on each flange face between the holes.
  return body;
}

// --------------------------------------------------------------------------
// 3. Gearbox end cover DTV-CVR-0288 Rev C: HPDC EN AC-43000 (AlSi10Mg)
// --------------------------------------------------------------------------
function buildCover() {
  const C = P.cover;
  const T1 = Math.tan(1 * DEG); // 1° die-cast draft
  const PCD_R = 86; // PCD 172
  const LAND_T = 1.5; // raised sealing land, Ø182
  const FT = C.flangeTop; // top of the flange
  const Z_BODY = C.domeTop; // top face of the dome
  const Z_TOP = 48; // top of the boss
  const at = (r, a) => [r * Math.cos(a), r * Math.sin(a)];

  // Axisymmetric body as one revolved (r, z) section with its cast fillets and machined
  // chamfers drawn in: sealing land Ø182, flange Ø196, drafted dome, boss, Ø84 bore,
  // Ø92 seal-seat step, bearing recess underneath.
  const pts = [
    [42, C.recessDepth, 1, "chamfer"],
    [C.recessR, C.recessDepth, 0],
    [C.recessR, LAND_T, 0],
    [C.landInnerR, LAND_T, 0],
    [C.landInnerR, 0, 0.5, "chamfer"],
    [91, 0, 0.5, "chamfer"],
    [91, LAND_T, 0],
    [98, LAND_T, 0],
    [98 - (FT + C.lipH - LAND_T) * T1, FT + C.lipH, 0.8],
    [C.lipR, FT + C.lipH, 0.8],
    [C.lipR - C.lipH * T1, FT, 1.5],
    [C.bodyR, FT, 3],
    [C.bodyR - (Z_BODY - FT) * T1, Z_BODY, 4],
    [C.bossR, Z_BODY + C.domeRise, 2],
    [C.bossR - (Z_TOP - Z_BODY) * T1, Z_TOP, 1],
    [46, Z_TOP, 1, "chamfer"],
    [46, Z_TOP - C.sealDepth, 0],
    [42, Z_TOP - C.sealDepth, 0.8, "chamfer"],
  ];
  let pen = R.draw([pts[0][0], pts[0][1]]);
  for (let i = 1; i <= pts.length; i++) {
    const [r, z] = pts[i % pts.length];
    pen = pen.lineTo([r, z]);
    const [, , rad, mode] = pts[i % pts.length];
    if (rad && i < pts.length) pen = pen.customCorner(rad, mode ?? "fillet");
  }
  const section = pen.close();
  let part = section.sketchOnPlane("XZ").revolve([0, 0, 1]);

  // Four radial ribs, 2.2 mm, from the boss over the dome and down to the flange rim,
  // set between the bolt pockets. Profile in (r, z), turned up into the radial plane.
  const ribs = [];
  for (let k = 0; k < 4; k++) {
    const a = 22.5 + 90 * k;
    const rib = prismXY(
      [
        [C.bossR - 3, Z_BODY - 2],
        [C.bodyR - 4, FT - 1],
        [C.lipR - 0.5, FT - 1],
        [C.lipR - 0.5, FT + 2],
        [C.bodyR + 0.5, Z_BODY - 5],
        [C.bodyR - 4, Z_BODY + C.ribH],
        [C.bossR - 2, Math.min(Z_TOP - 0.5, Z_BODY + C.domeRise + C.ribH)],
      ],
      -C.ribT / 2,
      C.ribT / 2,
    );
    ribs.push(rib.rotate(90, [0, 0, 0], [1, 0, 0]).rotate(a, [0, 0, 0], [0, 0, 1]));
  }
  part = fuseAll([part, ...ribs]);
  part = filletWhere("cover: rib crests", part, 0.8, (e) => {
    const b = e.boundingBox.bounds;
    return b[1][2] > FT + 2 && e.geomType === "LINE" && Math.hypot((b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2) > C.bossR - 4 &&
      (b[1][2] - b[0][2] > 3 || Math.hypot(b[1][0] - b[0][0], b[1][1] - b[0][1]) > 10) && b[1][2] < Z_BODY + C.ribH + 1.2 && b[0][2] > FT + 1;
  });

  // Bolt pockets: Ø18 cast pockets down to the bolt seat, Ø9 clearance (8 x M8 on PCD 172).
  const cuts = [];
  for (let i = 0; i < 8; i++) {
    const [x, y] = at(PCD_R, i * 45 * DEG);
    cuts.push(cylZ(9, C.seatZ, Z_TOP + 1, x, y));
    cuts.push(cylZ(4.5, -1, C.seatZ + 1, x, y));
  }
  part = cutAll(part, cuts);
  part = filletWhere("cover: pocket floor", part, 1.5, (e) => {
    if (e.geomType !== "CIRCLE") return false;
    const b = e.boundingBox.bounds;
    return near(b[0][2], C.seatZ, 0.01) && near(b[1][2], C.seatZ, 0.01) && b[1][0] - b[0][0] > 12;
  });
  return part;
}

// --------------------------------------------------------------------------
// Part table
// --------------------------------------------------------------------------
const PARTS = [
  {
    variant: "bearing",
    partNumber: "DTV-HSG-0431",
    name: "Bearing Housing",
    revision: "B",
    process: "Sand casting",
    material: "EN-GJL-250 (GG25)",
    densityGcm3: 7.2,
    targetMassKg: 12.4,
    appFileName: "DTV-HSG-0431_Bearing-Housing_RevB.step",
    color: 0x8b9092,
    metalness: 0.45,
    roughness: 0.62,
    build: buildBearing,
  },
  {
    variant: "bracket",
    partNumber: "DTV-BRK-0117",
    name: "Cab Mount Bracket",
    revision: "B",
    process: "Progressive stamping",
    material: "HC340LA (EN 10268), t 2.5 mm",
    densityGcm3: 7.85,
    targetMassKg: 1.15,
    appFileName: "DTV-BRK-0117_Cab-Mount-Bracket_RevB.step",
    color: 0xc2cad1,
    metalness: 0.78,
    roughness: 0.26,
    build: buildBracket,
  },
  {
    variant: "cover",
    partNumber: "DTV-CVR-0288",
    name: "Gearbox End Cover",
    revision: "C",
    process: "High-pressure die casting",
    material: "EN AC-43000 (AlSi10Mg)",
    densityGcm3: 2.68,
    targetMassKg: 2.8,
    appFileName: "DTV-CVR-0288_Gearbox-End-Cover_RevC.step",
    color: 0xdadee1,
    metalness: 0.62,
    roughness: 0.34,
    // Many small fillets and ribs: at the 0.05 mm / 0.1 rad default this part meshed to
    // ~127k triangles (3.2 MB GLB). 0.1 mm chordal + 0.3 rad angular gives ~26k (~0.6 MB);
    // the chordal limit still keeps the large outer arcs smooth at viewer scale.
    mesh: { tolerance: 0.1, angularTolerance: 0.3 },
    build: buildCover,
  },
];


// Header, product record and design notes carried over from the original CostLens demo
// STEP files (which held metadata only). Rev A -> Rev C for the cover, as the app shows.
const STEP_META = {
  bearing: {
    header: {
      description: "Bearing Housing - Rev B - Sand Cast GG25",
      name: "DTV-HSG-0431_Bearing-Housing_RevB",
      timeStamp: "2026-04-28T10:22:14+01:00",
      author: "R. Ehlers",
      organization: "Powertrain Design",
      preprocessor: "CATIA V5R21 - STEP AP214 Export",
      originatingSystem: "CATIA V5R21",
    },
    product: { id: "DTV-HSG-0431", name: "Bearing Housing", description: "Rev B - 8mm nominal wall - sand cast GG25" },
    notes: [
      ["MATERIAL", "EN-GJL-250 (GG25)"],
      ["TOLERANCE", "ISO 2768-m"],
      ["SURFACE", "Shot blast SA 2.5"],
      ["NET_MASS_KG", "12.4"],
      ["POUR_MASS_KG", "15.8"],
      ["VOLUME_CM3", "1722.2"],
      ["SURFACE_AREA_CM2", "2948.0"],
      ["BOUNDING_BOX_MM", "248.0 x 186.0 x 94.0"],
      ["MIN_WALL_MM", "8.0"],
      ["FACE_COUNT", "148"],
      ["EDGE_COUNT", "392"],
      ["PARTING_LINE_MM", "742.0"],
    ],
  },
  bracket: {
    header: {
      description: "Cab Mount Bracket - Rev B - Stamped HC340LA 2.5mm",
      name: "DTV-BRK-0117_Cab-Mount-Bracket_RevB",
      timeStamp: "2026-05-21T14:08:52+01:00",
      author: "A. Silva",
      organization: "Chassis & Cab Design",
      preprocessor: "CATIA V5R21 - STEP AP214 Export",
      originatingSystem: "CATIA V5R21",
    },
    product: { id: "DTV-BRK-0117", name: "Cab Mount Bracket", description: "Rev B - 2.5mm HC340LA - 4 bends - progressive die" },
    notes: [
      ["MATERIAL", "HC340LA"],
      ["THICKNESS_MM", "2.5"],
      ["TOLERANCE", "ISO 2768-m"],
      ["SURFACE", "KTL e-coat 20um"],
      ["NET_MASS_KG", "1.15"],
      ["BLANK_SIZE_MM", "312.0 x 148.0"],
      ["BLANK_AREA_CM2", "461.8"],
      ["BEND_COUNT", "4"],
      ["PIERCE_COUNT", "8"],
      ["DRAW_DEPTH_MM", "18.0"],
      ["FACE_COUNT", "86"],
      ["EDGE_COUNT", "214"],
      ["BLANK_PERIMETER_MM", "556.0"],
      ["CUT_LENGTH_MM", "862.0"],
      ["DART_COUNT", "2"],
    ],
  },
  cover: {
    header: {
      description: "Gearbox End Cover - Rev C - HPDC AlSi10Mg",
      name: "DTV-CVR-0288_Gearbox-End-Cover_RevC",
      timeStamp: "2026-06-11T09:41:07+01:00",
      author: "M. Okonkwo",
      organization: "Powertrain Design",
      preprocessor: "CATIA V5R21 - STEP AP214 Export",
      originatingSystem: "CATIA V5R21",
    },
    product: { id: "DTV-CVR-0288", name: "Gearbox End Cover", description: "Rev C - 3.0mm nominal wall - HPDC AlSi10Mg - 2 slides" },
    notes: [
      ["MATERIAL", "EN AC-43000 (AlSi10Mg)"],
      ["TOLERANCE", "ISO 2768-m"],
      ["SURFACE", "As cast, deburred"],
      ["NET_MASS_KG", "2.8"],
      ["SHOT_MASS_KG", "3.6"],
      ["VOLUME_CM3", "1037.0"],
      ["SURFACE_AREA_CM2", "1184.0"],
      ["BOUNDING_BOX_MM", "196.0 x 196.0 x 48.0"],
      ["PROJECTED_AREA_CM2", "260.2"],
      ["MIN_WALL_MM", "3.0"],
      ["SLIDE_COUNT", "2"],
      ["FACE_COUNT", "112"],
      ["EDGE_COUNT", "298"],
      ["PARTING_LINE_MM", "618.0"],
    ],
  },
};

// --------------------------------------------------------------------------
// Export helpers
// --------------------------------------------------------------------------

/** STEP AP214 (IS) export of one named solid, via the XCAF writer. */
function stepAP214(shape, name, color = "#8b9092") {
  const oc = R.getOC();
  const doc = R.createAssembly([{ shape, name, color }]);
  const session = new oc.XSControl_WorkSession();
  const writer = new oc.STEPCAFControl_Writer(session, false);
  writer.SetColorMode(true);
  writer.SetLayerMode(true);
  writer.SetNameMode(true);
  oc.Interface_Static.SetCVal("write.step.unit", "MM");
  oc.Interface_Static.SetIVal("write.surfacecurve.mode", 1);
  oc.Interface_Static.SetIVal("write.precision.mode", 0);
  oc.Interface_Static.SetIVal("write.step.assembly", 2);
  oc.Interface_Static.SetIVal("write.step.schema", 4); // 4 = AP214 IS (AUTOMOTIVE_DESIGN)
  const progress = new oc.Message_ProgressRange();
  const ok = writer.Perform(doc.wrapped, "/export.step", progress);
  if (!ok) throw new Error(`STEP export failed for ${name}`);
  const text = new TextDecoder().decode(oc.FS.readFile("/export.step"));
  oc.FS.unlink("/export.step");
  progress.delete();
  writer.delete();
  session.delete();
  doc.delete?.();
  return text;
}

const stepStr = (s) => `'${String(s).replace(/'/g, "''")}'`;

/** Rewrites the kernel's STEP header/product records with the part's metadata and appends the notes. */
function decorateStep(step, meta) {
  const { header, product, revision, notes } = meta;
  let out = step;
  out = out.replace(
    /FILE_DESCRIPTION\(\([\s\S]*?\),'2;1'\);/,
    `FILE_DESCRIPTION((${stepStr(header.description)}),'2;1');`,
  );
  out = out.replace(
    /FILE_NAME\([\s\S]*?\);\s*\nFILE_SCHEMA/,
    `FILE_NAME(${stepStr(header.name)},${stepStr(header.timeStamp)},(${stepStr(header.author)}),(\n  ${stepStr(
      header.organization,
    )}),${stepStr(header.preprocessor)},${stepStr(header.originatingSystem)},'');\nFILE_SCHEMA`,
  );
  // PRODUCT('<name>','<name>','',(#n)) -> part number, name, description.
  out = out.replace(
    /PRODUCT\('[^']*','[^']*','[^']*',\(/,
    `PRODUCT(${stepStr(product.id)},${stepStr(product.name)},${stepStr(product.description)},(`,
  );
  out = out.replace(
    /PRODUCT_DEFINITION_FORMATION\('[^']*','[^']*',/,
    `PRODUCT_DEFINITION_FORMATION(${stepStr(revision)},'',`,
  );
  // Notes: DESCRIPTIVE_REPRESENTATION_ITEMs in a REPRESENTATION hung off the product definition.
  const ids = [...out.matchAll(/^#(\d+)\s*=/gm)].map((m) => Number(m[1]));
  let next = Math.max(...ids) + 1;
  const pd = out.match(/^#(\d+)\s*=\s*PRODUCT_DEFINITION\(/m)?.[1];
  // The 3D context is the one the B-rep representation uses (not the 2D parametric one).
  const ctx = out.match(/ADVANCED_BREP_SHAPE_REPRESENTATION\([\s\S]*?,#(\d+)\);/)?.[1];
  out = out.replace(/ADVANCED_BREP_SHAPE_REPRESENTATION\(''/, `ADVANCED_BREP_SHAPE_REPRESENTATION(${stepStr(product.id)}`);
  if (pd && ctx && notes.length) {
    const lines = [];
    const itemIds = [];
    for (const [key, value] of notes) {
      itemIds.push(next);
      lines.push(`#${next++} = DESCRIPTIVE_REPRESENTATION_ITEM(${stepStr(key)},${stepStr(value)});`);
    }
    const rep = next++;
    const prop = next++;
    lines.push(`#${rep} = REPRESENTATION('design notes',(${itemIds.map((i) => `#${i}`).join(",")}),#${ctx});`);
    lines.push(`#${prop} = PROPERTY_DEFINITION('design notes','',#${pd});`);
    lines.push(`#${next++} = PROPERTY_DEFINITION_REPRESENTATION(#${prop},#${rep});`);
    out = out.replace(/ENDSEC;\s*END-ISO-10303-21;\s*$/, `${lines.join("\n")}\nENDSEC;\nEND-ISO-10303-21;\n`);
  }
  return out;
}

/** Edge ids (replicad hash codes) of edges where the two faces meet at a real angle. */
function sharpEdgeIds(shape) {
  const records = new Map();
  for (const face of shape.faces) {
    for (const edge of face.edges) {
      const h = edge.hashCode;
      let list = records.get(h);
      if (!list) records.set(h, (list = []));
      let rec = list.find((r) => r.edge.isSame(edge));
      if (!rec) list.push((rec = { edge, faces: [] }));
      if (!rec.faces.some((f) => f.isSame(face))) rec.faces.push(face);
    }
  }
  const sharp = new Set();
  const cosLimit = Math.cos(SHARP_EDGE_DEG * DEG);
  for (const [hash, list] of records) {
    for (const { edge, faces } of list) {
      if (faces.length !== 2) {
        if (faces.length === 1 && !isSeam(edge, faces[0])) sharp.add(hash);
        continue;
      }
      let sharpHere = false;
      for (const t of [0.25, 0.5, 0.75]) {
        const p = edge.pointAt(t);
        const n1 = faces[0].normalAt(p);
        const n2 = faces[1].normalAt(p);
        const c = Math.abs(n1.dot(n2)) / (n1.Length * n2.Length);
        if (c < cosLimit) sharpHere = true;
      }
      if (sharpHere) sharp.add(hash);
    }
  }
  return sharp;
}
/** A seam edge appears twice in the same face (periodic surfaces). */
function isSeam(edge, face) {
  return face.edges.filter((e) => e.isSame(edge)).length > 1;
}

function toBinarySTL(mesh, name) {
  const tris = mesh.triangles.length / 3;
  const buf = Buffer.alloc(84 + tris * 50);
  buf.write(`${name} - Mulya CAD export (mm)`.slice(0, 80), 0, "ascii");
  buf.writeUInt32LE(tris, 80);
  const v = mesh.vertices;
  let o = 84;
  for (let t = 0; t < tris; t++) {
    const [a, b, c] = [mesh.triangles[t * 3], mesh.triangles[t * 3 + 1], mesh.triangles[t * 3 + 2]];
    const ax = v[a * 3], ay = v[a * 3 + 1], az = v[a * 3 + 2];
    const bx = v[b * 3], by = v[b * 3 + 1], bz = v[b * 3 + 2];
    const cx = v[c * 3], cy = v[c * 3 + 1], cz = v[c * 3 + 2];
    let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    for (const f of [nx, ny, nz, ax, ay, az, bx, by, bz, cx, cy, cz]) {
      buf.writeFloatLE(f, o);
      o += 4;
    }
    buf.writeUInt16LE(0, o);
    o += 2;
  }
  return buf;
}

async function toGLB(mesh, part) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(mesh.vertices), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(mesh.normals), 3));
  const vertexCount = mesh.vertices.length / 3;
  const index = vertexCount > 65535 ? new Uint32Array(mesh.triangles) : new Uint16Array(mesh.triangles);
  geometry.setIndex(new BufferAttribute(index, 1));
  const material = new MeshStandardMaterial({
    color: part.color,
    metalness: part.metalness,
    roughness: part.roughness,
  });
  material.name = `${part.variant}-material`;
  const body = new Mesh(geometry, material);
  body.name = "body";
  body.userData = { partNumber: part.partNumber, revision: part.revision, units: "mm" };
  const scene = new Scene();
  scene.name = part.variant;
  scene.add(body);
  const result = await new GLTFExporter().parseAsync(scene, { binary: true });
  return Buffer.from(result);
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------
const only = process.argv.slice(2);
await mkdir(OUT_DIR, { recursive: true });
const manifestPath = join(OUT_DIR, "manifest.json");
const manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, "utf8")) : { parts: [] };
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

for (const part of PARTS) {
  if (only.length && !only.includes(part.variant)) continue;
  const t0 = Date.now();
  let shape = part.build();
  const bb0 = shape.boundingBox;
  const c = bb0.center;
  shape = shape.translate([-c[0], -c[1], -c[2]]);
  const bb = shape.boundingBox;
  const size = [bb.width, bb.height, bb.depth].map((n) => Math.round(n * 100) / 100);
  const volumeCm3 = R.measureVolume(shape) / 1000;
  const areaCm2 = R.measureArea(shape) / 100;
  const massKg = (volumeCm3 * part.densityGcm3) / 1000;
  const faces = shape.faces.length;
  const edges = shape.edges.length;

  // STEP with the original demo file's header, product record and notes.
  const stub = STEP_META[part.variant];
  const meta = {
    ...stub,
    revision: part.revision,
    notes: [
      ...stub.notes,
      ["MEASURED_VOLUME_CM3", volumeCm3.toFixed(1)],
      ["MEASURED_SURFACE_AREA_CM2", areaCm2.toFixed(1)],
      ["MEASURED_MASS_KG", massKg.toFixed(2)],
      ["MEASURED_BOUNDING_BOX_MM", size.map((n) => n.toFixed(1)).join(" x ")],
      ["MEASURED_FACE_COUNT", String(faces)],
      ["MEASURED_EDGE_COUNT", String(edges)],
    ],
  };
  const step = decorateStep(stepAP214(shape, part.partNumber, `#${part.color.toString(16).padStart(6, "0")}`), meta);
  // One STEP per part, under the name the app links and the sample-upload flow uses.
  await writeFile(join(OUT_DIR, part.appFileName), step);

  // Meshes.
  const mesh = shape.mesh(part.mesh ?? MESH);
  const triangleCount = mesh.triangles.length / 3;
  const stl = toBinarySTL(mesh, part.partNumber);
  await writeFile(join(OUT_DIR, `${part.variant}.stl`), stl);
  const glb = await toGLB(mesh, part);
  await writeFile(join(OUT_DIR, `${part.variant}.glb`), glb);

  // Sharp CAD edges as flat line-segment endpoint pairs.
  const sharp = sharpEdgeIds(shape);
  const edgeMesh = shape.meshEdges({ tolerance: 0.02, angularTolerance: 0.08 });
  const segs = [];
  for (const g of edgeMesh.edgeGroups) {
    if (!sharp.has(g.edgeId)) continue;
    // lines holds a polyline per group: start/count index points (xyz triples).
    const pts = edgeMesh.lines.slice(g.start * 3, (g.start + g.count) * 3);
    for (let i = 0; i + 5 < pts.length; i += 3) {
      segs.push(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5]);
    }
  }
  const edgesJson = JSON.stringify(Array.from(segs, (n) => Math.round(n * 1000) / 1000));
  await writeFile(join(OUT_DIR, `${part.variant}.edges.json`), edgesJson);

  const entry = {
    variant: part.variant,
    partNumber: part.partNumber,
    name: part.name,
    revision: part.revision,
    process: part.process,
    material: part.material,
    densityGcm3: part.densityGcm3,
    files: {
      step: part.appFileName,
      stl: `${part.variant}.stl`,
      glb: `${part.variant}.glb`,
      edges: `${part.variant}.edges.json`,
    },
    units: "mm",
    upAxis: "+Y",
    bbox: size,
    volumeCm3: Math.round(volumeCm3 * 10) / 10,
    surfaceAreaCm2: Math.round(areaCm2 * 10) / 10,
    massKg: Math.round(massKg * 1000) / 1000,
    targetMassKg: part.targetMassKg,
    faceCount: faces,
    edgeCount: edges,
    triangleCount,
    edgeSegmentCount: segs.length / 6,
  };
  manifest.parts = [...manifest.parts.filter((p) => p.variant !== part.variant), entry].sort(
    (a, b) => PARTS.findIndex((p) => p.variant === a.variant) - PARTS.findIndex((p) => p.variant === b.variant),
  );
  const dev = ((massKg / part.targetMassKg - 1) * 100).toFixed(1);
  console.log(
    `${part.variant.padEnd(8)} bbox ${size.join(" x ")} mm | V ${volumeCm3.toFixed(1)} cm3 | m ${massKg.toFixed(
      2,
    )} kg (target ${part.targetMassKg}, ${dev}%) | ${faces} faces ${edges} edges | ${triangleCount} tris | STEP ${kb(
      step.length,
    )} GLB ${kb(glb.length)} STL ${kb(stl.length)} edges ${segs.length / 6} segs | ${((Date.now() - t0) / 1000).toFixed(1)} s`,
  );
}

manifest.generatedBy = "scripts/build-cad.mjs (replicad + OpenCascade)";
manifest.units = "mm";
manifest.upAxis = "+Y";
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
for (const w of warnings) console.warn(`warning: ${w}`);
