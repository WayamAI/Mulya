/**
 * Three-free part metadata: file locations, sample STEP names, real envelopes,
 * the CAD manifest and download links. Anything that only needs these (page
 * chrome, the STEP readout, the models list) imports this module, so it does
 * not pull three.js into its bundle. `part-source.ts` re-exports all of it.
 */

import type { PartVariant } from "./part-geometry";

export type { PartVariant };

/** The three demo parts. Mirrors `PART_VARIANTS` in `part-geometry.mjs`. */
export const PART_VARIANTS = ["bearing", "bracket", "cover"] as const satisfies readonly PartVariant[];

export const MODELS_BASE = "/models/parts";

export interface PartManifestEntry {
  variant: PartVariant;
  partNumber: string;
  name: string;
  revision: string;
  process: string;
  material: string;
  files: Record<string, string> | string[];
  /** Bounding box, mm. */
  bbox: { x: number; y: number; z: number } | [number, number, number];
  volumeCm3: number;
  massKg: number;
  triangleCount: number;
}

export interface Dimensions {
  x: number;
  y: number;
  z: number;
}

/** Real part envelopes, mm (x × y × z, +Y up). Used when the manifest is missing. */
export const PART_DIMENSIONS: Record<PartVariant, Dimensions> = {
  bearing: { x: 248, y: 186, z: 94 },
  bracket: { x: 186, y: 92, z: 64 },
  cover: { x: 196, y: 196, z: 48 },
};

/** Sample STEP files, as the engineer would receive them. */
export const SAMPLE_STEP_FILES: Record<PartVariant, { file: string; label: string; partNumber: string }> = {
  bearing: {
    file: "DTV-HSG-0431_Bearing-Housing_RevB.step",
    label: "Bearing Housing",
    partNumber: "DTV-HSG-0431",
  },
  bracket: {
    file: "DTV-BRK-0117_Cab-Mount-Bracket_RevB.step",
    label: "Cab Mount Bracket",
    partNumber: "DTV-BRK-0117",
  },
  cover: {
    file: "DTV-CVR-0288_Gearbox-End-Cover_RevC.step",
    label: "Gearbox End Cover",
    partNumber: "DTV-CVR-0288",
  },
};

/** Photoreal finish per process: sand-cast iron, zinc-plated steel, die-cast aluminium. */
export const PART_FINISH: Record<
  PartVariant,
  { label: string; color: number; metalness: number; roughness: number; clearcoat?: number; sheen?: number }
> = {
  bearing: { label: "Grey cast iron · as-cast", color: 0x6a6e70, metalness: 0.72, roughness: 0.58 },
  bracket: { label: "Zinc-plated steel · satin", color: 0xb5bcc2, metalness: 0.92, roughness: 0.3, clearcoat: 0.25 },
  cover: { label: "Die-cast aluminium · semi-matte", color: 0xbfc4c8, metalness: 0.85, roughness: 0.46 },
};

/* ------------------------------------------------------------------ */
/* Manifest                                                            */
/* ------------------------------------------------------------------ */

let manifestPromise: Promise<Partial<Record<PartVariant, PartManifestEntry>> | null> | null = null;

/** The CAD manifest keyed by variant, or `null` when the CAD set is not there. Fetched once per page. */
export function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(`${MODELS_BASE}/manifest.json`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: unknown) => {
        if (!data) return null;
        const list: PartManifestEntry[] = Array.isArray(data)
          ? (data as PartManifestEntry[])
          : Array.isArray((data as { parts?: unknown }).parts)
            ? ((data as { parts: PartManifestEntry[] }).parts)
            : (Object.values(data as Record<string, PartManifestEntry>) as PartManifestEntry[]);
        const byVariant: Partial<Record<PartVariant, PartManifestEntry>> = {};
        for (const entry of list) if (entry && entry.variant) byVariant[entry.variant] = entry;
        return Object.keys(byVariant).length ? byVariant : null;
      })
      .catch(() => null);
  }
  return manifestPromise;
}

/** Normalised bbox of a manifest entry. */
export function manifestDimensions(entry: PartManifestEntry | undefined): Dimensions | null {
  if (!entry?.bbox) return null;
  const b = entry.bbox;
  if (Array.isArray(b)) return { x: b[0], y: b[1], z: b[2] };
  const raw = b as unknown as Record<string, unknown>;
  if (typeof raw.x === "number") return { x: b.x, y: b.y, z: b.z };
  // {min:[..], max:[..]} or {size:[..]}
  if (Array.isArray(raw.size)) return { x: raw.size[0], y: raw.size[1], z: raw.size[2] };
  if (Array.isArray(raw.min) && Array.isArray(raw.max)) {
    const [min, max] = [raw.min as number[], raw.max as number[]];
    return { x: max[0] - min[0], y: max[1] - min[1], z: max[2] - min[2] };
  }
  return null;
}

export interface DownloadLink {
  label: string;
  href: string;
  ext: string;
}

/** Download links for a variant: STEP (named sample), STL and GLB. */
export function downloadLinks(variant: PartVariant, entry?: PartManifestEntry): DownloadLink[] {
  const files = entry?.files;
  const list: string[] = !files ? [] : Array.isArray(files) ? files : Object.values(files);
  const find = (ext: string, fallback: string) => {
    const hit = list.find(
      (file) =>
        file.toLowerCase().endsWith(ext) && !file.toLowerCase().includes("edges") && !file.toLowerCase().includes(".web."),
    );
    const name = hit ?? fallback;
    return name.startsWith("/") ? name : `${MODELS_BASE}/${name.split("/").pop()}`;
  };
  return [
    { label: "STEP AP214", ext: ".step", href: `${MODELS_BASE}/${SAMPLE_STEP_FILES[variant].file}` },
    { label: "STL mesh", ext: ".stl", href: find(".stl", `${variant}.stl`) },
    { label: "glTF binary", ext: ".glb", href: find(".glb", `${variant}.glb`) },
  ];
}
