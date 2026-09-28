"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useApp } from "@/lib/app-context";
import { PARTS, type Part } from "@/lib/costing/parts";
import { PRESET_PART_NUMBERS } from "@/lib/costing/session";
import { TOOLING, type ToolSpec } from "@/lib/costing/tooling";
import type { PartVariant } from "@/lib/models/part-geometry";

/** The three parts that have CAD models, in gallery order. */
export const SAMPLE_VARIANTS: PartVariant[] = ["bearing", "bracket", "cover"];

/** Each part's production route → its tool. */
const SAMPLE_ROUTE: Record<PartVariant, { process: string; toolKey: string }> = {
  bearing: { process: "sand", toolKey: "bearing-sand" },
  bracket: { process: "stamping", toolKey: "bracket-stamping" },
  cover: { process: "die", toolKey: "cover-die" },
};

export function samplePart(variant: PartVariant): Part | undefined {
  return PARTS.find((part) => part.number === PRESET_PART_NUMBERS[variant]);
}

export function sampleTool(variant: PartVariant): ToolSpec | undefined {
  return TOOLING[SAMPLE_ROUTE[variant].toolKey];
}

/** Opens the estimate for a sample part, the way the Part Library does. */
export function useOpenSampleEstimate() {
  const { setFlow } = useApp();
  const router = useRouter();
  return useCallback(
    (variant: PartVariant) => {
      const part = samplePart(variant);
      setFlow({
        preset: variant,
        process: SAMPLE_ROUTE[variant].process,
        material: null,
        manual: false,
        comparing: false,
        confirmed: true,
        scenarioId: "base",
        tab: "part",
        unknowns: [],
        source: part
          ? {
              name: part.name,
              number: part.number,
              revision: part.revision,
              date: part.date,
              engineer: part.engineer,
            }
          : null,
      });
      router.push("/estimate");
    },
    [router, setFlow],
  );
}
