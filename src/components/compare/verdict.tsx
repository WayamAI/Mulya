"use client";

import { statusFor } from "@/components/mulya/status-chip";
import { Badge, VarianceBadge } from "@/components/ui/badge";
import { NumberInput } from "@/components/ui/field";
import { Mark } from "@/components/ui/mark";
import { KpiTile } from "@/components/ui/primitives";
import { useApp } from "@/lib/app-context";
import type { Comparison } from "@/lib/costing/compare";
import { cx, formatMoney, formatNumber, formatPct } from "@/lib/format";
import { TARGET_MARK, TOOL_MARK } from "@/lib/marks";
import { TOOL_NAME } from "./entries";
import { useMedia } from "./use-media";
import type { CompareEntry } from "./types";

/** `+€ 1.60` / `−€ 3.20` / `€ 0.00`. */
export function signedMoney(value: number, currency: Parameters<typeof formatMoney>[1], digits = 2): string {
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return formatMoney(0, currency, digits);
  return `${rounded > 0 ? "+" : "−"}${formatMoney(Math.abs(rounded), currency, digits)}`;
}

/** The plain-language verdict banner. */
export function VerdictBanner({
  a,
  b,
  comparison,
}: {
  a: CompareEntry;
  b: CompareEntry;
  comparison: Comparison;
}) {
  const { currency } = useApp();
  const { delta, deltaPct } = comparison;
  const same = Math.abs(delta) < 0.005;
  const cheaper = delta < 0;
  const differentParts = a.partNumber !== b.partNumber;
  return (
    <div
      aria-live="polite"
      className={cx(
        "flex flex-col gap-1.5 rounded-xl border px-4 py-3.5 sm:px-5",
        same ? "border-muted bg-raised" : cheaper ? "border-success-stroke bg-success-surface" : "border-error-stroke bg-error-surface",
      )}
    >
      <p className="text-heading-sm text-primary">
        {same ? (
          <>Candidate costs the same per piece as Baseline.</>
        ) : (
          <>
            Candidate is <span className="tabular">{formatMoney(Math.abs(delta), currency)}</span>{" "}
            {cheaper ? "cheaper" : "more expensive"} per piece{" "}
            <span className={cx("tabular", cheaper ? "text-success" : "text-error")}>({formatPct(deltaPct)})</span> than
            Baseline.
          </>
        )}
      </p>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-md text-secondary">
        <span>
          <span className="text-primary">A</span> {a.partName} {a.label} · {a.process} {a.material}
        </span>
        <span aria-hidden className="text-quaternary">→</span>
        <span className="sr-only">against</span>
        <span>
          <span className="text-primary">B</span> {b.partName} {b.label} · {b.process} {b.material}
        </span>
        {differentParts ? (
          <Badge
            tone="warning"
            size="sm"
            icon="⚠"
            title="Useful as a benchmark, but the line deltas are not a redesign story."
          >
            Different parts
          </Badge>
        ) : null}
      </p>
    </div>
  );
}

function TargetLine({ letter, entry }: { letter: string; entry: CompareEntry }) {
  const pct = entry.target == null ? null : ((entry.cost - entry.target) / entry.target) * 100;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-caption text-quaternary">{letter}</span>
      <VarianceBadge pct={pct} size="sm" />
    </span>
  );
}

/** Δ per piece · annual impact (editable volume) · vs target · tooling. */
export function KpiStrip({
  a,
  b,
  comparison,
  volume,
  onVolume,
}: {
  a: CompareEntry;
  b: CompareEntry;
  comparison: Comparison;
  volume: number;
  onVolume: (value: number) => void;
}) {
  const { currency } = useApp();
  const narrow = useMedia("(max-width: 639px)");
  const { delta, deltaPct } = comparison;
  const annual = delta * volume;
  // Phones: `−€ 29.8k` so the figure fits a half-width tile.
  const bigMoney = (value: number) => {
    if (!narrow || Math.abs(value) < 10_000) return signedMoney(value, currency, 0);
    const [div, suffix] = Math.abs(value) >= 1_000_000 ? [1_000_000, "M"] : [1_000, "k"];
    return `${signedMoney(value / div, currency, 1)}${suffix}`;
  };
  const saving = annual < 0;

  const bStatus = statusFor(b.cost, b.target);
  const bPct = b.target == null ? null : ((b.cost - b.target) / b.target) * 100;

  // Tooling: only a story when the tool itself changes.
  const toolingDelta = comparison.categories.find((c) => c.category === "tooling")?.delta ?? 0;
  const sameTool = a.partNumber === b.partNumber && a.toolKind === b.toolKind && a.toolInvestment === b.toolInvestment;
  const investDelta = a.toolInvestment != null && b.toolInvestment != null ? b.toolInvestment - a.toolInvestment : null;
  // Piece-price change without the tool amortisation: what pays the tool back.
  const variableDelta = delta - toolingDelta;
  let breakeven: string | null = null;
  if (investDelta != null && investDelta !== 0) {
    if (investDelta > 0 && variableDelta < 0) breakeven = `pays back in ${formatNumber(Math.ceil(investDelta / -variableDelta))} pcs`;
    else if (investDelta < 0 && variableDelta <= 0) breakeven = "cheaper tool and piece";
    else if (investDelta > 0) breakeven = "no payback";
    else breakeven = `tool saving covers ${formatNumber(Math.floor(-investDelta / variableDelta))} pcs`;
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <KpiTile
        label="Δ per piece"
        value={signedMoney(delta, currency)}
        variance={deltaPct}
        varianceGoodWhen="lower"
        hint="B against A"
        mark={<Mark id="mark-kpi-variance" size={40} />}
      />
      <KpiTile
        label="Annual impact"
        value={bigMoney(annual)}
        tone={saving ? "success" : annual > 0 ? "error" : "neutral"}
        mark={<Mark id={saving ? "mark-saving" : "mark-kpi-over"} size={40} />}
        delta={
          <NumberInput
            size="sm"
            value={volume}
            onValueChange={(value) => onVolume(value ?? 0)}
            min={0}
            max={10_000_000}
            step={100}
            format={(value) => formatNumber(value)}
            unit="pcs/yr"
            aria-label="Annual volume"
            className="w-[9.5rem]"
          />
        }
      />
      <KpiTile
        label="Vs target"
        value={bPct == null ? "No target" : formatPct(bPct)}
        mark={<Mark id={TARGET_MARK[bStatus === "pending" ? "none" : bStatus]} size={40} />}
        delta={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <TargetLine letter="A" entry={a} />
            <TargetLine letter="B" entry={b} />
          </span>
        }
      />
      <KpiTile
        label="Tooling"
        value={sameTool ? "Same tool" : investDelta != null ? bigMoney(investDelta) : signedMoney(toolingDelta, currency)}
        mark={<Mark id={sameTool ? "mark-amortisation" : TOOL_MARK[b.toolKind]} size={40} />}
        hint={
          sameTool
            ? `${TOOL_NAME[b.toolKind]} · amortisation ${signedMoney(toolingDelta, currency)}`
            : investDelta != null
              ? `${TOOL_NAME[a.toolKind]} → ${TOOL_NAME[b.toolKind]}${breakeven ? ` · ${breakeven}` : ""}`
              : `${TOOL_NAME[a.toolKind]} → ${TOOL_NAME[b.toolKind]} · per piece`
        }
      />
    </div>
  );
}
