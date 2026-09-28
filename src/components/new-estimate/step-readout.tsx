"use client";

import { useState } from "react";
import { ChevronRight, Download, Sparkles } from "lucide-react";
import { PartViewer } from "@/components/mulya/part-viewer";
import { Mark } from "@/components/ui/mark";
import { SAMPLE_STEP_TEXT, type LabelValue, type StepFile } from "@/lib/costing/agents";
import { cx } from "@/lib/format";
import { MODELS_BASE, SAMPLE_STEP_FILES } from "@/lib/models/part-meta";
import { CAPS, CARD, CARD_BAR, ICON, INFO_CHIP } from "./ui";

/** One labelled group of read-out rows. */
function ReadoutGroup({ title, fromCad, rows }: { title: string; fromCad?: boolean; rows: LabelValue[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 border-b border-muted pb-2">
        <span className={CAPS}>{title}</span>
        {fromCad ? (
          <span className={INFO_CHIP}>
            <Sparkles size={12} strokeWidth={1.75} aria-hidden /> from CAD
          </span>
        ) : null}
      </div>
      <dl className="mt-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline gap-4 py-1.5">
            <dt className="w-32 shrink-0 text-body-md text-tertiary">{row.label}</dt>
            <dd className="min-w-0 flex-1 text-right text-body-md text-primary tabular">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const SECTION_LINE = /^(ISO-10303-21;|HEADER;|DATA;|ENDSEC;|END-ISO-10303-21;)$/;

/** Collapsible, lightly highlighted raw ISO-10303-21 excerpt. */
function RawStepData() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-muted">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-body-md text-tertiary transition-colors duration-[150ms] hover:bg-raised hover:text-primary"
      >
        <ChevronRight
          {...ICON}
          aria-hidden
          className={cx("transition-transform duration-200", open && "rotate-90")}
        />
        View raw STEP data
      </button>
      {open ? (
        <div className="relative">
          <pre className="max-h-[320px] overflow-auto bg-raised-2 px-4 py-4 font-mono text-body-sm leading-relaxed tabular">
            {SAMPLE_STEP_TEXT.split("\n").map((line, index) => {
              if (SECTION_LINE.test(line.trim())) {
                return (
                  <div key={index} className="text-info">
                    {line}
                  </div>
                );
              }
              const entity = line.match(/^(#\d+ =)(.*)$/);
              if (entity) {
                return (
                  <div key={index}>
                    <span className="text-quaternary">{entity[1]}</span>
                    <span className="text-secondary">{entity[2]}</span>
                  </div>
                );
              }
              const keyword = line.match(/^([A-Z_]+)(\(.*)$/);
              return keyword ? (
                <div key={index}>
                  <span className="text-info">{keyword[1]}</span>
                  <span className="text-secondary">{keyword[2]}</span>
                </div>
              ) : (
                <div key={index} className="text-secondary">
                  {line}
                </div>
              );
            })}
          </pre>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-raised-2 to-transparent" />
        </div>
      ) : null}
    </div>
  );
}

/** Geometry agent's panel: the file header, 3D preview and every parameter read. */
export function StepFileCard({ file }: { file: StepFile }) {
  return (
    <section className={CARD}>
      <header className={cx(CARD_BAR, "border-b")}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Mark id="mark-step-file" size={28} />
          <span className="text-body-lg font-medium text-primary tabular">{file.fileName}</span>
          <span className="rounded-full border border-muted bg-container px-2 py-0.5 text-caption text-quaternary tabular">
            {file.fileSize}
          </span>
          <span className={INFO_CHIP}>Geometry extracted</span>
          <span className="ml-auto text-body-sm text-quaternary">
            {file.geometry.length + file.features.length + file.notes.length} parameters read
          </span>
          <a
            href={`${MODELS_BASE}/${SAMPLE_STEP_FILES[file.key].file}`}
            download
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-muted bg-action px-2.5 text-label-sm text-secondary transition-colors duration-[150ms] outline-none hover:bg-raised-2 hover:text-primary focus-visible:ring-2 focus-visible:ring-active"
          >
            <Download size={12} strokeWidth={1.75} aria-hidden /> Download sample STEP
          </a>
        </div>
        <p className="mt-1.5 text-body-sm text-tertiary tabular">{file.meta}</p>
      </header>
      <div className="flex flex-col gap-6 p-4 xl:flex-row">
        <div className="w-full xl:w-[480px] xl:shrink-0">
          <PartViewer variant={file.key} height={340} />
        </div>
        <div className="grid min-w-0 flex-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <ReadoutGroup title="Product" rows={file.product} />
          <ReadoutGroup title="Geometry" fromCad rows={file.geometry} />
          <ReadoutGroup title="Features detected" fromCad rows={file.features} />
          <ReadoutGroup title="Notes in file" fromCad rows={file.notes} />
        </div>
      </div>
      <RawStepData />
    </section>
  );
}
