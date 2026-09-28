import { Flame, Lightbulb, TriangleAlert } from "lucide-react";
import { Section } from "@/components/mulya/page";
import type { ThermalProfile, ThermalStage, ThermalStatus } from "@/lib/costing/agents";
import { cx } from "@/lib/format";
import { CAPS, GLYPH_CHIP, ICON, ROW, TH, TONE } from "./ui";

const STATUS_META: Record<ThermalStatus, { icon: string; label: string; className: string }> = {
  "in-band": { icon: "●", label: "In band", className: TONE.neutral },
  high: { icon: "▲", label: "Above band", className: TONE.error },
  low: { icon: "▼", label: "Below band", className: TONE.error },
};

/** Target band with the estimated value pinned on it. */
function BandGauge({ stage }: { stage: ThermalStage }) {
  const span = stage.max - stage.min;
  const lo = stage.min - span * 0.6;
  const hi = stage.max + span * 0.6;
  const pos = (value: number) => ((value - lo) / (hi - lo)) * 100;
  const marker = Math.min(98, Math.max(2, pos(stage.actual)));
  const out = stage.status !== "in-band";
  return (
    <div className="relative h-10">
      <div className="absolute inset-x-0 top-3 h-1.5 rounded-full bg-raised-2" />
      <div
        className="absolute top-3 h-1.5 rounded-full bg-info-icon/35"
        style={{ left: `${pos(stage.min)}%`, width: `${pos(stage.max) - pos(stage.min)}%` }}
      />
      {[stage.min, stage.max].map((edge) => (
        <div key={edge} className="absolute top-1.5" style={{ left: `${pos(edge)}%` }}>
          <div className="h-4 w-px bg-active" />
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-caption font-normal whitespace-nowrap text-quaternary tabular">
            {edge}
          </span>
        </div>
      ))}
      <div className="absolute top-0.5 -translate-x-1/2" style={{ left: `${marker}%` }} title={`${stage.actual} ${stage.unit}`}>
        <span
          className={cx(
            "rounded px-1.5 py-0.5 text-caption tabular text-on-color",
            out ? "bg-error-icon" : "bg-action-primary",
          )}
        >
          {stage.actual}
        </span>
        <div className={cx("mx-auto h-2 w-px", out ? "bg-error-icon" : "bg-action-primary")} aria-hidden />
      </div>
    </div>
  );
}

/** Thermal agent's panel: stage-by-stage process windows and what to do about excursions. */
export function ThermalPanel({ profile }: { profile: ThermalProfile }) {
  const outside = profile.stages.filter((stage) => stage.status !== "in-band");
  const summary = outside.length ? STATUS_META.high : STATUS_META["in-band"];
  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          <Flame {...ICON} aria-hidden className="text-info" />
          Thermal profile &amp; limits
        </span>
      }
      action={
        <span className={cx(GLYPH_CHIP, summary.className)}>
          <span aria-hidden className="leading-none">
            {outside.length ? "▲" : "●"}
          </span>
          {outside.length ? `${outside.length} stage${outside.length > 1 ? "s" : ""} outside band` : "All stages in band"}
        </span>
      }
    >
      <p className="text-body-md leading-relaxed text-tertiary">{profile.headline}</p>
      <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-muted bg-muted sm:grid-cols-3">
        {profile.reference.map((ref) => (
          <div key={ref.label} className="bg-container px-4 py-3">
            <span className={CAPS}>{ref.label}</span>
            <p className="mt-1 text-heading-md font-normal text-primary tabular">{ref.value}</p>
            <p className="mt-1 text-body-sm leading-relaxed text-quaternary">{ref.note}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[880px]">
          <thead>
            <tr className="border-b border-muted">
              <th className={cx(TH, "pr-4 text-left")}>Stage</th>
              <th className={cx(TH, "px-4 text-left")} style={{ width: 260 }}>
                Target band
              </th>
              <th className={cx(TH, "px-4 text-left")}>Status</th>
              <th className={cx(TH, "px-4 text-left")}>Outside band</th>
              <th className={cx(TH, "pl-4 text-left")}>Cost line affected</th>
            </tr>
          </thead>
          <tbody>
            {profile.stages.map((stage) => {
              const meta = STATUS_META[stage.status];
              const consequence = stage.status === "high" ? stage.ifHigh : stage.status === "low" ? stage.ifLow : null;
              return (
                <tr key={stage.stage} className={cx(ROW, "align-top")}>
                  <td className="py-3 pr-4">
                    <div className="text-body-md font-medium text-primary">{stage.stage}</div>
                    <div className="mt-0.5 text-body-sm leading-relaxed text-quaternary">{stage.purpose}</div>
                  </td>
                  <td className="px-4 py-3">
                    <BandGauge stage={stage} />
                    <div className="mt-1 text-caption font-normal text-quaternary tabular">
                      {stage.min} to {stage.max} {stage.unit}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cx(GLYPH_CHIP, meta.className)}>
                      <span aria-hidden className="leading-none">
                        {meta.icon}
                      </span>
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-body-sm leading-relaxed text-tertiary">
                    {consequence ? (
                      <span className="text-error">{consequence}</span>
                    ) : (
                      <>
                        <span className="block">▲ {stage.ifHigh}</span>
                        <span className="mt-1 block">▼ {stage.ifLow}</span>
                      </>
                    )}
                  </td>
                  <td className="py-3 pl-4 text-body-sm text-tertiary tabular">{stage.costLink}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-6 border-t border-muted pt-5">
        <span className={CAPS}>What to do about it</span>
        <div className="mt-3 space-y-3">
          {profile.suggestions.map((suggestion) => (
            <div
              key={suggestion.title}
              className={cx(
                "flex gap-3 rounded-md border px-4 py-3",
                suggestion.tone === "warn"
                  ? "border-error-stroke bg-error-surface"
                  : suggestion.tone === "save"
                    ? "border-success-stroke bg-success-surface"
                    : "border-muted bg-raised",
              )}
            >
              {suggestion.tone === "warn" ? (
                <TriangleAlert {...ICON} aria-hidden className="mt-0.5 shrink-0 text-error" />
              ) : (
                <Lightbulb
                  {...ICON}
                  aria-hidden
                  className={cx("mt-0.5 shrink-0", suggestion.tone === "save" ? "text-success" : "text-quaternary")}
                />
              )}
              <div>
                <p className="text-body-md font-medium text-primary">{suggestion.title}</p>
                <p className="mt-1 text-body-md leading-relaxed text-tertiary">{suggestion.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-body-sm leading-relaxed text-quaternary">
        Bands are process and alloy specific and come from standard practice, not from your plants. Connect your
        process data and these become your actual running windows.
      </p>
    </Section>
  );
}
