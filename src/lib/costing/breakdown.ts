/**
 * Cost breakdown for any catalogue part: the recorded revision breakdown when
 * one exists, otherwise one derived from mass, material rate and the price.
 *
 * original chunk: breakdown-CQyaBcn-.js
 * original exports: t=deriveBreakdown
 */

import { REVISION_HISTORY, type CostLine } from "./estimate";
import type { Part, ProcessName } from "./parts";
import { MATERIAL_RATES } from "./rates";

export interface Breakdown {
  lines: CostLine[];
  /** `true` when the lines were derived rather than recorded. */
  derived: boolean;
}

export type BreakdownInput = Pick<Part, "number" | "revision" | "material" | "weightKg" | "process" | "estimate">;

/** Gross (billet / blank / pour) mass per kg of finished part. */
const PROCESS_YIELD: Record<ProcessName, number> = { Stamping: 1.37, "Sand cast": 1.27, "Die cast": 1.29 };

/** How the conversion cost splits across operations, per process. */
const CONVERSION_SHARES: Record<ProcessName, { label: string; share: number }[]> = {
  Stamping: [
    { label: "Blanking & piercing", share: 0.22 },
    { label: "Forming / bending", share: 0.26 },
    { label: "Machine time", share: 0.16 },
    { label: "Surface treatment", share: 0.2 },
    { label: "Tooling amortisation", share: 0.12 },
    { label: "Inspection", share: 0.04 },
  ],
  "Sand cast": [
    { label: "Melting & pouring", share: 0.17 },
    { label: "Moulding & cores", share: 0.23 },
    { label: "Fettling", share: 0.09 },
    { label: "Machining", share: 0.34 },
    { label: "Pattern amortisation", share: 0.13 },
    { label: "Inspection", share: 0.04 },
  ],
  "Die cast": [
    { label: "Melting & holding", share: 0.15 },
    { label: "Die casting machine", share: 0.26 },
    { label: "Trimming", share: 0.07 },
    { label: "Machining", share: 0.32 },
    { label: "Tooling amortisation", share: 0.16 },
    { label: "Inspection", share: 0.04 },
  ],
};

const OVERHEAD_RATE = 0.08;
const MARGIN_RATE = 0.055;

const round2 = (value: number) => Math.round(value * 100) / 100;

function recordedLines(partNumber: string, revision: string): CostLine[] | undefined {
  return REVISION_HISTORY.find((h) => h.partNumber === partNumber)?.revisions.find((r) => r.rev === revision)?.lines;
}

export function deriveBreakdown(part: BreakdownInput, revision: string = part.revision): Breakdown {
  const recorded = recordedLines(part.number, revision);
  if (recorded) return { lines: recorded, derived: false };

  const rate = MATERIAL_RATES.find((m) => m.grade === part.material);
  const ratePerKg = rate?.rate ?? 1.2;
  const scrapPerKg = rate?.scrap ?? 0.25;
  const grossKg = part.weightKg * PROCESS_YIELD[part.process];
  const rawMaterial = grossKg * ratePerKg;
  const returnCredit = (grossKg - part.weightKg) * scrapPerKg;
  const netMaterial = rawMaterial - returnCredit;
  const beforeBurden = part.estimate / (1.08 * 1.055);
  const conversion = Math.max(0, beforeBurden - netMaterial);

  const lines: CostLine[] = [
    { label: "Raw material", value: round2(rawMaterial) },
    { label: "Return credit", value: -round2(returnCredit) },
    ...CONVERSION_SHARES[part.process].map((op) => ({ label: op.label, value: round2(conversion * op.share) })),
  ];
  const subtotal = lines.reduce((sum, l) => sum + l.value, 0);
  const overhead = round2(subtotal * OVERHEAD_RATE);
  const margin = round2((subtotal + overhead) * MARGIN_RATE);
  lines.push({ label: `Overhead (${OVERHEAD_RATE * 100}%)`, value: overhead });
  lines.push({ label: `Margin (${MARGIN_RATE * 100}%)`, value: margin });

  // Push the rounding residue onto the largest conversion line so the lines sum to the price.
  const residue = round2(part.estimate - lines.reduce((sum, l) => sum + l.value, 0));
  if (residue !== 0) {
    let largest = 2;
    for (let i = 2; i < lines.length - 2; i++) if (lines[i].value > lines[largest].value) largest = i;
    lines[largest] = { ...lines[largest], value: round2(lines[largest].value + residue) };
  }
  return { lines, derived: true };
}
