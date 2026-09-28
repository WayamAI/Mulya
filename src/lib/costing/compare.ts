/**
 * Estimate comparison: cost categories, line alignment across processes, and
 * the reconciled deltas that drive /compare.
 *
 * Pure and framework-free. All arithmetic runs in integer cents so the row
 * deltas sum exactly to the total delta, and the category subtotals sum
 * exactly to each side's total.
 */

import type { CostLine } from "./estimate";

// --- categories ---------------------------------------------------------------

export type CostCategory = "material" | "conversion" | "tooling" | "overhead";

export const CATEGORY_ORDER: readonly CostCategory[] = ["material", "conversion", "tooling", "overhead"];

export const CATEGORY_LABEL: Record<CostCategory, string> = {
  material: "Material",
  conversion: "Conversion",
  tooling: "Tooling",
  overhead: "Overhead & margin",
};

/** Label of the synthetic row that carries any gap between the lines and the price on file. */
export const UNALLOCATED_LABEL = "Unallocated to lines";

const norm = (label: string) => label.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Category for a cost line label. Material: bought metal and its scrap credit.
 * Tooling: any amortisation. Overhead & margin: burden, margin and the
 * unallocated residue. Everything else (melting, moulding, pressing,
 * fettling, machining, finishing, inspection, and unknown labels) is Conversion.
 */
export function categoryOf(label: string): CostCategory {
  const l = norm(label);
  if (/\bamorti[sz]ation\b/.test(l) || /^(tooling|pattern|die|tool)\b.*\bcost\b/.test(l)) return "tooling";
  if (/^(raw material|material|return credit|scrap credit|scrap return)\b/.test(l)) return "material";
  if (/^(overhead|margin|profit|sg&a)\b/.test(l) || l === norm(UNALLOCATED_LABEL)) return "overhead";
  return "conversion";
}

// --- alignment ----------------------------------------------------------------

/**
 * Equivalent operations under different names. Each group maps to one
 * canonical key; the first entry is the canonical display name.
 */
const SYNONYMS: { key: string; labels: string[] }[] = [
  { key: "raw-material", labels: ["Raw material", "Material"] },
  { key: "return-credit", labels: ["Return credit", "Scrap credit", "Scrap return"] },
  { key: "melting", labels: ["Melting & pouring", "Melting & holding"] },
  {
    key: "forming",
    labels: ["Moulding & cores", "Moulding / machine", "Die casting machine", "Forming / bending", "Forming & restrike"],
  },
  { key: "press-time", labels: ["Machine time", "Press time · progressive die"] },
  { key: "blanking", labels: ["Blanking & piercing", "Piercing & tapping"] },
  {
    key: "fettling",
    labels: ["Fettling", "Fettling / trimming", "Trimming", "Trimming & deflashing", "Vibratory deburr"],
  },
  { key: "machining", labels: ["Machining", "Machining · bore & face"] },
  { key: "finishing", labels: ["Surface treatment", "Coating (KTL)", "Surface treatment · KTL"] },
  { key: "inspection", labels: ["Inspection", "Leak test & inspection"] },
  { key: "unallocated", labels: [UNALLOCATED_LABEL] },
];

const SYNONYM_KEY = new Map<string, string>(
  SYNONYMS.flatMap((group) => group.labels.map((label) => [norm(label), group.key] as const)),
);

/** Canonical key a label aligns on. */
export function alignKey(label: string): string {
  const l = norm(label);
  const known = SYNONYM_KEY.get(l);
  if (known) return known;
  const category = categoryOf(label);
  if (category === "tooling") return "tooling";
  if (/^overhead\b/.test(l)) return "overhead";
  if (/^margin\b/.test(l)) return "margin";
  return `line:${l}`;
}

export type RowChange = "same" | "changed" | "added" | "removed";

/** One aligned pair of lines (either side may be missing). Money in EUR. */
export interface AlignedRow {
  key: string;
  category: CostCategory;
  /** Display label: the shared name, or `A name → B name` when they differ. */
  label: string;
  labelA: string | null;
  labelB: string | null;
  a: number | null;
  b: number | null;
  /** B minus A (a missing side counts as 0). */
  delta: number;
  /** Delta over |A| in percent; `null` when A is missing or zero. */
  deltaPct: number | null;
  change: RowChange;
  /** Position in the combined line order, for stable category sorting. */
  order: number;
}

const cents = (value: number) => Math.round(value * 100);
const eur = (c: number) => c / 100;

/**
 * Pair equivalent lines of two breakdowns. Lines pair on their canonical key
 * (see the synonym map); a second line with the same key on one side pairs
 * with the next unmatched one on the other, else stands alone.
 */
export function alignLines(a: readonly CostLine[], b: readonly CostLine[]): AlignedRow[] {
  type Slot = { key: string; labelA: string | null; labelB: string | null; a: number | null; b: number | null; order: number };
  const slots: Slot[] = [];
  const openForB = new Map<string, Slot[]>();

  a.forEach((line, index) => {
    const key = alignKey(line.label);
    const slot: Slot = { key, labelA: line.label, labelB: null, a: line.value, b: null, order: index };
    slots.push(slot);
    openForB.set(key, [...(openForB.get(key) ?? []), slot]);
  });

  b.forEach((line, index) => {
    const key = alignKey(line.label);
    const queue = openForB.get(key);
    const slot = queue?.shift();
    if (slot) {
      slot.labelB = line.label;
      slot.b = line.value;
    } else {
      // Unmatched B lines sit just after the A line they follow in B's order.
      slots.push({ key, labelA: null, labelB: line.label, a: null, b: line.value, order: index + 0.5 });
    }
  });

  const seen = new Map<string, number>();
  return slots.map((slot) => {
    const n = seen.get(slot.key) ?? 0;
    seen.set(slot.key, n + 1);
    const labelA = slot.labelA;
    const labelB = slot.labelB;
    const label =
      labelA && labelB ? (norm(labelA) === norm(labelB) ? labelB : `${labelA} → ${labelB}`) : (labelB ?? labelA ?? "");
    const deltaC = cents(slot.b ?? 0) - cents(slot.a ?? 0);
    const change: RowChange = slot.a == null ? "added" : slot.b == null ? "removed" : deltaC === 0 ? "same" : "changed";
    return {
      key: n ? `${slot.key}#${n}` : slot.key,
      category: categoryOf(labelB ?? labelA ?? ""),
      label,
      labelA,
      labelB,
      a: slot.a,
      b: slot.b,
      delta: eur(deltaC),
      deltaPct: slot.a ? (eur(deltaC) / Math.abs(slot.a)) * 100 : null,
      change,
      order: slot.order,
    };
  });
}

// --- comparison ------------------------------------------------------------------

export interface ComparableEstimate {
  /** Price per piece on file, EUR. */
  cost: number;
  lines: readonly CostLine[];
}

export interface CategorySummary {
  category: CostCategory;
  label: string;
  a: number;
  b: number;
  delta: number;
  rows: AlignedRow[];
}

export interface WalkStep {
  key: string;
  label: string;
  kind: "start" | "step" | "end";
  /** Signed change for a step; the total for start / end. */
  value: number;
  /** Running total before and after this bar. */
  from: number;
  to: number;
}

export interface Comparison {
  totalA: number;
  totalB: number;
  delta: number;
  /** Delta over total A, percent. */
  deltaPct: number;
  volume: number;
  annualImpact: number;
  rows: AlignedRow[];
  categories: CategorySummary[];
  /** Top three rows by |delta| (only real lines that moved). */
  movers: AlignedRow[];
  walk: WalkStep[];
}

/** Lines plus a residue line when they do not sum to the price on file. */
function reconciled(estimate: ComparableEstimate): CostLine[] {
  const gap = cents(estimate.cost) - estimate.lines.reduce((sum, line) => sum + cents(line.value), 0);
  return gap === 0 ? [...estimate.lines] : [...estimate.lines, { label: UNALLOCATED_LABEL, value: eur(gap) }];
}

/** Everything /compare shows about A (baseline) against B (candidate) at an annual volume. */
export function compareEstimates(a: ComparableEstimate, b: ComparableEstimate, volume: number): Comparison {
  const aligned = alignLines(reconciled(a), reconciled(b));
  const rank = (category: CostCategory) => CATEGORY_ORDER.indexOf(category);
  const rows = [...aligned].sort((x, y) => rank(x.category) - rank(y.category) || x.order - y.order);

  const categories: CategorySummary[] = CATEGORY_ORDER.map((category) => {
    const members = rows.filter((row) => row.category === category);
    const aC = members.reduce((sum, row) => sum + cents(row.a ?? 0), 0);
    const bC = members.reduce((sum, row) => sum + cents(row.b ?? 0), 0);
    return { category, label: CATEGORY_LABEL[category], a: eur(aC), b: eur(bC), delta: eur(bC - aC), rows: members };
  }).filter((summary) => summary.rows.length > 0);

  const totalAC = cents(a.cost);
  const totalBC = cents(b.cost);
  const deltaC = totalBC - totalAC;

  const movers = rows
    // The unallocated residue is bookkeeping, not a cost driver.
    .filter((row) => row.delta !== 0 && row.key !== "unallocated")
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta) || x.order - y.order)
    .slice(0, 3);

  const walk: WalkStep[] = [{ key: "start", label: "A", kind: "start", value: eur(totalAC), from: 0, to: eur(totalAC) }];
  let running = totalAC;
  for (const summary of categories) {
    const stepC = cents(summary.delta);
    if (stepC === 0) continue;
    walk.push({
      key: summary.category,
      label: summary.label,
      kind: "step",
      value: eur(stepC),
      from: eur(running),
      to: eur(running + stepC),
    });
    running += stepC;
  }
  walk.push({ key: "end", label: "B", kind: "end", value: eur(totalBC), from: 0, to: eur(totalBC) });

  return {
    totalA: eur(totalAC),
    totalB: eur(totalBC),
    delta: eur(deltaC),
    deltaPct: totalAC ? (deltaC / totalAC) * 100 : 0,
    volume,
    annualImpact: eur(deltaC) * volume,
    rows,
    categories,
    movers,
    walk,
  };
}
