// Part geometry for the three demo parts (bearing housing, bracket, cover).
// Plain ESM so both the React viewer and `scripts/export-models.mjs` (plain Node)
// can import it. Types live in `part-geometry.d.mts`. Every dimension, colour and
// material value is copied verbatim from the original PartViewer.

import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
} from "three";

/** @type {readonly ["bearing", "bracket", "cover"]} */
export const PART_VARIANTS = ["bearing", "bracket", "cover"];

/** Body material per part (original `Gc`). */
export const PART_MATERIALS = {
  bearing: { color: 0x8b9092, metalness: 0.45, roughness: 0.62 },
  bracket: { color: 0xc2cad1, metalness: 0.78, roughness: 0.26 },
  cover: { color: 0xdadee1, metalness: 0.62, roughness: 0.34 },
};

/** Light steel colour used for the part when shown inside a tool (original `Kc`). */
export const PART_ACCENT_COLOR = 0xd8dee2;

/** Bore / hole material colour (original `Qc`). */
export const BORE_COLOR = 0x4a5052;

/** Resting rotation per part so each reads well in the isometric view. */
export const PART_REST_ROTATION = {
  bearing: [-0.25, 0.5, 0],
  bracket: [-0.5, 0.7, 0],
  cover: [-0.55, 0.35, 0],
};

/** Pillow-block bearing housing (original `qc`). */
export function buildBearing(material, boreMaterial) {
  const group = new Group();
  group.name = "bearing";
  group.add(new Mesh(new BoxGeometry(2.5, 1.9, 1), material));
  const bore = new Mesh(new CylinderGeometry(0.62, 0.62, 1.3, 48, 1, true), boreMaterial);
  bore.rotation.x = Math.PI / 2;
  group.add(bore);
  const lip = new Mesh(new TorusGeometry(0.72, 0.1, 16, 48), material);
  lip.position.z = 0.5;
  group.add(lip);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const bolt = new Mesh(new CylinderGeometry(0.13, 0.13, 1.06, 20), material);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(Math.cos(angle) * 1, Math.sin(angle) * 0.78, 0);
    group.add(bolt);
  }
  const base = new Mesh(new BoxGeometry(2.9, 0.24, 1.2), material);
  base.position.y = -1.05;
  group.add(base);
  return group;
}

/** Formed hat-section bracket (original `Jc`). */
export function buildBracket(material, boreMaterial) {
  const group = new Group();
  group.name = "bracket";
  const t = 0.13;
  const depth = 1.5;
  /** @type {[number, number, number, number, number][]} */
  const segments = [
    [0.95, t, depth, -1.05, 0],
    [t, 1.05, depth, -0.52, 0.53],
    [1.17, t, depth, 0, 1.05],
    [t, 1.05, depth, 0.52, 0.53],
    [0.95, t, depth, 1.05, 0],
  ];
  segments.forEach(([w, h, d, x, y]) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, 0);
    group.add(mesh);
  });
  [-1.25, -0.85, 0.85, 1.25].forEach((x, i) => {
    const hole = new Mesh(new CylinderGeometry(0.115, 0.115, t * 2.2, 20), boreMaterial);
    hole.position.set(x, 0, i % 2 == 0 ? -0.42 : 0.42);
    group.add(hole);
  });
  const slot = new Mesh(new BoxGeometry(0.5, t * 2.2, 0.22), boreMaterial);
  slot.position.set(0, 1.05, 0);
  group.add(slot);
  group.position.y = -0.35;
  return group;
}

/** Round flanged cover (original `Yc`). */
export function buildCover(material, boreMaterial) {
  const group = new Group();
  group.name = "cover";
  const disc = new Mesh(new CylinderGeometry(1.3, 1.3, 0.16, 64), material);
  disc.rotation.x = Math.PI / 2;
  group.add(disc);
  const rim = new Mesh(new TorusGeometry(1.3, 0.085, 16, 64), material);
  group.add(rim);
  const boss = new Mesh(new CylinderGeometry(0.6, 0.68, 0.42, 48), material);
  boss.rotation.x = Math.PI / 2;
  boss.position.z = 0.2;
  group.add(boss);
  const bore = new Mesh(new CylinderGeometry(0.36, 0.36, 0.75, 48, 1, true), boreMaterial);
  bore.rotation.x = Math.PI / 2;
  group.add(bore);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const hole = new Mesh(new CylinderGeometry(0.085, 0.085, 0.3, 20), boreMaterial);
    hole.rotation.x = Math.PI / 2;
    hole.position.set(Math.cos(angle) * 1.05, Math.sin(angle) * 1.05, 0);
    group.add(hole);
  }
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
    const rib = new Mesh(new BoxGeometry(0.55, 0.1, 0.2), material);
    rib.position.set(Math.cos(angle) * 0.85, Math.sin(angle) * 0.85, 0.12);
    rib.rotation.z = angle;
    group.add(rib);
  }
  return group;
}

/** Builds the part for a variant; unknown variants fall back to the bearing (original `Xc`). */
export function buildPart(variant, material, boreMaterial) {
  return variant === "bracket"
    ? buildBracket(material, boreMaterial)
    : variant === "cover"
      ? buildCover(material, boreMaterial)
      : buildBearing(material, boreMaterial);
}

/** Body material for a part variant (original `Zc`). */
export function createPartMaterial(variant) {
  const spec = PART_MATERIALS[variant];
  const material = new MeshStandardMaterial({
    color: spec.color,
    metalness: spec.metalness,
    roughness: spec.roughness,
  });
  material.name = `${variant}-body`;
  return material;
}

/** Dark, double-sided bore material (original `Qc`). */
export function createBoreMaterial() {
  const material = new MeshStandardMaterial({
    color: BORE_COLOR,
    metalness: 0.5,
    roughness: 0.6,
    side: DoubleSide,
  });
  material.name = "bore";
  return material;
}
