"use client";

import { ArrowRight } from "lucide-react";
import { Dropdown, type DropdownOption } from "@/components/ui/dropdown";
import { useApp } from "@/lib/app-context";
import { PROCESS_SHORT, type ProcessOption } from "@/lib/costing/process-detection";
import { MATERIAL_RATES, type MaterialRate } from "@/lib/costing/rates";
import { cx, formatMoney, type Currency } from "@/lib/format";
import { CAPS, INSET } from "./ui";

/** Overhead 8% then margin 5.5%: how a material delta reaches the piece price. */
const BURDEN_FACTOR = 1.08 * 1.055;

/** Grade options with the standard underneath and the Rate Master €/kg on the right. */
export function gradeOptions(grades: readonly MaterialRate[], currency: Currency): DropdownOption[] {
  return grades.map((rate) => ({
    value: rate.grade,
    label: rate.grade,
    description: rate.standard,
    meta: `${formatMoney(rate.rate, currency)}/kg`,
  }));
}

function MaterialRow({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={cx("text-body-md", strong ? "font-medium text-primary" : "text-tertiary")}>
        {label}
        {sub ? <span className="ml-1.5 text-body-sm text-quaternary tabular">{sub}</span> : null}
      </span>
      <span
        className={cx("text-right text-body-md whitespace-nowrap text-primary tabular", strong && "font-medium")}
      >
        {value}
      </span>
    </div>
  );
}

/** Grade picker with the billet-to-net material calculation and the delta against the declared grade. */
export function MaterialGradePanel({
  option,
  process,
  selected,
  onSelect,
}: {
  option: ProcessOption;
  process: string;
  selected: string;
  onSelect: (grade: string) => void;
}) {
  const { currency } = useApp();
  const grades = MATERIAL_RATES.filter((rate) => rate.process === PROCESS_SHORT[process]);
  const grade = grades.find((rate) => rate.grade === selected) ?? grades[0];
  const basis = option.basis;
  if (!grade || !basis) return null;

  const returnKg = basis.billetKg - basis.netKg;
  const raw = basis.billetKg * grade.rate;
  const credit = returnKg * grade.scrap;
  const net = raw - credit;
  const declared = grades.find((rate) => rate.grade === option.material) ?? grade;
  const delta = net - (basis.billetKg * declared.rate - returnKg * declared.scrap);
  const changed = grade.grade !== declared.grade;

  return (
    <div>
      <span className={CAPS}>Material grade</span>
      <div className="mt-2 grid gap-4 md:grid-cols-3">
        <Dropdown
          aria-label="Grade"
          value={grade.grade}
          onChange={onSelect}
          options={gradeOptions(grades, currency)}
          edited={changed}
          menuMinWidth={260}
        />
        <div className="text-body-sm text-quaternary md:col-span-2 md:self-center">
          {grades.length} grades available for {PROCESS_SHORT[process].toLowerCase()} · rates from Rate Master 14 Jul
          2026
        </div>
      </div>
      <div className={cx(INSET, "mt-4 px-4 py-4")}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-heading-md text-primary tabular">{grade.grade}</span>
          <span className="text-body-md text-tertiary tabular">{grade.standard}</span>
          {changed ? (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-default bg-container px-2 py-0.5 text-body-sm text-tertiary tabular">
              {declared.grade} <ArrowRight size={12} strokeWidth={1.75} aria-hidden /> {grade.grade}
            </span>
          ) : null}
        </div>
        <div className="mt-3 grid gap-x-10 gap-y-0 sm:grid-cols-2">
          <div className="divide-y divide-muted">
            <MaterialRow label={basis.billetLabel} value={`${basis.billetKg.toFixed(2)} kg`} />
            <MaterialRow label="Material rate" value={`${formatMoney(grade.rate, currency)} / kg`} />
            <MaterialRow label="Raw material" value={formatMoney(raw, currency)} strong />
          </div>
          <div className="divide-y divide-muted">
            <MaterialRow label={basis.returnLabel} value={`${returnKg.toFixed(2)} kg`} />
            <MaterialRow label="Scrap return" value={`${formatMoney(grade.scrap, currency)} / kg`} />
            <MaterialRow label="Return credit" value={`−${formatMoney(credit, currency)}`} strong />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-default pt-3">
          <span className="text-body-lg font-semibold text-primary">Net material per piece</span>
          <span className="text-heading-md text-primary tabular">{formatMoney(net, currency)}</span>
        </div>
        {changed ? (
          <div
            className={cx(
              "mt-3 rounded-md border px-4 py-2.5 text-body-md",
              delta > 0 ? "border-error-stroke bg-error-surface" : "border-success-stroke bg-success-surface",
            )}
          >
            <span className={delta > 0 ? "text-error" : "text-success"}>
              <span aria-hidden className="mr-1.5 text-caption">
                {delta > 0 ? "▲" : "▼"}
              </span>
              <span className="font-medium tabular">{formatMoney(Math.abs(delta), currency)}</span> material per
              piece against {declared.grade}
            </span>
            <span className="text-tertiary">
              . The piece price moves{" "}
              <span className="font-medium text-primary tabular">
                {delta > 0 ? "+" : "−"}
                {formatMoney(Math.abs(delta) * BURDEN_FACTOR, currency)}
              </span>{" "}
              once overhead 8% and margin 5.5% are applied.
            </span>
          </div>
        ) : (
          <p className="mt-3 text-body-sm leading-relaxed text-quaternary">
            The grade declared in the file. Change it and the material lines recompute against Rate Master.
          </p>
        )}
        <p className="mt-2 text-body-sm leading-relaxed text-quaternary">
          Material only. Machine time, tooling and inspection do not move with grade: those come from the full
          estimate.
        </p>
      </div>
    </div>
  );
}
