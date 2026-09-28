/**
 * The "estimate subject": everything the estimate / report pages show for one
 * part on one route: price, breakdown, tooling, price breaks, what-ifs and
 * the confidence model (inputs read / assumed / unknown, AACE class).
 *
 * original chunk: estimate-subject-DUtmINMq.js
 * original exports: a=INPUT_STATES, i=PROGRAMME_FIELDS, n=ESTIMATE_CLASSES, r=CONFIDENCE, t=buildEstimateSubject
 */

import {
  ALTERNATIVES,
  BASE_DESIGN,
  LOT_SIZES,
  VOLUME_CURVE,
  type CostLine,
  type QuotedActual,
  type Scenario,
  type VolumePoint,
} from "./estimate";
import { MATERIAL_RATES } from "./rates";
import { deriveBreakdown } from "./breakdown";
import { PARTS, type Part } from "./parts";
import {
  PRESETS,
  PROCESS_NAMES,
  PROCESS_SHORT,
  type PresetKey,
  type ProcessInference,
  type ProcessKey,
  type ProcessOption,
} from "./process-detection";
import { TOOLING, type ToolSpec } from "./tooling";

export type InputState = "read" | "assumed" | "unknown";

export interface InputStateMeta {
  label: string;
  icon: string;
  blurb: string;
}

/** AACE 18R-97 estimate class. */
export interface EstimateClassInfo {
  cls: number;
  name: string;
  band: string;
}

export interface ConfidenceInput {
  label: string;
  /** `null` for unknowns. */
  value: string | null;
  state: InputState;
  source: string;
}

export interface ConfidenceProfile {
  presetKey: PresetKey;
  estimateClass: number;
  className: string;
  /** Accuracy band, %. */
  low: number;
  high: number;
  toImprove: { step: string; effect: string }[];
  inputs: ConfidenceInput[];
}

export type ProgrammeFieldKey = "annualVolume" | "productionLife" | "targetCost" | "actualCost";

export interface ProgrammeField {
  key: ProgrammeFieldKey;
  label: string;
  /** What is lost while the field is unknown. */
  contingency: string;
}

export interface CostDriver {
  title: string;
  detail: string;
}

/** A design/commercial lever that moves one breakdown line by `delta` EUR. */
export interface WhatIfLever {
  id: string;
  label: string;
  line: string;
  delta: number;
  note: string;
}

interface RouteShare {
  label: string;
  share: number;
  /** The amortisation line, priced from the tool rather than the share. */
  tooling?: boolean;
}

export interface EstimateSubject {
  presetKey: string;
  variant: string;
  partName: string;
  partNumber: string;
  programme: string;
  revision: string;
  process: string;
  processLabel: string;
  material: string;
  spec: string;
  price: number;
  lines: CostLine[];
  /** `true` when the breakdown was derived rather than seeded. */
  derived: boolean;
  target: number | null;
  annualVolume: number;
  productionLife: number;
  tool: ToolSpec | undefined;
  /** Tool for the detected (recommended) route. */
  baseTool: ToolSpec | undefined;
  actual: QuotedActual | undefined;
  drivers: CostDriver[];
  priceBreaks: VolumePoint[];
  priceBreakNote: string;
  lotOptions: number[];
  whatIfs: Scenario[];
  recommended: ProcessKey;
  inference: ProcessInference;
}

export const INPUT_STATES: Record<InputState, InputStateMeta> = {
  read: { label: "Read", icon: "●", blurb: "Extracted from the model · certain" },
  assumed: { label: "Assumed", icon: "◐", blurb: "Defaulted by Mūlya · confirm or correct" },
  unknown: { label: "Unknown", icon: "○", blurb: "Nobody has this yet · carried as contingency" },
};

export const ESTIMATE_CLASSES: EstimateClassInfo[] = [
  { cls: 5, name: "Concept screening", band: "−30% / +50%" },
  { cls: 4, name: "Study estimate", band: "−15% / +20%" },
  { cls: 3, name: "Budget authorisation", band: "−10% / +15%" },
  { cls: 2, name: "Control / bid", band: "−5% / +10%" },
  { cls: 1, name: "Definitive", band: "−3% / +5%" },
];

/** Company-level rate assumptions shared by every preset. */
const RATE_INPUTS: ConfidenceInput[] = [
  {
    label: "Material rate",
    value: "Rate Master",
    state: "assumed",
    source: "Placeholder rate card, not your purchasing data",
  },
  {
    label: "Machine hour rates",
    value: "Rate Master",
    state: "assumed",
    source: "Industry-typical rates pending your cost centre data",
  },
  {
    label: "Overhead",
    value: "8%",
    state: "assumed",
    source: "Company-level assumption, editable in Rate Master",
  },
  {
    label: "Margin",
    value: "5.5%",
    state: "assumed",
    source: "Company-level assumption, editable in Rate Master",
  },
];

/** Commercial unknowns shared by every preset. */
const COMMERCIAL_UNKNOWNS: ConfidenceInput[] = [
  {
    label: "Supplier conversion cost",
    value: null,
    state: "unknown",
    source: "No quote in the system for this part: the model has never seen this supplier",
  },
  {
    label: "Energy surcharge",
    value: null,
    state: "unknown",
    source: "Foundry and press energy clauses move with the market and are renegotiated quarterly",
  },
  {
    label: "Packaging & freight spec",
    value: null,
    state: "unknown",
    source: "Depends on supplier location and whether returnable racks are agreed",
  },
  {
    label: "Tooling commercial basis",
    value: null,
    state: "unknown",
    source: "Some suppliers invoice tooling separately, some amortise it into the piece price",
  },
];

/** Confidence profile per preset, keyed by `PresetKey`. */
export const CONFIDENCE: Record<string, ConfidenceProfile> = {
  bearing: {
    presetKey: "bearing",
    estimateClass: 4,
    className: "Study estimate",
    low: -10.6,
    high: 11.2,
    toImprove: [
      {
        step: "Connect your purchasing rate cards",
        effect: "Removes four assumed rates: the largest single source of spread",
      },
      {
        step: "Add one supplier quote for a comparable housing",
        effect: "Anchors conversion cost, which is the biggest unknown on this part",
      },
      {
        step: "Confirm annual volume and production life with the programme",
        effect: "Fixes the tooling amortisation base, currently assumed at 2,000 × 3",
      },
      {
        step: "Release the historical catalogue",
        effect: "Moves the model from rules-based to trained: Class 2 becomes reachable",
      },
    ],
    inputs: [
      {
        label: "Bounding box",
        value: "248.0 × 186.0 × 94.0 mm",
        state: "read",
        source: "STEP AP214 geometry",
      },
      { label: "Net mass", value: "12.4 kg", state: "read", source: "STEP AP214 geometry" },
      { label: "Pour mass", value: "15.8 kg", state: "read", source: "STEP AP214 geometry" },
      { label: "Minimum wall", value: "8.0 mm", state: "read", source: "Model section analysis" },
      { label: "Cored features", value: "2 internal", state: "read", source: "Model topology" },
      { label: "Surface area", value: "2,948 cm²", state: "read", source: "STEP AP214 geometry" },
      { label: "Parting line", value: "742.0 mm", state: "read", source: "Model topology" },
      { label: "Draft angle", value: "2.0°", state: "read", source: "Model face analysis" },
      {
        label: "Material grade",
        value: "EN-GJL-250 (GG25)",
        state: "read",
        source: "Declared in the file header",
      },
      { label: "Tolerance class", value: "ISO 2768-m", state: "read", source: "Declared in the file header" },
      ...RATE_INPUTS,
      {
        label: "Pattern life",
        value: "6,000 pours",
        state: "assumed",
        source: "Typical for a resin-coated aluminium match plate",
      },
      {
        label: "Machining allowance",
        value: "3.0 mm",
        state: "assumed",
        source: "Standard stock for a cast iron housing",
      },
      {
        label: "Machining cycle time",
        value: "14.3 min",
        state: "assumed",
        source: "Derived from face count, not from a CAM programme",
      },
      ...COMMERCIAL_UNKNOWNS,
      {
        label: "Foundry yield",
        value: null,
        state: "unknown",
        source: "Scrap and rework rate per good casting: supplier-specific and rarely disclosed",
      },
      {
        label: "Heat treatment route",
        value: null,
        state: "unknown",
        source: "Stress relief may or may not be required; the drawing does not say",
      },
    ],
  },
  bracket: {
    presetKey: "bracket",
    estimateClass: 4,
    className: "Study estimate",
    low: -12.4,
    high: 13,
    toImprove: [
      {
        step: "Confirm the strip supplier and coil width",
        effect: "Material utilisation is the dominant cost on a stamping and is currently assumed",
      },
      { step: "Connect your purchasing rate cards", effect: "Removes four assumed rates" },
      {
        step: "Add a press-shop quote at 24,000 pcs/yr",
        effect: "Anchors strokes per minute and the true die maintenance burden",
      },
    ],
    inputs: [
      {
        label: "Bounding box",
        value: "186.0 × 92.0 × 64.0 mm",
        state: "read",
        source: "STEP AP214 geometry",
      },
      { label: "Flat blank", value: "312.0 × 148.0 mm", state: "read", source: "Unfold analysis" },
      { label: "Sheet thickness", value: "2.5 mm", state: "read", source: "Model section analysis" },
      { label: "Net mass", value: "1.15 kg", state: "read", source: "STEP AP214 geometry" },
      { label: "Bend count", value: "4 at R4.0", state: "read", source: "Model feature recognition" },
      {
        label: "Pierced holes",
        value: "8 · ⌀10.5 to 14.0",
        state: "read",
        source: "Model feature recognition",
      },
      {
        label: "Material grade",
        value: "EN 10268 (HC340LA)",
        state: "read",
        source: "Declared in the file header",
      },
      ...RATE_INPUTS,
      {
        label: "Strip utilisation",
        value: "68%",
        state: "assumed",
        source: "Nesting is assumed single-row; a two-row nest would change material cost materially",
      },
      {
        label: "Strokes per minute",
        value: "24",
        state: "assumed",
        source: "Typical for a 160 t mechanical press at this progression",
      },
      {
        label: "Die life",
        value: "400,000 hits",
        state: "assumed",
        source: "Typical for hardened D2 at 2.5 mm HSLA",
      },
      ...COMMERCIAL_UNKNOWNS,
      {
        label: "Coil price basis",
        value: null,
        state: "unknown",
        source: "Steel is bought on quarterly contracts; the applicable index is not in the system",
      },
    ],
  },
  cover: {
    presetKey: "cover",
    estimateClass: 4,
    className: "Study estimate",
    low: -11,
    high: 12.2,
    toImprove: [
      {
        step: "Confirm the machine class with the die caster",
        effect: "350 t is our sizing; the supplier's available tonnage sets the real cycle rate",
      },
      { step: "Connect your purchasing rate cards", effect: "Removes four assumed rates" },
      {
        step: "Agree the porosity acceptance level",
        effect: "A pressure-tight requirement would add impregnation and change the scrap rate",
      },
    ],
    inputs: [
      {
        label: "Bounding box",
        value: "196.0 × 196.0 × 48.0 mm",
        state: "read",
        source: "STEP AP214 geometry",
      },
      { label: "Projected area", value: "302 cm²", state: "read", source: "STEP AP214 geometry" },
      { label: "Minimum wall", value: "3.0 mm", state: "read", source: "Model section analysis" },
      { label: "Net mass", value: "2.8 kg", state: "read", source: "STEP AP214 geometry" },
      { label: "Rib section", value: "4 at 2.2 mm", state: "read", source: "Model feature recognition" },
      { label: "Draft angle", value: "1.0°", state: "read", source: "Model face analysis" },
      {
        label: "Material grade",
        value: "EN AC-43000 (AlSi10Mg)",
        state: "read",
        source: "Declared in the file header",
      },
      { label: "Tolerance class", value: "ISO 2768-f", state: "read", source: "Declared in the file header" },
      ...RATE_INPUTS,
      {
        label: "Cycle time",
        value: "41 s",
        state: "assumed",
        source: "Derived from wall section and shot weight, not from a filling simulation",
      },
      {
        label: "Die life",
        value: "120,000 shots",
        state: "assumed",
        source: "Typical for nitrided H13 at this alloy and wall",
      },
      ...COMMERCIAL_UNKNOWNS,
      {
        label: "Porosity acceptance",
        value: null,
        state: "unknown",
        source: "Pressure-tight parts need impregnation; the drawing does not call it out either way",
      },
    ],
  },
};

/** Programme fields the user may mark as unknown. */
export const PROGRAMME_FIELDS: ProgrammeField[] = [
  { key: "annualVolume", label: "Annual volume", contingency: "Tooling amortisation base" },
  { key: "productionLife", label: "Production life", contingency: "Tooling amortisation base" },
  { key: "targetCost", label: "Target cost", contingency: "No over/under judgement possible" },
  { key: "actualCost", label: "Actual / quoted cost", contingency: "No estimate-vs-actual check" },
];

/** Overhead × margin multiplier applied on top of conversion cost. */
const BURDEN_FACTOR = 1.08 * 1.055;
const OVERHEAD_RATE = 0.08;
const MARGIN_RATE = 0.055;
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Hand-seeded breakdowns, keyed `<preset>-<process>`. */
const SEEDED_LINES: Record<string, CostLine[]> = {
  "bracket-stamping": [
    { label: "Raw material", value: 1.98 },
    { label: "Return credit", value: -0.08 },
    { label: "Press time · progressive die", value: 0.68 },
    { label: "Forming & restrike", value: 0.42 },
    { label: "Piercing & tapping", value: 0.24 },
    { label: "Surface treatment · KTL", value: 0.56 },
    { label: "Tooling amortisation", value: 0.35 },
    { label: "Inspection", value: 0.11 },
    { label: "Overhead (8%)", value: 0.34 },
    { label: "Margin (5.5%)", value: 0.25 },
  ],
  "cover-die": [
    { label: "Raw material", value: 11.52 },
    { label: "Return credit", value: -0.88 },
    { label: "Melting & holding", value: 1.02 },
    { label: "Die casting machine", value: 1.86 },
    { label: "Trimming & deflashing", value: 0.48 },
    { label: "Machining · bore & face", value: 1.94 },
    { label: "Vibratory deburr", value: 0.32 },
    { label: "Tooling amortisation", value: 0.59 },
    { label: "Leak test & inspection", value: 0.35 },
    { label: "Overhead (8%)", value: 1.38 },
    { label: "Margin (5.5%)", value: 1.02 },
  ],
};

const QUOTED_ACTUALS: Record<string, QuotedActual> = {
  bearing: { value: 51.4, source: "Supplier quote · 12 May 2026 · Tier-1 foundry, EU" },
  bracket: { value: 5.05, source: "Supplier quote · 03 Jun 2026 · Press shop, EU" },
  cover: { value: 20.35, source: "Supplier quote · 24 Jun 2026 · HPDC supplier, Turkey" },
};

const COST_DRIVERS: Record<string, CostDriver[]> = {
  bearing: [
    { title: "Wall thickness 8 mm", detail: "+€ 5.20 vs. 6 mm" },
    { title: "Tolerance ±0.05", detail: "+€ 4.10 · drives finishing" },
    { title: "6 machined faces", detail: "€ 12.90 · 27% of piece cost" },
  ],
  bracket: [
    { title: "Blank 312 × 148 mm", detail: "€ 1.98 of coil · 41% of piece cost" },
    { title: "4 bends at R4.0", detail: "+€ 0.42 · two extra forming stations" },
    { title: "KTL e-coat 20 µm", detail: "€ 0.56 · 12% of piece cost" },
  ],
  cover: [
    { title: "Shot mass 3.6 kg", detail: "€ 11.52 · 59% of piece cost is metal" },
    { title: "Bore ⌀ 84.0 + face", detail: "€ 1.94 machining · 10% of piece cost" },
    { title: "Rib section 2.2 mm", detail: "+€ 0.46 · below the 2.5 mm fill floor" },
  ],
};

const WHAT_IF_LEVERS: Record<string, WhatIfLever[]> = {
  "bearing-sand": [
    {
      id: "tol-tight",
      label: "Tighten tolerance to ±0.05",
      line: "Machining",
      delta: 3.59,
      note: "Drives finishing passes and gauge time on six machined faces",
    },
    {
      id: "ggg40",
      label: "Upgrade to GGG40 ductile iron",
      line: "Raw material",
      delta: 4.74,
      note: "15.8 kg poured at € 1.25/kg instead of € 0.95: same scrap value back",
    },
  ],
  "bearing-die": [
    {
      id: "tol-tight",
      label: "Tighten tolerance to ±0.05",
      line: "Machining",
      delta: 1.67,
      note: "Fewer as-cast faces than the sand route, so the penalty is smaller",
    },
    {
      id: "t6",
      label: "Upgrade to AlSi10Mg-T6",
      line: "Raw material",
      delta: 1.05,
      note: "Solution treat and age: buys yield strength, costs a heat-treat cycle",
    },
    {
      id: "vol-up",
      label: "Increase volume to 6,000 / yr",
      line: "Tooling amortisation",
      delta: -3.07,
      note: "The die is good for 100,000 shots: nowhere near reached, so volume keeps helping",
    },
  ],
  "bracket-stamping": [
    {
      id: "flatness",
      label: "Tighten mounting-face flatness to 0.3 mm",
      line: "Forming & restrike",
      delta: 0.15,
      note: "Adds a restrike station to take the springback out of the mounting face",
    },
    {
      id: "ktl30",
      label: "KTL to 30 µm for corrosion class C4",
      line: "Surface treatment · KTL",
      delta: 0.23,
      note: "Thicker e-coat for a chassis-exposed part: longer bath, higher reject rate",
    },
    {
      id: "dc04",
      label: "Downgrade to DC04 mild steel",
      line: "Raw material",
      delta: -0.24,
      note: "€ 1.10/kg against € 1.25: only viable if the fatigue case allows it",
    },
    {
      id: "vol-up",
      label: "Increase volume to 48,000 / yr",
      line: "Tooling amortisation",
      delta: -0.18,
      note: "The progressive die lasts 400,000 hits, so the tool is never the limit",
    },
  ],
  "bracket-die": [
    {
      id: "t6",
      label: "Upgrade to AlSi10Mg-T6",
      line: "Raw material",
      delta: 0.22,
      note: "Solution treat and age: a per-part cycle cost on a 0.39 kg casting",
    },
    {
      id: "alsi9cu3",
      label: "Switch alloy to AlSi9Cu3",
      line: "Raw material",
      delta: -0.12,
      note: "€ 2.95/kg against € 3.20: fine unless the bracket sees road salt",
    },
    {
      id: "vol-up",
      label: "Increase volume to 40,000 / yr",
      line: "Tooling amortisation",
      delta: -0.18,
      note: "Exactly reaches the die's 120,000-shot life: past this a second die is needed",
    },
  ],
  "cover-sand": [
    {
      id: "tol-tight",
      label: "Tighten tolerance to ±0.05",
      line: "Machining",
      delta: 1.6,
      note: "A sand casting starts further from finish, so tolerance costs more here than in a die",
    },
    {
      id: "ggg40",
      label: "Upgrade to GGG40 ductile iron",
      line: "Raw material",
      delta: 1.86,
      note: "6.2 kg poured at € 1.25/kg instead of € 0.95",
    },
    {
      id: "tol-relax",
      label: "Relax tolerance to ISO 2768-c",
      line: "Machining",
      delta: -1.1,
      note: "Drops a finishing pass: only if the mating face allows it",
    },
  ],
  "cover-die": [
    {
      id: "tol-tight",
      label: "Tighten tolerance to ±0.05",
      line: "Machining · bore & face",
      delta: 1.32,
      note: "The ⌀84 bore and its face carry the tolerance: finishing pass and gauging",
    },
    {
      id: "t6",
      label: "Upgrade to AlSi10Mg-T6",
      line: "Raw material",
      delta: 1.58,
      note: "Solution treat and age: watch distortion on a 3 mm wall",
    },
    {
      id: "alsi9cu3",
      label: "Switch alloy to AlSi9Cu3",
      line: "Raw material",
      delta: -0.86,
      note: "€ 2.95/kg against € 3.20, better castability, lower corrosion resistance",
    },
    {
      id: "vol-up",
      label: "Increase volume to 28,000 / yr",
      line: "Tooling amortisation",
      delta: -0.3,
      note: "Still inside the die's 120,000-shot life, so the tool cost keeps dividing",
    },
  ],
};

const PRICE_BREAK_NOTES: Record<string, string> = {
  "bearing-sand": "The curve flattens above 2,000/yr: the pattern lasts 6,000 pieces, so beyond that you buy more patterns rather than amortising the first one further. Volume stops helping; the saving has to come from the design.",
  "bracket-stamping": "The curve keeps falling. The progressive die is good for 400,000 hits and even 72,000/yr over three years only reaches 216,000, so the tool is never the limit: what is left is coil price, and that does not move with volume.",
  "cover-die": "Below 28,000/yr the die is what moves the price. Above it the die reaches its 120,000-shot life inside the programme and a second one has to be bought, which is why the last row rises rather than falls.",
};

/** Tool amortisation per piece at a given annual volume, buying replacement tools as each wears out. */
function amortisationPerPiece(tool: ToolSpec, annualVolume: number): number {
  const lifetimePieces = annualVolume * tool.productionLife;
  const toolsNeeded = Math.max(1, Math.ceil(lifetimePieces / tool.life));
  return (tool.cost * toolsNeeded) / lifetimePieces;
}

/** Conversion split per `ProcessKey`. */
const ROUTE_SHARES: Record<string, RouteShare[]> = {
  stamping: [
    { label: "Blanking & piercing", share: 0.22 },
    { label: "Forming / bending", share: 0.26 },
    { label: "Machine time", share: 0.16 },
    { label: "Surface treatment", share: 0.2 },
    { label: "Tooling amortisation", share: 0.12, tooling: true },
    { label: "Inspection", share: 0.04 },
  ],
  sand: [
    { label: "Melting & pouring", share: 0.17 },
    { label: "Moulding & cores", share: 0.23 },
    { label: "Fettling", share: 0.09 },
    { label: "Machining", share: 0.34 },
    { label: "Pattern amortisation", share: 0.13, tooling: true },
    { label: "Inspection", share: 0.04 },
  ],
  die: [
    { label: "Melting & holding", share: 0.15 },
    { label: "Die casting machine", share: 0.26 },
    { label: "Trimming", share: 0.07 },
    { label: "Machining", share: 0.32 },
    { label: "Tooling amortisation", share: 0.16, tooling: true },
    { label: "Inspection", share: 0.04 },
  ],
};

/** Derives a breakdown for a route option at a given price, with the amortisation line priced from its tool. */
function routeLines(option: ProcessOption, grade: string, price: number, tool: ToolSpec | undefined): CostLine[] {
  const shares = ROUTE_SHARES[option.key];
  const rate = MATERIAL_RATES.find((m) => m.grade === grade);
  const ratePerKg = rate?.rate ?? 1.2;
  const scrapPerKg = rate?.scrap ?? 0.25;
  const billetKg = option.basis?.billetKg ?? 0;
  const netKg = option.basis?.netKg ?? 0;
  const rawMaterial = billetKg * ratePerKg;
  const returnCredit = (billetKg - netKg) * scrapPerKg;
  const beforeBurden = price / BURDEN_FACTOR;
  const conversion = Math.max(0, beforeBurden - (rawMaterial - returnCredit));
  const amortisation = tool ? tool.perPiece : 0;
  const operations = Math.max(0, conversion - amortisation);
  const operationShare = shares.filter((s) => !s.tooling).reduce((sum, s) => sum + s.share, 0);

  const lines: CostLine[] = [
    { label: "Raw material", value: round2(rawMaterial) },
    { label: "Return credit", value: -round2(returnCredit) },
    ...shares.map((s) => ({
      label: s.label,
      value: s.tooling ? round2(amortisation) : round2((operations * s.share) / operationShare),
    })),
  ];
  const subtotal = lines.reduce((sum, l) => sum + l.value, 0);
  const overhead = round2(subtotal * OVERHEAD_RATE);
  const margin = round2((subtotal + overhead) * MARGIN_RATE);
  lines.push({ label: `Overhead (${OVERHEAD_RATE * 100}%)`, value: overhead });
  lines.push({ label: `Margin (${MARGIN_RATE * 100}%)`, value: margin });

  // Rounding residue goes onto the largest non-amortisation conversion line.
  const residue = round2(price - lines.reduce((sum, l) => sum + l.value, 0));
  if (residue !== 0) {
    let largest = -1;
    lines.forEach((l, i) => {
      if (i < 2 || i >= lines.length - 2 || /amortisation/i.test(l.label)) return;
      if (largest === -1 || l.value > lines[largest].value) largest = i;
    });
    if (largest !== -1) lines[largest] = { ...lines[largest], value: round2(lines[largest].value + residue) };
  }
  return lines;
}

/** Price breaks at ¼, ½, 1, 2 and 3× the annual volume (seeded curve for the bearing sand route). */
function priceBreaks(
  presetKey: string,
  process: string,
  price: number,
  annualVolume: number,
  tool: ToolSpec | undefined,
): VolumePoint[] {
  if (presetKey === "bearing" && process === "sand") return VOLUME_CURVE;
  if (!tool) return [];
  const roundTo500 = (v: number) => Math.round(v / 500) * 500 || 500;
  return [0.25, 0.5, 1, 2, 3].map((multiple) => {
    const volume = multiple === 1 ? annualVolume : roundTo500(annualVolume * multiple);
    const unit = round2(price + (amortisationPerPiece(tool, volume) - tool.perPiece) * BURDEN_FACTOR);
    return { volume, unit, lot: round2(unit * volume) };
  });
}

/** Applies a lever to a breakdown and re-burdens it. */
function applyLever(lines: CostLine[], lever: WhatIfLever): CostLine[] {
  const adjusted = lines
    .filter((l) => !/^(Overhead|Margin)/.test(l.label))
    .map((l) => (l.label === lever.line ? { ...l, value: round2(l.value + lever.delta) } : l));
  const subtotal = adjusted.reduce((sum, l) => sum + l.value, 0);
  const overhead = round2(subtotal * OVERHEAD_RATE);
  const margin = round2((subtotal + overhead) * MARGIN_RATE);
  return [
    ...adjusted,
    { label: `Overhead (${OVERHEAD_RATE * 100}%)`, value: overhead },
    { label: `Margin (${MARGIN_RATE * 100}%)`, value: margin },
  ];
}

/** What-if scenarios: seeded alternatives, levers on this route, and switching route; cheapest first. */
function buildWhatIfs(inference: ProcessInference, process: string, price: number, lines: CostLine[]): Scenario[] {
  const preset = inference.presetKey;
  const seeded =
    preset === "bearing" && process === "sand"
      ? ALTERNATIVES.filter((s) => s.toolKey !== `bearing-${process}` || s.id !== "base")
      : [];
  const levers = (WHAT_IF_LEVERS[`${preset}-${process}`] ?? []).map((lever): Scenario => {
    const leverLines = applyLever(lines, lever);
    const leverPrice = round2(leverLines.reduce((sum, l) => sum + l.value, 0));
    return {
      id: lever.id,
      label: lever.label,
      price: leverPrice,
      deltaPct: Math.round(((leverPrice - price) / price) * 1e3) / 10,
      spec: lever.note,
      toolKey: `${preset}-${process}`,
      lines: leverLines,
    };
  });
  const switches = inference.options
    .filter((o) => o.key !== process && o.price != null)
    .map((option): Scenario | null => {
      const tool: ToolSpec | undefined = TOOLING[`${preset}-${option.key}`];
      const optionPrice = option.price as number; // filtered to non-null above
      const seededAlt =
        preset === "bearing"
          ? [BASE_DESIGN, ...ALTERNATIVES].find((s) => s.toolKey === `${preset}-${option.key}`)
          : undefined;
      return seededAlt && seeded.some((s) => s.id === seededAlt.id)
        ? null
        : {
            id: `switch-${option.key}`,
            label: `Switch to ${PROCESS_NAMES[option.key].toLowerCase()} (${option.material})`,
            price: optionPrice,
            deltaPct: Math.round(((optionPrice - price) / price) * 1e3) / 10,
            spec: option.note,
            toolKey: tool?.key ?? "",
            lines: seededAlt?.lines ?? routeLines(option, option.material, optionPrice, tool),
          };
    })
    .filter((s): s is Scenario => s !== null);
  return [...seeded, ...levers, ...switches].sort((a, b) => a.price - b.price);
}

/**
 * Builds the estimate subject for a preset on a route. When `partNumber` names a
 * catalogue part that is not one of the presets, the subject is built from that
 * part instead (see `subjectFromPart`). Unknown presets fall back to `bearing`.
 */
export function buildEstimateSubject(
  presetKey: string,
  process: string,
  material?: string | null,
  partNumber?: string | null,
): EstimateSubject {
  if (partNumber && !PRESET_NUMBER_SET.has(partNumber)) {
    const part = PARTS.find((p) => p.number === partNumber);
    if (part) return subjectFromPart(part, presetKey, process);
  }
  const found: ProcessInference | undefined = PRESETS[presetKey];
  const inference = found ?? PRESETS.bearing;
  const key = found ? presetKey : "bearing";
  const option =
    inference.options.find((o) => o.key === process && o.price != null) ??
    inference.options.find((o) => o.key === inference.detected);
  const route = option?.key ?? inference.detected;
  const part = PARTS.find((p) => p.number === inference.partNumber);
  const price = option?.price ?? part?.estimate ?? 0;
  const grade = material ?? option?.material ?? part?.material ?? "n/a";
  const tool: ToolSpec | undefined = TOOLING[`${key}-${route}`];
  const baseTool: ToolSpec | undefined = TOOLING[`${key}-${inference.detected}`];
  const seededLines: CostLine[] | undefined = SEEDED_LINES[`${key}-${route}`];
  const seededAlt =
    key === "bearing" ? [BASE_DESIGN, ...ALTERNATIVES].find((s) => s.toolKey === `bearing-${route}`) : undefined;
  const lines = seededAlt?.lines ?? seededLines ?? (option ? routeLines(option, grade, price, tool) : []);
  const breaks = priceBreaks(key, route, price, inference.annualVolume, tool);
  const drivers: CostDriver[] | undefined = COST_DRIVERS[key];

  return {
    presetKey: key,
    variant: key,
    partName: inference.partName,
    partNumber: inference.partNumber,
    programme: part?.programme ?? "n/a",
    revision: part?.revision ?? "n/a",
    process: route,
    processLabel: PROCESS_NAMES[route],
    material: grade,
    spec: `${PROCESS_SHORT[route]} · ${grade} · ${option?.basis?.netKg ?? part?.weightKg ?? "n/a"} kg`,
    price,
    lines,
    derived: !seededAlt && !seededLines,
    target: inference.target,
    annualVolume: inference.annualVolume,
    productionLife: inference.productionLife,
    tool,
    baseTool,
    actual: QUOTED_ACTUALS[key],
    drivers: drivers ?? COST_DRIVERS.bearing,
    priceBreaks: breaks,
    priceBreakNote:
      PRICE_BREAK_NOTES[`${key}-${route}`] ??
      `The curve is driven by the ${tool?.toolType.toLowerCase() ?? "tool"}: ${tool ? `€ ${tool.cost.toLocaleString("en-GB")} divided across whatever the programme runs` : "paid once and divided"}. Every other line is per piece and does not move with volume.`,
    lotOptions:
      key === "bearing" && route === "sand" ? LOT_SIZES : Array.from(new Set([1, 100, ...breaks.map((b) => b.volume)])),
    whatIfs: buildWhatIfs(inference, route, price, lines),
    recommended: inference.detected,
    inference,
  };
}

/** Part numbers of the demo presets. */
const PRESET_NUMBER_SET = new Set(Object.values(PRESETS).map((p) => p.partNumber));

/** Subject for a plain catalogue part: its own price and breakdown, no tooling or what-ifs. */
function subjectFromPart(part: Part, presetKey: string, process: string): EstimateSubject {
  const found: ProcessInference | undefined = PRESETS[presetKey];
  const inference = found ?? PRESETS.bearing;
  const key = found ? presetKey : "bearing";
  const { lines, derived } = deriveBreakdown(part);
  return {
    presetKey: key,
    variant: key,
    partName: part.name,
    partNumber: part.number,
    programme: part.programme,
    revision: part.revision,
    process,
    processLabel: PROCESS_NAMES[process],
    material: part.material,
    spec: `${part.process} · ${part.material} · ${part.weightKg} kg`,
    price: part.estimate,
    lines,
    derived,
    target: part.target,
    annualVolume: part.annualVolume,
    productionLife: 3,
    tool: undefined,
    baseTool: undefined,
    actual: undefined,
    drivers: [],
    priceBreaks: [],
    priceBreakNote: "",
    lotOptions: [1, 100, 500, 1e3, part.annualVolume].filter(
      (v, i, all) => all.indexOf(v) === i && v <= Math.max(part.annualVolume, 1e3),
    ),
    whatIfs: [],
    recommended: inference.detected,
    inference,
  };
}
