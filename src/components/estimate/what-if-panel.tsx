import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/mulya/controls";
import { Section } from "@/components/mulya/page";
import { MarkedTitle } from "./marked-title";
import { Badge } from "@/components/ui/badge";
import { StatusChip, type TargetStatus } from "@/components/mulya/status-chip";
import type { Scenario } from "@/lib/costing/estimate";
import { cx, formatMoney, formatPct, type Currency } from "@/lib/format";

/**
 * Costed alternatives for the part. Picking one applies it to the estimate
 * above; picking it again (or Reset) returns to the current design.
 */
export function WhatIfPanel({
  scenarios,
  basePrice,
  selectedId,
  onSelect,
  onReset,
  status,
  revisionLabel,
  total,
  savedAsNew,
  currency,
}: {
  scenarios: Scenario[];
  /** Price of the current design the deltas are measured against. */
  basePrice: number;
  selectedId: string;
  onSelect: (scenario: Scenario, selected: boolean) => void;
  onReset: () => void;
  status: TargetStatus;
  revisionLabel: string;
  total: number;
  /** The bearing die-cast change has created Rev C in the catalogue. */
  savedAsNew: boolean;
  currency: Currency;
}) {
  const applied = scenarios.some((scenario) => scenario.id === selectedId);

  return (
    <Section
      title={<MarkedTitle mark="mark-what-if">What if…</MarkedTitle>}
      count={scenarios.length || undefined}
      action={
        applied ? (
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onReset} className="h-7">
            Reset to current design
          </Button>
        ) : null
      }
    >
      {scenarios.length === 0 ? (
        <p className="text-body-md text-tertiary">
          No costed alternatives for this part yet: it carries a price and a target, but no process comparison or
          design levers have been worked up for it.
        </p>
      ) : (
        <>
          <p className="mb-3 max-w-[70ch] text-body-md text-tertiary">
            What each change does to the piece price. Cheaper and dearer both: a design that is already inside its
            target still has decisions to price.
          </p>
          <div className="flex flex-col gap-2">
            {scenarios.map((scenario) => {
              const delta = scenario.price - basePrice;
              const deltaPct = (delta / basePrice) * 100;
              const cheaper = delta < -0.005;
              const dearer = delta > 0.005;
              const selected = scenario.id === selectedId;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => onSelect(scenario, selected)}
                  aria-pressed={selected}
                  className={cx(
                    "group/wi flex w-full cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border px-3 py-3 text-left transition-colors duration-[150ms] outline-none focus-visible:ring-2 focus-visible:ring-active sm:px-4",
                    selected
                      ? "border-active bg-raised-2"
                      : "border-muted bg-container hover:border-default hover:bg-raised",
                  )}
                >
                  <span className="flex w-full min-w-0 items-start gap-3 sm:w-auto sm:flex-1">
                    <span
                      aria-hidden
                      className={cx(
                        "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-[150ms]",
                        selected
                          ? "border-transparent bg-action-primary text-on-color"
                          : "border-default text-quaternary group-hover/wi:text-primary",
                      )}
                    >
                      {selected ? <Check size={12} strokeWidth={2.25} /> : <ArrowRight size={12} strokeWidth={2} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-label-md text-primary">{scenario.label}</span>
                      {scenario.spec ? (
                        <span className="mt-0.5 block text-body-sm text-quaternary">{scenario.spec}</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="ml-8 flex shrink-0 items-center gap-3 sm:ml-0">
                    <span className="text-label-md text-primary tabular">{formatMoney(scenario.price, currency)}</span>
                    <Badge
                      tone={cheaper ? "success" : dearer ? "error" : "neutral"}
                      icon={cheaper ? "▼" : dearer ? "▲" : "●"}
                      size="sm"
                      className="min-w-[112px] justify-center"
                    >
                      <span className="tabular">
                        {formatMoney(Math.abs(delta), currency)}
                        <span className="ml-1 opacity-75">{formatPct(deltaPct, 0)}</span>
                      </span>
                    </Badge>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {applied ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-info-stroke bg-info-surface px-4 py-3 text-body-md">
          <StatusChip status={status} label={`${revisionLabel} · ${formatMoney(total, currency)}`} />
          <span className="text-tertiary">
            {savedAsNew
              ? "Saved as a new estimate: visible in Estimate History and Compare Estimates."
              : "Applied to this estimate: the breakdown above is this change."}
          </span>
        </div>
      ) : null}
    </Section>
  );
}
