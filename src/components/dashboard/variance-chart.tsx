"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/primitives";
import type { DriftPoint } from "@/lib/costing/estimate";

const VarianceChartPlot = dynamic(() => import("./variance-chart-plot"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

/** Monthly average variance to target, with a dashed zero (on-target) line. */
export function VarianceChart({ data }: { data: DriftPoint[] }) {
  return (
    <div className="h-[240px] w-full sm:h-[280px]">
      <VarianceChartPlot data={data} />
    </div>
  );
}
