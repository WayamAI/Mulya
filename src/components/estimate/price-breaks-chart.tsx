"use client";

import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import type { VolumePoint } from "@/lib/costing/estimate";
import { formatMoney, formatNumber, type Currency } from "@/lib/format";

const tick = { fill: "var(--text-quaternary)", fontSize: 11 };
const SERIES = "var(--analytics-series-1)";

/** Unit price curve by annual volume; the recharts half of `PriceBreaksPanel`, loaded lazily. */
export default function PriceBreaksChart({
  breaks,
  domain,
  current,
  currency,
}: {
  breaks: VolumePoint[];
  domain: [number, number];
  current: VolumePoint | undefined;
  currency: Currency;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={breaks} margin={{ top: 12, right: 16, bottom: 0, left: -4 }}>
        <CartesianGrid stroke="var(--stroke-muted)" vertical={false} />
        <XAxis
          dataKey="volume"
          tickFormatter={(value: number) => (value >= 1000 ? `${value / 1000}k` : String(value))}
          tick={tick}
          axisLine={{ stroke: "var(--stroke-muted)" }}
          tickLine={false}
          tickMargin={8}
          padding={{ left: 12, right: 12 }}
        />
        <YAxis
          domain={domain}
          tick={tick}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(value: number) => `€${value}`}
        />
        <Tooltip
          cursor={{ stroke: "var(--stroke-default)", strokeDasharray: "3 3" }}
          content={
            <ChartTooltip
              seriesLabel="Unit price"
              formatLabel={(label) => `${formatNumber(Number(label))} pcs / yr`}
              formatValue={(value) => formatMoney(value, currency)}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="unit"
          stroke={SERIES}
          strokeWidth={2}
          dot={{ r: 3.5, fill: "var(--surface-container)", stroke: SERIES, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: SERIES, stroke: "var(--surface-container)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
        {current ? (
          <ReferenceDot
            x={current.volume}
            y={current.unit}
            r={6}
            fill={SERIES}
            stroke="var(--surface-container)"
            strokeWidth={2}
            label={{ value: "current", position: "top", fill: "var(--text-tertiary)", fontSize: 11, offset: 10 }}
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}
