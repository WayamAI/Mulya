"use client";

/**
 * The Recharts half of the cost walk, split out so /compare loads it lazily
 * (see `cost-walk.tsx`).
 */

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import type { WalkStep } from "@/lib/costing/compare";

const tick = { fill: "var(--text-tertiary)", fontSize: 11 };

export interface WalkDatum {
  name: string;
  /** Bar extent [low, high]: steps float between the running totals. */
  range: [number, number];
  signed: number;
  display: string;
  fill: string;
  kind: WalkStep["kind"];
}

export default function CostWalkChart({
  data,
  domain,
  narrow,
  formatAxis,
  formatTotal,
  formatStep,
}: {
  data: WalkDatum[];
  domain: [number, number];
  narrow: boolean;
  formatAxis: (value: number) => string;
  formatTotal: (value: number) => string;
  formatStep: (value: number) => string;
}) {
  const money = formatAxis;
  const tooltip = (
    <Tooltip
      cursor={{ fill: "var(--surface-raised)" }}
      content={(props) => {
        const datum = (props.payload?.[0]?.payload ?? null) as WalkDatum | null;
        if (!datum) return null;
        return (
          <ChartTooltip
            active={props.active}
            label={datum.name}
            payload={[{ value: datum.signed, name: datum.kind === "step" ? "Change" : "Total", color: datum.fill }]}
            formatValue={(v) => (datum.kind === "step" ? formatStep(v) : formatTotal(v))}
          />
        );
      }}
    />
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      {narrow ? (
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 4 }} barCategoryGap="22%">
          <CartesianGrid stroke="var(--stroke-muted)" horizontal={false} />
          <XAxis type="number" domain={domain} tick={tick} tickFormatter={money} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={tick} width={92} axisLine={false} tickLine={false} />
          {tooltip}
          <Bar dataKey="range" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
            <LabelList dataKey="display" content={(props) => <BarLabel {...props} side="right" />} />
          </Bar>
        </BarChart>
      ) : (
        <BarChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barCategoryGap="24%">
          <CartesianGrid stroke="var(--stroke-muted)" vertical={false} />
          <XAxis dataKey="name" tick={tick} interval={0} axisLine={{ stroke: "var(--stroke-muted)" }} tickLine={false} />
          <YAxis domain={domain} tick={tick} tickFormatter={money} width={56} axisLine={false} tickLine={false} />
          {tooltip}
          <Bar dataKey="range" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
            <LabelList dataKey="display" content={(props) => <BarLabel {...props} side="top" />} />
          </Bar>
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

/** Single-line bar label (Recharts' default wraps to the bar width). */
function BarLabel({
  x,
  y,
  width,
  height,
  value,
  side,
}: {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: unknown;
  side: "top" | "right";
}) {
  const [nx, ny, nw, nh] = [x, y, width, height].map((n) => Number(n ?? 0));
  const top = side === "top";
  return (
    <text
      x={top ? nx + nw / 2 : nx + nw + 6}
      y={top ? ny - 7 : ny + nh / 2}
      textAnchor={top ? "middle" : "start"}
      dominantBaseline={top ? "auto" : "central"}
      fill="var(--text-secondary)"
      fontSize={11}
      className="tabular"
    >
      {String(value ?? "")}
    </text>
  );
}
