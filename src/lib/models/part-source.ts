/**
 * Where the 3D viewers get part geometry from. The real CAD exports live in
 * `public/models/parts/` (GLB mesh `body` in millimetres, +Y up, centred, plus
 * `<variant>.edges.json` feature edges and a `manifest.json`). When those are
 * missing the procedural `buildPart()` solid is used instead, scaled to roughly
 * millimetres, so a viewport is never empty. Results are cached per variant and
 * the geometries are flagged `userData.shared` so viewers never dispose them.
 *
 * The viewer prefers `<variant>.web.glb` (`npm run models:web`): the same mesh
 * plus the feature edges as a LINES node `edges`, quantized and
 * meshopt-compressed. When it is missing it falls back to `<variant>.glb` plus
 * `<variant>.edges.json`, which also stay on disk for the Download menu.
 */

import {
  BufferGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  type LineSegments,
  type Material,
  Matrix4,
  type Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildPart, createBoreMaterial, createPartMaterial, type PartVariant } from "./part-geometry";

import {
  loadManifest,
  MODELS_BASE,
  PART_DIMENSIONS,
  PART_FINISH,
} from "./part-meta";

// Three-free metadata lives in `part-meta.ts`; re-exported so old import paths keep working.
export {
  downloadLinks,
  loadManifest,
  manifestDimensions,
  MODELS_BASE,
  PART_DIMENSIONS,
  PART_FINISH,
  PART_VARIANTS,
  SAMPLE_STEP_FILES,
  type Dimensions,
  type DownloadLink,
  type PartManifestEntry,
} from "./part-meta";

export interface PartModel {
  /** Body geometry; when `slots === 2` group 0 is the body and group 1 the bores. */
  geometry: BufferGeometry;
  /** Feature-edge line segments in the same frame. */
  edges: BufferGeometry;
  slots: 1 | 2;
  source: "cad" | "procedural";
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

const cache = new Map<PartVariant, Promise<PartModel>>();

function markShared(geometry: BufferGeometry) {
  geometry.userData.shared = true;
  return geometry;
}

/** Procedural fallback: merged solid scaled to real size (mm), bores as a second group. */
function proceduralModel(variant: PartVariant): PartModel {
  const body = createPartMaterial(variant);
  const bore = createBoreMaterial();
  const group = buildPart(variant, body, bore);
  group.position.set(0, 0, 0);
  group.updateMatrixWorld(true);
  const bodyParts: BufferGeometry[] = [];
  const boreParts: BufferGeometry[] = [];
  group.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    // Keep only position/normal so every input has the same attributes.
    for (const name of Object.keys(geometry.attributes)) {
      if (name !== "position" && name !== "normal") geometry.deleteAttribute(name);
    }
    (mesh.material === bore ? boreParts : bodyParts).push(geometry);
    mesh.geometry.dispose();
  });
  body.dispose();
  bore.dispose();
  const bodyGeometry = mergeGeometries(bodyParts) as BufferGeometry;
  const boreGeometry = boreParts.length ? (mergeGeometries(boreParts) as BufferGeometry) : null;
  const merged = boreGeometry
    ? (mergeGeometries([bodyGeometry, boreGeometry], true) as BufferGeometry)
    : bodyGeometry;
  merged.computeBoundingBox();
  const box = merged.boundingBox!;
  const center = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  // Uniform scale so the longest side matches the real part.
  const real = PART_DIMENSIONS[variant];
  const scale = Math.max(real.x, real.y, real.z) / Math.max(size.x, size.y, size.z);
  const toMm = new Matrix4().makeScale(scale, scale, scale).multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z));
  merged.applyMatrix4(toMm);
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  const edges = new EdgesGeometry(bodyGeometry.applyMatrix4(toMm), 28);
  return {
    geometry: markShared(merged),
    edges: markShared(edges),
    slots: boreGeometry ? 2 : 1,
    source: "procedural",
  };
}

/**
 * Plain float copy of a (possibly quantized, normalized-int) geometry with the
 * node transform baked in, keeping only position, normal and the index.
 */
function bakeFloat(source: BufferGeometry, matrix: Matrix4) {
  const geometry = new BufferGeometry();
  for (const name of ["position", "normal"] as const) {
    const attribute = source.getAttribute(name);
    if (!attribute) continue;
    const array = new Float32Array(attribute.count * 3);
    for (let i = 0; i < attribute.count; i++) {
      array[i * 3] = attribute.getX(i);
      array[i * 3 + 1] = attribute.getY(i);
      array[i * 3 + 2] = attribute.getZ(i);
    }
    geometry.setAttribute(name, new Float32BufferAttribute(array, 3));
  }
  if (source.index) geometry.setIndex(source.index.clone());
  return geometry.applyMatrix4(matrix);
}

/** One compressed file: body mesh plus feature edges (node `edges`). */
async function webModel(variant: PartVariant): Promise<PartModel> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(`${MODELS_BASE}/${variant}.web.glb`);
  gltf.scene.updateMatrixWorld(true);
  let body: Mesh | null = null;
  let lines: LineSegments | null = null;
  gltf.scene.traverse((node) => {
    const candidate = node as Mesh & LineSegments;
    if (candidate.isLineSegments && (candidate.name === "edges" || candidate.parent?.name === "edges")) lines = candidate;
    else if (candidate.isMesh && (!body || candidate.name === "body")) body = candidate;
  });
  if (!body || !lines) throw new Error(`incomplete ${variant}.web.glb`);
  const found = body as Mesh;
  const edgeNode = lines as LineSegments;
  const geometry = bakeFloat(found.geometry, found.matrixWorld);
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const edges = bakeFloat(edgeNode.geometry, edgeNode.matrixWorld);
  gltf.scene.traverse((node) => {
    const m = node as Mesh;
    if (m.isMesh || (node as LineSegments).isLineSegments) {
      m.geometry.dispose();
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat: Material) => mat.dispose());
    }
  });
  return { geometry: markShared(geometry), edges: markShared(edges), slots: 1, source: "cad" };
}

async function cadModel(variant: PartVariant): Promise<PartModel> {
  const gltf = await new GLTFLoader().loadAsync(`${MODELS_BASE}/${variant}.glb`);
  gltf.scene.updateMatrixWorld(true);
  let mesh: Mesh | null = null;
  gltf.scene.traverse((node) => {
    const candidate = node as Mesh;
    if (!candidate.isMesh) return;
    if (!mesh || candidate.name === "body") mesh = candidate;
  });
  if (!mesh) throw new Error(`no mesh in ${variant}.glb`);
  const found = mesh as Mesh;
  const geometry = found.geometry.clone().applyMatrix4(new Matrix4().copy(found.matrixWorld));
  for (const name of Object.keys(geometry.attributes)) {
    if (name !== "position" && name !== "normal") geometry.deleteAttribute(name);
  }
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  geometry.clearGroups();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  // Dispose everything the loader made; we keep only the clone.
  gltf.scene.traverse((node) => {
    const m = node as Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat: Material) => mat.dispose());
    }
  });

  let edges: BufferGeometry;
  try {
    const response = await fetch(`${MODELS_BASE}/${variant}.edges.json`);
    if (!response.ok) throw new Error("no edges");
    const data = (await response.json()) as number[] | { segments?: number[]; positions?: number[] };
    const flat = Array.isArray(data) ? data : (data.segments ?? data.positions ?? []);
    if (flat.length < 6) throw new Error("empty edges");
    edges = new BufferGeometry();
    edges.setAttribute("position", new Float32BufferAttribute(flat, 3));
  } catch {
    edges = new EdgesGeometry(geometry, 25);
  }
  return { geometry: markShared(geometry), edges: markShared(edges), slots: 1, source: "cad" };
}

/**
 * CAD geometry for a variant when available, else the procedural solid. The
 * promise is cached per variant, so every viewer of a part on a page shares
 * one fetch and one parse.
 */
export function loadPartModel(variant: PartVariant): Promise<PartModel> {
  let promise = cache.get(variant);
  if (!promise) {
    promise = loadManifest()
      .then((manifest) =>
        manifest?.[variant]
          ? webModel(variant).catch(() => cadModel(variant))
          : Promise.reject(new Error("no manifest")),
      )
      .catch(() => proceduralModel(variant));
    cache.set(variant, promise);
  }
  return promise;
}

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

export function createFinishMaterial(variant: PartVariant) {
  const finish = PART_FINISH[variant];
  const material = new MeshPhysicalMaterial({
    color: finish.color,
    metalness: finish.metalness,
    roughness: finish.roughness,
    clearcoat: finish.clearcoat ?? 0,
    clearcoatRoughness: 0.45,
    envMapIntensity: 1,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  material.name = `${variant}-finish`;
  return material;
}

export function createBoreFinish() {
  return new MeshStandardMaterial({
    color: 0x3c4043,
    metalness: 0.7,
    roughness: 0.42,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}

export const SECTION_CAP_COLOR = new Color(0xd9a44a);
