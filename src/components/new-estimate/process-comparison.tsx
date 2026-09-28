"use client";

import { Check, Wrench } from "lucide-react";
import { Button } from "@/components/mulya/controls";
import { StatusChip, statusFor } from "@/components/mulya/status-chip";
import { ViabilityBadge } from "@/components/ui/badge";
import { Mark } from "@/components/ui/mark";
import { useApp } from "@/lib/app-context";
import {
  PROCESS_NAMES,
  VIABILITY,
  type ProcessInference,
  type ProcessKey,
  type ProcessOption,
  type Viability,
} from "@/lib/costing/process-detection";
import { cx, formatMoney, formatNumber, formatPct } from "@/lib/format";
import { PROCESS_KEY_MARK } from "@/lib/marks";
import { CAPS, ICON, ICON_SM, INSET } from "./ui";

/** Route viability as the shared badge; label and glyph from the data layer. */
export function ViabilityChip({ viability }: { viability: Viability }) {
  const meta = VIABILITY[viability];
  return <ViabilityBadge viability={viability} size="sm" label={meta.label} />;
}

function FigureRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-body-md text-tertiary">{label}</span>
      <span className={cx("text-body-md tabular", muted ? "text-quaternary" : "text-primary")}>{value}</span>
    </div>
  );
}

/** One process route priced side by side with the others. */
function ProcessOptionCard({
  option,
  inference,
  selected,
  onSelect,
}: {
  option: ProcessOption;
  inference: ProcessInference;
  selected: boolean;
  onSelect: (process: ProcessKey) => void;
}) {
  const { currency } = useApp();
  const blocked = option.viability === "blocked";
  const status = option.price != null && inference.target != null ? statusFor(option.price, inference.target) : null;

  return (
    <div
      className={cx(
        "flex flex-col rounded-lg border bg-container transition-colors duration-[150ms]",
        selected ? "border-active ring-1 ring-active" : "border-muted hover:border-default",
        blocked && "opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-muted px-4 py-4">
        <div className="min-w-0">
          <ViabilityChip viability={option.viability} />
          <h3 className="mt-3 text-heading-sm text-primary">{PROCESS_NAMES[option.key]}</h3>
          <p className="mt-1 text-body-md text-tertiary tabular">
            {blocked ? "n/a" : `${option.material} · ${option.toolType}`}
          </p>
        </div>
        <Mark id={PROCESS_KEY_MARK[option.key]} size={44} className={cx("-mr-1", blocked && "opacity-55 grayscale")} />
      </div>
      {blocked || option.price == null ? (
        <div className="flex flex-1 flex-col justify-between gap-4 px-4 py-5">
          <p className="text-body-md leading-relaxed text-tertiary">{option.note}</p>
          <span className="text-body-sm text-quaternary">Not costed: the geometry rules this process out.</span>
        </div>
      ) : (
        <div className="flex flex-1 flex-col px-4 py-5">
          <span className={CAPS}>Piece price</span>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-display-2xl text-primary tabular">
              {formatMoney(option.price, currency)}
            </span>
            {status && inference.target != null ? (
              <StatusChip
                size="sm"
                status={status}
                label={formatPct(((option.price - inference.target) / inference.target) * 100)}
              />
            ) : null}
          </div>
          <div className="mt-4 divide-y divide-muted border-y border-muted">
            <FigureRow label="Tool build cost" value={formatMoney(option.toolingCost ?? 0, currency, 0)} />
            <FigureRow label="Tooling per piece" value={`${formatMoney(option.toolingPerPiece ?? 0, currency)} / pc`} />
            <FigureRow label="Tooling lead time" value={`${formatNumber(option.toolingLeadWeeks ?? 0)} weeks`} />
          </div>
          <p className="mt-4 text-body-md leading-relaxed text-tertiary">{option.note}</p>
          {option.breakeven ? (
            <p className={cx(INSET, "mt-3 rounded-md px-3 py-2 text-body-sm leading-relaxed text-tertiary")}>
              <span className={CAPS}>Breakeven</span>
              <span className="mt-1 block">{option.breakeven}</span>
            </p>
          ) : null}
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
            {selected ? (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-active bg-raised-2 px-4 text-label-md text-primary">
                <Check {...ICON} aria-hidden /> Selected
              </span>
            ) : (
              <Button variant="secondary" onClick={() => onSelect(option.key)}>
                Use this process
              </Button>
            )}
            <span className="inline-flex items-center gap-1 text-body-sm text-quaternary">
              <Wrench {...ICON_SM} aria-hidden />
              {option.toolType}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** “Switching process”: all three routes priced with tooling amortised over the lifetime volume. */
export function ProcessComparison({
  inference,
  selected,
  onSelect,
}: {
  inference: ProcessInference;
  selected: string;
  onSelect: (process: ProcessKey) => void;
}) {
  const { currency } = useApp();
  const lifetime = inference.annualVolume * inference.productionLife;
  return (
    <section className="overflow-hidden rounded-xl border border-muted bg-raised">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-muted px-4 py-4">
        <h2 className="text-heading-sm text-primary">Switching process</h2>
        <p className="text-body-md text-tertiary tabular">
          {formatNumber(inference.annualVolume)} pcs/yr × {inference.productionLife} years ={" "}
          {formatNumber(lifetime)} lifetime pieces
          {inference.target != null && ` · target ${formatMoney(inference.target, currency)}`}
        </p>
      </header>
      <div className="grid gap-4 p-4 lg:grid-cols-3">
        {inference.options.map((option) => (
          <ProcessOptionCard
            key={option.key}
            option={option}
            inference={inference}
            selected={option.key === selected}
            onSelect={onSelect}
          />
        ))}
      </div>
      <footer className="border-t border-muted px-4 py-3 text-body-sm leading-relaxed text-quaternary">
        Piece prices include tooling amortised over the lifetime volume above. Change the annual volume or
        production life on the form below and the amortisation moves with it: a die that looks expensive at
        500/yr is the cheapest option at 10,000/yr.
      </footer>
    </section>
  );
}
