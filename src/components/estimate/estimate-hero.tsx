"use client";

import { useState } from "react";
import { PartViewer } from "@/components/mulya/part-viewer";
import { statusIcon, statusTextClass, type TargetStatus } from "@/components/mulya/status-chip";
import { Badge, VarianceBadge } from "@/components/ui/badge";
import { NumberInput } from "@/components/ui/field";
import { Mark } from "@/components/ui/mark";
import { PanelHeader } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/segmented";
import type { ConfidenceProfile, EstimateSubject } from "@/lib/costing/estimate-subject";
import { cx, formatMoney, formatNumber, formatPct, type Currency } from "@/lib/format";
import type { PartVariant } from "@/lib/models/part-geometry";

/** Price basis: should-cost excludes the margin line; piece price includes it. */
export type PriceBasis = "should" | "piece";

const captionClass = "text-caption tracking-[0.08em] text-quaternary uppercase";

const BANNER_CLASS: Record<Exclude<TargetStatus, "pending">, string> = {
  over: "border-error-stroke bg-error-surface text-error",
  under: "border-success-stroke bg-success-surface text-success",
  on: "border-default bg-raised-2 text-neutral",
};

const BANNER_ICON: Record<Exclude<TargetStatus, "pending">, string> = {
  over: "bg-error-badge text-badge",
  under: "bg-success-badge text-badge",
  on: "bg-neutral-badge text-badge",
};

/**
 * Headline figure: piece price or should-cost with its confidence range,
 * target / actual comparison, lot calculator and the part preview.
 * Keyed by preset + route by the parent so the lot resets with the route.
 */
export function EstimateHero({
  subject,
  variant,
  confidence,
  basis,
  onBasisChange,
  total,
  target,
  status,
  currency,
}: {
  subject: EstimateSubject;
  variant: PartVariant;
  confidence: ConfidenceProfile;
  basis: PriceBasis;
  onBasisChange: (basis: PriceBasis) => void;
  total: number;
  target: number | null;
  status: TargetStatus;
  currency: Currency;
}) {
  const [lot, setLot] = useState(subject.annualVolume);
  const [customLot, setCustomLot] = useState<number | null>(null);
  const variance = target == null ? 0 : total - target;
  const variancePctValue = target == null ? null : (variance / target) * 100;
  const money = (value: number, digits?: number) => formatMoney(value, currency, digits);
  const bannerStatus = status === "pending" ? "on" : status;
  const lotPreset = customLot == null && subject.lotOptions.includes(lot) ? String(lot) : "";

  return (
    <section className="overflow-hidden rounded-xl border border-muted bg-container">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={captionClass}>Estimated {basis === "piece" ? "piece price" : "should-cost"}</span>
            <Segmented
              ariaLabel="Price basis"
              size="sm"
              value={basis}
              onChange={onBasisChange}
              options={[
                { value: "should", label: "Should-cost", title: "Excludes the margin line" },
                { value: "piece", label: "Piece price", title: "Includes margin" },
              ]}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-display text-display-4xl leading-none text-primary tabular sm:text-display-metric">
              {money(total)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-body-md text-tertiary tabular">
              <Mark id="mark-confidence-band" size={24} />
              range {money(total * (1 + confidence.low / 100))} to {money(total * (1 + confidence.high / 100))}
            </span>
          </div>

          {target == null ? (
            <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-dashed border-default px-3 py-2.5 text-body-md text-tertiary">
              <Badge tone="neutral" variant="outline" icon="○" size="sm">
                No target
              </Badge>
              <span>No target cost set</span>
            </div>
          ) : (
            <div
              className={cx(
                "mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5 text-body-md font-medium",
                BANNER_CLASS[bannerStatus],
              )}
            >
              <span
                aria-hidden
                className={cx(
                  "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] leading-none",
                  BANNER_ICON[bannerStatus],
                )}
              >
                {statusIcon(status)}
              </span>
              <span className="min-w-0 flex-1">
                {money(Math.abs(variance))} {variance > 0 ? "over" : "under"} target of {money(target)}
              </span>
              <VarianceBadge pct={variancePctValue} variant="solid" />
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 divide-y divide-muted overflow-hidden rounded-lg border border-muted sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="px-4 py-3">
              <span className={captionClass}>Estimate</span>
              <p className="mt-1 text-heading-md font-medium text-primary tabular">{money(total)}</p>
            </div>
            <div className="px-4 py-3">
              <span className={captionClass}>Target</span>
              <p className="mt-1 text-heading-md font-medium text-primary tabular">
                {target == null ? "n/a" : money(target)}
              </p>
              {target != null ? (
                <p className={cx("mt-0.5 text-body-sm tabular", statusTextClass(status))}>
                  {formatPct((variance / target) * 100)} vs. estimate
                </p>
              ) : null}
            </div>
            <div className="px-4 py-3">
              <span className={captionClass}>Actual / quoted</span>
              <p className="mt-1 text-heading-md font-medium text-primary tabular">
                {subject.actual ? money(subject.actual.value) : "n/a"}
              </p>
              {subject.actual ? (
                <p className="mt-0.5 text-body-sm text-tertiary tabular">
                  estimate {formatPct(((total - subject.actual.value) / subject.actual.value) * 100)} vs. actual
                </p>
              ) : null}
            </div>
          </div>
          {subject.actual ? <p className="mt-1.5 text-body-sm text-quaternary">{subject.actual.source}</p> : null}

          <div className="mt-5 rounded-lg border border-muted bg-raised p-3 sm:p-4">
            <span className={captionClass}>Lot quantity</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Segmented
                ariaLabel="Lot quantity"
                size="sm"
                value={lotPreset}
                onChange={(value) => {
                  setLot(Number(value));
                  setCustomLot(null);
                }}
                options={subject.lotOptions.map((option) => ({
                  value: String(option),
                  label: <span className="tabular">{formatNumber(option)}</span>,
                }))}
              />
              <NumberInput
                size="sm"
                shape="pill"
                value={customLot}
                min={1}
                max={10_000_000}
                format={formatNumber}
                edited={customLot != null}
                onValueChange={(value) => {
                  const next = value == null ? null : Math.max(1, Math.round(value));
                  setCustomLot(next);
                  if (next != null) setLot(next);
                }}
                placeholder="custom"
                aria-label="Custom lot quantity"
                unit="pcs"
                className="w-32"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-display-xl text-primary tabular">{money(total * lot)}</span>
              <span className="text-body-sm text-quaternary">
                lot total at {formatNumber(lot)} pcs: current annual volume {formatNumber(subject.annualVolume)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col border-t border-muted lg:border-t-0 lg:border-l">
          <PanelHeader title="Part model" actionHref="/models" actionLabel="Open in 3D Models" />
          <div className="p-3">
            <PartViewer variant={variant} height={360} compact />
          </div>
        </div>
      </div>
    </section>
  );
}
