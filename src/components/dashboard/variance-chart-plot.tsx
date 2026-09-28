"use client";

import { useId } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import type { DriftPoint } from "@/lib/costing/estimate";

const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value)}%`;
const tick = { fill: "var(--text-quaternary)", fontSize: 11 };
const SERIES = "var(--analytics-series-1)";

/** The recharts body of `VarianceChart`; loaded lazily so recharts stays out of the page bundle. */
export default function VarianceChartPlot({ data }: { data: DriftPoint[] }) {
  const gradientId = `vc-${useId().replace(/:/g, "")}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={SERIES} stopOpacity={0.16} />
            <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--stroke-muted)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={tick}
          tickLine={false}
          axisLine={{ stroke: "var(--stroke-muted)" }}
          tickMargin={8}
          padding={{ left: 12, right: 12 }}
        />
        <YAxis
          tick={tick}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(value: number) => signed(value)}
        />
        <ReferenceLine
          y={0}
          stroke="var(--stroke-default)"
          strokeDasharray="4 4"
          label={{ value: "On target", position: "insideTopRight", fill: "var(--text-quaternary)", fontSize: 11 }}
        />
        <Tooltip
          cursor={{ stroke: "var(--stroke-default)", strokeDasharray: "3 3" }}
          content={<ChartTooltip seriesLabel="Avg variance" formatValue={signed} />}
        />
        <Area type="monotone" dataKey="value" stroke="none" fill={`url(#${gradientId})`} isAnimationActive={false} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={SERIES}
          strokeWidth={2}
          dot={{ r: 3.5, fill: "var(--surface-container)", stroke: SERIES, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: SERIES, stroke: "var(--surface-container)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
