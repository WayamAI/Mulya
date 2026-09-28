// Tool geometry for the MouldViewer: a two-plate tool (casting pattern or die-cast
// die) and a progressive stamping die set, each carrying one of the three parts.
// Plain ESM so the viewer and `scripts/export-models.mjs` share it. Types live in
// `mould-geometry.d.mts`. All values are copied verbatim from the original chunk,
// including the pre-folded float literals.

import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { buildPart, createBoreMaterial, PART_ACCENT_COLOR } from "./part-geometry.mjs";
import { MOULD_COLORS, MOULD_DEFAULT_OPEN } from "./mould-meta.mjs";

// Three-free constants live in `mould-meta.mjs` so page chrome can use them without three.js.
export { MOULD_COLORS, MOULD_DEFAULT_OPEN, MOULD_KINDS, MOULD_MATERIAL_LABELS } from "./mould-meta.mjs";

/** How far the upper half travels at 100 % open. */
export const MOULD_OPEN_TRAVEL = 2.3;
/** Two-plate tool plate footprint and section sizes. */
export const PLATE_WIDTH = 3.6;
export const PLATE_DEPTH = 2.8;
export const PLATE_THICKNESS = 0.3;
export const WALL_THICKNESS = 0.3;
export const WALL_HEIGHT = 0.75;
export const WALL_INSET = 0.16;

/** One half of a two-plate tool: plate, four walls, optional cavity insert (original `M`). */
export function buildToolHalf(material, insertMaterial, isUpper) {
  const group = new Group();
  group.name = isUpper ? "upper-half" : "lower-half";
  const dir = isUpper ? 1 : -1;
  const plate = new Mesh(new BoxGeometry(PLATE_WIDTH, PLATE_THICKNESS, PLATE_DEPTH), material);
  plate.position.y = dir * 0.9;
  group.add(plate);
  const wallX = PLATE_WIDTH / 2 - WALL_INSET - WALL_THICKNESS / 2;
  const wallZ = PLATE_DEPTH / 2 - WALL_INSET - WALL_THICKNESS / 2;
  const innerWidth = PLATE_WIDTH - 2 * 0.45999999999999996;
  /** @type {{ size: [number, number, number]; at: [number, number] }[]} */
  const walls = [
    { size: [WALL_THICKNESS, WALL_HEIGHT, PLATE_DEPTH - 2 * WALL_INSET], at: [wallX, 0] },
    { size: [WALL_THICKNESS, WALL_HEIGHT, PLATE_DEPTH - 2 * WALL_INSET], at: [-1.4900000000000002, 0] },
    { size: [innerWidth, WALL_HEIGHT, WALL_THICKNESS], at: [0, wallZ] },
    { size: [innerWidth, WALL_HEIGHT, WALL_THICKNESS], at: [0, -1.09] },
  ];
  walls.forEach(({ size, at: [x, z] }) => {
    const wall = new Mesh(new BoxGeometry(...size), material);
    wall.position.set(x, (WALL_HEIGHT / 2) * dir, z);
    group.add(wall);
  });
  if (insertMaterial) {
    const insert = new Mesh(
      new BoxGeometry(innerWidth * 0.8, 0.06, (PLATE_DEPTH - 2 * WALL_INSET) * 0.7),
      insertMaterial,
    );
    insert.position.y = dir * (WALL_HEIGHT - 0.04);
    group.add(insert);
  }
  return group;
}

/** Four guide pillars at the plate corners (original `N`). */
export function buildGuidePillars(material) {
  const group = new Group();
  group.name = "guide-pillars";
  const x = PLATE_WIDTH / 2 - 0.14;
  const z = PLATE_DEPTH / 2 - 0.14;
  [
    [-1.6600000000000001, -1.2599999999999998],
    [x, -1.2599999999999998],
    [-1.6600000000000001, z],
    [x, z],
  ].forEach(([px, pz]) => {
    const pillar = new Mesh(new CylinderGeometry(0.09, 0.09, 3.9499999999999997, 20), material);
    pillar.position.set(px, 0.9249999999999998, pz);
    group.add(pillar);
  });
  return group;
}

/** Sprue bush / pouring cup on the upper half (original `P`). */
export function buildSprue(material) {
  const group = new Group();
  group.name = "sprue";
  const cup = new Mesh(new CylinderGeometry(0.34, 0.17, 0.7, 28), material);
  cup.position.set(-0.95, 1.4, 0);
  group.add(cup);
  return group;
}

/** Runner and two gates, shown in the part colour (original `F`). */
export function buildRunner(material) {
  const group = new Group();
  group.name = "runner";
  const runner = new Mesh(new BoxGeometry(0.85, 0.11, 0.2), material);
  runner.position.set(-0.92, -0.055, 0);
  group.add(runner);
  [-0.26, 0.26].forEach((z) => {
    const gate = new Mesh(new BoxGeometry(0.32, 0.07, 0.14), material);
    gate.position.set(-0.4, -0.05, z);
    group.add(gate);
  });
  return group;
}

/** Side-action slides with their cylinders; `count` of 1 to 3 (original `I`). */
export function buildSlides(material, count) {
  const group = new Group();
  group.name = "slides";
  [
    [2.08, 0],
    [-2.08, 0],
    [0, 1.68],
  ]
    .slice(0, count)
    .forEach(([x, z]) => {
      const alongX = x !== 0;
      const slide = new Mesh(
        new BoxGeometry(alongX ? 0.55 : 0.8, 0.5, alongX ? 0.8 : 0.55),
        material,
      );
      slide.position.set(x, -0.3, z);
      group.add(slide);
      const rod = new Mesh(new CylinderGeometry(0.06, 0.06, 0.55, 14), material);
      rod.rotation.z = alongX ? Math.PI / 2 : 0;
      rod.rotation.x = alongX ? 0 : Math.PI / 2;
      rod.position.set(alongX ? x + Math.sign(x) * 0.5 : 0, -0.3, alongX ? z : z + 0.5);
      group.add(rod);
    });
  return group;
}

/** Ejector pins and ejector plate under the lower half (original `L`). */
export function buildEjectors(material) {
  const group = new Group();
  group.name = "ejectors";
  const top = -1.05;
  [
    [-0.7, -0.5],
    [0.7, -0.5],
    [-0.7, 0.5],
    [0.7, 0.5],
    [0, 0],
  ].forEach(([x, z]) => {
    const pin = new Mesh(new CylinderGeometry(0.05, 0.05, 0.7, 12), material);
    pin.position.set(x, top - 0.35, z);
    group.add(pin);
  });
  const plate = new Mesh(new BoxGeometry(2.2, 0.14, 1.6), material);
  plate.position.y = top - 0.77;
  group.add(plate);
  return group;
}

/** Stacked core boxes beside a casting pattern; `count` stacks (original `R`). */
export function buildCoreBoxes(material, count) {
  const group = new Group();
  group.name = "core-boxes";
  for (let i = 0; i < count; i++) {
    const stack = new Group();
    [0, 0.36].forEach((y) => {
      const box = new Mesh(new BoxGeometry(0.8, 0.28, 0.7), material);
      box.position.y = y;
      stack.add(box);
    });
    stack.position.set(2.7, -0.91, -0.55 + i * 1.1);
    group.add(stack);
  }
  return group;
}

/** Progressive die set: punch holder, die shoe, strip and the part (original `z`). */
export function buildProgressiveDie(material, partMaterial, variant, boreMaterial) {
  const upper = new Group();
  upper.name = "upper-die";
  const lower = new Group();
  lower.name = "lower-die";
  const statics = new Group();
  statics.name = "strip";

  const upperShoe = new Mesh(new BoxGeometry(5, 0.4, 2), material);
  upperShoe.position.y = 0.92;
  upper.add(upperShoe);
  const punchPlate = new Mesh(new BoxGeometry(4.6, 0.3, 1.6), material);
  punchPlate.position.y = 0.57;
  upper.add(punchPlate);
  /** @type {[number, "round" | "form"][]} */
  const stations = [
    [-1.9, "round"],
    [-1.15, "round"],
    [-0.4, "form"],
    [0.35, "form"],
    [1.1, "form"],
    [1.85, "form"],
  ];
  stations.forEach(([x, shape]) => {
    const punch =
      shape === "round"
        ? new Mesh(new CylinderGeometry(0.1, 0.1, 0.68, 18), material)
        : new Mesh(new BoxGeometry(0.38, 0.68, 0.62), material);
    punch.position.set(x, 0.08, 0);
    upper.add(punch);
  });

  const lowerShoe = new Mesh(new BoxGeometry(5, 0.4, 2), material);
  lowerShoe.position.y = -0.92;
  lower.add(lowerShoe);
  const dieBlock = new Mesh(new BoxGeometry(4.6, 0.3, 1.6), material);
  dieBlock.position.y = -0.57;
  lower.add(dieBlock);
  [
    [-2.3, -0.85],
    [2.3, -0.85],
    [-2.3, 0.85],
    [2.3, 0.85],
  ].forEach(([x, z]) => {
    const post = new Mesh(new CylinderGeometry(0.08, 0.08, 4.3, 16), material);
    post.position.set(x, 1.0299999999999998, z);
    lower.add(post);
  });

  const strip = new Mesh(new BoxGeometry(6.2, 0.07, 1.05), partMaterial);
  statics.add(strip);
  const part = buildPart(variant, partMaterial, boreMaterial);
  part.scale.setScalar(0.32);
  part.position.set(2.6, 0.2, 0);
  part.rotation.y = 0.25;
  statics.add(part);
  return { upper, lower, statics };
}

/** Tool body material for a kind. */
export function createToolMaterial(kind) {
  const material = new MeshStandardMaterial({ color: MOULD_COLORS[kind], metalness: 0.2, roughness: 0.55 });
  material.name = `${kind}-tool`;
  return material;
}

/** Part material used inside the tool. */
export function createToolPartMaterial() {
  const material = new MeshStandardMaterial({ color: PART_ACCENT_COLOR, metalness: 0.22, roughness: 0.36 });
  material.name = "part";
  return material;
}

/** Upper-half height for an opening fraction 0 to 1. */
export function openOffset(fraction) {
  return fraction * MOULD_OPEN_TRAVEL;
}

/**
 * Assembles the full tool exactly as the viewer shows it. `openFraction`
 * (0 closed to 1 open) positions the upper half; defaults to the viewer's 70 %.
 */
export function buildMould(kind, variant, openFraction = MOULD_DEFAULT_OPEN / 100) {
  const toolMaterial = createToolMaterial(kind);
  const partMaterial = createToolPartMaterial();
  const boreMaterial = createBoreMaterial();
  const root = new Group();
  root.name = `mould-${kind}-${variant}`;
  let upper;
  let lower;
  if (kind === "progressive") {
    const die = buildProgressiveDie(toolMaterial, partMaterial, variant, boreMaterial);
    upper = die.upper;
    lower = die.lower;
    root.add(die.statics);
  } else {
    const isDie = kind === "die";
    upper = buildToolHalf(toolMaterial, isDie ? boreMaterial : null, true);
    lower = buildToolHalf(toolMaterial, isDie ? boreMaterial : null, false);
    lower.add(buildGuidePillars(toolMaterial));
    upper.add(buildSprue(toolMaterial));
    lower.add(buildRunner(partMaterial));
    if (isDie) {
      lower.add(buildSlides(toolMaterial, variant === "bearing" ? 3 : 2));
      lower.add(buildEjectors(toolMaterial));
    } else {
      root.add(buildCoreBoxes(toolMaterial, variant === "bearing" ? 2 : 1));
    }
    const part = buildPart(variant, partMaterial, boreMaterial);
    part.rotation.x = -Math.PI / 2;
    part.scale.setScalar(variant === "cover" ? 0.62 : variant === "bracket" ? 0.6 : 0.55);
    part.position.y = variant === "bracket" ? 0.14 : 0.02;
    root.add(part);
  }
  root.add(upper);
  root.add(lower);
  upper.position.y = openOffset(openFraction);
  return { root, upper, lower, materials: { tool: toolMaterial, part: partMaterial, bore: boreMaterial } };
}
