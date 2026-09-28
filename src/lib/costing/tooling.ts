/**
 * Tool build quotes per preset and route: line items, spec, derived
 * measurements, plan-view layout and amortisation curve.
 *
 * original chunk: tooling-DHrH2HKh.js
 * original exports: t=TOOLING
 */

import type { PresetKey, ProcessKey } from "./process-detection";

export type ToolingKey =
  | "bearing-sand"
  | "bearing-die"
  | "bracket-stamping"
  | "bracket-die"
  | "cover-die"
  | "cover-sand";

export type ToolKind = "pattern" | "die" | "progressive";

export interface ToolCostLine {
  label: string;
  value: number;
  basis: string;
}

export interface ToolSpecRow {
  label: string;
  value: string;
}

export interface ToolMeasurementRow {
  label: string;
  value: string;
  note?: string;
  /** Highlighted as a key dimension. */
  key?: boolean;
}

export interface ToolMeasurementGroup {
  title: string;
  rows: ToolMeasurementRow[];
}

/** Plan-view footprint of the tool and the part (or blank) inside it, in mm. */
export interface ToolLayout {
  toolW: number;
  toolD: number;
  toolLabel: string;
  partW: number;
  partD: number;
  partLabel: string;
  /** Progressive dies only. */
  stations?: number;
  pitch?: number;
  stripWidth?: number;
}

export interface AmortisationPoint {
  volume: number;
  perPiece: number;
}

export interface ToolSpec {
  key: ToolingKey;
  presetKey: PresetKey;
  process: ProcessKey;
  partName: string;
  partNumber: string;
  toolType: string;
  kind: ToolKind;
  /** Build cost, EUR. */
  cost: number;
  leadWeeks: number;
  /** Tool life in `lifeUnit`. */
  life: number;
  lifeUnit: string;
  cavities: number;
  annualVolume: number;
  /** Years. */
  productionLife: number;
  /** Amortisation, EUR per piece. */
  perPiece: number;
  amortLineLabel: string;
  lines: ToolCostLine[];
  spec: ToolSpecRow[];
  measurements: ToolMeasurementGroup[];
  layout: ToolLayout;
  amortisation: AmortisationPoint[];
  /** Where the per-piece figure floors because the tool wears out (patterns). */
  floorsAt?: { value: number; note: string };
  note: string;
  complexityNote: string;
}

/** Tool quotes keyed by `ToolingKey` (`<preset>-<process>`); look-ups may miss. */
export const TOOLING: Record<string, ToolSpec> = {
  "bearing-sand": {
    key: "bearing-sand",
    presetKey: "bearing",
    process: "sand",
    partName: "Bearing Housing",
    partNumber: "DTV-HSG-0431",
    toolType: "Pattern & core box set",
    kind: "pattern",
    cost: 18000,
    leadWeeks: 6,
    life: 6000,
    lifeUnit: "pours",
    cavities: 1,
    annualVolume: 2000,
    productionLife: 3,
    perPiece: 3,
    amortLineLabel: "Pattern amortisation",
    lines: [
      { label: "Tooling design & methoding", value: 2652, basis: "34 h @ € 78/hr" },
      { label: "Pattern plate stock", value: 1180, basis: "Resin-coated aluminium" },
      { label: "CNC machining · pattern halves", value: 3128, basis: "46 h @ € 68/hr" },
      { label: "Core boxes (2 off)", value: 3640, basis: "Machined & fitted" },
      { label: "Bench fitting & finishing", value: 1736, basis: "28 h @ € 62/hr" },
      { label: "Draft & parting verification", value: 980, basis: "Spotting and blue check" },
      { label: "Sealing, coating & mounting", value: 1120, basis: "Match plate assembly" },
      { label: "Trial pour & first-article", value: 2240, basis: "3 pours, dimensional report" },
      { label: "Spares & contingency", value: 1324, basis: "Loose pieces, wear allowance" },
    ],
    spec: [
      { label: "Tool type", value: "Pattern & core box set" },
      { label: "Pattern material", value: "Resin-coated aluminium plate" },
      { label: "Core boxes", value: "2 · internal passages" },
      { label: "Cavities", value: "1 per mould" },
      { label: "Parting line", value: "742.0 mm" },
      { label: "Draft angle", value: "2.0°" },
      { label: "Tool life", value: "6,000 pours" },
      { label: "Lead time", value: "6 weeks" },
      { label: "Maintenance", value: "Re-coat every 1,500 pours" },
      { label: "Moulding line", value: "Green sand, automatic" },
    ],
    measurements: [
      {
        title: "Part to pattern",
        rows: [
          { label: "Part envelope", value: "248.0 × 186.0 × 94.0 mm" },
          {
            label: "Machining allowance",
            value: "+ 3.0 mm per face",
            note: "Cast surfaces that will be machined",
          },
          { label: "Shrinkage allowance", value: "× 1.010", note: "GG25 solidification shrinkage, 1.0%" },
          {
            label: "Pattern envelope",
            value: "256.5 × 193.9 × 101.0 mm",
            note: "The pattern is cut oversize: the casting shrinks onto size as it cools",
            key: true,
          },
        ],
      },
      {
        title: "Tool set",
        rows: [
          { label: "Match plate", value: "500 × 400 mm", key: true },
          { label: "Flask · cope + drag", value: "600 × 500 × 300 mm" },
          { label: "Core box 1 · main bore", value: "180 × 140 × 90 mm" },
          { label: "Core box 2 · oil gallery", value: "120 × 120 × 70 mm" },
          { label: "Pattern draw depth", value: "48.0 mm" },
          { label: "Draft angle", value: "2.0°" },
          { label: "Parting line", value: "742.0 mm" },
        ],
      },
      {
        title: "Running system",
        rows: [
          { label: "Sprue", value: "⌀ 32 → ⌀ 18 · 180 mm" },
          { label: "Runner section", value: "32 × 18 mm" },
          { label: "Ingates", value: "2 off · 24 × 10 mm" },
          {
            label: "Pour to net",
            value: "15.8 kg → 12.4 kg",
            note: "3.4 kg of running system returns as foundry scrap",
          },
        ],
      },
    ],
    layout: {
      toolW: 500,
      toolD: 400,
      toolLabel: "Match plate 500 × 400",
      partW: 256.5,
      partD: 193.9,
      partLabel: "Pattern 256.5 × 193.9",
    },
    amortisation: [
      { volume: 500, perPiece: 12 },
      { volume: 1000, perPiece: 6 },
      { volume: 2000, perPiece: 3 },
      { volume: 5000, perPiece: 3 },
      { volume: 10000, perPiece: 3 },
    ],
    floorsAt: {
      value: 3,
      note: "The pattern lasts 6,000 pours. Beyond a lifetime volume of 6,000 you buy a replacement rather than amortising the first one further, so the per-piece figure floors at € 3.00, which is why the price-break curve flattens above 2,000/yr.",
    },
    note: "A pattern is cheap to build and short-lived. At 2,000 pcs/yr over a 3-year life the programme consumes exactly one pattern, so € 18,000 spreads over 6,000 pieces and stops there.",
    complexityNote: "Complexity is not an abstraction on a tool quote: it is a line item. The two cored passages scored above are Core boxes (2 off) € 3,640, and the wall variation is why Draft & parting verification runs to € 980. Together they are 26% of the pattern cost.",
  },
  "bearing-die": {
    key: "bearing-die",
    presetKey: "bearing",
    process: "die",
    partName: "Bearing Housing",
    partNumber: "DTV-HSG-0431",
    toolType: "HPDC die · single cavity",
    kind: "die",
    cost: 27600,
    leadWeeks: 14,
    life: 100000,
    lifeUnit: "shots",
    cavities: 1,
    annualVolume: 2000,
    productionLife: 3,
    perPiece: 4.6,
    amortLineLabel: "Tooling amortisation",
    lines: [
      { label: "Die design & flow simulation", value: 5084, basis: "62 h @ € 82/hr" },
      { label: "H13 tool steel blocks", value: 4320, basis: "Cavity & cover halves" },
      { label: "CNC roughing & finishing", value: 6336, basis: "88 h @ € 72/hr" },
      { label: "EDM · sink & wire", value: 2992, basis: "44 h @ € 68/hr" },
      { label: "Slides & core pins (3 slides)", value: 2890, basis: "Hydraulic actuation" },
      { label: "Heat treatment & nitriding", value: 1460, basis: "48 HRC, surface nitrided" },
      { label: "Polishing & texturing", value: 1180, basis: "Cavity draw polish" },
      { label: "Ejector system & assembly", value: 1620, basis: "Pins, plate, guides" },
      { label: "Die spotting & T1/T2 trials", value: 1718, basis: "2 sampling runs" },
    ],
    spec: [
      { label: "Tool type", value: "HPDC die · single cavity" },
      { label: "Die material", value: "H13 hot-work tool steel, nitrided" },
      { label: "Hardness", value: "48 HRC" },
      { label: "Cavities", value: "1" },
      { label: "Slides", value: "3 · hydraulic" },
      { label: "Machine class", value: "900 t cold chamber" },
      { label: "Tool life", value: "100,000 shots" },
      { label: "Lead time", value: "14 weeks" },
      { label: "Maintenance", value: "Polish every 10,000 shots" },
      { label: "Cycle time", value: "62 s" },
    ],
    measurements: [
      {
        title: "Part to cavity",
        rows: [
          { label: "Part envelope", value: "248.0 × 186.0 × 94.0 mm" },
          { label: "Wall", value: "6.0 mm", note: "Reduced from 8.0 mm for this process" },
          { label: "Machining allowance", value: "+ 0.8 mm", note: "Bore and mounting face only" },
          { label: "Shrinkage allowance", value: "× 1.006", note: "AlSi10Mg shrinkage, 0.6%" },
          { label: "Cavity envelope", value: "250.9 × 188.1 × 95.1 mm", key: true },
        ],
      },
      {
        title: "Die block & machine",
        rows: [
          { label: "Die block per half", value: "460 × 400 × 280 mm", key: true },
          { label: "Shut height", value: "560 mm" },
          { label: "Projected area", value: "461 cm²", note: "Sets the required locking force" },
          {
            label: "Locking force required",
            value: "376 t",
            note: "461 cm² at 800 bar intensification",
            key: true,
          },
          { label: "Machine class", value: "900 t cold chamber", note: "Nearest size up, with margin" },
          { label: "Platen", value: "1,100 × 1,100 mm" },
          { label: "Tie-bar spacing", value: "720 × 720 mm" },
        ],
      },
      {
        title: "Cavity detail",
        rows: [
          { label: "Slide travel", value: "3 off · 45 mm" },
          { label: "Ejector stroke", value: "90 mm" },
          { label: "Gate thickness", value: "2.4 mm" },
          { label: "Overflows", value: "6 off" },
          { label: "Draft angle", value: "1.0°" },
        ],
      },
    ],
    layout: {
      toolW: 460,
      toolD: 400,
      toolLabel: "Die block 460 × 400",
      partW: 250.9,
      partD: 188.1,
      partLabel: "Cavity 250.9 × 188.1",
    },
    amortisation: [
      { volume: 500, perPiece: 18.4 },
      { volume: 1000, perPiece: 9.2 },
      { volume: 2000, perPiece: 4.6 },
      { volume: 5000, perPiece: 1.84 },
      { volume: 10000, perPiece: 0.92 },
    ],
    note: "A die costs half as much again to build and lasts sixteen times longer. Nothing in this programme comes close to 100,000 shots, so the curve keeps falling instead of flooring: the opposite behaviour to the pattern.",
    complexityNote: "The same two cored passages that cost € 3,640 as sand core boxes become Slides & core pins at € 2,890: a die has no disposable cores, so every internal feature turns into a mechanism.",
  },
  "bracket-stamping": {
    key: "bracket-stamping",
    presetKey: "bracket",
    process: "stamping",
    partName: "Cab Mount Bracket",
    partNumber: "DTV-BRK-0117",
    toolType: "6-station progressive die",
    kind: "progressive",
    cost: 25200,
    leadWeeks: 10,
    life: 400000,
    lifeUnit: "hits",
    cavities: 1,
    annualVolume: 24000,
    productionLife: 3,
    perPiece: 0.35,
    amortLineLabel: "Tooling amortisation",
    lines: [
      { label: "Die design & strip layout", value: 3744, basis: "48 h @ € 78/hr" },
      { label: "Tool steel, shoes & die sets", value: 5180, basis: "1.2379 blocks, standard shoes" },
      { label: "CNC machining · stations", value: 4896, basis: "72 h @ € 68/hr" },
      { label: "Wire EDM · punches & dies", value: 2660, basis: "38 h @ € 70/hr" },
      { label: "Form & bend stations (4)", value: 3120, basis: "Steels, pads, springs" },
      { label: "Heat treatment", value: 1240, basis: "Hardened 60 HRC" },
      { label: "Assembly & fitting", value: 2108, basis: "34 h @ € 62/hr" },
      { label: "Try-out & buy-off (T0 to T2)", value: 1540, basis: "3 runs, PPAP dimensional" },
      { label: "Spare punches & wear parts", value: 712, basis: "One replacement set" },
    ],
    spec: [
      { label: "Tool type", value: "Progressive die · 6 stations" },
      { label: "Die material", value: "1.2379 / D2, hardened 60 HRC" },
      { label: "Stations", value: "Pierce · pierce · form · form · form · cut-off" },
      { label: "Strip width", value: "336.0 mm" },
      { label: "Progression", value: "164.0 mm per hit" },
      { label: "Press class", value: "160 t mechanical" },
      { label: "Tool life", value: "400,000 hits" },
      { label: "Lead time", value: "10 weeks" },
      { label: "Maintenance", value: "Regrind punches every 50,000 hits" },
      { label: "Strokes per minute", value: "24" },
    ],
    measurements: [
      {
        title: "Part to strip",
        rows: [
          { label: "Part envelope", value: "186.0 × 92.0 × 64.0 mm" },
          {
            label: "Flat blank",
            value: "312.0 × 148.0 mm",
            note: "The formed part unfolded: no shrinkage in sheet metal",
            key: true,
          },
          { label: "Sheet thickness", value: "2.5 mm" },
          {
            label: "Strip width",
            value: "336.0 mm",
            note: "The 312 mm blank dimension runs across the strip, plus 12.0 mm carrier each side",
          },
          {
            label: "Progression",
            value: "164.0 mm per hit",
            note: "148 mm blank along the feed plus a 16.0 mm web",
            key: true,
          },
          { label: "Scrap web", value: "16.0 mm" },
        ],
      },
      {
        title: "Die set & press",
        rows: [
          { label: "Die set", value: "1,040 × 420 mm", note: "6 stations at 164 mm pitch", key: true },
          { label: "Shut height", value: "280 mm" },
          {
            label: "Die clearance",
            value: "0.20 mm per side",
            note: "8% of sheet thickness for HC340LA",
            key: true,
          },
          { label: "Punch penetration", value: "1.5 mm" },
          { label: "Feed height", value: "1,050 mm" },
          { label: "Press bed", value: "1,200 × 600 mm" },
          { label: "Press class", value: "160 t mechanical" },
        ],
      },
      {
        title: "Station layout",
        rows: [
          { label: "1 · Pierce", value: "4 holes ⌀ 10.5" },
          { label: "2 · Pierce", value: "4 holes ⌀ 14.0" },
          { label: "3 · Form", value: "2 darts" },
          { label: "4 · Form", value: "Bend 1 & 2 at R4.0" },
          { label: "5 · Form", value: "Bend 3 & 4 at R4.0" },
          { label: "6 · Cut-off", value: "Part separation" },
        ],
      },
    ],
    layout: {
      toolW: 1040,
      toolD: 420,
      toolLabel: "Die set 1,040 × 420",
      partW: 148,
      partD: 312,
      partLabel: "Blank 148 along feed × 312 across",
      stations: 6,
      pitch: 164,
      stripWidth: 336,
    },
    amortisation: [
      { volume: 2000, perPiece: 4.2 },
      { volume: 5000, perPiece: 1.68 },
      { volume: 10000, perPiece: 0.84 },
      { volume: 24000, perPiece: 0.35 },
      { volume: 40000, perPiece: 0.21 },
    ],
    note: "A progressive die is the most expensive tool per part drawing and the cheapest per piece, because 400,000 hits is a lot of pieces. At 24,000 pcs/yr the programme uses less than a fifth of the tool's life.",
    complexityNote: "The four bends and two darts scored above are Form & bend stations (4) € 3,120, and the eight pierced holes are most of Wire EDM: punches & dies € 2,660. Complexity in a stamping is paid for in stations.",
  },
  "bracket-die": {
    key: "bracket-die",
    presetKey: "bracket",
    process: "die",
    partName: "Cab Mount Bracket",
    partNumber: "DTV-BRK-0117",
    toolType: "HPDC die · single cavity",
    kind: "die",
    cost: 31400,
    leadWeeks: 13,
    life: 120000,
    lifeUnit: "shots",
    cavities: 1,
    annualVolume: 24000,
    productionLife: 3,
    perPiece: 0.44,
    amortLineLabel: "Tooling amortisation",
    lines: [
      { label: "Die design & flow simulation", value: 4756, basis: "58 h @ € 82/hr" },
      { label: "H13 tool steel blocks", value: 5240, basis: "Cavity & cover halves" },
      { label: "CNC roughing & finishing", value: 6912, basis: "96 h @ € 72/hr" },
      { label: "EDM · sink & wire", value: 3536, basis: "52 h @ € 68/hr" },
      { label: "Slides & core pins (2 slides)", value: 2180, basis: "Cam actuated" },
      { label: "Heat treatment & nitriding", value: 1580, basis: "48 HRC, surface nitrided" },
      { label: "Polishing & texturing", value: 1340, basis: "Cavity draw polish" },
      { label: "Ejector system & assembly", value: 2460, basis: "Pins, plate, guides" },
      { label: "Die spotting & T1/T2 trials", value: 2120, basis: "2 sampling runs" },
      { label: "Spare inserts & wear parts", value: 1276, basis: "Core pins, ejector pins" },
    ],
    spec: [
      { label: "Tool type", value: "HPDC die · single cavity" },
      { label: "Die material", value: "H13 hot-work tool steel, nitrided" },
      { label: "Hardness", value: "48 HRC" },
      { label: "Cavities", value: "1" },
      { label: "Slides", value: "2 · cam actuated" },
      { label: "Machine class", value: "250 t cold chamber" },
      { label: "Tool life", value: "120,000 shots" },
      { label: "Lead time", value: "13 weeks" },
      { label: "Maintenance", value: "Polish every 12,000 shots" },
      { label: "Cycle time", value: "34 s" },
    ],
    measurements: [
      {
        title: "Part to cavity",
        rows: [
          { label: "Part envelope", value: "186.0 × 92.0 × 64.0 mm" },
          { label: "Wall", value: "3.0 mm", note: "Recast from a 2.5 mm sheet section" },
          { label: "Shrinkage allowance", value: "× 1.006", note: "AlSi10Mg shrinkage, 0.6%" },
          { label: "Cavity envelope", value: "187.1 × 92.6 × 64.4 mm", key: true },
        ],
      },
      {
        title: "Die block & machine",
        rows: [
          { label: "Die block per half", value: "340 × 280 × 240 mm", key: true },
          { label: "Shut height", value: "460 mm" },
          { label: "Projected area", value: "171 cm²" },
          {
            label: "Locking force required",
            value: "140 t",
            note: "171 cm² at 800 bar intensification",
            key: true,
          },
          { label: "Machine class", value: "250 t cold chamber" },
          { label: "Platen", value: "620 × 620 mm" },
          { label: "Tie-bar spacing", value: "420 × 420 mm" },
        ],
      },
      {
        title: "Cavity detail",
        rows: [
          { label: "Slide travel", value: "2 off · 32 mm" },
          { label: "Ejector stroke", value: "65 mm" },
          { label: "Gate thickness", value: "1.8 mm" },
          { label: "Overflows", value: "4 off" },
          { label: "Draft angle", value: "1.5°" },
        ],
      },
    ],
    layout: {
      toolW: 340,
      toolD: 280,
      toolLabel: "Die block 340 × 280",
      partW: 187.1,
      partD: 92.6,
      partLabel: "Cavity 187.1 × 92.6",
    },
    amortisation: [
      { volume: 2000, perPiece: 5.23 },
      { volume: 5000, perPiece: 2.09 },
      { volume: 10000, perPiece: 1.05 },
      { volume: 24000, perPiece: 0.44 },
      { volume: 40000, perPiece: 0.26 },
    ],
    note: "Dearer to build than the progressive die and dearer per piece. It only makes sense if the bracket has to be aluminium for mass or corrosion reasons: not on cost.",
    complexityNote: "Casting a part drawn for sheet metal means the bends become cavity detail: € 6,912 of CNC and € 3,536 of EDM against € 4,896 and € 2,660 for the progressive die.",
  },
  "cover-die": {
    key: "cover-die",
    presetKey: "cover",
    process: "die",
    partName: "Gearbox End Cover",
    partNumber: "DTV-CVR-0288",
    toolType: "HPDC die · single cavity",
    kind: "die",
    cost: 24800,
    leadWeeks: 12,
    life: 120000,
    lifeUnit: "shots",
    cavities: 1,
    annualVolume: 14000,
    productionLife: 3,
    perPiece: 0.59,
    amortLineLabel: "Tooling amortisation",
    lines: [
      { label: "Die design & flow simulation", value: 4428, basis: "54 h @ € 82/hr" },
      { label: "H13 tool steel blocks", value: 3960, basis: "Cavity & cover halves" },
      { label: "CNC roughing & finishing", value: 5904, basis: "82 h @ € 72/hr" },
      { label: "EDM · sink & wire", value: 2720, basis: "40 h @ € 68/hr" },
      { label: "Slides & core pins (2 slides)", value: 2040, basis: "Cam actuated" },
      { label: "Heat treatment & nitriding", value: 1380, basis: "48 HRC, surface nitrided" },
      { label: "Polishing & texturing", value: 1120, basis: "As-cast finish, draw polish" },
      { label: "Ejector system & assembly", value: 1740, basis: "Pins, plate, guides" },
      { label: "Die spotting & T1/T2 trials", value: 1508, basis: "2 sampling runs" },
    ],
    spec: [
      { label: "Tool type", value: "HPDC die · single cavity" },
      { label: "Die material", value: "H13 hot-work tool steel, nitrided" },
      { label: "Hardness", value: "48 HRC" },
      { label: "Cavities", value: "1" },
      { label: "Slides", value: "2 · cam actuated" },
      { label: "Machine class", value: "350 t cold chamber" },
      { label: "Tool life", value: "120,000 shots" },
      { label: "Lead time", value: "12 weeks" },
      { label: "Maintenance", value: "Polish every 12,000 shots" },
      { label: "Cycle time", value: "41 s" },
    ],
    measurements: [
      {
        title: "Part to cavity",
        rows: [
          { label: "Part envelope", value: "196.0 × 196.0 × 48.0 mm" },
          { label: "Wall", value: "3.0 mm uniform" },
          { label: "Machining allowance", value: "+ 0.5 mm", note: "Sealing face only" },
          { label: "Shrinkage allowance", value: "× 1.006", note: "AlSi10Mg shrinkage, 0.6%" },
          { label: "Cavity envelope", value: "197.2 × 197.2 × 48.3 mm", key: true },
        ],
      },
      {
        title: "Die block & machine",
        rows: [
          { label: "Die block per half", value: "400 × 400 × 250 mm", key: true },
          { label: "Shut height", value: "500 mm" },
          { label: "Projected area", value: "302 cm²", note: "Read from the model" },
          {
            label: "Locking force required",
            value: "246 t",
            note: "302 cm² at 800 bar intensification",
            key: true,
          },
          { label: "Machine class", value: "350 t cold chamber" },
          { label: "Platen", value: "760 × 760 mm" },
          { label: "Tie-bar spacing", value: "500 × 500 mm" },
        ],
      },
      {
        title: "Cavity detail",
        rows: [
          { label: "Slide travel", value: "2 off · 28 mm" },
          { label: "Ejector stroke", value: "55 mm" },
          { label: "Gate thickness", value: "1.6 mm" },
          { label: "Overflows", value: "5 off" },
          { label: "Draft angle", value: "1.0°" },
        ],
      },
    ],
    layout: {
      toolW: 400,
      toolD: 400,
      toolLabel: "Die block 400 × 400",
      partW: 197.2,
      partD: 197.2,
      partLabel: "Cavity 197.2 × 197.2",
    },
    amortisation: [
      { volume: 2000, perPiece: 4.13 },
      { volume: 5000, perPiece: 1.65 },
      { volume: 14000, perPiece: 0.59 },
      { volume: 25000, perPiece: 0.33 },
      { volume: 40000, perPiece: 0.21 },
    ],
    note: "At 14,000 pcs/yr the tool contributes 3% of the piece price. Tooling stops being the argument at this volume: material and cycle time carry the cost.",
    complexityNote: "The two undercuts scored above are Slides & core pins € 2,040, and the fine tolerance class is why Die spotting & T1/T2 trials runs to € 1,508: a fine class is a die-build cost before it is an inspection cost.",
  },
  "cover-sand": {
    key: "cover-sand",
    presetKey: "cover",
    process: "sand",
    partName: "Gearbox End Cover",
    partNumber: "DTV-CVR-0288",
    toolType: "Pattern & core box set",
    kind: "pattern",
    cost: 9400,
    leadWeeks: 5,
    life: 45000,
    lifeUnit: "pours",
    cavities: 1,
    annualVolume: 14000,
    productionLife: 3,
    perPiece: 0.22,
    amortLineLabel: "Pattern amortisation",
    lines: [
      { label: "Tooling design & methoding", value: 1716, basis: "22 h @ € 78/hr" },
      { label: "Pattern plate stock", value: 640, basis: "Resin-coated aluminium" },
      { label: "CNC machining · pattern halves", value: 2312, basis: "34 h @ € 68/hr" },
      { label: "Core box (1 off · bore core)", value: 1180, basis: "Machined & fitted" },
      { label: "Bench fitting & finishing", value: 1116, basis: "18 h @ € 62/hr" },
      { label: "Draft & parting verification", value: 520, basis: "Spotting and blue check" },
      { label: "Sealing, coating & mounting", value: 680, basis: "Match plate assembly" },
      { label: "Trial pour & first-article", value: 880, basis: "2 pours, dimensional report" },
      { label: "Spares & contingency", value: 356, basis: "Loose pieces, wear allowance" },
    ],
    spec: [
      { label: "Tool type", value: "Pattern & core box set" },
      { label: "Pattern material", value: "Resin-coated aluminium plate" },
      { label: "Core boxes", value: "1 · shaft bore" },
      { label: "Cavities", value: "1 per mould" },
      { label: "Parting line", value: "618.0 mm" },
      { label: "Draft angle", value: "2.0°: increased from 1.0°" },
      { label: "Tool life", value: "45,000 pours" },
      { label: "Lead time", value: "5 weeks" },
      { label: "Maintenance", value: "Re-coat every 6,000 pours" },
      { label: "Requires", value: "Wall 3.0 → 5.0 mm" },
    ],
    measurements: [
      {
        title: "Part to pattern",
        rows: [
          { label: "Part envelope", value: "196.0 × 196.0 × 48.0 mm" },
          {
            label: "Wall",
            value: "5.0 mm",
            note: "Increased from 3.0 mm: sand will not fill a 3 mm section",
            key: true,
          },
          { label: "Machining allowance", value: "+ 2.5 mm per face" },
          { label: "Shrinkage allowance", value: "× 1.010", note: "Grey iron shrinkage, 1.0%" },
          { label: "Pattern envelope", value: "203.0 × 203.0 × 53.5 mm", key: true },
          {
            label: "Mass penalty",
            value: "2.8 → 4.4 kg",
            note: "The thicker wall is what makes this option expensive per piece",
            key: true,
          },
        ],
      },
      {
        title: "Tool set",
        rows: [
          { label: "Match plate", value: "400 × 400 mm", key: true },
          { label: "Flask · cope + drag", value: "500 × 500 × 250 mm" },
          { label: "Core box · shaft bore", value: "140 × 140 × 60 mm" },
          { label: "Pattern draw depth", value: "26.0 mm" },
          { label: "Draft angle", value: "2.0°", note: "Opened up from 1.0° for sand draw" },
          { label: "Parting line", value: "618.0 mm" },
        ],
      },
      {
        title: "Running system",
        rows: [
          { label: "Sprue", value: "⌀ 26 → ⌀ 14 · 150 mm" },
          { label: "Runner section", value: "24 × 14 mm" },
          { label: "Ingates", value: "2 off · 18 × 8 mm" },
        ],
      },
    ],
    layout: {
      toolW: 400,
      toolD: 400,
      toolLabel: "Match plate 400 × 400",
      partW: 203,
      partD: 203,
      partLabel: "Pattern 203 × 203",
    },
    amortisation: [
      { volume: 2000, perPiece: 1.57 },
      { volume: 5000, perPiece: 0.63 },
      { volume: 10000, perPiece: 0.31 },
      { volume: 14000, perPiece: 0.22 },
    ],
    note: "The cheapest tool in the set, and the wrong answer. It only works after the wall goes 3.0 → 5.0 mm, which adds 1.6 kg of aluminium and € 8.40 to every piece: € 15,400 saved once against € 352,800 spent over the programme.",
    complexityNote: "The cheap tool hides the real cost. € 1,180 of core box buys you a pattern set for € 9,400, but the 5 mm wall it forces adds € 8.40 to every one of 42,000 pieces.",
  },
};
