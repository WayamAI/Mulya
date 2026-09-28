/**
 * 3D marks: the dimensional icons rendered from prompts.md.
 *
 * Files live in public/images/marks/<id>.webp (transparent, 512px). This is
 * the one registry that says which mark goes with a route, process, tool,
 * agent, status, persona or connector, so pages never hard-code a filename.
 */

import type { AgentId } from "@/lib/costing/agents";
import type { ConnectorCategory, PersonaKey } from "@/lib/costing/connectors";
import type { ProcessName } from "@/lib/costing/parts";
import type { ProcessKey } from "@/lib/costing/process-detection";

export const MARK_IDS = [
  // Pages
  "mark-dashboard",
  "mark-new-estimate",
  "mark-estimate",
  "mark-report",
  "mark-library",
  "mark-models",
  "mark-history",
  "mark-compare",
  "mark-agents",
  "mark-rates",
  "mark-model",
  "mark-guide",
  // Processes
  "mark-casting",
  "mark-die-casting",
  "mark-stamping",
  "mark-machining",
  // Tooling
  "mark-pattern",
  "mark-die",
  "mark-progressive",
  "mark-amortisation",
  // Agents
  "mark-agent-supervisor",
  "mark-agent-geometry",
  "mark-agent-process",
  "mark-agent-cost",
  "mark-agent-tooling",
  "mark-agent-confidence",
  "mark-agent-supplier",
  "mark-agent-thermal",
  "mark-checkpoint",
  // Status
  "mark-over-target",
  "mark-on-target",
  "mark-under-target",
  "mark-no-target",
  "mark-saving",
  "mark-risk",
  // KPIs
  "mark-kpi-estimates",
  "mark-kpi-variance",
  "mark-kpi-over",
  "mark-kpi-trend",
  // Estimate anatomy
  "mark-material",
  "mark-labour",
  "mark-overhead",
  "mark-driver",
  "mark-price-breaks",
  "mark-what-if",
  "mark-confidence-band",
  "mark-unknown-input",
  // Hand-off and data
  "mark-rfq-pack",
  "mark-drawing",
  "mark-step-file",
  "mark-plm",
  "mark-erp",
  "mark-sourcing",
  "mark-connector",
  "mark-catalogue",
  // Personas
  "mark-persona-design",
  "mark-persona-cost",
  "mark-persona-purchasing",
  "mark-persona-programme",
  // Empty states
  "mark-empty-search",
  "mark-empty-compare",
  "mark-empty-upload",
  "mark-not-found",
] as const;

export type MarkId = (typeof MARK_IDS)[number];

/** Pre-scaled copies in `public/images/marks/<width>/` (`npm run marks:sizes`); the original is 512 px. */
export const MARK_WIDTHS = [96, 192] as const;

/**
 * URL of a mark at least `minWidth` px wide: the 96 or 192 px copy when one is
 * big enough, else the 512 px original. No width gives the original.
 */
export function markSrc(id: MarkId, minWidth?: number): string {
  const width = minWidth == null ? undefined : MARK_WIDTHS.find((w) => w >= minWidth);
  return width ? `/images/marks/${width}/${id}.webp` : `/images/marks/${id}.webp`;
}

/** Page-header mark per route (longest-prefix match is done by the caller's pathname). */
export const ROUTE_MARK: Record<string, MarkId> = {
  "/": "mark-dashboard",
  "/new-estimate": "mark-new-estimate",
  "/estimate": "mark-estimate",
  "/report": "mark-report",
  "/library": "mark-library",
  "/models": "mark-models",
  "/history": "mark-history",
  "/compare": "mark-compare",
  "/agents": "mark-agents",
  "/rates": "mark-rates",
  "/model": "mark-model",
};

export const PROCESS_NAME_MARK: Record<ProcessName, MarkId> = {
  "Sand cast": "mark-casting",
  "Die cast": "mark-die-casting",
  Stamping: "mark-stamping",
};

export const PROCESS_KEY_MARK: Record<ProcessKey, MarkId> = {
  sand: "mark-casting",
  die: "mark-die-casting",
  stamping: "mark-stamping",
};

/** Tool per process, matching the mould viewer's `kind`. */
export const TOOL_MARK: Record<"pattern" | "die" | "progressive", MarkId> = {
  pattern: "mark-pattern",
  die: "mark-die",
  progressive: "mark-progressive",
};

export const AGENT_MARK: Record<AgentId | "supervisor", MarkId> = {
  supervisor: "mark-agent-supervisor",
  part: "mark-agent-geometry",
  process: "mark-agent-process",
  inputs: "mark-agent-cost",
  tooling: "mark-agent-tooling",
  thermal: "mark-agent-thermal",
  confidence: "mark-agent-confidence",
  share: "mark-agent-supplier",
};

export const TARGET_MARK: Record<"over" | "on" | "under" | "none", MarkId> = {
  over: "mark-over-target",
  on: "mark-on-target",
  under: "mark-under-target",
  none: "mark-no-target",
};

export const PERSONA_MARK: Record<PersonaKey, MarkId> = {
  design: "mark-persona-design",
  cost: "mark-persona-cost",
  purchasing: "mark-persona-purchasing",
  programme: "mark-persona-programme",
};

export const CONNECTOR_MARK: Record<ConnectorCategory, MarkId> = {
  PLM: "mark-plm",
  ERP: "mark-erp",
  Warehouse: "mark-catalogue",
  File: "mark-step-file",
  API: "mark-connector",
};
