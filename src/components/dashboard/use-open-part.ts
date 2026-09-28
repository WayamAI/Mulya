"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useApp } from "@/lib/app-context";
import type { Part, ProcessName } from "@/lib/costing/parts";
import { PRESET_PART_NUMBERS } from "@/lib/costing/session";

/** Part number → preset, for the parts that have a full estimate model. */
const PRESET_BY_PART_NUMBER: Record<string, string> = Object.fromEntries(
  Object.entries(PRESET_PART_NUMBERS).map(([preset, number]) => [number, preset]),
);
/** Fallback preset per process, when the part has no model of its own. */
const PRESET_BY_PROCESS: Record<ProcessName, string> = { Stamping: "bracket", "Sand cast": "bearing", "Die cast": "cover" };
const PROCESS_KEY: Record<ProcessName, string> = { Stamping: "stamping", "Sand cast": "sand", "Die cast": "die" };

/** Opens a catalogue part's estimate (same behaviour as the Part Library rows). */
export function useOpenPartEstimate() {
  const { setFlow } = useApp();
  const router = useRouter();
  return useCallback(
    (part: Part) => {
      setFlow({
        preset: PRESET_BY_PART_NUMBER[part.number] ?? PRESET_BY_PROCESS[part.process] ?? "bearing",
        process: PROCESS_KEY[part.process] ?? "sand",
        material: null,
        manual: false,
        comparing: false,
        confirmed: true,
        scenarioId: "base",
        tab: "part",
        unknowns: [],
        source: {
          name: part.name,
          number: part.number,
          revision: part.revision,
          date: part.date,
          engineer: part.engineer,
        },
      });
      router.push("/estimate");
    },
    [router, setFlow],
  );
}
