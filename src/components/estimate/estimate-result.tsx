"use client";

import { useMemo, useState } from "react";
import { Columns3, FileText, History } from "lucide-react";
import { Page } from "@/components/mulya/page";
import { StatusChip, statusFor } from "@/components/mulya/status-chip";
import { ButtonLink } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { CONFIDENCE, buildEstimateSubject } from "@/lib/costing/estimate-subject";
import type { Scenario } from "@/lib/costing/estimate";
import { buildSessionEstimate } from "@/lib/costing/session";
import { TOOLING, type ToolSpec } from "@/lib/costing/tooling";
import { useApp } from "@/lib/app-context";
import { ROUTE_MARK } from "@/lib/marks";
import { PART_VARIANTS, type PartVariant } from "@/lib/models/part-meta";
import { CostBreakdownPanel } from "./cost-breakdown-panel";
import { EstimateHero, type PriceBasis } from "./estimate-hero";
import { PriceBreaksPanel } from "./price-breaks-panel";
import { ToolingPanel } from "./tooling-panel";
import { WhatIfPanel } from "./what-if-panel";

/** Next revision letter (A → B … Y → Z); anything else is returned unchanged. */
const nextRevision = (rev: string) => (/^[A-Y]$/.test(rev) ? String.fromCharCode(rev.charCodeAt(0) + 1) : rev);

/** Process key a what-if implies, from its tool key (`bearing-die` → `die`); sand when it has none. */
function scenarioProcess(scenario: Scenario, presetKey: string): string {
  const key = scenario.toolKey.replace(`${presetKey}-`, "");
  return key === "die" || key === "sand" || key === "stamping" ? key : "sand";
}

const toVariant = (value: string): PartVariant =>
  (PART_VARIANTS as readonly string[]).includes(value) ? (value as PartVariant) : "bearing";

/** Estimate Result: price, breakdown, tooling, price breaks and what-ifs for the current flow. */
export function EstimateResult() {
  const { currency, createRevC, revCCreated, flow, setFlow, addNewEstimate } = useApp();
  const sourceNumber = flow.source?.number;
  const subject = useMemo(
    () => buildEstimateSubject(flow.preset ?? "bearing", flow.process, flow.material, sourceNumber),
    [flow.preset, flow.process, flow.material, sourceNumber],
  );
  const scenario = subject.whatIfs.find((s) => s.id === flow.scenarioId);
  const selectScenario = (next: Scenario | null) => setFlow({ scenarioId: next?.id ?? "base" });

  const [basis, setBasis] = useState<PriceBasis>("piece");
  const isBase = !scenario;
  const target = subject.target;
  const confidence = CONFIDENCE[subject.presetKey] ?? CONFIDENCE.bearing;
  const sourceLines = scenario?.lines ?? subject.lines;
  const lines = useMemo(
    () => (basis === "piece" ? sourceLines : sourceLines.filter((line) => !/^Margin/.test(line.label))),
    [sourceLines, basis],
  );
  const total = useMemo(() => lines.reduce((sum, line) => sum + line.value, 0), [lines]);
  const status = statusFor(total, target);

  const partName = flow.source?.name ?? subject.partName;
  const partNumber = flow.source?.number ?? subject.partNumber;
  const revision = flow.source?.revision ?? subject.revision;
  const revisionLabel = `Rev ${isBase ? revision : nextRevision(revision)}`;
  const tool: ToolSpec | undefined = scenario ? TOOLING[scenario.toolKey] : subject.tool;
  const variant = toVariant(subject.variant);

  const onSelectScenario = (next: Scenario, selected: boolean) => {
    selectScenario(selected ? null : next);
    if (selected) return;
    if (subject.presetKey === "bearing" && next.id === "diecast") createRevC();
    const saved = buildSessionEstimate(
      subject.presetKey,
      scenarioProcess(next, subject.presetKey),
      null,
      `What-if · ${next.label}`,
    );
    if (saved) addNewEstimate({ ...saved, cost: next.price, lines: next.lines, derived: false });
  };

  return (
    <Page
      title={`${partName}: ${revisionLabel}`}
      mark={<Mark id={ROUTE_MARK["/estimate"]} size={44} />}
      subtitle={
        <span className="tabular">
          {scenario?.spec ?? subject.spec} · {partNumber} · {subject.programme}
        </span>
      }
      actions={
        <>
          <ButtonLink href="/compare" icon={Columns3}>
            Compare Estimates
          </ButtonLink>
          <ButtonLink href="/history" icon={History}>
            View History
          </ButtonLink>
          <ButtonLink href="/report" icon={FileText}>
            Cost Report
          </ButtonLink>
        </>
      }
    >
      <EstimateHero
        key={`${subject.presetKey}-${subject.process}`}
        subject={subject}
        variant={variant}
        confidence={confidence}
        basis={basis}
        onBasisChange={setBasis}
        total={total}
        target={target}
        status={status}
        currency={currency}
      />

      <CostBreakdownPanel
        lines={lines}
        total={total}
        drivers={subject.drivers}
        derivedNote={subject.derived && isBase ? subject.processLabel : null}
        currency={currency}
      />

      {tool ? <ToolingPanel tool={tool} baseTool={subject.baseTool} variant={variant} currency={currency} /> : null}

      {subject.priceBreaks.length > 0 ? (
        <PriceBreaksPanel
          breaks={subject.priceBreaks}
          annualVolume={subject.annualVolume}
          note={subject.priceBreakNote}
          currency={currency}
        />
      ) : null}

      <WhatIfPanel
        scenarios={subject.whatIfs}
        basePrice={subject.price}
        selectedId={flow.scenarioId}
        onSelect={onSelectScenario}
        onReset={() => selectScenario(null)}
        status={status}
        revisionLabel={revisionLabel}
        total={total}
        savedAsNew={revCCreated && subject.presetKey === "bearing"}
        currency={currency}
      />

      <div className="flex flex-wrap items-center gap-2 text-body-sm text-tertiary" aria-live="polite">
        <StatusChip status={status} size="sm" />
        <span>
          {status === "over"
            ? "Over target: redesign recommended."
            : status === "under"
              ? "Under target: headroom available."
              : status === "on"
                ? "Within tolerance."
                : "No target cost set."}
        </span>
      </div>
    </Page>
  );
}
