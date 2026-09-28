"use client";

import { ArrowRight, Columns3, ScanSearch } from "lucide-react";
import { Button } from "@/components/mulya/controls";
import { Badge } from "@/components/ui/badge";
import { Mark } from "@/components/ui/mark";
import { NumCell, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  PROCESS_NAMES,
  PROCESS_SHORT,
  type ProcessInference,
  type ProcessKey,
} from "@/lib/costing/process-detection";
import { cx } from "@/lib/format";
import { PROCESS_KEY_MARK } from "@/lib/marks";
import { CAPS, CARD, CARD_BAR_ROW, ICON, INFO_CHIP, LINK } from "./ui";

export const PROCESS_KEYS: ProcessKey[] = ["stamping", "sand", "die"];

/** Process agent's verdict: detected route, confidence, per-process scores and the evidence table. */
export function ProcessInferencePanel({
  inference,
  selected,
  onSelect,
  onCompare,
  onConfirm,
  comparing,
}: {
  inference: ProcessInference;
  selected: string;
  onSelect: (process: ProcessKey) => void;
  onCompare: () => void;
  onConfirm: () => void;
  comparing: boolean;
}) {
  const overridden = selected !== inference.detected;
  return (
    <section className={CARD}>
      <header className={cx(CARD_BAR_ROW, "border-b")}>
        <ScanSearch {...ICON} aria-hidden className="shrink-0 text-info" />
        <span className="text-caption tracking-[0.08em] text-quaternary uppercase">Process inference</span>
        <span className={INFO_CHIP}>from geometry</span>
        <span className="ml-auto text-body-sm text-quaternary tabular">
          {inference.signals.length} signals evaluated
        </span>
      </header>

      <div className="grid gap-8 p-4 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,2.4fr)]">
        <div>
          <span className={CAPS}>Most likely process</span>
          <div className="mt-2 flex items-center gap-3">
            <Mark id={PROCESS_KEY_MARK[inference.detected]} size={44} />
            <p className="text-heading-md text-primary">{PROCESS_NAMES[inference.detected]}</p>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className={CAPS}>Confidence</span>
              <span className="text-body-lg font-medium text-primary tabular">{inference.confidence}%</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-raised-2">
              <div
                className="h-2 rounded-full bg-[var(--analytics-series-1)] transition-[width] duration-200"
                style={{ width: `${inference.confidence}%` }}
              />
            </div>
          </div>
          <ul className="mt-5 space-y-2.5">
            {PROCESS_KEYS.map((key) => (
              <li key={key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={cx(
                      "text-body-md",
                      key === inference.detected ? "font-medium text-primary" : "text-tertiary",
                    )}
                  >
                    {PROCESS_SHORT[key]}
                  </span>
                  <span className="text-body-sm text-quaternary tabular">{inference.scores[key]}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-raised-2">
                  <div
                    className={cx(
                      "h-1.5 rounded-full",
                      key === inference.detected ? "bg-[var(--analytics-series-1)]" : "bg-[var(--stroke-default)]",
                    )}
                    style={{ width: `${inference.scores[key]}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-body-sm leading-relaxed text-quaternary">
            Inferred from geometry: not read from the file. No STEP file carries manufacturing intent, so this is
            a recommendation you confirm, not a fact we extracted.
          </p>
        </div>

        <div className="min-w-0">
          <span className={CAPS}>Evidence</span>
          <div className="mt-2 overflow-hidden rounded-lg border border-muted">
            <Table minWidth={600} density="compact">
              <THead>
                <tr>
                  <TH>Signal</TH>
                  <TH align="right">Measured</TH>
                  <TH>What it implies</TH>
                  <TH align="right">Favours</TH>
                </tr>
              </THead>
              <TBody>
                {inference.signals.map((signal) => (
                  <TR key={signal.signal} className="align-top">
                    <TD className="text-label-md text-primary">{signal.signal}</TD>
                    <NumCell>{signal.value}</NumCell>
                    <TD className="text-body-sm leading-relaxed text-tertiary">{signal.implies}</TD>
                    <TD align="right" className="whitespace-nowrap">
                      {signal.favours ? (
                        <Badge
                          tone={signal.favours === inference.detected ? "info" : "neutral"}
                          icon={signal.favours === inference.detected ? "●" : "○"}
                          size="sm"
                        >
                          {PROCESS_SHORT[signal.favours]}
                        </Badge>
                      ) : (
                        <Badge tone="error" variant="outline" icon="✕" size="sm">
                          rules out
                        </Badge>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </div>
      </div>

      <footer className={cx(CARD_BAR_ROW, "border-t bg-raised py-3")}>
        {overridden ? (
          <span className="text-body-md text-tertiary">
            Overridden to <span className="font-medium text-primary">{PROCESS_NAMES[selected]}</span>.{" "}
            <button type="button" onClick={() => onSelect(inference.detected)} className={LINK}>
              Restore {PROCESS_SHORT[inference.detected]}
            </button>
          </span>
        ) : (
          <span className="text-body-md text-tertiary">
            Continue with {PROCESS_NAMES[inference.detected]}, or look at what the other two would cost.
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={onCompare} aria-expanded={comparing}>
            <Columns3 {...ICON} aria-hidden />
            {comparing ? "Hide process comparison" : "Compare all three processes"}
          </Button>
          <Button onClick={onConfirm}>
            Confirm · {PROCESS_SHORT[selected]} <ArrowRight {...ICON} aria-hidden />
          </Button>
        </div>
      </footer>
    </section>
  );
}
