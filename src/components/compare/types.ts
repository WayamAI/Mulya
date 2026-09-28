import type { CostLine } from "@/lib/costing/estimate";
import type { ProcessName } from "@/lib/costing/parts";

export type ToolKind = "pattern" | "die" | "progressive";

/** One selectable estimate: an on-file revision or one produced this session. */
export interface CompareEntry {
  /** URL-safe id: `<part number>~<rev>` on file, `new~<session id>` this session. */
  id: string;
  kind: "file" | "session";
  partNumber: string;
  partName: string;
  /** `Rev B` or `New estimate`. */
  label: string;
  /** Revision letter for on-file entries. */
  rev: string | null;
  /** The revision the library shows as current. */
  current: boolean;
  /** Display date (already formatted). */
  date: string;
  /** ISO date (or datetime) for sorting and hand-off. */
  isoDate: string;
  process: ProcessName;
  material: string;
  /** Wall / sheet note, when one is recorded. */
  spec: string | null;
  massKg: number | null;
  /** EUR per piece. */
  cost: number;
  lines: CostLine[];
  target: number | null;
  annualVolume: number;
  derived: boolean;
  /** Revision change note, or where the estimate came from. */
  note: string;
  engineer: string | null;
  toolKind: ToolKind;
  /** Tool build cost in EUR when a tool quote exists for this part and route. */
  toolInvestment: number | null;
  /** Preset and route used to reopen it in the estimate workspace. */
  preset: string;
  processKey: string;
}

export type SlotKey = "a" | "b";
