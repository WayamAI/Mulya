"use client";

/**
 * Lets a page add segments to the top-bar breadcrumb trail beyond what the
 * route implies (e.g. the part being viewed, or a “Result” step).
 *
 *   useTrail("Result");                     // Estimate › New Estimate › Result
 *   useTrail([{ label: "BRK-2210", href: "/library?part=BRK-2210" }, "Result"]);
 *
 * Server pages can render `<Trail label="…" />` instead of calling the hook.
 * Segments are removed automatically when the page unmounts.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { TrailCrumb } from "@/lib/navigation";

type TrailInput = string | TrailCrumb | readonly (string | TrailCrumb)[] | null | undefined | false;

interface TrailContextValue {
  extra: TrailCrumb[];
  setExtra: (crumbs: TrailCrumb[]) => void;
}

const TrailContext = createContext<TrailContextValue | null>(null);

export function TrailProvider({ children }: { children: ReactNode }) {
  const [extra, setExtra] = useState<TrailCrumb[]>([]);
  const value = useMemo(() => ({ extra, setExtra }), [extra]);
  return <TrailContext.Provider value={value}>{children}</TrailContext.Provider>;
}

function normalise(input: TrailInput): TrailCrumb[] {
  if (!input) return [];
  const list = Array.isArray(input) ? input : [input];
  return (list as (string | TrailCrumb)[])
    .filter(Boolean)
    .map((c) => (typeof c === "string" ? { label: c } : c));
}

/** Append crumbs to the top-bar trail while the calling component is mounted. */
export function useTrail(input: TrailInput) {
  const ctx = useContext(TrailContext);
  const setExtra = ctx?.setExtra;
  const key = JSON.stringify(normalise(input));
  useEffect(() => {
    if (!setExtra) return;
    setExtra(JSON.parse(key) as TrailCrumb[]);
    return () => setExtra([]);
  }, [key, setExtra]);
}

/** Extra crumbs registered by the current page (read by the top bar). */
export function useTrailExtra(): TrailCrumb[] {
  return useContext(TrailContext)?.extra ?? [];
}

/** Component form of `useTrail` for server pages. Renders nothing. */
export function Trail({ label }: { label: TrailInput }) {
  useTrail(label);
  return null;
}
