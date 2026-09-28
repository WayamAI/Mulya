"use client";

import { useState, type ReactNode } from "react";
import { CircleHelp, CircleSlash, Undo2, Wrench } from "lucide-react";
import { Button } from "@/components/mulya/controls";
import { Section } from "@/components/mulya/page";
import { Badge, ProvenanceBadge, type ProvenanceState } from "@/components/ui/badge";
import { TextAction } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { Dropdown, toOptions } from "@/components/ui/dropdown";
import { Field as UiField, Input } from "@/components/ui/field";
import { useApp } from "@/lib/app-context";
import type { AgentId } from "@/lib/costing/agents";
import type { ProgrammeFieldKey } from "@/lib/costing/estimate-subject";
import {
  PROCESS_NAMES,
  PROCESS_SHORT,
  type ProcessInference,
  type ProcessKey,
  type ProcessOption,
} from "@/lib/costing/process-detection";
import { REGION_FACTORS, type MaterialRate } from "@/lib/costing/rates";
import type { ToolSpec } from "@/lib/costing/tooling";
import { cx, formatMoney } from "@/lib/format";
import { MaterialGradePanel, gradeOptions } from "./material-grade";
import { CAPS, ICON, ICON_SM, INSET, LINK } from "./ui";

const MANUAL_PROCESSES: { key: ProcessKey; title: string; sub: string }[] = [
  { key: "stamping", title: "Stamped Sheet Metal", sub: "Progressive or transfer die" },
  { key: "sand", title: "Sand Casting", sub: "Green sand, pattern tooling" },
  { key: "die", title: "High-Pressure Die Casting", sub: "Cold chamber, steel die" },
];

/** Labelled form field with its provenance and an optional “Mark unknown” toggle. */
function Field({
  label,
  hint,
  children,
  provenance,
  unknown,
  onToggleUnknown,
  className,
}: {
  className?: string;
  label: string;
  hint?: string;
  children: ReactNode;
  /** Where the value comes from (read from CAD / assumed default); unknown overrides it. */
  provenance?: Exclude<ProvenanceState, "unknown">;
  unknown?: boolean;
  onToggleUnknown?: () => void;
}) {
  const state: ProvenanceState | undefined = unknown ? "unknown" : provenance;
  return (
    <UiField
      className={className}
      label={label}
      aside={state ? <ProvenanceBadge state={state} size="sm" variant={state === "unknown" ? "soft" : "dot"} /> : undefined}
    >
      {(id) => (
        <>
          {unknown ? (
            <div
              id={id}
              className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-dashed border-default bg-raised px-3"
            >
              <CircleSlash size={14} strokeWidth={1.75} aria-hidden className="shrink-0 icon-tertiary" />
              <span className="truncate text-body-md text-tertiary">Not known · carried as contingency</span>
            </div>
          ) : (
            children
          )}
          {(hint && !unknown) || onToggleUnknown ? (
            <div className="flex items-start justify-between gap-3">
              {hint && !unknown ? <span className="text-body-sm text-quaternary">{hint}</span> : <span />}
              {onToggleUnknown ? (
                <TextAction
                  onClick={onToggleUnknown}
                  aria-pressed={unknown}
                  className={cx("shrink-0 text-caption", unknown ? "text-secondary" : "text-quaternary")}
                >
                  {unknown ? (
                    <>
                      <Undo2 size={12} strokeWidth={1.75} aria-hidden /> Unknown · undo
                    </>
                  ) : (
                    <>
                      <CircleHelp size={12} strokeWidth={1.75} aria-hidden /> Mark unknown
                    </>
                  )}
                </TextAction>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </UiField>
  );
}

/** Numeric field that remembers its starting value and shows the edited state. */
function TextInput({ defaultValue, placeholder }: { defaultValue: string; placeholder?: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <Input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder={placeholder}
      inputMode="decimal"
      numeric
      edited={value !== defaultValue}
      className="w-full"
    />
  );
}

/** A select the page does not act on; it only remembers the choice. */
function LocalSelect({ label, initial, options }: { label: string; initial: string; options: readonly string[] }) {
  const [value, setValue] = useState(initial);
  return (
    <Dropdown
      aria-label={label}
      value={value}
      onChange={setValue}
      options={toOptions(options)}
      edited={value !== initial}
    />
  );
}

/** Section heading used above the Tooling / Thermal / Confidence tabs. */
export function TabHeading({ title, sub, mark }: { title: string; sub: string; mark?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
      <div className="flex min-w-0 items-center gap-2.5">
        {mark}
        <h2 className="font-display text-display-xl text-primary">{title}</h2>
      </div>
      <p className="pb-0.5 text-body-md text-tertiary tabular">{sub}</p>
    </div>
  );
}

/** The Cost agent's input form: process (manual entry), grade, geometry, tooling, quality and commercial fields. */
export function InputsForm({
  manual,
  process,
  inference,
  option,
  grade,
  grades,
  tool,
  onSelectProcess,
  onSelectMaterial,
  onChangeProcess,
  onOpenTab,
  isUnknown,
  toggleUnknown,
}: {
  manual: boolean;
  process: string;
  inference: ProcessInference | null;
  option: ProcessOption | undefined;
  grade: string;
  grades: MaterialRate[];
  tool: ToolSpec | undefined;
  onSelectProcess: (process: ProcessKey) => void;
  onSelectMaterial: (grade: string) => void;
  onChangeProcess: () => void;
  onOpenTab: (tab: AgentId) => void;
  isUnknown: (key: ProgrammeFieldKey) => boolean;
  toggleUnknown: (key: ProgrammeFieldKey) => void;
}) {
  const { currency } = useApp();
  const short = PROCESS_SHORT[process] ?? "";
  // Geometry comes off the CAD model; with manual entry there is no model to read.
  const readFrom = manual ? "assumed" : "read";

  return (
    <Section
      title={manual ? "Enter the part" : "Confirm manufacturing intent: these cannot be read from geometry"}
      action={
        manual ? undefined : (
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="info" icon="●" size="sm">
              {PROCESS_NAMES[process]}
            </Badge>
            <TextAction onClick={onChangeProcess}>Change process</TextAction>
          </span>
        )
      }
    >
      <div className="space-y-8">
        {manual ? (
          <div>
            <span className={CAPS}>Process</span>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {MANUAL_PROCESSES.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => onSelectProcess(entry.key)}
                  aria-pressed={process === entry.key}
                  className={cx(
                    "rounded-lg border p-4 text-left transition-colors duration-[150ms]",
                    process === entry.key
                      ? "border-active bg-raised-2"
                      : "border-muted bg-container hover:border-default hover:bg-raised",
                  )}
                >
                  <div className="text-label-md text-primary">{entry.title}</div>
                  <div className="mt-1 text-body-sm text-tertiary">{entry.sub}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {option?.basis ? (
          <MaterialGradePanel option={option} process={process} selected={grade} onSelect={onSelectMaterial} />
        ) : (
          <div>
            <span className={CAPS}>Material grade</span>
            <div className="mt-2 grid gap-4 md:grid-cols-3">
              <Dropdown
                aria-label="Grade"
                value={grade}
                onChange={onSelectMaterial}
                options={gradeOptions(grades, currency)}
                menuMinWidth={260}
              />
              <div className="text-body-sm text-quaternary md:col-span-2 md:self-center">
                {grades.length} grades available for {short.toLowerCase()} · rates from Rate Master 14 Jul 2026
              </div>
            </div>
          </div>
        )}

        <div>
          <span className={CAPS}>Geometry · {short}</span>
          <div className="mt-2 grid gap-4 md:grid-cols-3">
            {process === "stamping" ? (
              <>
                <Field provenance={readFrom} label="Blank length (mm)">
                  <TextInput defaultValue="186.0" />
                </Field>
                <Field provenance={readFrom} label="Blank width (mm)">
                  <TextInput defaultValue="92.0" />
                </Field>
                <Field provenance={readFrom} label="Sheet thickness (mm)">
                  <TextInput defaultValue="2.5" />
                </Field>
                <Field provenance={readFrom} label="Blank perimeter (mm)" hint="Outer profile only">
                  <TextInput defaultValue="556.0" />
                </Field>
                <Field provenance={readFrom} label="Cut length (mm)" hint="Outer profile + internal features">
                  <TextInput defaultValue="862.0" />
                </Field>
                <Field provenance={readFrom} label="Bend count">
                  <TextInput defaultValue="4" />
                </Field>
                <Field provenance={readFrom} label="Pierce count">
                  <TextInput defaultValue="8" />
                </Field>
                <Field provenance={readFrom} label="Dart / gusset count" hint="Formed stiffening features">
                  <TextInput defaultValue="2" />
                </Field>
                <Field provenance={readFrom} label="Draw depth (mm)">
                  <TextInput defaultValue="18.0" />
                </Field>
                <Field provenance="assumed" label="Die type">
                  <LocalSelect label="Die type" initial="Progressive" options={["Progressive", "Transfer"]} />
                </Field>
              </>
            ) : null}
            {process === "sand" ? (
              <>
                <Field provenance={readFrom} label="Net weight (kg)">
                  <TextInput defaultValue="12.40" />
                </Field>
                <Field provenance={readFrom} label="Pour weight (kg)">
                  <TextInput defaultValue="15.80" />
                </Field>
                <Field provenance={readFrom} label="Min wall thickness (mm)">
                  <TextInput defaultValue="8.0" />
                </Field>
                <Field provenance={readFrom} label="Surface area (cm²)">
                  <TextInput defaultValue="2948" />
                </Field>
                <Field provenance={readFrom} label="Parting line length (mm)" hint="Drives flash removal">
                  <TextInput defaultValue="742.0" />
                </Field>
                <Field provenance={readFrom} label="Core count">
                  <TextInput defaultValue="2" />
                </Field>
                <Field provenance={readFrom} label="Draft angle (°)">
                  <TextInput defaultValue="2.0" />
                </Field>
              </>
            ) : null}
            {process === "die" ? (
              <>
                <Field provenance={readFrom} label="Shot weight (kg)">
                  <TextInput defaultValue="3.60" />
                </Field>
                <Field provenance={readFrom} label="Projected area (cm²)" hint="Sets required machine tonnage">
                  <TextInput defaultValue="302" />
                </Field>
                <Field provenance={readFrom} label="Wall thickness (mm)">
                  <TextInput defaultValue="3.0" />
                </Field>
                <Field provenance={readFrom} label="Surface area (cm²)">
                  <TextInput defaultValue="1486" />
                </Field>
                <Field provenance={readFrom} label="Parting line length (mm)" hint="Drives trim tooling">
                  <TextInput defaultValue="618.0" />
                </Field>
                <Field provenance={readFrom} label="Slide count">
                  <TextInput defaultValue="2" />
                </Field>
              </>
            ) : null}
          </div>
        </div>

        {tool ? (
          <div>
            <span className={CAPS}>Tooling</span>
            <div className={cx(INSET, "mt-2 flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4")}>
              <div>
                <span className="text-body-sm text-quaternary">Tool required</span>
                <p className="mt-0.5 text-body-md font-medium text-primary">{tool.toolType}</p>
              </div>
              <div>
                <span className="text-body-sm text-quaternary">Build cost</span>
                <p className="mt-0.5 text-body-md text-primary tabular">{formatMoney(tool.cost, currency, 0)}</p>
              </div>
              <div>
                <span className="text-body-sm text-quaternary">Lead time</span>
                <p className="mt-0.5 text-body-md text-primary tabular">{tool.leadWeeks} weeks</p>
              </div>
              <div>
                <span className="text-body-sm text-quaternary">Amortised</span>
                <p className="mt-0.5 text-body-md text-primary tabular">{formatMoney(tool.perPiece, currency)} / pc</p>
              </div>
              <button type="button" onClick={() => onOpenTab("tooling")} className={cx(LINK, "ml-auto")}>
                <Wrench {...ICON_SM} aria-hidden /> Mould &amp; tooling detail →
              </button>
            </div>
          </div>
        ) : null}

        <div>
          <span className={CAPS}>Quality</span>
          <div className="mt-2 grid gap-4 md:grid-cols-3">
            <Field provenance="assumed" label="ISO 2768 class">
              <LocalSelect label="Class" initial="m (medium)" options={["f (fine)", "m (medium)", "c (coarse)"]} />
            </Field>
            <Field provenance="assumed" label="Critical tolerance (± mm)">
              <TextInput defaultValue="0.05" />
            </Field>
            <Field provenance="assumed" label="Surface finish / coating">
              <LocalSelect label="Coating" initial="None" options={["None", "KTL e-coat", "Powder", "Zinc"]} />
            </Field>
            <Field provenance="assumed" label="Heat treatment">
              <LocalSelect
                label="Heat treatment"
                initial="Stress relieve"
                options={["None", "Stress relieve", "T6 ageing", "Normalise"]}
              />
            </Field>
            <Field provenance="assumed" label="Inspection level">
              <LocalSelect
                label="Inspection"
                initial="Sampling AQL 1.0"
                options={["Sampling AQL 2.5", "Sampling AQL 1.0", "100% CMM"]}
              />
            </Field>
          </div>
        </div>

        <div>
          <span className={CAPS}>Commercial</span>
          <div className="mt-2 grid gap-4 md:grid-cols-4">
            <Field provenance="assumed" label="Annual volume (pcs)"
              unknown={isUnknown("annualVolume")}
              onToggleUnknown={() => toggleUnknown("annualVolume")}
            >
              <TextInput defaultValue={String(inference?.annualVolume ?? 2000)} />
            </Field>
            <Field provenance="assumed" label="Production life (years)"
              unknown={isUnknown("productionLife")}
              onToggleUnknown={() => toggleUnknown("productionLife")}
            >
              <TextInput defaultValue="3" />
            </Field>
            <Field provenance="assumed" label="Target cost (EUR)"
              unknown={isUnknown("targetCost")}
              onToggleUnknown={() => toggleUnknown("targetCost")}
            >
              <TextInput defaultValue={inference?.target?.toFixed(2) ?? "42.00"} />
            </Field>
            <Field provenance="assumed" label="Manufacturing region">
              <LocalSelect label="Region" initial="EU" options={REGION_FACTORS.map((factor) => factor.region)} />
            </Field>
            <Field provenance="assumed" className="md:col-span-2" label="Actual / quoted cost (EUR)"
              hint="Optional: a known supplier quote. Drives the estimate-vs-actual comparison and, once your catalogue is connected, model accuracy."
              unknown={isUnknown("actualCost")}
              onToggleUnknown={() => toggleUnknown("actualCost")}
            >
              <TextInput defaultValue="51.40" placeholder="not known" />
            </Field>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <Mark id="mark-unknown-input" size={28} className="mt-0.5" />
            <p className="text-body-sm leading-relaxed text-quaternary">
              Anything you do not know yet, mark unknown rather than guessing. It widens the band on the{" "}
              <button type="button" onClick={() => onOpenTab("confidence")} className={LINK}>
                Confidence tab
              </button>{" "}
              instead of hiding inside a number that looks certain.
            </p>
          </div>
        </div>

        {!manual ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-muted pt-6">
            <Button variant="secondary" onClick={() => onOpenTab("tooling")}>
              <Wrench {...ICON} aria-hidden /> Review tooling
            </Button>
          </div>
        ) : null}
      </div>
    </Section>
  );
}
