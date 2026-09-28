import type { Group, Material, MeshStandardMaterial } from "three";

export type PartVariant = "bearing" | "bracket" | "cover";

export interface MaterialSpec {
  color: number;
  metalness: number;
  roughness: number;
}

export declare const PART_VARIANTS: readonly ["bearing", "bracket", "cover"];
export declare const PART_MATERIALS: Record<PartVariant, MaterialSpec>;
export declare const PART_ACCENT_COLOR: number;
export declare const BORE_COLOR: number;
export declare const PART_REST_ROTATION: Record<PartVariant, [number, number, number]>;

export declare function buildBearing(material: Material, boreMaterial: Material): Group;
export declare function buildBracket(material: Material, boreMaterial: Material): Group;
export declare function buildCover(material: Material, boreMaterial: Material): Group;
export declare function buildPart(variant: PartVariant, material: Material, boreMaterial: Material): Group;
export declare function createPartMaterial(variant: PartVariant): MeshStandardMaterial;
export declare function createBoreMaterial(): MeshStandardMaterial;
