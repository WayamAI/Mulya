"use client";

import { useMemo } from "react";
import { ShieldQuestionMark } from "lucide-react";
import { Section } from "@/components/mulya/page";
import { ProvenanceBadge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";
import {
  ESTIMATE_CLASSES,
  INPUT_STATES,
  type ConfidenceInput,
  type ConfidenceProfile,
  type InputState,
} from "@/lib/costing/estimate-subject";
import { cx, formatMoney } from "@/lib/format";
import { CAPS, ICON, INSET, ladderRow } from "./ui";

const STATES: InputState[] = ["read", "assumed", "unknown"];

const STATE_BAR: Record<InputState, string> = {
  read: "bg-success-icon",
  assumed: "bg-warning-icon",
  unknown: "bg-neutral-icon",
};

/** Read / assumed / unknown as the shared provenance badge (label from the data layer). */
function InputStateChip({ state, count }: { state: InputState; count?: number }) {
  return (
    <ProvenanceBadge
      state={state}
      size="sm"
      title={INPUT_STATES[state].blurb}
      label={
        <>
          {INPUT_STATES[state].label}
          {count != null ? <span className="ml-1 tabular opacity-80">{count}</span> : null}
        </>
      }
    />
  );
}

/** What the estimate knows: estimate class, accuracy band and every input sorted by read / assumed / unknown. */
export function ConfidencePanel({
  profile,
  price,
  extraUnknowns,
}: {
  profile: ConfidenceProfile;
  price: number;
  /** Programme fields marked unknown on the input form. */
  extraUnknowns: ConfidenceInput[];
}) {
  const { currency } = useApp();
  const inputs = useMemo(() => [...profile.inputs, ...extraUnknowns], [profile.inputs, extraUnknowns]);
  const counts = useMemo(() => {
    const tally: Record<InputState, number> = { read: 0, assumed: 0, unknown: 0 };
    inputs.forEach((input) => (tally[input.state] += 1));
    return tally;
  }, [inputs]);
  const total = inputs.length;
  const readPct = Math.round((counts.read / total) * 100);
  const marked = extraUnknowns.length;
  const low = profile.low - marked * 2.5;
  const high = profile.high + marked * 2.5;
  const estimateClass = Math.min(5, profile.estimateClass + (marked >= 4 ? 2 : marked >= 2 ? 1 : 0));
  const demoted = estimateClass !== profile.estimateClass;
  const className = ESTIMATE_CLASSES.find((c) => c.cls === estimateClass)?.name ?? profile.className;

  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          <ShieldQuestionMark {...ICON} aria-hidden className="shrink-0 text-info" />
          What this estimate knows, and what it doesn&apos;t
        </span>
      }
      action={
        <span className="flex flex-wrap items-center gap-2">
          {STATES.map((state) => (
            <InputStateChip key={state} state={state} count={counts[state]} />
          ))}
        </span>
      }
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(280px,1fr)_minmax(0,2.6fr)]">
        <div>
          <span className={CAPS}>Estimate class</span>
          <div className="mt-2 flex items-baseline gap-3">
            <span className={cx("font-display text-display-metric tabular", demoted ? "text-error" : "text-primary")}>
              {estimateClass}
            </span>
            <span className="text-heading-md text-primary">{className}</span>
          </div>
          {demoted ? (
            <p className="mt-2 text-body-sm text-error tabular">
              ▲ Was class {profile.estimateClass} · {marked} input{marked > 1 ? "s" : ""} marked unknown
            </p>
          ) : null}
          <p className="mt-3 text-body-md text-tertiary tabular">{readPct}% of inputs read from the model</p>
          <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-raised-2">
            {STATES.map((state) => (
              <div
                key={state}
                className={cx(STATE_BAR[state], "border-r border-container last:border-r-0")}
                style={{ width: `${(counts[state] / total) * 100}%` }}
                title={`${INPUT_STATES[state].label}: ${counts[state]}`}
              />
            ))}
          </div>
          <div className={cx(INSET, "mt-5 px-4 py-3")}>
            <span className={CAPS}>Expected accuracy</span>
            <p className="mt-1 text-heading-md font-normal text-primary tabular">
              {low.toFixed(1)}% / +{high.toFixed(1)}%
            </p>
            <p className="mt-1 text-body-md text-tertiary tabular">
              {formatMoney(price * (1 + low / 100), currency)} to {formatMoney(price * (1 + high / 100), currency)}
            </p>
            <p className="mt-2 text-body-sm leading-relaxed text-quaternary">
              This is the range shown beside the estimate. It is the width of the {counts.unknown} unknowns below,
              not a rounding allowance.
            </p>
          </div>
          <ul className="mt-4 space-y-1">
            {ESTIMATE_CLASSES.map((cls) => (
              <li key={cls.cls} className={ladderRow(cls.cls === estimateClass)}>
                <span>
                  <span className="mr-2 tabular">{cls.cls}</span>
                  {cls.name}
                </span>
                <span className="tabular">{cls.band}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-body-sm leading-relaxed text-quaternary">
            AACE 18R-97 classification. A study estimate is what you can produce from geometry and standard rates
            alone.
          </p>
        </div>

        <div className="min-w-0 space-y-6">
          {STATES.map((state) => {
            const rows = inputs.filter((input) => input.state === state);
            if (!rows.length) return null;
            return (
              <div key={state}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <InputStateChip state={state} />
                  <span className="text-body-md text-quaternary">{INPUT_STATES[state].blurb}</span>
                </div>
                <dl className="mt-2 divide-y divide-muted border-t border-muted">
                  {rows.map((input) => (
                    <div key={input.label} className="py-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                        <dt className="text-body-md text-primary">{input.label}</dt>
                        <dd
                          className={cx(
                            "text-right text-body-md whitespace-nowrap tabular",
                            input.value ? "text-primary" : "text-quaternary italic",
                          )}
                        >
                          {input.value ?? "not known"}
                        </dd>
                      </div>
                      <p className="mt-0.5 text-body-sm leading-relaxed text-quaternary">{input.source}</p>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 border-t border-muted pt-5">
        <span className={CAPS}>What would tighten this</span>
        <ol className="mt-2 grid gap-3 md:grid-cols-2">
          {profile.toImprove.map((item, index) => (
            <li key={item.step} className={cx(INSET, "flex gap-3 rounded-md px-4 py-3")}>
              <span className="mt-0.5 text-body-sm font-medium text-info tabular">{index + 1}</span>
              <div>
                <p className="text-body-md font-medium text-primary">{item.step}</p>
                <p className="mt-0.5 text-body-sm leading-relaxed text-tertiary">{item.effect}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
