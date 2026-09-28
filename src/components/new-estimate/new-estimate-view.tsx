"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Calculator, Download, FileUp, History, Pencil } from "lucide-react";
import { Button } from "@/components/mulya/controls";
import { PageBody, PageHeader } from "@/components/mulya/page";
import { Badge } from "@/components/ui/badge";
import { TextAction, buttonClass } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { useApp } from "@/lib/app-context";
import {
  COMPLEXITY,
  FEATURE_FLAGS,
  PHASE_ONE_AGENT_IDS,
  STEP_FILES,
  buildAgentRun,
  getThermalProfile,
  type AgentId,
} from "@/lib/costing/agents";
import { BASE_DESIGN } from "@/lib/costing/estimate";
import {
  CONFIDENCE,
  PROGRAMME_FIELDS,
  type ConfidenceInput,
  type ProgrammeFieldKey,
} from "@/lib/costing/estimate-subject";
import { PRESETS, PROCESS_NAMES, PROCESS_SHORT, type ProcessKey } from "@/lib/costing/process-detection";
import { MATERIAL_RATES } from "@/lib/costing/rates";
import { buildSessionEstimate } from "@/lib/costing/session";
import { TOOLING, type ToolSpec } from "@/lib/costing/tooling";
import { cx, formatDate, formatMoney } from "@/lib/format";
import { PROCESS_KEY_MARK, ROUTE_MARK, TOOL_MARK } from "@/lib/marks";
import { AgentPlaceholder, AgentRunPanel, type PlaceholderState } from "./agent-run-panel";
import { ComplexityPanel } from "./complexity-panel";
import { ConfidencePanel } from "./confidence-panel";
import { EstimateTabBar, EstimateTabPager, type AgentTabState, type EstimateTab } from "./estimate-tabs";
import { InputsForm, TabHeading } from "./inputs-form";
import type { BoundingBox } from "./orthographic-viewer";
import { ProcessComparison } from "./process-comparison";
import { ProcessInferencePanel } from "./process-inference";
import { StepFileCard } from "./step-readout";
import { SupplierPackPanel } from "./supplier-pack-panel";
import { ThermalPanel } from "./thermal-panel";
import { ToolingDetail } from "./tooling-detail";
import { MODELS_BASE, SAMPLE_STEP_FILES } from "@/lib/models/part-meta";
import { CAPS, ICON } from "./ui";
import { useAgentRun } from "./use-agent-run";

const LOCKED_HINT = "Confirm the process on the Process tab first";

const SAMPLE_PARTS = [
  { key: "bearing", label: "Bearing Housing", sub: "DTV-HSG-0431 · 12.4 kg" },
  { key: "bracket", label: "Cab Mount Bracket", sub: "DTV-BRK-0117 · 1.15 kg" },
  { key: "cover", label: "Gearbox End Cover", sub: "DTV-CVR-0288 · 2.8 kg" },
];

/** Preset a dropped / chosen file maps to, by name. */
function presetForFile(name: string | undefined) {
  const lower = (name ?? "").toLowerCase();
  if (lower.includes("brk") || lower.includes("bracket")) return "bracket";
  if (lower.includes("cvr") || lower.includes("cover")) return "cover";
  return "bearing";
}

/** Nearest scrolling ancestor (the page body), falling back to the window. */
function scrollParent(el: HTMLElement | null): HTMLElement | Window {
  let node = el?.parentElement ?? null;
  while (node) {
    const overflow = getComputedStyle(node).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return window;
}

/** New Estimate: upload or pick a part, watch the agent crew read it, confirm the process and review each panel. */
export function NewEstimateView() {
  const router = useRouter();
  const { currency, flow, setFlow, addNewEstimate } = useApp();
  const { preset, process, manual, comparing, confirmed } = flow;
  const [dragging, setDragging] = useState(false);

  const agents = useMemo(
    () => (flow.preset ? buildAgentRun(flow.preset, flow.process, (value, digits) => formatMoney(value, currency, digits)) : []),
    [flow.preset, flow.process, currency],
  );
  const run = useAgentRun(agents, flow.confirmed);

  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);

  const loadFile = (name: string | undefined) => {
    const key = presetForFile(name);
    setFlow({
      preset: key,
      process: PRESETS[key].detected,
      material: null,
      manual: false,
      comparing: false,
      confirmed: false,
      tab: "part",
      agentsRanFor: null,
      source: null,
    });
    run.reset();
  };

  const enterManually = () => {
    run.reset();
    setFlow({ preset: null, manual: true, confirmed: true, comparing: false, agentsRanFor: null });
  };

  // Dispatch the crew when a part loads; a part the crew already read is shown complete.
  const { phase, start, complete } = run;
  useEffect(() => {
    if (!preset || !agents.length || phase !== "idle") return;
    if (flow.agentsRanFor === preset) complete();
    else start();
  }, [preset, agents.length, flow.agentsRanFor, phase, start, complete]);

  useEffect(() => {
    if (phase === "done" && preset && flow.agentsRanFor !== preset) setFlow({ agentsRanFor: preset });
  }, [phase, preset, flow.agentsRanFor, setFlow]);

  // Follow the active agent's tab while the run plays.
  useEffect(() => {
    if (run.phase !== "running" || !run.activeId) return;
    if (flow.tab !== run.activeId) setFlow({ tab: run.activeId });
  }, [run.phase, run.activeId, flow.tab, setFlow]);

  const inference = preset ? PRESETS[preset] : null;
  const complexity = preset ? COMPLEXITY[preset] : null;
  const grades = MATERIAL_RATES.filter((rate) => rate.process === PROCESS_SHORT[process]);
  const tool = preset ? (TOOLING[`${preset}-${process}`] as ToolSpec | undefined) : undefined;
  const confidence = preset ? CONFIDENCE[preset] : null;
  const thermal = preset ? getThermalProfile(preset, process) : undefined;
  const option = inference?.options.find((o) => o.key === process);
  const outOfBand = thermal?.stages.filter((stage) => stage.status !== "in-band").length ?? 0;
  const classPenalty = flow.unknowns.length >= 4 ? 2 : flow.unknowns.length >= 2 ? 1 : 0;

  const isUnknown = (key: ProgrammeFieldKey) => flow.unknowns.includes(key);
  const toggleUnknown = (key: ProgrammeFieldKey) =>
    setFlow({
      unknowns: flow.unknowns.includes(key) ? flow.unknowns.filter((k) => k !== key) : [...flow.unknowns, key],
    });
  const extraUnknowns: ConfidenceInput[] = PROGRAMME_FIELDS.filter((field) => flow.unknowns.includes(field.key)).map(
    (field) => ({
      label: field.label,
      value: null,
      state: "unknown",
      source: `Marked unknown on the input form: ${field.contingency}`,
    }),
  );

  const bbox = useMemo<BoundingBox>(() => {
    const dims = (preset ? STEP_FILES[preset].geometry.find((row) => row.label === "Bounding box")?.value : undefined)
      ?.match(/[\d.]+/g)
      ?.map(Number);
    return dims && dims.length >= 3 ? { x: dims[0], y: dims[1], z: dims[2] } : { x: 100, y: 100, z: 100 };
  }, [preset]);

  const grade =
    flow.material && grades.some((rate) => rate.grade === flow.material)
      ? flow.material
      : (option?.material ?? grades[0]?.grade ?? "");

  const openTab = (key: AgentId) => {
    if (run.phase === "running") run.pause();
    setFlow({ tab: key });
    requestAnimationFrame(() => scrollParent(rootRef.current).scrollTo({ top: 0, behavior: "smooth" }));
  };

  const isReady = (key: AgentId) => !preset || run.doneIds.has(key);
  const placeholderState = (key: AgentId): PlaceholderState =>
    run.activeId === key && run.phase === "running"
      ? "running"
      : run.phase === "awaiting" && !PHASE_ONE_AGENT_IDS.includes(key)
        ? "blocked"
        : "queued";

  const calculateButton = (
    <Button
      onClick={() => {
        if (preset) {
          const estimate = buildSessionEstimate(preset, process, flow.material);
          if (estimate) addNewEstimate(estimate);
        }
        setFlow({ scenarioId: "base" });
        router.push("/estimate");
      }}
      disabled={!confirmed}
      title={confirmed ? undefined : "Confirm the process first: the estimate is priced against it"}
    >
      <Calculator {...ICON} aria-hidden /> Calculate Estimate
    </Button>
  );

  const agentState = (key: AgentId): AgentTabState =>
    run.doneIds.has(key) ? "done" : run.activeId === key && run.phase !== "idle" ? "running" : "queued";

  const baseTabs: EstimateTab[] = [
    { key: "part", label: "Part", badge: complexity ? String(complexity.index) : undefined },
    { key: "process", label: "Process", badge: inference ? `${inference.confidence}%` : undefined },
    { key: "inputs", label: "Inputs", disabled: !confirmed },
    { key: "tooling", label: "Tooling", disabled: !confirmed },
    ...(FEATURE_FLAGS.thermal
      ? [
          {
            key: "thermal" as const,
            label: "Thermal",
            disabled: !confirmed,
            badge: thermal ? (outOfBand ? `▲ ${outOfBand}` : "●") : undefined,
            alert: outOfBand > 0,
          },
        ]
      : []),
    {
      key: "confidence",
      label: "Confidence",
      disabled: !confirmed,
      badge: confidence ? `${confidence.estimateClass + classPenalty}` : undefined,
      alert: classPenalty > 0,
    },
    { key: "share", label: "Share", disabled: !confirmed },
  ];
  const tabs = baseTabs.map((tab) => ({ ...tab, agent: agentState(tab.key) }));
  const activeTab: AgentId = baseTabs.find((tab) => tab.key === flow.tab && !tab.disabled)
    ? (flow.tab as AgentId)
    : "part";

  const scrollIntoView = (ref: RefObject<HTMLElement | null>) =>
    requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  const pager = (hint = LOCKED_HINT) => (
    <EstimateTabPager tabs={tabs} active={activeTab} onSelect={openTab} lockedHint={hint} />
  );

  const stepFile = preset ? STEP_FILES[preset] : null;

  return (
    <>
      <PageHeader
        title="New Estimate"
        subtitle="Upload a STEP file and we'll tell you what it looks like, or enter the part by hand"
        mark={<Mark id={ROUTE_MARK["/new-estimate"]} size={44} />}
        actions={manual ? calculateButton : undefined}
      />
      <PageBody>
        <div ref={rootRef} className="flex flex-col gap-4">
          {preset && stepFile ? (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-muted bg-container px-4 py-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-info-stroke bg-info-surface">
                  {flow.source ? (
                    <History {...ICON} aria-hidden className="text-info" />
                  ) : (
                    <FileUp {...ICON} aria-hidden className="text-info" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  {flow.source ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-label-md text-primary">{flow.source.name}</span>
                      <span className="text-body-md text-tertiary tabular">
                        {flow.source.number} · Rev {flow.source.revision}
                      </span>
                      <Badge tone="neutral" variant="outline" icon={History} size="sm">
                        <span className="tabular">
                          From history · {formatDate(flow.source.date)} · {flow.source.engineer}
                        </span>
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="min-w-0 truncate text-label-md text-primary tabular">{stepFile.fileName}</span>
                      <Badge tone="neutral" variant="outline" icon={false} size="sm">
                        <span className="tabular">{stepFile.fileSize}</span>
                      </Badge>
                    </div>
                  )}
                  <p className="mt-0.5 truncate text-body-sm text-quaternary">
                    {PROCESS_NAMES[process]} · {grade}
                  </p>
                </div>
                <TextAction onClick={() => setFlow({ preset: null, confirmed: false, comparing: false, source: null })}>
                  Change part
                </TextAction>
              </div>
              {flow.source ? (
                <p className="text-body-md leading-relaxed text-quaternary">
                  Opened from history. Geometry below is the representative solid for a{" "}
                  {PROCESS_NAMES[process]?.toLowerCase()} part: the figures and tooling are this part&apos;s.
                </p>
              ) : null}
            </>
          ) : null}

          <div className={cx("grid gap-4 lg:grid-cols-3", preset && "hidden")}>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                loadFile(event.dataTransfer.files?.[0]?.name);
              }}
              className={cx(
                "group/drop relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-5 py-10 text-center transition-colors duration-[180ms] sm:px-8 sm:py-14 lg:col-span-2",
                dragging ? "border-active bg-raised-2" : "border-default bg-container hover:bg-raised",
              )}
            >
              <Mark
                id="mark-empty-upload"
                size={112}
                className={cx(
                  "transition-transform duration-[180ms]",
                  dragging ? "-translate-y-1.5 scale-105" : "group-hover/drop:-translate-y-1",
                )}
              />
              <p className="mt-3 text-heading-sm text-primary">Drop a STEP file here: .step or .stp</p>
              <p className="mt-1.5 max-w-[52ch] text-body-md text-tertiary">
                Seven agents read the model, decide the process and cost it. You watch them do it.
              </p>
              <div className="mt-5">
                <Button onClick={() => fileRef.current?.click()}>
                  <FileUp {...ICON} aria-hidden /> Browse files
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".step,.stp"
                  className="hidden"
                  onChange={(event) => loadFile(event.target.files?.[0]?.name)}
                />
              </div>
              <div className="mt-8 flex w-full flex-col items-center gap-2 border-t border-muted pt-5">
                <span className="text-body-sm text-quaternary">No STEP file handy? Download a sample:</span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {Object.values(SAMPLE_STEP_FILES).map((sample) => (
                    <a
                      key={sample.file}
                      href={`${MODELS_BASE}/${sample.file}`}
                      download
                      title={`${sample.label}: ${sample.file}`}
                      className={buttonClass({ variant: "secondary", size: "sm", className: "tabular" })}
                    >
                      <Download size={13} strokeWidth={1.75} aria-hidden /> {sample.partNumber}.step
                    </a>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col rounded-xl border border-muted bg-container">
              <div className="flex h-11 items-center border-b border-muted px-4">
                <span className={CAPS}>Or start from a sample part</span>
              </div>
              <div className="flex flex-col gap-2 p-3">
                {SAMPLE_PARTS.map((sample) => (
                  <button
                    key={sample.key}
                    type="button"
                    onClick={() => loadFile(sample.key)}
                    className={cx(
                      "group/sample flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors duration-[150ms] outline-none focus-visible:ring-2 focus-visible:ring-active",
                      preset === sample.key
                        ? "border-active bg-raised-2"
                        : "border-muted bg-container hover:border-default hover:bg-raised",
                    )}
                  >
                    <Mark id={PROCESS_KEY_MARK[PRESETS[sample.key].detected]} size={30} framed />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label-md text-primary">{sample.label}</span>
                      <span className="mt-0.5 block truncate text-body-sm text-quaternary tabular">{sample.sub}</span>
                    </span>
                    <Badge tone="neutral" variant="outline" icon="●" size="sm" className="hidden sm:inline-flex">
                      {PROCESS_SHORT[PRESETS[sample.key].detected]}
                    </Badge>
                    <ArrowRight
                      size={16}
                      strokeWidth={1.75}
                      aria-hidden
                      className="shrink-0 icon-quaternary transition-transform duration-[150ms] group-hover/sample:translate-x-0.5"
                    />
                  </button>
                ))}
              </div>
              <div className="mt-auto border-t border-muted px-4 py-3">
                <TextAction onClick={enterManually} className="text-primary">
                  <Pencil size={12} strokeWidth={1.75} aria-hidden /> Skip upload · enter the part manually →
                </TextAction>
                <p className="mt-1.5 text-body-sm leading-relaxed text-quaternary">
                  Manual entry has no geometry to read, so you choose the process yourself.
                </p>
              </div>
            </div>
          </div>

          {preset && agents.length > 0 ? (
            <AgentRunPanel
              agents={agents}
              run={run}
              confirmed={confirmed}
              onOpenAgent={openTab}
              onConfirmProcess={() => openTab("process")}
            />
          ) : null}

          {preset ? (
            <EstimateTabBar
              tabs={tabs}
              active={activeTab}
              onSelect={openTab}
              lockedHint={LOCKED_HINT}
              action={calculateButton}
            />
          ) : null}

          {preset && !isReady(activeTab) ? (
            <AgentPlaceholder
              agent={agents.find((agent) => agent.id === activeTab)}
              state={placeholderState(activeTab)}
              onRun={run.phase === "idle" ? run.start : undefined}
            />
          ) : null}

          {preset && stepFile && isReady("part") && activeTab === "part" ? (
            <>
              <StepFileCard file={stepFile} />
              {complexity && inference ? <ComplexityPanel complexity={complexity} process={inference.detected} /> : null}
              {pager()}
            </>
          ) : null}

          {inference && isReady("process") && activeTab === "process" ? (
            <>
              <ProcessInferencePanel
                inference={inference}
                selected={process}
                onSelect={(key) => setFlow({ process: key, material: null })}
                comparing={comparing}
                onCompare={() => {
                  const next = !comparing;
                  setFlow({ comparing: next });
                  if (next) scrollIntoView(compareRef);
                }}
                onConfirm={() => {
                  setFlow({ confirmed: true });
                  openTab("inputs");
                }}
              />
              {comparing ? (
                <div ref={compareRef}>
                  <ProcessComparison
                    inference={inference}
                    selected={process}
                    onSelect={(key: ProcessKey) => {
                      setFlow({ process: key, material: null, confirmed: true });
                      openTab("inputs");
                    }}
                  />
                </div>
              ) : null}
              {pager()}
            </>
          ) : null}

          {confirmed && isReady("inputs") && (manual || activeTab === "inputs") ? (
            <InputsForm
              manual={manual}
              process={process}
              inference={inference}
              option={option}
              grade={grade}
              grades={grades}
              tool={tool}
              onSelectProcess={(key) => setFlow({ process: key, material: null })}
              onSelectMaterial={(material) => setFlow({ material })}
              onChangeProcess={() => {
                setFlow({ comparing: true });
                openTab("process");
              }}
              onOpenTab={openTab}
              isUnknown={isUnknown}
              toggleUnknown={toggleUnknown}
            />
          ) : null}

          {inference && tool && confirmed && isReady("tooling") && activeTab === "tooling" ? (
            <>
              <TabHeading
                title="Mould & Tooling"
                mark={<Mark id={TOOL_MARK[tool.kind]} size={40} />}
                sub={`${tool.toolType} for ${inference.partName} · ${PROCESS_NAMES[process]}`} />
              <ToolingDetail
                tool={tool}
                inference={inference}
                onProcessChange={(key) => setFlow({ process: key, material: null })}
              />
              {pager()}
            </>
          ) : null}

          {FEATURE_FLAGS.thermal && confirmed && thermal && isReady("thermal") && activeTab === "thermal" ? (
            <>
              <TabHeading title="Process conditions" sub={`Thermal limits for ${thermal.material} · ${PROCESS_NAMES[process]}`} />
              <ThermalPanel profile={thermal} />
              {pager()}
            </>
          ) : null}

          {confirmed && confidence && isReady("confidence") && activeTab === "confidence" ? (
            <>
              <TabHeading
                title="Estimate confidence"
                mark={<Mark id="mark-confidence-band" size={40} />}
                sub="How much of this estimate is read, assumed, or not known at all"
              />
              <ConfidencePanel
                profile={confidence}
                price={option?.price ?? BASE_DESIGN.price}
                extraUnknowns={extraUnknowns}
              />
              {pager()}
            </>
          ) : null}

          {confirmed && confidence && complexity && inference && tool && stepFile && isReady("share") && activeTab === "share" ? (
            <>
              <SupplierPackPanel
                variant={inference.presetKey}
                bbox={bbox}
                pack={{
                  inference,
                  process,
                  cad: stepFile,
                  complexity,
                  confidence,
                  tool,
                  thermal: FEATURE_FLAGS.thermal ? thermal : undefined,
                  lines: BASE_DESIGN.lines,
                  grade,
                }}
              />
              {pager("")}
            </>
          ) : null}
        </div>
      </PageBody>
    </>
  );
}

