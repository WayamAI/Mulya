"use client";

/**
 * Three-free chrome for the OrthographicViewer: the 2×2 stage with view labels
 * and extents, and the Lines / Shaded toggle. Shared by the lazy wrapper's
 * placeholder and the real viewer, so both occupy exactly the same box.
 */

import type { Ref, RefObject } from "react";
import { Grid2x2, Ruler } from "lucide-react";
import { StageLoading, viewerButtonClass } from "@/components/mulya/viewer-chrome";
import type { PartVariant } from "@/lib/models/part-geometry";
import { cx } from "@/lib/format";

export interface BoundingBox {
  x: number;
  y: number;
  z: number;
}

export interface OrthographicViewerProps {
  variant: PartVariant;
  bbox: BoundingBox;
  height?: number;
  className?: string;
}

export type OrthoViewKey = "front" | "top" | "left" | "right";

export const ORTHO_VIEWS: {
  key: OrthoViewKey;
  label: string;
  dir: [number, number, number];
  up: [number, number, number];
}[] = [
  { key: "front", label: "Front", dir: [0, 0, 1], up: [0, 1, 0] },
  { key: "top", label: "Top", dir: [0, 1, 0], up: [0, 0, -1] },
  { key: "left", label: "Left", dir: [-1, 0, 0], up: [0, 1, 0] },
  { key: "right", label: "Right", dir: [1, 0, 0], up: [0, 1, 0] },
];

/** Stage, view captions and the Lines / Shaded toggle. */
export function OrthographicFrame({
  hostRef,
  bbox,
  height = 300,
  className,
  lines,
  onLines,
  loading,
  inert,
  ref,
}: {
  hostRef?: RefObject<HTMLDivElement | null>;
  bbox: BoundingBox;
  height?: number;
  className?: string;
  lines: boolean;
  onLines: () => void;
  loading?: boolean;
  inert?: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  const extents: Record<OrthoViewKey, string> = {
    front: `${bbox.x.toFixed(1)} × ${bbox.y.toFixed(1)}`,
    top: `${bbox.x.toFixed(1)} × ${bbox.z.toFixed(1)}`,
    left: `${bbox.z.toFixed(1)} × ${bbox.y.toFixed(1)}`,
    right: `${bbox.z.toFixed(1)} × ${bbox.y.toFixed(1)}`,
  };

  return (
    <div ref={ref} className={cx("flex flex-col gap-3", className)}>
      <div className="viewport relative w-full overflow-hidden rounded-lg border border-muted">
        <div ref={hostRef} style={{ height }} className="w-full" />
        <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-2">
          {ORTHO_VIEWS.map((view) => (
            <div
              key={view.key}
              className="relative border-white/10 [&:nth-child(-n+2)]:border-b [&:nth-child(odd)]:border-r"
            >
              <span className="absolute top-2 left-2.5 text-caption tracking-[0.08em] text-white/55 uppercase">
                {view.label}
              </span>
              <span className="absolute right-2.5 bottom-2 text-caption font-normal text-white/40 tabular">
                {extents[view.key]} mm
              </span>
            </div>
          ))}
        </div>
        {loading ? <StageLoading label="Loading views" /> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-body-sm text-quaternary">
          <Grid2x2 size={14} strokeWidth={1.75} aria-hidden /> First-angle projection · all views to one scale
        </span>
        <button
          type="button"
          onClick={onLines}
          aria-pressed={lines}
          className={cx("ml-auto", viewerButtonClass(lines))}
          inert={inert}
        >
          <Ruler size={14} strokeWidth={1.75} aria-hidden /> {lines ? "Lines" : "Shaded"}
        </button>
      </div>
    </div>
  );
}

const noop = () => undefined;

/** Same box as the OrthographicViewer, with no three.js. */
export function OrthographicPlaceholder({
  bbox,
  height,
  className,
  ref,
}: OrthographicViewerProps & { ref?: Ref<HTMLDivElement> }) {
  return (
    <OrthographicFrame
      ref={ref}
      bbox={bbox}
      height={height}
      className={className}
      lines
      onLines={noop}
      loading
      inert
    />
  );
}
