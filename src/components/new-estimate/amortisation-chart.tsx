"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import type { ToolSpec } from "@/lib/costing/tooling";
import { formatMoney, type Currency } from "@/lib/format";

const CHART_TICK = { fill: "var(--text-quaternary)", fontSize: 11 };
const CHART_LINE = "var(--analytics-series-1)";

export interface AmortisationPoint {
  label: string;
  volume: number;
  perPiece: number;
  current: boolean;
}

/** Tooling cost per piece against annual volume; the recharts half of `ToolingDetail`, loaded lazily. */
export default function AmortisationChart({
  curve,
  floorsAt,
  currency,
}: {
  curve: AmortisationPoint[];
  floorsAt: ToolSpec["floorsAt"];
  currency: Currency;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={curve} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="var(--stroke-muted)" vertical={false} />
        <XAxis dataKey="label" tick={CHART_TICK} axisLine={{ stroke: "var(--stroke-muted)" }} tickLine={false} />
        <YAxis
          tick={CHART_TICK}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(value: number) => `€${value}`}
        />
        <Tooltip
          cursor={{ stroke: "var(--stroke-default)", strokeDasharray: "3 3" }}
          content={
            <ChartTooltip
              seriesLabel="Tooling"
              formatLabel={(label) => `${String(label)} pcs / yr`}
              formatValue={(value) => `${formatMoney(value, currency)} / pc`}
            />
          }
        />
        {floorsAt ? (
          <ReferenceLine
            y={floorsAt.value}
            stroke="var(--feedback-error-icon)"
            strokeDasharray="4 4"
            label={{
              value: `Floor ${formatMoney(floorsAt.value, currency)}`,
              position: "insideTopRight",
              fill: "var(--feedback-error-icon)",
              fontSize: 11,
            }}
          />
        ) : null}
        <Line
          type="monotone"
          dataKey="perPiece"
          stroke={CHART_LINE}
          strokeWidth={2}
          dot={(props: { cx?: number; cy?: number; index?: number }) => {
            const { cx: x, cy: y, index = 0 } = props;
            const current = curve[index]?.current;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={current ? 7 : 4}
                fill={CHART_LINE}
                stroke={current ? "var(--surface-container)" : "none"}
                strokeWidth={current ? 3 : 0}
              />
            );
          }}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
