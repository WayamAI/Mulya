"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Download, Wrench } from "lucide-react";
import { MouldViewer } from "@/components/mulya/mould-viewer";
import { PageBody, PageHeader, Section } from "@/components/mulya/page";
import { PartViewer } from "@/components/mulya/part-viewer";
import { formatDimensions } from "@/components/mulya/viewer-chrome";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink, buttonClass } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { formatNumber } from "@/lib/format";
import { ROUTE_MARK, TOOL_MARK } from "@/lib/marks";
import type { PartVariant } from "@/lib/models/part-geometry";
import {
  downloadLinks,
  loadManifest,
  manifestDimensions,
  PART_DIMENSIONS,
  PART_FINISH,
  type PartManifestEntry,
} from "@/lib/models/part-meta";
import { SAMPLE_VARIANTS, samplePart, sampleTool, useOpenSampleEstimate } from "./sample-parts";

type Manifest = Partial<Record<PartVariant, PartManifestEntry>>;

const captionClass = "text-caption tracking-[0.08em] text-quaternary uppercase";

/** Shared manifest state for the gallery. */
function useManifest() {
  const [manifest, setManifest] = useState<Manifest | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void loadManifest().then((data) => live && setManifest(data));
    return () => {
      live = false;
    };
  }, []);
  return manifest;
}

function PartCard({ variant, entry, loaded }: { variant: PartVariant; entry?: PartManifestEntry; loaded: boolean }) {
  const part = samplePart(variant);
  const openEstimate = useOpenSampleEstimate();
  const dims = manifestDimensions(entry) ?? PART_DIMENSIONS[variant];
  const mass = entry?.massKg ?? part?.weightKg;
  const rows: { label: string; value: string }[] = [
    { label: "Process", value: entry?.process ?? part?.process ?? "n/a" },
    { label: "Material", value: entry?.material ?? part?.material ?? "n/a" },
    { label: "Finish", value: PART_FINISH[variant].label },
    { label: "Envelope", value: formatDimensions(dims) },
    { label: "Mass", value: mass != null ? `${mass.toFixed(2)} kg` : "n/a" },
    { label: "Volume", value: entry?.volumeCm3 != null ? `${formatNumber(Math.round(entry.volumeCm3))} cm³` : "n/a" },
    {
      label: "Mesh",
      value: entry?.triangleCount != null ? `${formatNumber(entry.triangleCount)} triangles` : loaded ? "Preview solid" : "…",
    },
  ];
  const name = entry?.name ?? part?.name ?? variant;
  const number = entry?.partNumber ?? part?.number ?? "";
  const revision = entry?.revision ?? part?.revision;

  return (
    <Section
      title={`${name} · ${number}`}
      bodyClassName="p-0"
      action={
        entry ? (
          <Badge tone="success" icon="✓" size="sm" title="Real B-rep CAD model">
            STEP AP214
          </Badge>
        ) : loaded ? (
          <Badge tone="neutral" variant="outline" icon="○" size="sm">
            Preview solid
          </Badge>
        ) : null
      }
    >
      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 p-3 sm:p-4">
          <PartViewer variant={variant} height={440} />
        </div>
        <aside className="flex flex-col gap-5 border-t border-muted p-4 sm:p-5 xl:border-t-0 xl:border-l">
          <div>
            <h3 className="text-heading-sm font-semibold text-primary">{name}</h3>
            <p className="mt-0.5 text-body-md text-quaternary tabular">
              {number}
              {revision ? ` · Rev ${revision}` : ""}
            </p>
          </div>
          <dl className="divide-y divide-muted border-y border-muted">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline gap-4 py-2.5">
                <dt className="w-20 shrink-0 text-caption tracking-[0.08em] text-quaternary uppercase">{row.label}</dt>
                <dd className="min-w-0 flex-1 text-right text-body-md text-primary tabular">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div>
            <span className={captionClass}>Download</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {downloadLinks(variant, entry).map((link) => (
                // Static files: a plain anchor with the ButtonLink look (a Next Link would try to route).
                <a
                  key={link.ext}
                  href={link.href}
                  download
                  title={link.label}
                  className={buttonClass({ variant: "secondary", size: "sm" })}
                >
                  <Download size={14} strokeWidth={1.75} aria-hidden />
                  {link.ext.slice(1).toUpperCase()}
                </a>
              ))}
            </div>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <Button variant="primary" iconRight={ArrowRight} onClick={() => openEstimate(variant)}>
              Open estimate
            </Button>
            <a href={`#tool-${variant}`} className={buttonClass({ variant: "ghost", size: "md" })}>
              <Wrench size={14} strokeWidth={1.75} aria-hidden /> See its tool
            </a>
          </div>
        </aside>
      </div>
    </Section>
  );
}

/**
 * Hero band: the rendered banner, cover-cropped, with the page intro on a dark
 * gradient. The image is always dark, so the text is white in both themes.
 */
function ModelsHero() {
  return (
    <section className="relative isolate h-40 overflow-hidden rounded-xl border border-muted bg-raised-2 sm:h-[220px]">
      <Image
        src="/brand/mulya-hero.webp"
        alt=""
        fill
        priority
        sizes="(min-width: 1280px) 1200px, 100vw"
        className="-z-10 object-cover object-[70%_50%]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-black/85 via-black/60 to-black/10 sm:bg-linear-to-r sm:from-black/80 sm:via-black/50 sm:to-black/0"
      />
      <div className="flex h-full max-w-[520px] flex-col justify-end gap-1.5 p-4 sm:justify-center sm:p-7">
        <span className="text-caption tracking-[0.12em] text-white/60 uppercase">
          {SAMPLE_VARIANTS.length} parts · {SAMPLE_VARIANTS.length} tools
        </span>
        <p className="font-display text-body-lg leading-snug text-white sm:text-display-xl">
          CAD models of the sample parts and the tools that make them.
        </p>
        <p className="text-body-sm text-white/70 sm:text-body-md">
          Drag to orbit, scroll to zoom, right-drag to pan.
        </p>
      </div>
    </section>
  );
}

/** /models · CAD gallery: the three sample parts and their production tooling. */
export function ModelsView() {
  const manifest = useManifest();

  return (
    <>
      <PageHeader
        title="3D Models"
        mark={<Mark id={ROUTE_MARK["/models"]} size={44} />}
        actions={
          <ButtonLink href="/new-estimate" iconRight={ArrowRight}>
            Estimate a new part
          </ButtonLink>
        }
      />
      <PageBody>
        <div className="flex flex-col gap-4">
          <ModelsHero />
          {SAMPLE_VARIANTS.map((variant) => (
            <PartCard key={variant} variant={variant} entry={manifest?.[variant]} loaded={manifest !== undefined} />
          ))}

          <Section title="Tooling" count={SAMPLE_VARIANTS.length}>
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {SAMPLE_VARIANTS.map((variant) => {
                const tool = sampleTool(variant);
                if (!tool) return null;
                return (
                  <div
                    key={variant}
                    id={`tool-${variant}`}
                    className="min-w-0 scroll-mt-4 rounded-lg border border-muted bg-raised p-3 target:border-active"
                  >
                    <div className="mb-3 flex items-center gap-3 px-1">
                      <Mark id={TOOL_MARK[tool.kind]} size={30} framed />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <h3 className="text-label-md text-primary">{tool.toolType}</h3>
                        <span className="text-body-sm text-quaternary tabular">
                          {tool.partName} · {tool.leadWeeks} wk lead · {formatNumber(tool.life)} {tool.lifeUnit}
                        </span>
                      </div>
                    </div>
                    <MouldViewer variant={variant} kind={tool.kind} height={320} />
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      </PageBody>
    </>
  );
}
