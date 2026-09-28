"use client";

/**
 * Token-styled Recharts tooltip. Pass as `<Tooltip content={<ChartTooltip … />} />`;
 * Recharts injects `active`, `label` and `payload`.
 */

import type { ReactNode } from "react";

interface PayloadItem {
  value?: unknown;
  name?: unknown;
  color?: string;
  stroke?: string;
}

export function ChartTooltip({
  active,
  label,
  payload,
  formatLabel,
  formatValue,
  seriesLabel,
}: {
  active?: boolean;
  label?: unknown;
  payload?: readonly PayloadItem[];
  formatLabel?: (label: unknown) => ReactNode;
  formatValue?: (value: number) => ReactNode;
  /** Series name shown beside the swatch (defaults to the payload name). */
  seriesLabel?: ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-lg border border-default bg-container px-3 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
      <p className="text-caption tracking-[0.08em] text-quaternary uppercase">
        {formatLabel ? formatLabel(label) : String(label ?? "")}
      </p>
      {payload.map((item, index) => (
        <div key={index} className="mt-1 flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-body-sm text-tertiary">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: item.stroke ?? item.color ?? "var(--analytics-series-1)" }}
            />
            {seriesLabel ?? String(item.name ?? "")}
          </span>
          <span className="text-label-md tabular text-primary">
            {formatValue ? formatValue(Number(item.value)) : String(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
