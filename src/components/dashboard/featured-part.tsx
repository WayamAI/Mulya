"use client";

import { ArrowRight } from "lucide-react";
import { SAMPLE_VARIANTS, samplePart, useOpenSampleEstimate } from "@/components/models/sample-parts";
import { Section } from "@/components/mulya/page";
import { PartViewer } from "@/components/mulya/part-viewer";
import { Button } from "@/components/ui/button";

/** Dashboard tile: the most recently estimated sample part, live in 3D. */
export function FeaturedPart({ className }: { className?: string }) {
  const openEstimate = useOpenSampleEstimate();
  const variant = [...SAMPLE_VARIANTS].sort((a, b) =>
    (samplePart(b)?.date ?? "").localeCompare(samplePart(a)?.date ?? ""),
  )[0];
  const part = samplePart(variant);

  return (
    <Section
      title="Latest part · 3D"
      className={className}
      bodyClassName="flex flex-col p-3"
      actionHref="/models"
      actionLabel="All 3D models"
    >
      <PartViewer variant={variant} height={264} controls={false} />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1 pt-3">
        <div className="min-w-0">
          <p className="truncate text-label-md text-primary">{part?.name}</p>
          <p className="mt-0.5 truncate text-body-sm text-quaternary tabular">
            {part?.number} · {part?.process} · {part?.material}
          </p>
        </div>
        <Button variant="secondary" size="sm" iconRight={ArrowRight} onClick={() => openEstimate(variant)}>
          Open estimate
        </Button>
      </div>
    </Section>
  );
}
