/**
 * Process inference for the three demo presets: geometric signals, the
 * detected process with confidence, and a priced option per process.
 *
 * original chunk: process-detection-COxgv9OY.js
 * original exports: i=VIABILITY, n=PROCESS_NAMES, r=PROCESS_SHORT, t=PRESETS
 */

import type { ProcessName } from "./parts";

/** Process key used by presets, tooling and the estimate flow. */
export type ProcessKey = "stamping" | "sand" | "die";
export type PresetKey = "bearing" | "bracket" | "cover";
export type Viability = "recommended" | "viable" | "redesign" | "blocked";

export interface DetectionSignal {
  signal: string;
  value: string;
  implies: string;
  /** Process this signal argues for, or `null` when it only rules others out. */
  favours: ProcessKey | null;
}

/** Billet/blank mass against finished mass for one route. */
export interface MaterialBasis {
  billetKg: number;
  billetLabel: string;
  netKg: number;
  returnLabel: string;
}

export interface ProcessOption {
  key: ProcessKey;
  viability: Viability;
  /** EUR per piece; `null` when the route is not viable. */
  price: number | null;
  material: string;
  toolingCost: number | null;
  toolingPerPiece: number | null;
  toolingLeadWeeks: number | null;
  toolType: string;
  note: string;
  basis?: MaterialBasis;
  breakeven?: string;
}

export interface ProcessInference {
  presetKey: PresetKey;
  partName: string;
  partNumber: string;
  detected: ProcessKey;
  confidence: number;
  scores: Record<ProcessKey, number>;
  annualVolume: number;
  productionLife: number;
  target: number;
  signals: DetectionSignal[];
  options: ProcessOption[];
}

/** Long process names, keyed by `ProcessKey`. */
export const PROCESS_NAMES: Record<string, string> = { stamping: "Stamped Sheet Metal", sand: "Sand Casting", die: "High-Pressure Die Casting" };

/** Catalogue process names (`ProcessName`), keyed by `ProcessKey`. */
export const PROCESS_SHORT: Record<string, ProcessName> = { stamping: "Stamping", sand: "Sand cast", die: "Die cast" };

/** Process inference per preset, keyed by `PresetKey`. */
export const PRESETS: Record<string, ProcessInference> = {
  bearing: {
    presetKey: "bearing",
    partName: "Bearing Housing",
    partNumber: "DTV-HSG-0431",
    detected: "sand",
    confidence: 92,
    scores: { sand: 92, die: 6, stamping: 2 },
    annualVolume: 2000,
    productionLife: 3,
    target: 42,
    signals: [
      {
        signal: "Minimum wall",
        value: "8.0 mm",
        implies: "Above the 4 to 5 mm sand-casting floor and well above the 1.5 to 4 mm band HPDC is economic in",
        favours: "sand",
      },
      {
        signal: "Wall variation",
        value: "8.0 to 22.0 mm",
        implies: "Non-uniform section: needs a process tolerant of heavy sections; cannot come from sheet",
        favours: "sand",
      },
      {
        signal: "Net mass",
        value: "12.4 kg",
        implies: "Exceeds typical cold-chamber shot weight for aluminium (≈ 8 kg), so HPDC is out of range",
        favours: null,
      },
      {
        signal: "Cored features",
        value: "2 internal cores",
        implies: "Sand cores are cheap and disposable; the same form in HPDC needs retracting slides",
        favours: "sand",
      },
      {
        signal: "Draft angle",
        value: "2.0° uniform",
        implies: "Consistent with a sand pattern draw (1 to 3°); die casting runs 0.5 to 1°",
        favours: "sand",
      },
      {
        signal: "Volume / envelope ratio",
        value: "0.40",
        implies: "Hollow cored form rather than a developable sheet blank",
        favours: null,
      },
      {
        signal: "Surface-to-volume",
        value: "1.71 cm⁻¹",
        implies: "Chunky section: no constant-gauge surface to unfold into a blank",
        favours: null,
      },
    ],
    options: [
      {
        key: "sand",
        viability: "recommended",
        price: 48.2,
        material: "GG25",
        toolingCost: 18000,
        toolingPerPiece: 3,
        toolingLeadWeeks: 6,
        toolType: "Pattern & core box set",
        note: "Matches the section thickness, the cored passages and the draft already in the model. No geometry change needed.",
        basis: {
          billetKg: 15.8,
          billetLabel: "Pour weight",
          netKg: 12.4,
          returnLabel: "Returned to foundry",
        },
      },
      {
        key: "die",
        viability: "redesign",
        price: 39.4,
        material: "AlSi10Mg",
        toolingCost: 27600,
        toolingPerPiece: 4.6,
        toolingLeadWeeks: 14,
        toolType: "HPDC die · single cavity",
        note: "Needs the wall taken from 8 mm to 6 mm and a change to AlSi10Mg. Cheaper per piece despite costlier tooling.",
        basis: { billetKg: 3.6, billetLabel: "Shot weight", netKg: 2.82, returnLabel: "Runner & biscuit" },
        breakeven: "€9,600 more tooling, €8.80/pc cheaper: pays back after 1,091 pieces against a 6,000-piece programme",
      },
      {
        key: "stamping",
        viability: "blocked",
        price: null,
        material: "n/a",
        toolingCost: null,
        toolingPerPiece: null,
        toolingLeadWeeks: null,
        toolType: "n/a",
        note: "Not producible from sheet. Sections of 8 to 22 mm and two cored passages have no developable blank.",
      },
    ],
  },
  bracket: {
    presetKey: "bracket",
    partName: "Cab Mount Bracket",
    partNumber: "DTV-BRK-0117",
    detected: "stamping",
    confidence: 96,
    scores: { stamping: 96, die: 3, sand: 1 },
    annualVolume: 24000,
    productionLife: 3,
    target: 5.2,
    signals: [
      {
        signal: "Wall uniformity",
        value: "2.5 mm across 100% of faces",
        implies: "Single-gauge section: the signature of a part formed from sheet",
        favours: "stamping",
      },
      {
        signal: "Developability",
        value: "Unfolds to 312.0 × 148.0 mm",
        implies: "The whole form flattens to one blank, so it can be blanked and folded",
        favours: "stamping",
      },
      {
        signal: "Bend features",
        value: "4 at R4.0 (R/t = 1.6)",
        implies: "Within the formable radius for HC340LA: no cracking at the outer fibre",
        favours: "stamping",
      },
      {
        signal: "Through-features",
        value: "8 pierced ⌀10.5 to 14.0",
        implies: "Pierce stations in a progressive die; no cast cores required",
        favours: "stamping",
      },
      {
        signal: "Draft angle",
        value: "None detected",
        implies: "No draw taper anywhere: a moulded part needs draft to release from the tool",
        favours: null,
      },
      {
        signal: "Section thickness",
        value: "2.5 mm",
        implies: "Below the 4 mm practical minimum wall for sand casting; metal would not fill",
        favours: null,
      },
      {
        signal: "Volume against annual demand",
        value: "1.15 kg at 24,000 pcs/yr",
        implies: "Strip economics at this volume beat any casting tool's payback",
        favours: "stamping",
      },
    ],
    options: [
      {
        key: "stamping",
        viability: "recommended",
        price: 4.85,
        material: "HC340LA",
        toolingCost: 25200,
        toolingPerPiece: 0.35,
        toolingLeadWeeks: 10,
        toolType: "6-station progressive die",
        note: "Constant gauge, developable form and 24,000 pcs/yr: the part is already drawn for stamping.",
        basis: { billetKg: 1.58, billetLabel: "Blank weight", netKg: 1.15, returnLabel: "Offal returned" },
      },
      {
        key: "die",
        viability: "viable",
        price: 7.9,
        material: "AlSi10Mg",
        toolingCost: 31400,
        toolingPerPiece: 0.44,
        toolingLeadWeeks: 13,
        toolType: "HPDC die · single cavity",
        note: "Producible, but €3.05/pc dearer and 3 weeks longer to tool. Only worth it if the bracket has to be aluminium.",
        basis: { billetKg: 0.52, billetLabel: "Shot weight", netKg: 0.39, returnLabel: "Runner & biscuit" },
        breakeven: "Never pays back: the die is dearer to build and dearer per piece",
      },
      {
        key: "sand",
        viability: "blocked",
        price: null,
        material: "n/a",
        toolingCost: null,
        toolingPerPiece: null,
        toolingLeadWeeks: null,
        toolType: "n/a",
        note: "Not producible. A 2.5 mm section is below the sand-casting minimum wall: the mould would not fill reliably.",
      },
    ],
  },
  cover: {
    presetKey: "cover",
    partName: "Gearbox End Cover",
    partNumber: "DTV-CVR-0288",
    detected: "die",
    confidence: 89,
    scores: { die: 89, sand: 8, stamping: 3 },
    annualVolume: 14000,
    productionLife: 3,
    target: 22,
    signals: [
      {
        signal: "Minimum wall",
        value: "3.0 mm uniform",
        implies: "Squarely in the 1.5 to 4 mm band HPDC fills reliably, and below the sand floor",
        favours: "die",
      },
      {
        signal: "Shot mass",
        value: "3.6 kg (2.8 kg net)",
        implies: "Comfortably within cold-chamber shot capacity",
        favours: "die",
      },
      {
        signal: "Projected area",
        value: "302 cm²",
        implies: "246 t separating force at 800 bar: a standard 350 t machine class",
        favours: "die",
      },
      {
        signal: "Rib section",
        value: "4 ribs at 2.2 mm",
        implies: "Thin ribs fill under injection pressure; they would not run in gravity sand",
        favours: "die",
      },
      {
        signal: "Parting line",
        value: "618.0 mm, draft 1.0°",
        implies: "A clean single split with draft: the part was drawn for a two-part tool",
        favours: "die",
      },
      {
        signal: "Topology",
        value: "Closed form with bosses",
        implies: "Raised boss and bolt bosses on a closed body: not developable, cannot be blanked",
        favours: null,
      },
      {
        signal: "Surface note in file",
        value: "As cast, deburred",
        implies: "As-cast finish is only acceptable off a die; sand needs shot blast",
        favours: "die",
      },
    ],
    options: [
      {
        key: "die",
        viability: "recommended",
        price: 19.6,
        material: "AlSi10Mg",
        toolingCost: 24800,
        toolingPerPiece: 0.59,
        toolingLeadWeeks: 12,
        toolType: "HPDC die · single cavity",
        note: "3 mm uniform wall, thin ribs, 1° draft and 14,000 pcs/yr. The part is already drawn for a die.",
        basis: { billetKg: 3.6, billetLabel: "Shot weight", netKg: 2.8, returnLabel: "Runner & biscuit" },
      },
      {
        key: "sand",
        viability: "redesign",
        price: 28,
        material: "GG25",
        toolingCost: 9400,
        toolingPerPiece: 0.22,
        toolingLeadWeeks: 5,
        toolType: "Pattern & core box set",
        note: "Only after the wall goes 3.0 → 5.0 mm. That adds 1.6 kg and €8.40/pc: cheap tooling, expensive part.",
        basis: { billetKg: 6.2, billetLabel: "Pour weight", netKg: 4.4, returnLabel: "Returned to foundry" },
        breakeven: "€15,400 less tooling, €8.40/pc dearer: worse beyond 1,833 pieces against a 42,000-piece programme",
      },
      {
        key: "stamping",
        viability: "blocked",
        price: null,
        material: "n/a",
        toolingCost: null,
        toolingPerPiece: null,
        toolingLeadWeeks: null,
        toolType: "n/a",
        note: "Not producible from sheet. A closed body with a raised boss and eight bolt bosses has no developable blank.",
      },
    ],
  },
};

export const VIABILITY: Record<Viability, { icon: string; label: string }> = {
  recommended: { icon: "✓", label: "Recommended" },
  viable: { icon: "●", label: "Viable" },
  redesign: { icon: "⚠", label: "Needs redesign" },
  blocked: { icon: "✕", label: "Not viable" },
};
