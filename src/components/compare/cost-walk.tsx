"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/primitives";
import { useApp } from "@/lib/app-context";
import type { WalkStep } from "@/lib/costing/compare";
import { formatMoney } from "@/lib/format";
import type { WalkDatum as Datum } from "./cost-walk-chart";
import { useMedia } from "./use-media";
import { signedMoney } from "./verdict";

/** Recharts stays out of the first load: the chart streams in behind a same-height skeleton. */
const CostWalkChart = dynamic(() => import("./cost-walk-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

const START = "var(--analytics-series-5)";
const END = "var(--analytics-series-1)";
const DOWN = "var(--feedback-success-icon)";
const UP = "var(--feedback-error-icon)";

/**
 * Cost walk (bridge): A's total, one floating bar per category that moved
 * (green down, red up), then B's total. Horizontal on phones.
 */
export function CostWalk({ walk, labelA, labelB }: { walk: WalkStep[]; labelA: string; labelB: string }) {
  const { currency } = useApp();
  const narrow = useMedia("(max-width: 639px)");

  const data: Datum[] = walk.map((step) => {
    if (step.kind !== "step") {
      return {
        name: step.kind === "start" ? labelA : labelB,
        range: [0, step.value],
        signed: step.value,
        display: formatMoney(step.value, currency),
        fill: step.kind === "start" ? START : END,
        kind: step.kind,
      };
    }
    return {
      name: step.label,
      range: [Math.min(step.from, step.to), Math.max(step.from, step.to)],
      signed: step.value,
      display: signedMoney(step.value, currency),
      fill: step.value < 0 ? DOWN : UP,
      kind: step.kind,
    };
  });

  const max = Math.max(...walk.map((s) => Math.max(s.from, s.to)));
  const domain: [number, number] = [0, Math.ceil(max * 1.14)];
  const money = (v: number) => formatMoney(v, currency, 0);
  const summary = data.map((d) => `${d.name} ${d.display}`).join(", ");

  return (
    <figure className="m-0 flex min-w-0 flex-col" aria-label={`Cost walk from A to B: ${summary}`}>
      <div className={narrow ? "h-[300px]" : "h-[280px]"} role="img" aria-label={`Cost walk: ${summary}`}>
        <CostWalkChart
          data={data}
          domain={domain}
          narrow={narrow}
          formatAxis={money}
          formatTotal={(v) => formatMoney(v, currency)}
          formatStep={(v) => signedMoney(v, currency)}
        />
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-tertiary">
        <Legend color={START} label="A total" />
        <Legend color={DOWN} label="Cheaper" />
        <Legend color={UP} label="Dearer" />
        <Legend color={END} label="B total" />
      </figcaption>
    </figure>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="size-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
