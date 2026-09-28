/**
 * Builds the estimate record saved to the session (`addNewEstimate`) from a
 * preset, a process choice and an optional material override.
 *
 * original chunk: session-DWbGm5so.js
 * original exports: n=buildSessionEstimate, t=PRESET_PART_NUMBERS
 */

import { deriveBreakdown } from "./breakdown";
import { ALTERNATIVES, BASE_DESIGN, type CostLine } from "./estimate";
import { PARTS, type ProcessName } from "./parts";
import { PRESETS, PROCESS_SHORT } from "./process-detection";

/** Catalogue part number behind each demo preset. */
export const PRESET_PART_NUMBERS: Record<string, string> = {
  bearing: "DTV-HSG-0431",
  bracket: "DTV-BRK-0117",
  cover: "DTV-CVR-0288",
};

/**
 * An estimate saved during this visit. A `type` (not an interface) so it is
 * assignable to `SavedEstimate` in app-context.
 */
export type SessionEstimate = {
  id: string;
  partNumber: string;
  partName: string;
  spec: string;
  process: ProcessName;
  material: string;
  cost: number;
  lines: CostLine[];
  target: number | null;
  annualVolume: number;
  origin: string;
  /** `HH:MM`, en-GB. */
  createdAt: string;
  derived: boolean;
};

const timeNow = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** `null` when the preset is unknown or the chosen route has no price. */
export function buildSessionEstimate(
  presetKey: string,
  processKey: string,
  material?: string | null,
  origin = "Estimate workspace",
): SessionEstimate | null {
  const inference = PRESETS[presetKey] as (typeof PRESETS)[string] | undefined;
  const partNumber = PRESET_PART_NUMBERS[presetKey] as string | undefined;
  const part = PARTS.find((p) => p.number === partNumber);
  if (!inference || !part) return null;

  const option = inference.options.find((o) => o.key === processKey);
  if (!option || option.price == null) return null;

  const grade = material ?? option.material;
  const seeded =
    partNumber === "DTV-HSG-0431"
      ? [BASE_DESIGN, ...ALTERNATIVES].find((s) => s.toolKey === `bearing-${processKey}`)
      : undefined;
  const cost = seeded?.price ?? option.price;
  const derived = !seeded;
  const lines =
    seeded?.lines ??
    deriveBreakdown({ ...part, process: PROCESS_SHORT[processKey], material: grade, estimate: cost }, "n/a").lines;

  return {
    id: `${partNumber}-${processKey}-${grade}`,
    partNumber: part.number,
    partName: part.name,
    spec: `${PROCESS_SHORT[processKey]} · ${grade}`,
    process: PROCESS_SHORT[processKey],
    material: grade,
    cost,
    lines,
    target: part.target,
    annualVolume: part.annualVolume,
    origin,
    createdAt: timeNow(),
    derived,
  };
}
