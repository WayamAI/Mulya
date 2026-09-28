import type { Group, Material, MeshStandardMaterial } from "three";
import type { PartVariant } from "./part-geometry.mjs";

export type { MouldKind } from "./mould-meta.mjs";
import type { MouldKind } from "./mould-meta.mjs";

export declare const MOULD_KINDS: readonly ["pattern", "die", "progressive"];
export declare const MOULD_OPEN_TRAVEL: number;
export declare const PLATE_WIDTH: number;
export declare const PLATE_DEPTH: number;
export declare const PLATE_THICKNESS: number;
export declare const WALL_THICKNESS: number;
export declare const WALL_HEIGHT: number;
export declare const WALL_INSET: number;
export declare const MOULD_COLORS: Record<MouldKind, number>;
export declare const MOULD_MATERIAL_LABELS: Record<MouldKind, string>;
export declare const MOULD_DEFAULT_OPEN: number;

export declare function buildToolHalf(material: Material, insertMaterial: Material | null, isUpper: boolean): Group;
export declare function buildGuidePillars(material: Material): Group;
export declare function buildSprue(material: Material): Group;
export declare function buildRunner(material: Material): Group;
export declare function buildSlides(material: Material, count: number): Group;
export declare function buildEjectors(material: Material): Group;
export declare function buildCoreBoxes(material: Material, count: number): Group;
export declare function buildProgressiveDie(
  material: Material,
  partMaterial: Material,
  variant: PartVariant,
  boreMaterial: Material,
): { upper: Group; lower: Group; statics: Group };
export declare function createToolMaterial(kind: MouldKind): MeshStandardMaterial;
export declare function createToolPartMaterial(): MeshStandardMaterial;
export declare function openOffset(fraction: number): number;

export interface BuiltMould {
  root: Group;
  upper: Group;
  lower: Group;
  materials: { tool: MeshStandardMaterial; part: MeshStandardMaterial; bore: MeshStandardMaterial };
}

export declare function buildMould(kind: MouldKind, variant: PartVariant, openFraction?: number): BuiltMould;
