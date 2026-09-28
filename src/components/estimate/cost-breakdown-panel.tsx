import { Section } from "@/components/mulya/page";
import { MarkedTitle } from "./marked-title";
import type { CostLine } from "@/lib/costing/estimate";
import type { CostDriver } from "@/lib/costing/estimate-subject";
import { cx, formatMoney, type Currency } from "@/lib/format";

/** Line-by-line cost bars with total, beside the ranked cost drivers. */
export function CostBreakdownPanel({
  lines,
  total,
  drivers,
  derivedNote,
  currency,
}: {
  lines: CostLine[];
  total: number;
  drivers: CostDriver[];
  /** Process label when the lines were split from an option price (base design only). */
  derivedNote: string | null;
  currency: Currency;
}) {
  const largest = Math.max(...lines.map((line) => Math.abs(line.value)), 1);

  return (
    <div className={cx("grid gap-4", drivers.length > 0 && "lg:grid-cols-[1.4fr_1fr]")}>
      <Section title={<MarkedTitle mark="mark-material">Cost breakdown</MarkedTitle>} count={lines.length}>
        <div className="flex flex-col">
          {lines.map((line) => {
            const credit = line.value < 0;
            const share = total > 0 ? (Math.abs(line.value) / total) * 100 : 0;
            return (
              <div
                key={line.label}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-md px-2 py-2 transition-colors duration-[150ms] hover:bg-raised"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-body-md text-secondary">{line.label}</span>
                    <span className="shrink-0 text-body-sm text-quaternary tabular">
                      {credit ? "credit" : `${share.toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised-2">
                    <div
                      className={cx("h-full rounded-full", credit ? "bg-success-icon" : "bg-[var(--analytics-series-1)]")}
                      style={{ width: `${(Math.abs(line.value) / largest) * 100}%` }}
                    />
                  </div>
                </div>
                <span
                  className={cx(
                    "w-[84px] text-right text-label-md tabular",
                    credit ? "text-success" : "text-primary",
                  )}
                >
                  {formatMoney(line.value, currency)}
                </span>
              </div>
            );
          })}
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-t border-default px-2 pt-3">
            <span className="text-caption tracking-[0.08em] text-quaternary uppercase">Total</span>
            <span className="text-right font-display text-display-lg text-primary tabular">
              {formatMoney(total, currency)}
            </span>
          </div>
          {derivedNote != null ? (
            <p className="px-2 pt-3 text-body-sm text-quaternary">
              Lines split from the {derivedNote.toLowerCase()} option price by process-typical proportions. Material
              and tooling are computed from the same basis the workspace uses; the conversion split is indicative.
            </p>
          ) : null}
        </div>
      </Section>

      {drivers.length > 0 ? (
        <Section title={<MarkedTitle mark="mark-driver">Top cost drivers</MarkedTitle>} count={drivers.length}>
          <ol className="flex flex-col gap-2">
            {drivers.map((driver, index) => (
              <li
                key={driver.title}
                className="flex items-start gap-3 rounded-lg border border-muted bg-raised px-3 py-3 transition-colors duration-[150ms] hover:border-default"
              >
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-muted bg-container text-caption text-tertiary tabular">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span aria-hidden className="inline-flex size-2.5 items-center justify-center text-[10px] text-error">
                      ▲
                    </span>
                    <span className="text-label-md text-primary">{driver.title}</span>
                  </div>
                  <div className="mt-1 text-body-sm text-tertiary tabular">{driver.detail}</div>
                </div>
              </li>
            ))}
          </ol>
          <p className="pt-3 text-body-sm text-quaternary">
            Ranked by sensitivity: how much the estimate moves when each input changes.
          </p>
        </Section>
      ) : null}
    </div>
  );
}
