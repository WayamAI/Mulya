/**
 * The agent crew behind New Estimate: the STEP read-outs, complexity scoring,
 * thermal windows, the crew definitions and the scripted run log per preset.
 *
 * original chunk: agents-D3Jo2k-x.js
 * original exports: a=CREW_STATUS, c=COMPLEXITY_BANDS, d=SAMPLE_STEP_TEXT, f=FEATURE_FLAGS, i=PHASES,
 *   l=COMPLEXITY, n=CHECKPOINT, o=buildAgentRun, r=PHASE_ONE_AGENT_IDS, s=getThermalProfile,
 *   t=AGENTS, u=STEP_FILES
 */

import { CONNECTORS, type ConnectorStatus } from "./connectors";
import { CONFIDENCE, buildEstimateSubject, type ConfidenceProfile, type InputState } from "./estimate-subject";
import { PRESETS, PROCESS_NAMES, type PresetKey, type ProcessInference, type ProcessKey } from "./process-detection";
import { TOOLING, type ToolSpec } from "./tooling";

/** Feature flags. The thermal agent is built but switched off. */
export const FEATURE_FLAGS: { thermal: boolean } = { thermal: false };

export interface LabelValue {
  label: string;
  value: string;
}

/** What the Geometry agent reads out of a preset's STEP file. */
export interface StepFile {
  key: PresetKey;
  fileName: string;
  fileSize: string;
  meta: string;
  product: LabelValue[];
  geometry: LabelValue[];
  features: LabelValue[];
  notes: LabelValue[];
}

export type ComplexityBand = "simple" | "moderate" | "complex" | "very";

export interface ComplexityFactor {
  factor: string;
  value: string;
  score: number;
  max: number;
  note: string;
}

export interface ComplexityProfile {
  presetKey: PresetKey;
  /** 0 to 100. */
  index: number;
  band: ComplexityBand;
  headline: string;
  costNote: string;
  factors: ComplexityFactor[];
}

export type ThermalStatus = "in-band" | "high" | "low";

export interface ThermalStage {
  stage: string;
  purpose: string;
  min: number;
  max: number;
  actual: number;
  unit: string;
  status: ThermalStatus;
  ifHigh: string;
  ifLow: string;
  costLink: string;
}

export interface ThermalSuggestion {
  title: string;
  detail: string;
  tone: "warn" | "save" | "note";
}

export interface ThermalProfile {
  key: string;
  process: ProcessKey;
  material: string;
  headline: string;
  reference: { label: string; value: string; note: string }[];
  stages: ThermalStage[];
  suggestions: ThermalSuggestion[];
}

export type AgentId = "part" | "process" | "inputs" | "tooling" | "thermal" | "confidence" | "share";

/** A connector reference shown on a `call` step. */
export interface SystemRef {
  name: string;
  method: string;
  status: ConnectorStatus;
}

export interface AgentStep {
  kind: "call" | "read" | "reason" | "result";
  text: string;
  system?: SystemRef;
  /** Relative duration of the step in the animated log. */
  weight?: number;
}

/** One agent's scripted run for a preset and route. */
export interface AgentRun {
  id: AgentId;
  name: string;
  role: string;
  handoff: string;
  result: string;
  alert?: boolean;
  steps: AgentStep[];
}

export interface AgentDefinition {
  id: AgentId;
  name: string;
  role: string;
  summary: string;
  phase: 1 | 2;
  inputs: string[];
  outputs: string[];
  systems: string[];
  dependsOn: string[];
  panel: string;
  limit: string;
}

export interface Phase {
  phase: 1 | 2;
  title: string;
  detail: string;
}

/** Money formatter handed in by the caller: `(valueEur, digits?) => string`. */
export type MoneyFormatter = (valueEur: number, digits?: number) => string;

/** STEP read-outs per preset, keyed by `PresetKey`. */
export const STEP_FILES: Record<string, StepFile> = {
  bearing: {
    key: "bearing",
    fileName: "DTV-HSG-0431_Bearing-Housing_RevB.step",
    fileSize: "4.82 MB",
    meta: "STEP AP214 · CATIA V5R21 · exported 28 Apr 2026 · R. Ehlers",
    product: [
      { label: "Part number", value: "DTV-HSG-0431" },
      { label: "Name", value: "Bearing Housing" },
      { label: "Revision", value: "B" },
      { label: "Description", value: "8 mm nominal wall, sand cast GG25" },
    ],
    geometry: [
      { label: "Bounding box", value: "248.0 × 186.0 × 94.0 mm" },
      { label: "Volume", value: "1,722 cm³" },
      { label: "Surface area", value: "2,948 cm²" },
      { label: "Net mass", value: "12.4 kg" },
      { label: "Pour mass", value: "15.8 kg" },
    ],
    features: [
      { label: "Primary bore", value: "⌀ 120.0" },
      { label: "Bolt circle", value: "6 × M12 on PCD 168.0" },
      { label: "Min wall", value: "8.0 mm" },
      { label: "Wall range", value: "8.0 to 22.0 mm" },
      { label: "Cored features", value: "2 internal" },
      { label: "Draft angle", value: "2.0° uniform" },
      { label: "Parting line", value: "742.0 mm" },
      { label: "Faces / edges", value: "148 / 392" },
    ],
    notes: [
      { label: "Material", value: "EN-GJL-250 (GG25)" },
      { label: "Tolerance", value: "ISO 2768-m" },
      { label: "Surface", value: "Shot blast SA 2.5" },
    ],
  },
  bracket: {
    key: "bracket",
    fileName: "DTV-BRK-0117_Cab-Mount-Bracket_RevB.step",
    fileSize: "1.14 MB",
    meta: "STEP AP214 · NX 2306 · exported 21 May 2026 · M. Okonkwo",
    product: [
      { label: "Part number", value: "DTV-BRK-0117" },
      { label: "Name", value: "Cab Mount Bracket" },
      { label: "Revision", value: "B" },
      { label: "Description", value: "2.5 mm HC340LA, 4 bends" },
    ],
    geometry: [
      { label: "Bounding box", value: "186.0 × 92.0 × 64.0 mm" },
      { label: "Blank size", value: "312.0 × 148.0 mm" },
      { label: "Volume", value: "147 cm³" },
      { label: "Surface area", value: "612 cm²" },
      { label: "Blank perimeter", value: "556.0 mm" },
      { label: "Cut length", value: "862.0 mm" },
      { label: "Net mass", value: "1.15 kg" },
      { label: "Blank mass", value: "1.58 kg" },
    ],
    features: [
      { label: "Pierced holes", value: "8 (⌀ 10.5 to ⌀ 14.0)" },
      { label: "Bend count", value: "4 at R4.0" },
      { label: "Dart / gussets", value: "2 formed" },
      { label: "Draw depth", value: "18.0 mm" },
      { label: "Sheet thickness", value: "2.5 mm" },
      { label: "Faces / edges", value: "64 / 178" },
    ],
    notes: [
      { label: "Material", value: "EN 10268 (HC340LA)" },
      { label: "Tolerance", value: "ISO 2768-m" },
      { label: "Surface", value: "KTL e-coat 20 µm" },
    ],
  },
  cover: {
    key: "cover",
    fileName: "DTV-CVR-0288_Gearbox-End-Cover_RevC.step",
    fileSize: "2.36 MB",
    meta: "STEP AP214 · CREO 10 · exported 11 Jun 2026 · A. Silva",
    product: [
      { label: "Part number", value: "DTV-CVR-0288" },
      { label: "Name", value: "Gearbox End Cover" },
      { label: "Revision", value: "C" },
      { label: "Description", value: "3 mm wall, HPDC AlSi10Mg" },
    ],
    geometry: [
      { label: "Bounding box", value: "196.0 × 196.0 × 48.0 mm" },
      { label: "Volume", value: "1,037 cm³" },
      { label: "Surface area", value: "1,486 cm²" },
      { label: "Projected area", value: "302 cm²" },
      { label: "Net mass", value: "2.8 kg" },
      { label: "Shot mass", value: "3.6 kg" },
    ],
    features: [
      { label: "Primary bore", value: "⌀ 84.0" },
      { label: "Bolt circle", value: "8 × M8 on PCD 172.0" },
      { label: "Min wall", value: "3.0 mm uniform" },
      { label: "Rib section", value: "4 at 2.2 mm" },
      { label: "Draft angle", value: "1.0°" },
      { label: "Parting line", value: "618.0 mm" },
      { label: "Faces / edges", value: "212 / 548" },
    ],
    notes: [
      { label: "Material", value: "EN AC-43000 (AlSi10Mg)" },
      { label: "Tolerance", value: "ISO 2768-f" },
      { label: "Surface", value: "As cast, deburred" },
    ],
  },
};

/** Raw STEP header/data excerpt for the bearing housing, shown as a file preview. */
export const SAMPLE_STEP_TEXT = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Bearing Housing - Rev B - Sand Cast GG25'),'2;1');
FILE_NAME('DTV-HSG-0431_Bearing-Housing_RevB','2026-04-28T10:22:14+01:00',
  ('R. Ehlers'),('Powertrain Design'),
  'CATIA V5R21 - STEP AP214 Export','CATIA V5R21','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 3 1 1 }'));
ENDSEC;
DATA;
#1 = APPLICATION_PROTOCOL_DEFINITION('international standard',
     'automotive_design',2000,#2);
#5 = PRODUCT('DTV-HSG-0431','Bearing Housing',
     'Rev B - 8mm nominal wall - sand cast GG25',(#4));
#10 = (LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.));
#30 = CARTESIAN_POINT('',(-124.0,-93.0,0.));
#36 = CARTESIAN_POINT('',(124.0,93.0,94.0));
#42 = CYLINDRICAL_SURFACE('',#41,60.0);
#70 = DESCRIPTIVE_REPRESENTATION_ITEM('MATERIAL','EN-GJL-250 (GG25)');
#73 = DESCRIPTIVE_REPRESENTATION_ITEM('NET_MASS_KG','12.4');
#74 = DESCRIPTIVE_REPRESENTATION_ITEM('POUR_MASS_KG','15.8');
ENDSEC;
END-ISO-10303-21;`;

export const COMPLEXITY_BANDS: Record<ComplexityBand, { label: string; range: string }> = {
  simple: { label: "Simple", range: "0 to 29" },
  moderate: { label: "Moderate", range: "30 to 54" },
  complex: { label: "Complex", range: "55 to 79" },
  very: { label: "Very complex", range: "80 to 100" },
};

/** Complexity scoring per preset, keyed by `PresetKey`. */
export const COMPLEXITY: Record<string, ComplexityProfile> = {
  bearing: {
    presetKey: "bearing",
    index: 68,
    band: "complex",
    headline: "Wall variation and two cored passages are what put this part in the complex band.",
    costNote: "Complex castings carry a 20 to 30% conversion premium over a simple part of the same mass. On this estimate it shows up as machining (€ 12.90) and fettling (€ 2.10): 31% of the piece price, none of which is metal.",
    factors: [
      {
        factor: "Feature count",
        value: "148 faces / 392 edges",
        score: 14,
        max: 20,
        note: "Above the median for a cast housing: every face is a surface the pattern has to form and the fettler has to clean",
      },
      {
        factor: "Wall variation",
        value: "8.0 to 22.0 mm",
        score: 12,
        max: 15,
        note: "Heavy sections beside thin ones risk shrinkage porosity and need feeding: the single most expensive thing a casting drawing can ask for",
      },
      {
        factor: "Cored features",
        value: "2 internal cores",
        score: 12,
        max: 15,
        note: "Each core is a separate box, a separate set operation and a separate knock-out",
      },
      {
        factor: "Tolerance demand",
        value: "ISO 2768-m · ±0.05 critical",
        score: 11,
        max: 15,
        note: "One tight characteristic forces a machining operation the rest of the part does not need",
      },
      {
        factor: "Machined faces",
        value: "6",
        score: 12,
        max: 15,
        note: "Each face is a setup or a tool change; machining is 27% of piece cost on this part",
      },
      {
        factor: "Surface requirement",
        value: "Shot blast SA 2.5",
        score: 4,
        max: 10,
        note: "Standard foundry cleaning: no coating, no masking, no special treatment",
      },
      {
        factor: "Draft & undercuts",
        value: "2.0° · none",
        score: 3,
        max: 10,
        note: "Clean two-part draw with nothing retracting: the one easy thing about this part",
      },
    ],
  },
  bracket: {
    presetKey: "bracket",
    index: 42,
    band: "moderate",
    headline: "Four bends and two darts drive the score; the draw itself is shallow and needs one stage.",
    costNote: "Moderate complexity. Blanking, piercing and forming come to € 1.46: 30% of the piece price. The rest is material and coating, which complexity does not move.",
    factors: [
      {
        factor: "Feature count",
        value: "64 faces / 178 edges",
        score: 6,
        max: 20,
        note: "Low: the part is essentially one folded blank, and every face comes from a bend or a cut",
      },
      {
        factor: "Draw severity",
        value: "18.0 mm over a 312 mm blank · ratio 0.06",
        score: 5,
        max: 15,
        note: "Shallow draw, well inside the limiting draw ratio for HC340LA: one stage, no redraw station, no annealing between hits",
      },
      {
        factor: "Bend count & radius",
        value: "4 at R4.0 · R/t 1.6",
        score: 9,
        max: 15,
        note: "Four bends need four form stations; R/t 1.6 is safe for this grade but leaves little spring-back margin",
      },
      {
        factor: "Pierce count",
        value: "8 holes ⌀10.5 to 14.0",
        score: 7,
        max: 15,
        note: "Two pierce stations and two punch sizes: each punch is a wear part on the spares list",
      },
      {
        factor: "Form features",
        value: "2 darts",
        score: 6,
        max: 15,
        note: "Stiffening darts add a station and a spring-back allowance that has to be tuned at try-out",
      },
      {
        factor: "Tolerance demand",
        value: "ISO 2768-m",
        score: 6,
        max: 10,
        note: "General tolerance throughout, no critical characteristics called out",
      },
      {
        factor: "Surface requirement",
        value: "KTL e-coat 20 µm",
        score: 3,
        max: 10,
        note: "Standard e-coat line, no masking and no selective coating",
      },
    ],
  },
  cover: {
    presetKey: "cover",
    index: 59,
    band: "complex",
    headline: "The fine tolerance class and 2.2 mm ribs are what put this part in the complex band.",
    costNote: "Complex, but complex in the die rather than in the part. The tolerance class and rib section drive die cost and cycle time: not material, which is why the piece price still lands under target.",
    factors: [
      {
        factor: "Feature count",
        value: "212 faces / 548 edges",
        score: 17,
        max: 20,
        note: "The highest count of the three: ribs, bosses and a bolt circle each add surfaces the cavity has to carry",
      },
      {
        factor: "Wall uniformity",
        value: "3.0 mm throughout",
        score: 4,
        max: 15,
        note: "A uniform section fills predictably and cools evenly: the easiest thing you can hand a die caster",
      },
      {
        factor: "Ribs & bosses",
        value: "4 ribs at 2.2 mm · 8 bosses",
        score: 11,
        max: 15,
        note: "Thin ribs need injection pressure and venting to fill; each boss is a local thick spot that solidifies last",
      },
      {
        factor: "Tolerance demand",
        value: "ISO 2768-f",
        score: 12,
        max: 15,
        note: "Fine class across the whole part rather than on one feature: that is a die-build cost, not an inspection cost",
      },
      {
        factor: "Slides & undercuts",
        value: "2 slides",
        score: 9,
        max: 15,
        note: "Two retracting actions, each a mechanism that wears and a maintenance interval",
      },
      {
        factor: "Surface requirement",
        value: "As cast, deburred",
        score: 2,
        max: 10,
        note: "No texture, no coating, no secondary finishing: the die polish does the work",
      },
      {
        factor: "Parting complexity",
        value: "618 mm · single split",
        score: 4,
        max: 10,
        note: "One clean parting plane with no stepped split to machine and spot",
      },
    ],
  },
};

/** Thermal windows keyed `<preset>-<process>`. */
const THERMAL_PROFILES: Record<string, ThermalProfile> = {
  "bearing-sand": {
    key: "bearing-sand",
    process: "sand",
    material: "GG25",
    headline: "The 22 mm boss section solidifies last and drives the whole thermal argument on this part.",
    reference: [
      {
        label: "Liquidus",
        value: "1,180 °C",
        note: "GG25 at 3.3% C equivalent: where solidification begins",
      },
      { label: "Solidus", value: "1,150 °C", note: "Eutectic arrest; below this the casting is solid" },
      {
        label: "Section modulus",
        value: "8 to 22 mm",
        note: "The heavy section sets the feeding requirement, not the average wall",
      },
    ],
    stages: [
      {
        stage: "Melt tapping",
        purpose: "Temperature leaving the furnace, before ladle transfer losses",
        min: 1450,
        max: 1500,
        actual: 1475,
        unit: "°C",
        status: "in-band",
        ifHigh: "Excess superheat oxidises the melt and burns refractory: lining cost rises",
        ifLow: "Not enough head for transfer losses; the pour arrives cold",
        costLink: "Melting & pouring € 4.20",
      },
      {
        stage: "Pouring",
        purpose: "Temperature at the sprue: the number that decides the casting",
        min: 1380,
        max: 1420,
        actual: 1435,
        unit: "°C",
        status: "high",
        ifHigh: "Sand burn-on and metal penetration; fettling time rises and the pattern wears faster",
        ifLow: "Misruns and cold shuts in the 8 mm wall: straight to scrap",
        costLink: "Fettling € 2.10",
      },
      {
        stage: "Mould",
        purpose: "Green sand temperature at the moment of pour",
        min: 20,
        max: 45,
        actual: 32,
        unit: "°C",
        status: "in-band",
        ifHigh: "Moisture flashes to steam at the mould face: blowholes and pinhole porosity",
        ifLow: "Below dew point the mould picks up condensation; same defect, opposite cause",
        costLink: "Moulding & cores € 5.60",
      },
      {
        stage: "Knockout",
        purpose: "Casting temperature when it leaves the mould",
        min: 400,
        max: 550,
        actual: 480,
        unit: "°C",
        status: "in-band",
        ifHigh: "Distortion and residual stress; the machined bore will move after cutting",
        ifLow: "Line occupancy rises: the moulding line is the bottleneck, not the furnace",
        costLink: "Machining € 12.90",
      },
      {
        stage: "Stress relief",
        purpose: "Optional soak to stabilise the casting before machining",
        min: 540,
        max: 580,
        actual: 560,
        unit: "°C",
        status: "in-band",
        ifHigh: "Above 600 °C pearlite begins to break down: hardness and strength drop",
        ifLow: "Below 520 °C the soak does not relieve; the bore moves on the machine",
        costLink: "Not separately costed, folded into Machining",
      },
    ],
    suggestions: [
      {
        title: "Pouring runs 15 °C above the upper limit",
        detail: "At 1,435 °C expect sand burn-on around the 22 mm boss. Drop to 1,405 °C, or keep the temperature and apply a zircon wash to the cope. The wash costs about € 0.18/pc against roughly € 0.60/pc of extra fettling: the wash wins.",
        tone: "warn",
      },
      {
        title: "The heavy section is the real problem",
        detail: "8 mm wall next to a 22 mm boss means the boss is still liquid when the wall has solidified, so it feeds from the wall and leaves shrinkage porosity. Coring the boss out to 12 mm would let you pour 30 °C cooler and remove a feeder.",
        tone: "save",
      },
      {
        title: "Stress relief may not be needed",
        detail: "Knockout at 480 °C is already slow-cooling the casting. If the bore holds ISO 2768-m after machining without the soak, that is a furnace cycle you are paying for and do not need: worth one trial batch to find out.",
        tone: "note",
      },
    ],
  },
  "bearing-die": {
    key: "bearing-die",
    process: "die",
    material: "AlSi10Mg",
    headline: "Die temperature is what protects the 100,000-shot life the tooling cost assumes.",
    reference: [
      { label: "Liquidus", value: "596 °C", note: "AlSi10Mg: where solidification begins" },
      { label: "Solidus", value: "557 °C", note: "Near-eutectic, so the freezing range is narrow" },
      {
        label: "Wall section",
        value: "6.0 mm",
        note: "Thick for HPDC: cycle time and porosity risk both rise with section",
      },
    ],
    stages: [
      {
        stage: "Holding furnace",
        purpose: "Melt temperature in the holder, feeding the shot sleeve",
        min: 660,
        max: 700,
        actual: 685,
        unit: "°C",
        status: "in-band",
        ifHigh: "Hydrogen pickup rises steeply above 700 °C: gas porosity in the heavy section",
        ifLow: "Below 650 °C the shot sleeve chills the metal before injection; cold flakes",
        costLink: "Melting & pouring € 3.90",
      },
      {
        stage: "Die surface",
        purpose: "Cavity temperature at the start of each shot",
        min: 180,
        max: 220,
        actual: 235,
        unit: "°C",
        status: "high",
        ifHigh: "Soldering and heat checking: die life falls well short of 100,000 shots",
        ifLow: "Cold shuts and poor surface; the as-cast finish will not be acceptable",
        costLink: "Tooling amortisation € 4.60",
      },
      {
        stage: "Ejection",
        purpose: "Casting temperature when the ejector pins push",
        min: 300,
        max: 380,
        actual: 345,
        unit: "°C",
        status: "in-band",
        ifHigh: "The casting is still soft: ejector pins mark it and the part distorts",
        ifLow: "It shrinks onto the cores; ejection force rises and pins break",
        costLink: "Trimming € 1.05",
      },
      {
        stage: "Shot sleeve",
        purpose: "Sleeve temperature at pour, before the plunger moves",
        min: 200,
        max: 260,
        actual: 225,
        unit: "°C",
        status: "in-band",
        ifHigh: "The sleeve seizes on the plunger tip; unplanned stops",
        ifLow: "Cold flakes form on the sleeve wall and end up in the casting as inclusions",
        costLink: "Die casting machine € 4.15",
      },
    ],
    suggestions: [
      {
        title: "Die is running 15 °C hot: this is a tooling cost, not a quality one",
        detail: "At 235 °C the die will solder and heat-check. Soldering does not scrap parts, it shortens die life, and the € 4.60/pc amortisation assumes 100,000 shots. Losing 20% of that life adds about € 0.92/pc. Add a cooling circuit to the boss area at roughly € 1,400 of die cost, which is € 0.23/pc.",
        tone: "warn",
      },
      {
        title: "The 6 mm wall is fighting the process",
        detail: "HPDC is economic between 1.5 and 4 mm. At 6 mm the cycle is long, the centre is porous and the die runs hot because it has more heat to remove each shot. Taking the wall to 4 mm would cut the cycle by roughly 18% and let the die sit inside band without extra cooling.",
        tone: "save",
      },
    ],
  },
  "bracket-stamping": {
    key: "bracket-stamping",
    process: "stamping",
    material: "HC340LA",
    headline: "The part is cold formed, so the only thermal risk on it is the coating bake, and it is a real one.",
    reference: [
      {
        label: "Forming",
        value: "Ambient",
        note: "HC340LA is cold formed; no heating anywhere in the press line",
      },
      {
        label: "Recrystallisation",
        value: "≈ 650 °C",
        note: "Far above anything the part sees: listed to rule it out",
      },
      {
        label: "Bake-hardening",
        value: "None",
        note: "HC340LA is micro-alloyed, not bake-hardenable: the e-coat bake adds no strength",
      },
    ],
    stages: [
      {
        stage: "Strip at blanking",
        purpose: "Coil temperature entering the die",
        min: 15,
        max: 35,
        actual: 22,
        unit: "°C",
        status: "in-band",
        ifHigh: "Nothing material: steel does not care at these temperatures",
        ifLow: "Below about 5 °C ductility falls and the R4.0 bends risk edge cracking",
        costLink: "Blanking & piercing € 0.72",
      },
      {
        stage: "Die surface",
        purpose: "Tool temperature after continuous running",
        min: 20,
        max: 60,
        actual: 48,
        unit: "°C",
        status: "in-band",
        ifHigh: "Above 80 °C the lubricant film breaks down: galling on the form stations",
        ifLow: "No lower limit in practice",
        costLink: "Forming / bending € 0.74",
      },
      {
        stage: "KTL e-coat bake",
        purpose: "Cure cycle for the 20 µm e-coat",
        min: 175,
        max: 185,
        actual: 192,
        unit: "°C",
        status: "high",
        ifHigh: "Over-bake embrittles the film: it chips at the bend radii and fails salt spray",
        ifLow: "Under-cure leaves the film soft; corrosion performance fails at 480 h",
        costLink: "Coating (KTL) € 0.44",
      },
      {
        stage: "Bake soak time",
        purpose: "Metal temperature held above 170 °C",
        min: 18,
        max: 25,
        actual: 20,
        unit: "°C",
        status: "in-band",
        ifHigh: "Longer soak costs oven throughput and therefore line rate",
        ifLow: "Insufficient crosslinking; same failure as under-temperature",
        costLink: "Coating (KTL) € 0.44",
      },
    ],
    suggestions: [
      {
        title: "E-coat bake is 7 °C over: this fails at the bend radii first",
        detail: "At 192 °C the film over-cures and embrittles. On a flat panel you would not notice; on four R4.0 bends it chips and fails 480 h salt spray. Bring the oven to 180 °C, or accept a thinner 15 µm film which tolerates the over-bake and saves about € 0.06/pc.",
        tone: "warn",
      },
      {
        title: "No thermal cost lever on the forming side",
        detail: "Cold forming means there is nothing to optimise thermally before the coating line. Anyone proposing a warm-forming step for a 2.5 mm HSLA bracket at 24,000/yr is adding cost for no return.",
        tone: "note",
      },
    ],
  },
  "cover-die": {
    key: "cover-die",
    process: "die",
    material: "AlSi10Mg",
    headline: "A 3 mm uniform wall is the easiest thermal case in the set: everything sits in band.",
    reference: [
      { label: "Liquidus", value: "596 °C", note: "AlSi10Mg: where solidification begins" },
      { label: "Solidus", value: "557 °C", note: "Narrow freezing range suits die casting" },
      {
        label: "Wall section",
        value: "3.0 mm uniform",
        note: "Squarely in the band HPDC fills and cools predictably",
      },
    ],
    stages: [
      {
        stage: "Holding furnace",
        purpose: "Melt temperature in the holder",
        min: 660,
        max: 700,
        actual: 675,
        unit: "°C",
        status: "in-band",
        ifHigh: "Hydrogen pickup and gas porosity",
        ifLow: "Cold flakes from the shot sleeve",
        costLink: "Melting & holding",
      },
      {
        stage: "Die surface",
        purpose: "Cavity temperature at the start of each shot",
        min: 180,
        max: 220,
        actual: 205,
        unit: "°C",
        status: "in-band",
        ifHigh: "Soldering and heat checking; shorter die life",
        ifLow: "Cold shuts in the 2.2 mm ribs before anywhere else",
        costLink: "Tooling amortisation € 0.59",
      },
      {
        stage: "Rib fill",
        purpose: "Metal temperature reaching the thin ribs",
        min: 570,
        max: 600,
        actual: 583,
        unit: "°C",
        status: "in-band",
        ifHigh: "Nothing: hotter helps fill, up to the porosity limit",
        ifLow: "Below 570 °C the 2.2 mm ribs short-fill; this is the first feature to go",
        costLink: "Die casting machine",
      },
      {
        stage: "Ejection",
        purpose: "Casting temperature at ejection",
        min: 300,
        max: 380,
        actual: 330,
        unit: "°C",
        status: "in-band",
        ifHigh: "Ejector marks and distortion on a thin flat part",
        ifLow: "Shrink grip on the bore core",
        costLink: "Trimming",
      },
    ],
    suggestions: [
      {
        title: "Nothing to fix, and that is worth saying out loud",
        detail: "Every stage sits inside band, which is what a uniform 3 mm wall buys you. This is the thermal profile a die caster wants to be handed, and it is part of why this part comes in under target while the bearing housing does not.",
        tone: "save",
      },
      {
        title: "Watch the ribs if the melt drifts",
        detail: "The 2.2 mm ribs fill last and fail first. Rib fill at 583 °C has 13 °C of margin to the lower limit: comfortable, but it is the characteristic to monitor rather than the wall.",
        tone: "note",
      },
    ],
  },
};

export function getThermalProfile(presetKey: string, process: string): ThermalProfile | undefined {
  return THERMAL_PROFILES[`${presetKey}-${process}`];
}

/** Agents that may run before the human checkpoint (phase 1). */
export const PHASE_ONE_AGENT_IDS: AgentId[] = ["part", "process"];

const systemRef = (name: string): SystemRef | undefined => {
  const connector = CONNECTORS.find((c) => c.name === name);
  return connector ? { name: connector.name, method: connector.method, status: connector.status } : undefined;
};

/**
 * Scripted run log for every agent on a preset and route. Returns `[]` for an
 * unknown preset. The thermal agent is dropped unless `FEATURE_FLAGS.thermal`.
 */
export function buildAgentRun(presetKey: string, process: string, money: MoneyFormatter): AgentRun[] {
  const stepFile: StepFile | undefined = STEP_FILES[presetKey];
  const inference: ProcessInference | undefined = PRESETS[presetKey];
  const complexity: ComplexityProfile | undefined = COMPLEXITY[presetKey];
  const confidence: ConfidenceProfile | undefined = CONFIDENCE[presetKey];
  const tool: ToolSpec | undefined = TOOLING[`${presetKey}-${process}`];
  const thermal = getThermalProfile(presetKey, process);
  const subject = buildEstimateSubject(presetKey, process, null);
  if (!stepFile || !inference || !complexity || !confidence) return [];

  const overTarget = subject.target != null && subject.price > subject.target * 1.05;
  const variance = subject.target == null ? 0 : ((subject.price - subject.target) / subject.target) * 100;

  const geometry: AgentRun = {
    id: "part",
    name: "Geometry",
    role: "Reads the solid and scores how hard it is to make",
    handoff: "Signals and complexity index → Process",
    result: `Complexity ${complexity.index}: ${COMPLEXITY_BANDS[complexity.band].label}`,
    steps: [
      { kind: "call", text: `Fetching part master ${inference.partNumber}`, system: systemRef("Teamcenter"), weight: 2 },
      { kind: "read", text: `${stepFile.fileName} · ${stepFile.fileSize}` },
      { kind: "read", text: stepFile.meta },
      ...stepFile.geometry.slice(0, 4).map((g): AgentStep => ({ kind: "read", text: `${g.label}: ${g.value}` })),
      ...stepFile.features.slice(0, 3).map((f): AgentStep => ({ kind: "read", text: `${f.label}: ${f.value}` })),
      {
        kind: "reason",
        text: `Scoring ${complexity.factors.length} complexity factors for a ${inference.detected === "stamping" ? "stamping" : "casting"}`,
        weight: 2,
      },
      { kind: "result", text: `Complexity ${complexity.index} / 100: ${COMPLEXITY_BANDS[complexity.band].label}` },
    ],
  };

  const rankedScores = Object.entries(inference.scores).sort((a, b) => b[1] - a[1]);
  const processAgent: AgentRun = {
    id: "process",
    name: "Process",
    role: "Decides what the geometry says it should be made by",
    handoff: "Confirmed route → Cost, Tooling, Thermal",
    result: `${PROCESS_NAMES[inference.detected]}: ${inference.confidence}%`,
    steps: [
      {
        kind: "reason",
        text: `Matching ${inference.signals.length} geometric signals against three process signatures`,
        weight: 2,
      },
      ...inference.signals
        .slice(0, 4)
        .map((s): AgentStep => ({ kind: "reason", text: `${s.signal} ${s.value} → ${s.implies}` })),
      {
        kind: "read",
        text: `Scores: ${rankedScores.map(([key, score]) => `${PROCESS_NAMES[key].toLowerCase()} ${score}`).join(" · ")}`,
      },
      ...inference.options
        .filter((o) => o.viability === "blocked")
        .slice(0, 1)
        .map((o): AgentStep => ({ kind: "reason", text: `${PROCESS_NAMES[o.key]} ruled out: ${o.note}` })),
      { kind: "result", text: `${PROCESS_NAMES[inference.detected]} at ${inference.confidence}% · override available` },
    ],
  };

  const option = inference.options.find((o) => o.key === process);
  const basis = option?.basis;
  const cost: AgentRun = {
    id: "inputs",
    name: "Cost",
    role: "Prices the metal, the conversion and the burden",
    handoff: "Piece price and breakdown → Confidence",
    result: money(subject.price),
    alert: overTarget,
    steps: [
      {
        kind: "call",
        text: "Requesting paid prices for comparable parts",
        system: systemRef("SAP S/4HANA"),
        weight: 2,
      },
      { kind: "reason", text: "Not connected: falling back to the Rate Master defaults your purchasing team owns" },
      ...(basis
        ? [
            {
              kind: "read",
              text: `${basis.billetLabel} ${basis.billetKg} kg · net ${basis.netKg} kg · grade ${option?.material}`,
            } satisfies AgentStep,
          ]
        : []),
      ...subject.lines.slice(0, 2).map((l): AgentStep => ({ kind: "read", text: `${l.label}: ${money(l.value)}` })),
      {
        kind: "reason",
        text: `Conversion by ${PROCESS_NAMES[process].toLowerCase()} route · overhead 8% · margin 5.5%`,
        weight: 2,
      },
      {
        kind: "result",
        text:
          subject.target == null
            ? `${money(subject.price)} piece price · no target set`
            : `${money(subject.price)} piece price: ${Math.abs(variance).toFixed(1)}% ${variance > 0 ? "over" : "under"} target`,
      },
    ],
  };

  const keyDimension = tool?.measurements?.[0]?.rows?.find((r) => r.key) ?? tool?.measurements?.[0]?.rows?.[0];
  const tooling: AgentRun = {
    id: "tooling",
    name: "Tooling",
    role: "Sizes and costs the tool, then divides it across the programme",
    handoff: "Amortisation line → Cost breakdown",
    result: tool ? `${money(tool.cost, 0)} · ${money(tool.perPiece)}/pc` : "n/a",
    steps: tool
      ? [
          { kind: "reason", text: `Sizing the ${tool.toolType.toLowerCase()} from the part envelope` },
          ...(keyDimension
            ? [{ kind: "read", text: `${keyDimension.label}: ${keyDimension.value}` } satisfies AgentStep]
            : []),
          {
            kind: "reason",
            text: `Costing ${tool.lines.length} tool-shop line items · steel, CNC, EDM, fitting, trials`,
            weight: 2,
          },
          {
            kind: "read",
            text: `${tool.toolType}: ${money(tool.cost, 0)} · ${tool.leadWeeks} week lead · ${tool.life.toLocaleString("en-GB")} ${tool.lifeUnit}`,
          },
          {
            kind: "reason",
            text: `${money(tool.cost, 0)} ÷ ${(tool.annualVolume * tool.productionLife).toLocaleString("en-GB")} lifetime pieces`,
          },
          { kind: "result", text: `${money(tool.perPiece)} / pc: the “${tool.amortLineLabel}” line` },
        ]
      : [{ kind: "result", text: "No tool costed for this route" }],
  };

  const outOfBand = thermal?.stages.filter((s) => s.status !== "in-band") ?? [];
  const thermalAgent: AgentRun = {
    id: "thermal",
    name: "Thermal",
    role: "Checks the temperature window the process has to run in",
    handoff: "Out-of-band stages → Cost drivers",
    result: thermal
      ? outOfBand.length
        ? `${outOfBand.length} stage${outOfBand.length === 1 ? "" : "s"} out of band`
        : `${thermal.stages.length} stages in band`
      : "n/a",
    alert: outOfBand.length > 0,
    steps: thermal
      ? [
          { kind: "reason", text: `Checking ${thermal.stages.length} stages against their target bands`, weight: 2 },
          ...thermal.stages.slice(0, 3).map(
            (s): AgentStep => ({
              kind: "read",
              text: `${s.stage}: ${s.actual.toLocaleString("en-GB")} ${s.unit} against ${s.min.toLocaleString("en-GB")} to ${s.max.toLocaleString("en-GB")} ${s.unit}`,
            }),
          ),
          ...outOfBand.slice(0, 1).map(
            (s): AgentStep => ({
              kind: "reason",
              text: `${s.stage} runs ${s.status}: ${s.status === "high" ? s.ifHigh : s.ifLow}`,
            }),
          ),
          {
            kind: "result",
            text: outOfBand.length
              ? `${outOfBand.length} stage${outOfBand.length === 1 ? "" : "s"} outside the band: ${outOfBand[0].costLink} moves`
              : `All ${thermal.stages.length} stages inside the band`,
          },
        ]
      : [{ kind: "result", text: "No thermal profile for this route" }],
  };

  const stateCounts = confidence.inputs.reduce<Partial<Record<InputState, number>>>(
    (counts, input) => ({ ...counts, [input.state]: (counts[input.state] ?? 0) + 1 }),
    {},
  );

  const runs: AgentRun[] = [
    geometry,
    processAgent,
    cost,
    tooling,
    thermalAgent,
    {
      id: "confidence",
      name: "Confidence",
      role: "Separates what was read from what was assumed and what nobody has",
      handoff: "Accuracy band → the ± on the headline figure",
      result: `Class ${confidence.estimateClass} · ±${Math.round((Math.abs(confidence.low) + confidence.high) / 2)}%`,
      steps: [
        {
          kind: "reason",
          text: `Classifying ${confidence.inputs.length} inputs as read, assumed or unknown`,
          weight: 2,
        },
        {
          kind: "read",
          text: `${stateCounts.read ?? 0} read · ${stateCounts.assumed ?? 0} assumed · ${stateCounts.unknown ?? 0} unknown`,
        },
        {
          kind: "reason",
          text: `AACE 18R-97: ${confidence.className.toLowerCase()}, priced off geometry and rate cards`,
        },
        {
          kind: "result",
          text: `Class ${confidence.estimateClass} · ${confidence.low.toFixed(1)}% / +${confidence.high.toFixed(1)}%`,
        },
      ],
    },
    {
      id: "share",
      name: "Supplier",
      role: "Assembles what actually leaves the building",
      handoff: "RFQ pack → purchasing",
      result: "RFQ pack ready",
      steps: [
        { kind: "reason", text: "Rendering four orthographic views, hidden-line, to one scale" },
        { kind: "reason", text: "Laying out the drawing sheet, cost summary and tool specification", weight: 2 },
        { kind: "call", text: "RFQ would post to the supplier network on release", system: systemRef("SAP Ariba") },
        { kind: "result", text: "Pack ready: drawing sheet, cost summary, tool spec" },
      ],
    },
  ];
  return runs.filter((r) => FEATURE_FLAGS.thermal || r.id !== "thermal");
}

/** Crew status line for each phase of a run. */
export const CREW_STATUS = {
  idle: "Seven specialists idle: drop a STEP file to dispatch",
  planning: "Planning the run: Geometry first, the rest depend on what it reads",
  running: (agentName: string, activity: string) => `${agentName} has control: ${activity.toLowerCase()}`,
  awaiting: "Holding. Tooling and cost work commits us to a manufacturing route: confirm the process before I dispatch the rest.",
  done: "Run complete: every panel below is filled by the agent that produced it",
};

const ALL_AGENTS: AgentDefinition[] = [
  {
    id: "part",
    name: "Geometry",
    role: "Reads the solid and scores how hard it is to make",
    summary: "Opens the STEP file and pulls the envelope, mass, wall range, cored features, draft and feature counts, then scores seven complexity factors against the process family the shape belongs to. Mass tells you what the metal costs and nothing else; complexity is what explains the other two thirds of the price.",
    phase: 1,
    inputs: ["STEP AP214 solid", "Part master record"],
    outputs: ["Geometric signals", "Complexity index 0 to 100", "Band · simple to very complex"],
    systems: ["Teamcenter"],
    dependsOn: [],
    panel: "Part",
    limit: "Reads geometry only. It does not read manufacturing intent, because no STEP file carries any.",
  },
  {
    id: "process",
    name: "Process",
    role: "Decides what the geometry says it should be made by",
    summary: "Matches the signals against three process signatures and returns a ranked verdict with a confidence figure and the evidence behind it: every row traceable to a line in the CAD read-out above it. Processes the geometry rules out are named as ruled out, with the reason, rather than quietly priced.",
    phase: 1,
    inputs: ["Geometric signals", "Complexity index"],
    outputs: ["Recommended process", "Confidence %", "Evidence table", "Viability per process"],
    systems: [],
    dependsOn: ["Geometry"],
    panel: "Process",
    limit: "Recommends; it does not commit. The route is confirmed by a person, and the rest of the crew waits for that.",
  },
  {
    id: "inputs",
    name: "Cost",
    role: "Prices the metal, the conversion and the burden",
    summary: "Takes the billet or blank mass against the finished mass, prices both at the grade's rate and scrap value, adds the conversion route for the confirmed process, then applies overhead and margin in that order. Where a grade is changed on the form, the material lines recompute against the same basis.",
    phase: 2,
    inputs: ["Confirmed process", "Material grade", "Annual volume", "Rate master"],
    outputs: ["Piece price", "Cost breakdown", "Variance to target"],
    systems: ["SAP S/4HANA"],
    dependsOn: ["Process", "Tooling"],
    panel: "Inputs",
    limit: "With no ERP connection it prices off the Rate Master defaults and says so, rather than presenting a defaulted rate as a paid price.",
  },
  {
    id: "tooling",
    name: "Tooling",
    role: "Sizes and costs the tool, then divides it across the programme",
    summary: "Derives the tool's size from the part: a pattern cut oversize for machining and shrinkage, a die block sized by the force it has to hold shut, then costs it as a tool shop would, line by line. The build cost is divided across the pieces the tool will actually make, and that division is the amortisation line in the breakdown.",
    phase: 2,
    inputs: ["Confirmed process", "Part envelope", "Annual volume", "Production life"],
    outputs: ["Tool build cost", "Lead time", "Tool life", "Amortisation per piece"],
    systems: [],
    dependsOn: ["Process", "Geometry"],
    panel: "Tooling",
    limit: "Costs one tool for one route. It does not decide whether the programme should buy it.",
  },
  {
    id: "thermal",
    name: "Thermal",
    role: "Checks the temperature window the process has to run in",
    summary: "Checks each stage (melt, ladle, mould or die) against the band the alloy needs, and names the defect that appears on each side of it along with the cost line that moves when it does. Temperature is not a footnote in casting; it is the process.",
    phase: 2,
    inputs: ["Confirmed process", "Material grade", "Section thickness"],
    outputs: ["Stage bands", "Out-of-band stages", "Affected cost lines"],
    systems: [],
    dependsOn: ["Process"],
    panel: "Thermal",
    limit: "States standard practice for the alloy for alignment, not as a process specification. The foundry's own window wins.",
  },
  {
    id: "confidence",
    name: "Confidence",
    role: "Separates what was read from what was assumed and what nobody has",
    summary: "Sorts every input into read, assumed or unknown, and turns that into an AACE 18R-97 estimate class with the accuracy band the class implies. The ± on the headline figure is not decoration: it is the width of what is not known, itemised here so it can be argued with.",
    phase: 2,
    inputs: ["Every input the other agents used", "Fields marked unknown on the form"],
    outputs: ["Estimate class", "Accuracy band", "What would move it up a class"],
    systems: [],
    dependsOn: ["Cost", "Tooling"],
    panel: "Confidence",
    limit: "Reports the class honestly, including when a marked unknown demotes it. It will not narrow a band it cannot justify.",
  },
  {
    id: "share",
    name: "Supplier",
    role: "Assembles what actually leaves the building",
    summary: "Renders four orthographic views as a drawing sheet (dark on white, because that is what survives printing) and lays out the cost summary and tool specification as a real document with selectable text, not a screenshot of a web page.",
    phase: 2,
    inputs: ["Part geometry", "Cost breakdown", "Tool specification"],
    outputs: ["Drawing sheet", "Cost summary", "Tool spec", "RFQ pack"],
    systems: ["SAP Ariba"],
    dependsOn: ["Cost", "Tooling", "Confidence"],
    panel: "Share",
    limit: "Assembles and previews the pack. Releasing it to a supplier is a human action.",
  },
];

/** The crew. The thermal agent is dropped unless `FEATURE_FLAGS.thermal` (evaluated once, at load). */
export const AGENTS: AgentDefinition[] = ALL_AGENTS.filter((a) => FEATURE_FLAGS.thermal || a.id !== "thermal");

export const PHASES: Phase[] = [
  {
    phase: 1,
    title: "Read and recommend",
    detail: "Geometry opens the file and Process reads a verdict out of it. Neither commits to anything: between them they produce evidence and a recommendation.",
  },
  {
    phase: 2,
    title: "Cost the committed route",
    detail: "Once a person confirms the manufacturing route, the rest of the crew prices it: the tool, the piece, the confidence in both, and the pack that goes to a supplier.",
  },
];

export const CHECKPOINT: { title: string; detail: string } = {
  title: "Human checkpoint",
  detail: "The run stops between the two phases. Everything after it commits to a way of making the part, and an agent that costs a die nobody agreed to has made a decision that was not its to make. Confirming the process releases the rest of the crew.",
};
