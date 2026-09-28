/**
 * Bearing-housing worked example and cross-part revision history: the seeded
 * scenarios, price breaks and model diagnostics shown on the estimate pages.
 *
 * original chunk: estimate-lXM318t1.js
 * original exports: a=LOT_SIZES, c=MONTHLY_DRIFT, i=FEATURE_IMPORTANCE, l=ALTERNATIVES,
 *   n=BASE_LINES, o=VOLUME_CURVE, r=BASE_DESIGN, s=REVISION_HISTORY, t=QUOTED_ACTUAL
 */

import type { ProcessName } from "./parts";

/** One line of a cost breakdown, in EUR per piece. */
export interface CostLine {
  label: string;
  value: number;
}

/** A priced design scenario (base design, alternative, what-if). */
export interface Scenario {
  id: string;
  label: string;
  price: number;
  /** Saving (or change) against the base, in percent. */
  deltaPct: number;
  lines: CostLine[];
  spec: string;
  /** Key into `TOOLING` (`<preset>-<process>`), or `""` when none. */
  toolKey: string;
}

export interface QuotedActual {
  value: number;
  source: string;
}

/** A price-break row: unit price and lot total at a given volume. */
export interface VolumePoint {
  volume: number;
  unit: number;
  lot: number;
}

export interface Revision {
  rev: string;
  date: string;
  change: string;
  process: ProcessName;
  material: string;
  wall: string;
  cost: number;
  lines: CostLine[];
}

export interface RevisionHistory {
  partName: string;
  partNumber: string;
  programme: string;
  target: number;
  volume: number;
  summary: string;
  revisions: Revision[];
}

export interface DriftPoint {
  month: string;
  value: number;
}

export interface FeatureWeight {
  feature: string;
  weight: number;
}

/** Cost breakdown of the current bearing-housing design (Rev B, sand cast GG25). */
export const BASE_LINES: CostLine[] = [
  { label: "Raw material", value: 15.01 },
  { label: "Return credit", value: -1.02 },
  { label: "Melting & pouring", value: 4.2 },
  { label: "Moulding & cores", value: 5.6 },
  { label: "Fettling", value: 2.1 },
  { label: "Machining", value: 12.9 },
  { label: "Pattern amortisation", value: 3 },
  { label: "Inspection", value: 0.52 },
  { label: "Overhead (8%)", value: 3.38 },
  { label: "Margin (5.5%)", value: 2.51 },
];

export const BASE_DESIGN: Scenario = {
  id: "base",
  label: "Current design: sand cast GG25, 8 mm wall",
  price: 48.2,
  deltaPct: 0,
  lines: BASE_LINES,
  spec: "Sand Cast · GG25 · 12.4 kg",
  toolKey: "bearing-sand",
};

/** Alternative designs for the bearing housing. */
export const ALTERNATIVES: Scenario[] = [
  {
    id: "diecast",
    label: "Switch to die casting (AlSi10Mg)",
    price: 39.4,
    deltaPct: 18,
    spec: "Die Cast · AlSi10Mg · 2.8 kg",
    toolKey: "bearing-die",
    lines: [
      { label: "Raw material", value: 11.52 },
      { label: "Return credit", value: -0.86 },
      { label: "Melting & pouring", value: 3.9 },
      { label: "Die casting machine", value: 4.15 },
      { label: "Trimming", value: 1.05 },
      { label: "Machining", value: 9.8 },
      { label: "Tooling amortisation", value: 4.6 },
      { label: "Inspection", value: 0.42 },
      { label: "Overhead (8%)", value: 2.77 },
      { label: "Margin (5.5%)", value: 2.05 },
    ],
  },
  {
    id: "wall6",
    label: "Reduce wall to 6 mm",
    price: 43,
    deltaPct: 11,
    spec: "Sand Cast · GG25 · 10.6 kg",
    toolKey: "bearing-sand",
    lines: [
      { label: "Raw material", value: 12.85 },
      { label: "Return credit", value: -0.88 },
      { label: "Melting & pouring", value: 3.7 },
      { label: "Moulding & cores", value: 5.1 },
      { label: "Fettling", value: 1.9 },
      { label: "Machining", value: 11.6 },
      { label: "Pattern amortisation", value: 3 },
      { label: "Inspection", value: 0.52 },
      { label: "Overhead (8%)", value: 3.02 },
      { label: "Margin (5.5%)", value: 2.19 },
    ],
  },
  {
    id: "tol",
    label: "Relax tolerance to ±0.15",
    price: 44.1,
    deltaPct: 8,
    spec: "Sand Cast · GG25 · 12.4 kg",
    toolKey: "bearing-sand",
    lines: [
      { label: "Raw material", value: 15.01 },
      { label: "Return credit", value: -1.02 },
      { label: "Melting & pouring", value: 4.2 },
      { label: "Moulding & cores", value: 5.6 },
      { label: "Fettling", value: 2.1 },
      { label: "Machining", value: 9.4 },
      { label: "Pattern amortisation", value: 3 },
      { label: "Inspection", value: 0.38 },
      { label: "Overhead (8%)", value: 3.09 },
      { label: "Margin (5.5%)", value: 2.34 },
    ],
  },
  {
    id: "vol",
    label: "Increase volume to 10,000/yr",
    price: 46.23,
    deltaPct: 4,
    spec: "Sand Cast · GG25 · 12.4 kg",
    toolKey: "bearing-sand",
    lines: [
      { label: "Raw material", value: 15.01 },
      { label: "Return credit", value: -1.02 },
      { label: "Melting & pouring", value: 4.2 },
      { label: "Moulding & cores", value: 5.6 },
      { label: "Fettling", value: 2.1 },
      { label: "Machining", value: 12.9 },
      { label: "Pattern amortisation", value: 1.6 },
      { label: "Inspection", value: 0.52 },
      { label: "Overhead (8%)", value: 3.16 },
      { label: "Margin (5.5%)", value: 2.16 },
    ],
  },
];

export const QUOTED_ACTUAL: QuotedActual = { value: 51.4, source: "Supplier quote · 12 May 2026 · Tier-1 foundry, EU" };

/** Bearing housing (sand cast) price breaks by annual volume. */
export const VOLUME_CURVE: VolumePoint[] = [
  { volume: 500, unit: 58.46, lot: 29230 },
  { volume: 1000, unit: 51.62, lot: 51620 },
  { volume: 2000, unit: 48.2, lot: 96400 },
  { volume: 5000, unit: 47.25, lot: 236250 },
  { volume: 10000, unit: 46.23, lot: 462300 },
];

/** Lot sizes offered for the bearing housing. */
export const LOT_SIZES: number[] = [1, 100, 500, 1000, 2000, 10000];

/** Revision-by-revision cost history for the parts with several revisions. */
export const REVISION_HISTORY: RevisionHistory[] = [
  {
    partName: "Bearing Housing",
    partNumber: "DTV-HSG-0431",
    programme: "HDT-2027",
    target: 42,
    volume: 2000,
    summary: "€14.90 saved per piece · €29,800 / year at 2,000 pcs.",
    revisions: [
      {
        rev: "A",
        date: "12 Mar 2026",
        change: "Sand cast GG25, 10 mm wall",
        process: "Sand cast",
        material: "GG25",
        wall: "10 mm wall",
        cost: 54.3,
        lines: [
          { label: "Raw material", value: 18.62 },
          { label: "Return credit", value: -1.28 },
          { label: "Melting & pouring", value: 4.85 },
          { label: "Moulding / machine", value: 6.4 },
          { label: "Fettling / trimming", value: 2.6 },
          { label: "Machining", value: 14.2 },
          { label: "Tooling amortisation", value: 3 },
          { label: "Inspection", value: 0.61 },
          { label: "Overhead (8%)", value: 3.92 },
          { label: "Margin (5.5%)", value: 2.91 },
        ],
      },
      {
        rev: "B",
        date: "28 Apr 2026",
        change: "Wall reduced to 8 mm",
        process: "Sand cast",
        material: "GG25",
        wall: "8 mm wall",
        cost: 48.2,
        lines: [
          { label: "Raw material", value: 15.01 },
          { label: "Return credit", value: -1.02 },
          { label: "Melting & pouring", value: 4.2 },
          { label: "Moulding / machine", value: 5.6 },
          { label: "Fettling / trimming", value: 2.1 },
          { label: "Machining", value: 12.9 },
          { label: "Tooling amortisation", value: 3 },
          { label: "Inspection", value: 0.52 },
          { label: "Overhead (8%)", value: 3.38 },
          { label: "Margin (5.5%)", value: 2.51 },
        ],
      },
      {
        rev: "C",
        date: "19 Jun 2026",
        change: "Process change to die casting AlSi10Mg, wall 6 mm",
        process: "Die cast",
        material: "AlSi10Mg",
        wall: "6 mm wall",
        cost: 39.4,
        lines: [
          { label: "Raw material", value: 11.52 },
          { label: "Return credit", value: -0.86 },
          { label: "Melting & pouring", value: 3.9 },
          { label: "Moulding / machine", value: 4.15 },
          { label: "Fettling / trimming", value: 1.05 },
          { label: "Machining", value: 9.8 },
          { label: "Tooling amortisation", value: 4.6 },
          { label: "Inspection", value: 0.42 },
          { label: "Overhead (8%)", value: 2.77 },
          { label: "Margin (5.5%)", value: 2.05 },
        ],
      },
    ],
  },
  {
    partName: "Cab Mount Bracket",
    partNumber: "DTV-BRK-0117",
    programme: "HDT-2027",
    target: 5.2,
    volume: 24000,
    summary: "€1.25 saved per piece · €30,000 / year at 24,000 pcs.",
    revisions: [
      {
        rev: "A",
        date: "04 Feb 2026",
        change: "DC04, 3.0 mm, 6 bends",
        process: "Stamping",
        material: "DC04",
        wall: "3.0 mm sheet",
        cost: 6.1,
        lines: [
          { label: "Raw material", value: 2.44 },
          { label: "Return credit", value: -0.31 },
          { label: "Blanking & piercing", value: 0.86 },
          { label: "Forming / bending", value: 1.12 },
          { label: "Machine time", value: 0.42 },
          { label: "Coating (KTL)", value: 0.44 },
          { label: "Tooling amortisation", value: 0.35 },
          { label: "Inspection", value: 0.08 },
          { label: "Overhead (8%)", value: 0.43 },
          { label: "Margin (5.5%)", value: 0.27 },
        ],
      },
      {
        rev: "B",
        date: "21 May 2026",
        change: "HC340LA, 2.5 mm, 4 bends",
        process: "Stamping",
        material: "HC340LA",
        wall: "2.5 mm sheet",
        cost: 4.85,
        lines: [
          { label: "Raw material", value: 1.98 },
          { label: "Return credit", value: -0.26 },
          { label: "Blanking & piercing", value: 0.72 },
          { label: "Forming / bending", value: 0.74 },
          { label: "Machine time", value: 0.36 },
          { label: "Coating (KTL)", value: 0.44 },
          { label: "Tooling amortisation", value: 0.35 },
          { label: "Inspection", value: 0.07 },
          { label: "Overhead (8%)", value: 0.32 },
          { label: "Margin (5.5%)", value: 0.13 },
        ],
      },
    ],
  },
  {
    partName: "Oil Pan",
    partNumber: "DTV-PAN-0073",
    programme: "MDT-2026",
    target: 30,
    volume: 8000,
    summary: "€4.65 saved per piece · €37,200 / year: still €1.75 over target.",
    revisions: [
      {
        rev: "A",
        date: "17 Jan 2026",
        change: "AlSi10Mg, 4 slides",
        process: "Die cast",
        material: "AlSi10Mg",
        wall: "4.0 mm wall",
        cost: 36.4,
        lines: [
          { label: "Raw material", value: 14.72 },
          { label: "Return credit", value: -1.32 },
          { label: "Melting & holding", value: 3.1 },
          { label: "Die casting machine", value: 5.4 },
          { label: "Trimming", value: 1.2 },
          { label: "Machining", value: 7.4 },
          { label: "Tooling amortisation", value: 3.1 },
          { label: "Inspection", value: 0.46 },
          { label: "Overhead (8%)", value: 1.84 },
          { label: "Margin (5.5%)", value: 0.5 },
        ],
      },
      {
        rev: "B",
        date: "09 Apr 2026",
        change: "AlSi9Cu3, 3 slides",
        process: "Die cast",
        material: "AlSi9Cu3",
        wall: "3.5 mm wall",
        cost: 33.2,
        lines: [
          { label: "Raw material", value: 13.57 },
          { label: "Return credit", value: -1.26 },
          { label: "Melting & holding", value: 3 },
          { label: "Die casting machine", value: 4.6 },
          { label: "Trimming", value: 1.05 },
          { label: "Machining", value: 6.9 },
          { label: "Tooling amortisation", value: 2.7 },
          { label: "Inspection", value: 0.42 },
          { label: "Overhead (8%)", value: 1.72 },
          { label: "Margin (5.5%)", value: 0.5 },
        ],
      },
      {
        rev: "C",
        date: "02 Jul 2026",
        change: "Wall 3.5 → 3.0 mm",
        process: "Die cast",
        material: "AlSi9Cu3",
        wall: "3.0 mm wall",
        cost: 31.75,
        lines: [
          { label: "Raw material", value: 12.64 },
          { label: "Return credit", value: -1.18 },
          { label: "Melting & holding", value: 2.85 },
          { label: "Die casting machine", value: 4.35 },
          { label: "Trimming", value: 1 },
          { label: "Machining", value: 6.75 },
          { label: "Tooling amortisation", value: 2.7 },
          { label: "Inspection", value: 0.4 },
          { label: "Overhead (8%)", value: 1.66 },
          { label: "Margin (5.5%)", value: 0.58 },
        ],
      },
    ],
  },
];

/** Model bias by month (estimate vs actual, %). */
export const MONTHLY_DRIFT: DriftPoint[] = [
  { month: "Feb", value: 6 },
  { month: "Mar", value: 4 },
  { month: "Apr", value: 3 },
  { month: "May", value: 1 },
  { month: "Jun", value: -2 },
  { month: "Jul", value: -4 },
];

/** Model feature importance (%). */
export const FEATURE_IMPORTANCE: FeatureWeight[] = [
  { feature: "Net / pour weight", weight: 27 },
  { feature: "Manufacturing process", weight: 21 },
  { feature: "Material grade", weight: 15 },
  { feature: "Annual volume", weight: 11 },
  { feature: "Cut length / perimeter", weight: 9 },
  { feature: "Feature count · holes, bends, darts", weight: 8 },
  { feature: "Wall / sheet thickness", weight: 5 },
  { feature: "Tolerance class", weight: 3 },
  { feature: "Coating / surface treatment", weight: 1 },
];
