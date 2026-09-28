import { Gauge } from "lucide-react";
import { COMPLEXITY_BANDS, type ComplexityBand, type ComplexityProfile } from "@/lib/costing/agents";
import { PROCESS_NAMES } from "@/lib/costing/process-detection";
import { cx } from "@/lib/format";
import { CAPS, CARD, CARD_BAR, CARD_BAR_ROW, ICON, INFO_CHIP, ladderRow } from "./ui";

const BANDS: ComplexityBand[] = ["simple", "moderate", "complex", "very"];

/** Manufacturing complexity index scored from the geometry, factor by factor. */
export function ComplexityPanel({ complexity, process }: { complexity: ComplexityProfile; process: string }) {
  const band = COMPLEXITY_BANDS[complexity.band];
  return (
    <section className={CARD}>
      <header className={cx(CARD_BAR_ROW, "border-b")}>
        <Gauge {...ICON} aria-hidden className="shrink-0 text-info" />
        <span className="text-caption tracking-[0.08em] text-primary uppercase">Manufacturing complexity</span>
        <span className={INFO_CHIP}>from geometry</span>
        <span className="ml-auto text-body-sm text-quaternary">Scored for {PROCESS_NAMES[process]?.toLowerCase()}</span>
      </header>
      <div className="grid gap-8 p-4 lg:grid-cols-[minmax(250px,0.85fr)_minmax(0,2.5fr)]">
        <div>
          <span className={CAPS}>Complexity index</span>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-display text-display-metric text-primary tabular">{complexity.index}</span>
            <span className="text-body-md text-quaternary tabular">/ 100</span>
          </div>
          <p className="mt-2 text-heading-md text-primary">{band.label}</p>
          <ul className="mt-4 space-y-1.5">
            {BANDS.map((key) => (
              <li key={key} className={ladderRow(key === complexity.band)}>
                <span>{COMPLEXITY_BANDS[key].label}</span>
                <span className="tabular">{COMPLEXITY_BANDS[key].range}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-body-sm leading-relaxed text-quaternary">
            Scored from the geometry, not learned from history. Weighting is a company assumption like any rate in
            Rate Master: yours to set.
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-body-md leading-relaxed text-tertiary">{complexity.headline}</p>
          <div className="mt-4 space-y-3">
            {complexity.factors.map((factor) => (
              <div key={factor.factor} className="grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_88px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-body-md text-primary">{factor.factor}</span>
                    <span className="text-body-sm text-quaternary tabular">{factor.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-raised-2">
                    <div
                      className="h-full rounded-full bg-[var(--analytics-series-1)] transition-[width] duration-200"
                      style={{ width: `${(factor.score / factor.max) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-body-sm leading-relaxed text-quaternary">{factor.note}</p>
                </div>
                <span className="self-start text-right text-body-md text-primary tabular sm:pt-0.5">
                  {factor.score}
                  <span className="text-quaternary"> / {factor.max}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-default pt-3">
            <span className="text-body-md font-semibold text-primary">Complexity index</span>
            <span className="text-body-lg font-semibold text-primary tabular">
              {complexity.index}
              <span className="text-quaternary"> / 100</span>
            </span>
          </div>
        </div>
      </div>
      <footer className={cx(CARD_BAR, "border-t text-body-md leading-relaxed text-tertiary")}>
        {complexity.costNote}
      </footer>
    </section>
  );
}
