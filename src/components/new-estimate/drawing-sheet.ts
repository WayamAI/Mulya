/**
 * Renders the dimensioned orthographic drawing sheet (front, top, left, right)
 * as a PNG data URL. The sheet is paper: dark ink on white regardless of theme,
 * so its colours are literal.
 */

import {
  Box3,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  type Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { buildPart, type PartVariant } from "@/lib/models/part-geometry";

const SHEET_W = 1600;
const SHEET_H = 1240;
const MARGIN = 40;
const TITLE_BLOCK_H = 150;
const VIEWS_W = SHEET_W - MARGIN * 2;
const VIEWS_H = SHEET_H - MARGIN * 2 - TITLE_BLOCK_H;
const CELL_W = VIEWS_W / 2;
const CELL_H = VIEWS_H / 2;

const INK = "#1f1f1f";
const RULE = "#9a9a9a";
const DIM = "#555555";

const VIEWS: { label: string; dir: [number, number, number]; up: [number, number, number]; axes: [number, number] }[] = [
  { label: "FRONT", dir: [0, 0, 1], up: [0, 1, 0], axes: [0, 1] },
  { label: "TOP", dir: [0, 1, 0], up: [0, 0, -1], axes: [0, 2] },
  { label: "LEFT", dir: [-1, 0, 0], up: [0, 1, 0], axes: [2, 1] },
  { label: "RIGHT", dir: [1, 0, 0], up: [0, 1, 0], axes: [2, 1] },
];

export interface DrawingSheetInfo {
  partName: string;
  partNumber: string;
  revision: string;
  material: string;
  process: string;
  /** Envelope in mm, `[x, y, z]`. */
  bbox: [number, number, number];
  issued: string;
}

type Point = [number, number];

/** Dimension line with arrowheads, extension ticks and a boxed label. */
function dimension(ctx: CanvasRenderingContext2D, from: Point, to: Point, label: string, vertical: boolean) {
  ctx.save();
  ctx.strokeStyle = DIM;
  ctx.fillStyle = DIM;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
  ctx.stroke();
  const arrow = (x: number, y: number, dir: number) => {
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(x, y);
      ctx.lineTo(x - 6 * 0.5, y + 6 * dir);
      ctx.lineTo(x + 6 * 0.5, y + 6 * dir);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6 * dir, y - 6 * 0.5);
      ctx.lineTo(x + 6 * dir, y + 6 * 0.5);
    }
    ctx.closePath();
    ctx.fill();
  };
  arrow(from[0], from[1], 1);
  arrow(to[0], to[1], -1);
  ctx.beginPath();
  if (vertical) {
    ctx.moveTo(from[0] - 5, from[1]);
    ctx.lineTo(from[0] + 5, from[1]);
    ctx.moveTo(to[0] - 5, to[1]);
    ctx.lineTo(to[0] + 5, to[1]);
  } else {
    ctx.moveTo(from[0], from[1] - 5);
    ctx.lineTo(from[0], from[1] + 5);
    ctx.moveTo(to[0], to[1] - 5);
    ctx.lineTo(to[0], to[1] + 5);
  }
  ctx.stroke();
  const mx = (from[0] + to[0]) / 2;
  const my = (from[1] + to[1]) / 2;
  ctx.font = "600 15px ui-monospace, Menlo, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const width = ctx.measureText(label).width + 10;
  ctx.translate(mx, my);
  if (vertical) ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-width / 2, -10, width, 20);
  ctx.fillStyle = INK;
  ctx.fillText(label, 0, 1);
  ctx.restore();
}

/** First-angle projection symbol. */
function projectionSymbol(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x + 16, y, 15, 15, 0, 0, Math.PI * 2);
  ctx.moveTo(x + 25, y);
  ctx.ellipse(x + 16, y, 9, 9, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 44, y - 15);
  ctx.lineTo(x + 74, y - 9);
  ctx.lineTo(x + 74, y + 9);
  ctx.lineTo(x + 44, y + 15);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** Draws the sheet off-screen; returns a PNG data URL, or `null` if WebGL / canvas is unavailable. */
export function renderDrawingSheet(variant: PartVariant, info: DrawingSheetInfo): string | null {
  try {
    const viewsCanvas = document.createElement("canvas");
    viewsCanvas.width = VIEWS_W;
    viewsCanvas.height = VIEWS_H;
    const renderer = new WebGLRenderer({
      canvas: viewsCanvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(2);
    renderer.setSize(VIEWS_W, VIEWS_H, false);
    renderer.setScissorTest(true);

    const scene = new Scene();
    const fill = new MeshBasicMaterial({
      color: 0xf4f4f4,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const part = buildPart(variant, fill, fill);
    scene.add(part);
    const edgeMaterial = new LineBasicMaterial({ color: 0x1f1f1f });
    const edges: LineSegments[] = [];
    part.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const lines = new LineSegments(new EdgesGeometry(mesh.geometry, 22), edgeMaterial);
      lines.position.copy(mesh.position);
      lines.rotation.copy(mesh.rotation);
      lines.scale.copy(mesh.scale);
      edges.push(lines);
    });
    edges.forEach((lines) => part.add(lines));

    const box = new Box3().setFromObject(part);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    const extents = [size.x, size.y, size.z];
    const half = Math.max(size.x, size.y, size.z) * 0.66;
    const aspect = CELL_W / CELL_H;
    const pxPerUnit = CELL_H / (2 * half);

    VIEWS.forEach((view, index) => {
      const camera = new OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 200);
      camera.position.set(center.x + view.dir[0] * 60, center.y + view.dir[1] * 60, center.z + view.dir[2] * 60);
      camera.up.set(...view.up);
      camera.lookAt(center);
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = col * CELL_W;
      const y = VIEWS_H - (row + 1) * CELL_H;
      renderer.setViewport(x, y, CELL_W, CELL_H);
      renderer.setScissor(x, y, CELL_W, CELL_H);
      renderer.render(scene, camera);
    });

    const sheet = document.createElement("canvas");
    sheet.width = SHEET_W;
    sheet.height = SHEET_H;
    const ctx = sheet.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SHEET_W, SHEET_H);
    ctx.drawImage(viewsCanvas, MARGIN, MARGIN, VIEWS_W, VIEWS_H);
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(800, MARGIN);
    ctx.lineTo(800, 1050);
    ctx.moveTo(MARGIN, 545);
    ctx.lineTo(1560, 545);
    ctx.stroke();

    VIEWS.forEach((view, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const left = MARGIN + col * CELL_W;
      const top = MARGIN + row * CELL_H;
      const cx = left + CELL_W / 2;
      const cy = top + CELL_H / 2;
      ctx.fillStyle = INK;
      ctx.font = "600 15px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(view.label, left + 16, top + 12);
      const [h, v] = view.axes;
      const halfW = (extents[h] * pxPerUnit) / 2;
      const halfH = (extents[v] * pxPerUnit) / 2;
      dimension(ctx, [cx - halfW, top + CELL_H - 34], [cx + halfW, top + CELL_H - 34], info.bbox[h].toFixed(1), false);
      dimension(ctx, [left + 34, cy - halfH], [left + 34, cy + halfH], info.bbox[v].toFixed(1), true);
    });

    // Title block.
    const blockTop = SHEET_H - MARGIN - TITLE_BLOCK_H;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(MARGIN, blockTop, VIEWS_W, TITLE_BLOCK_H);
    ctx.beginPath();
    ctx.moveTo(739.2, blockTop);
    ctx.lineTo(739.2, 1200);
    ctx.moveTo(1164.8, blockTop);
    ctx.lineTo(1164.8, 1200);
    ctx.stroke();

    const field = (x: number, y: number, label: string, value: string, large = false) => {
      ctx.fillStyle = DIM;
      ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(label.toUpperCase(), x, y);
      ctx.fillStyle = INK;
      ctx.font = large
        ? "600 22px ui-sans-serif, system-ui, sans-serif"
        : "400 15px ui-monospace, Menlo, Consolas, monospace";
      ctx.fillText(value, x, y + 15);
    };
    field(60, 1068, "Part", info.partName, true);
    field(60, 1116, "Part number", `${info.partNumber}  ·  Rev ${info.revision}`);
    field(60, 1158, "Material", info.material);
    const mid = 759.2;
    field(mid, 1068, "Process", info.process);
    field(mid, 1110, "Envelope", `${info.bbox.map((v) => v.toFixed(1)).join(" × ")} mm`);
    field(mid, 1152, "Units", "Millimetres · not to scale");
    const right = 1184.8;
    ctx.fillStyle = DIM;
    ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("PROJECTION", right, 1068);
    projectionSymbol(ctx, right, 1106);
    ctx.fillStyle = INK;
    ctx.font = "400 13px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("First angle", 1272.8, 1100);
    ctx.fillStyle = DIM;
    ctx.font = "400 12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`Issued ${info.issued}`, right, 1146);
    ctx.fillText("Mūlya v0.1 · reference only", right, 1166);

    const url = sheet.toDataURL("image/png");
    renderer.dispose();
    renderer.forceContextLoss();
    return url;
  } catch {
    return null;
  }
}
