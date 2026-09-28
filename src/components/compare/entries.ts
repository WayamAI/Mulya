"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/app-context";
import { deriveBreakdown } from "@/lib/costing/breakdown";
import { ALTERNATIVES, BASE_DESIGN, REVISION_HISTORY } from "@/lib/costing/estimate";
import { PARTS, type ProcessName } from "@/lib/costing/parts";
import { PRESET_PART_NUMBERS, type SessionEstimate } from "@/lib/costing/session";
import { TOOLING } from "@/lib/costing/tooling";
import { formatDate } from "@/lib/format";
import type { CompareEntry, ToolKind } from "./types";

/** Part number → preset, for the parts that have a full estimate model. */
const PRESET_BY_PART_NUMBER: Record<string, string> = Object.fromEntries(
  Object.entries(PRESET_PART_NUMBERS).map(([preset, number]) => [number, preset]),
);
/** Fallback preset per process, when the part has no model of its own (same as the library). */
const PRESET_BY_PROCESS: Record<ProcessName, string> = { Stamping: "bracket", "Sand cast": "bearing", "Die cast": "cover" };
export const PROCESS_KEY: Record<ProcessName, string> = { Stamping: "stamping", "Sand cast": "sand", "Die cast": "die" };
export const TOOL_KIND: Record<ProcessName, ToolKind> = { Stamping: "progressive", "Sand cast": "pattern", "Die cast": "die" };
export const TOOL_NAME: Record<ToolKind, string> = { pattern: "Pattern", die: "Die", progressive: "Progressive die" };

function toolFacts(partNumber: string, process: ProcessName) {
  const preset = PRESET_BY_PART_NUMBER[partNumber];
  const processKey = PROCESS_KEY[process];
  const quote = preset ? TOOLING[`${preset}-${processKey}`] : undefined;
  return {
    preset: preset ?? PRESET_BY_PROCESS[process],
    processKey,
    toolKind: quote?.kind ?? TOOL_KIND[process],
    toolInvestment: quote?.cost ?? null,
  };
}

/** `12 Mar 2026` → `2026-03-12`. */
function isoFrom(display: string): string {
  const time = Date.parse(`${display} UTC`);
  return Number.isNaN(time) ? display : new Date(time).toISOString().slice(0, 10);
}

/** Every on-file estimate: all recorded revisions, plus each part's current revision. */
function buildLibrary(): CompareEntry[] {
  const entries: CompareEntry[] = [];
  for (const part of PARTS) {
    const history = REVISION_HISTORY.find((h) => h.partNumber === part.number);
    const revisions = history?.revisions ?? [];
    for (const revision of revisions) {
      const current = revision.rev === part.revision;
      entries.push({
        id: `${part.number}~${revision.rev}`,
        kind: "file",
        partNumber: part.number,
        partName: part.name,
        label: `Rev ${revision.rev}`,
        rev: revision.rev,
        current,
        date: revision.date,
        isoDate: isoFrom(revision.date),
        process: revision.process,
        material: revision.material,
        spec: revision.wall,
        massKg: current ? part.weightKg : null,
        cost: revision.cost,
        lines: revision.lines,
        target: history?.target ?? part.target,
        annualVolume: part.annualVolume,
        derived: false,
        note: revision.change,
        engineer: part.engineer,
        ...toolFacts(part.number, revision.process),
      });
    }
    if (!revisions.some((revision) => revision.rev === part.revision)) {
      const breakdown = deriveBreakdown(part);
      entries.push({
        id: `${part.number}~${part.revision}`,
        kind: "file",
        partNumber: part.number,
        partName: part.name,
        label: `Rev ${part.revision}`,
        rev: part.revision,
        current: true,
        date: formatDate(part.date),
        isoDate: part.date,
        process: part.process,
        material: part.material,
        spec: null,
        massKg: part.weightKg,
        cost: part.estimate,
        lines: breakdown.lines,
        target: part.target,
        annualVolume: part.annualVolume,
        derived: breakdown.derived,
        note: `On file · ${part.programme}`,
        engineer: part.engineer,
        ...toolFacts(part.number, part.process),
      });
    }
  }
  return entries.sort((x, y) => x.partName.localeCompare(y.partName) || x.label.localeCompare(y.label));
}

const LIBRARY = buildLibrary();

const SCENARIOS = [BASE_DESIGN, ...ALTERNATIVES];

function sessionEntry(estimate: SessionEstimate): CompareEntry {
  const part = PARTS.find((p) => p.number === estimate.partNumber);
  // Seeded bearing scenarios hand their lines over by reference: recover mass and wall from them.
  const scenario = SCENARIOS.find((s) => s.lines === estimate.lines);
  const kg = scenario?.spec.match(/([\d.]+)\s*kg/)?.[1];
  const wall = scenario?.label.match(/(\d+(?:\.\d+)?\s*mm)\s*wall/i)?.[1];
  const massKg = kg ? Number(kg) : part && part.process === estimate.process ? part.weightKg : null;
  return {
    id: `new~${estimate.id}`,
    kind: "session",
    partNumber: estimate.partNumber,
    partName: estimate.partName,
    label: "New estimate",
    rev: null,
    current: false,
    date: `This session · ${estimate.createdAt}`,
    isoDate: new Date().toISOString(),
    process: estimate.process,
    material: estimate.material,
    spec: wall ? `${wall} wall` : scenario?.id === "base" ? "8 mm wall" : null,
    massKg,
    cost: estimate.cost,
    lines: estimate.lines,
    target: estimate.target,
    annualVolume: estimate.annualVolume,
    derived: estimate.derived,
    note: estimate.origin,
    engineer: null,
    ...toolFacts(estimate.partNumber, estimate.process),
  };
}

/** On-file entries (stable) and this session's estimates, newest first. */
export function useCompareEntries() {
  const { newEstimates } = useApp();
  const session = useMemo(
    // Saved estimates are built by `buildSessionEstimate` in the New Estimate flow.
    () => (newEstimates as unknown as SessionEstimate[]).map(sessionEntry),
    [newEstimates],
  );
  const all = useMemo(() => [...session, ...LIBRARY], [session]);
  return { library: LIBRARY, session, all };
}

/** Newest on-file revision of a part (by date). */
export function latestRevision(library: CompareEntry[], partNumber: string): CompareEntry | undefined {
  return library
    .filter((entry) => entry.partNumber === partNumber)
    .sort((x, y) => y.isoDate.localeCompare(x.isoDate))[0];
}

/** Revisions of a part, oldest first. */
export function revisionsOf(library: CompareEntry[], partNumber: string): CompareEntry[] {
  return library
    .filter((entry) => entry.partNumber === partNumber)
    .sort((x, y) => x.isoDate.localeCompare(y.isoDate));
}

/** Default pair: session estimate against its latest revision, else the richest revision history. */
export function defaultPair(library: CompareEntry[], session: CompareEntry[]): { a: string; b: string } {
  const fresh = session[0];
  if (fresh) {
    const base = latestRevision(library, fresh.partNumber);
    if (base) return { a: base.id, b: fresh.id };
  }
  const richest = [...REVISION_HISTORY].sort((x, y) => y.revisions.length - x.revisions.length)[0];
  const bearing = REVISION_HISTORY.find((h) => h.partNumber === "DTV-HSG-0431") ?? richest;
  const revs = revisionsOf(library, bearing.partNumber);
  return { a: revs[0].id, b: revs[revs.length - 1].id };
}

export interface Suggestion {
  a: string;
  b: string;
  label: string;
}

/** Ready-made comparisons: session vs file, then revision pairs from the history. */
export function suggestions(library: CompareEntry[], session: CompareEntry[]): Suggestion[] {
  const out: Suggestion[] = [];
  for (const fresh of session.slice(0, 2)) {
    const base = latestRevision(library, fresh.partNumber);
    if (base) out.push({ a: base.id, b: fresh.id, label: `${fresh.partName} ${base.label} vs new` });
  }
  for (const history of REVISION_HISTORY) {
    const revs = revisionsOf(library, history.partNumber);
    if (revs.length < 2) continue;
    const last = revs[revs.length - 1];
    out.push({ a: revs[0].id, b: last.id, label: `${history.partName} ${revs[0].label} vs ${last.label}` });
    if (revs.length > 2) {
      const prev = revs[revs.length - 2];
      out.push({ a: prev.id, b: last.id, label: `${history.partName} ${prev.label} vs ${last.label}` });
    }
  }
  return out.slice(0, 6);
}
