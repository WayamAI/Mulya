"use client";

/**
 * Session state shared across pages: display currency, the in-progress
 * estimate flow, and estimates saved during this visit. Nothing persists
 * beyond the tab: this is a prototype with a mock catalogue.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { Currency } from "./format";

/** The on-file record an estimate was opened from (Part Library / History rows). */
export interface FlowSource {
  name: string;
  number: string;
  revision: string;
  date: string;
  engineer: string;
}

export interface EstimateFlow {
  preset: string | null;
  process: string;
  material: string | null;
  manual: boolean;
  confirmed: boolean;
  comparing: boolean;
  scenarioId: string;
  unknowns: string[];
  tab: string;
  agentsRanFor: string | null;
  source: FlowSource | null;
}

export const INITIAL_FLOW: EstimateFlow = {
  preset: null,
  process: "sand",
  material: null,
  manual: false,
  confirmed: false,
  comparing: false,
  scenarioId: "base",
  unknowns: [],
  tab: "part",
  agentsRanFor: null,
  source: null,
};

/** An estimate saved from the New Estimate flow. Shape is owned by the flow. */
export type SavedEstimate = { partNumber: string } & Record<string, unknown>;

interface AppContextValue {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  revCCreated: boolean;
  createRevC: () => void;
  newEstimates: SavedEstimate[];
  addNewEstimate: (estimate: SavedEstimate) => void;
  flow: EstimateFlow;
  setFlow: (patch: Partial<EstimateFlow>) => void;
  resetFlow: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [revCCreated, setRevCCreated] = useState(false);
  const [flow, setFlowState] = useState<EstimateFlow>(INITIAL_FLOW);
  const [newEstimates, setNewEstimates] = useState<SavedEstimate[]>([]);

  const value = useMemo<AppContextValue>(
    () => ({
      currency,
      setCurrency,
      revCCreated,
      createRevC: () => setRevCCreated(true),
      newEstimates,
      addNewEstimate: (estimate) =>
        setNewEstimates((prev) => [estimate, ...prev.filter((e) => e.partNumber !== estimate.partNumber)]),
      flow,
      setFlow: (patch) => setFlowState((prev) => ({ ...prev, ...patch })),
      resetFlow: () => setFlowState(INITIAL_FLOW),
    }),
    [currency, revCCreated, newEstimates, flow],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
