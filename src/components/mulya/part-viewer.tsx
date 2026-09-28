"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import type { PartVariant } from "@/lib/models/part-geometry";
import {
  LazyFallbackProvider,
  LazyViewerFallback,
  PartViewerPlaceholder,
  useDeferredMount,
  type PartViewerProps,
} from "./viewer-chrome";

export type { PartVariant, PartViewerProps };
// Chrome moved to `viewer-chrome.tsx`; re-exported so existing imports keep working.
export {
  DownloadMenu,
  formatDimensions,
  setWireframe,
  StageLoading,
  stageCaptionClass,
  useFullscreen,
  viewerButtonClass,
  ViewerStage,
  ViewPresets,
  type ViewerHandle,
} from "./viewer-chrome";

const loadImpl = () => import("./part-viewer-impl");

const PartViewerImpl = dynamic(() => loadImpl().then((m) => m.PartViewer), {
  ssr: false,
  loading: LazyViewerFallback,
});

/**
 * Interactive CAD viewer for a part: real STEP-derived mesh when available,
 * photoreal finish per process, feature edges, view presets, wireframe, X-ray,
 * a section plane, fullscreen and file downloads. Drag to orbit, scroll to
 * zoom, right-drag to pan.
 *
 * This wrapper renders a same-size placeholder and loads the three.js viewer
 * only once the box is near the screen and the browser is idle, so the 3D
 * engine stays out of the page's first bundle and first paint.
 */
export function PartViewer(props: PartViewerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useDeferredMount(ref, { preload: loadImpl });
  if (!ready) return <PartViewerPlaceholder {...props} ref={ref} />;
  return (
    <LazyFallbackProvider value={<PartViewerPlaceholder {...props} />}>
      <PartViewerImpl {...props} />
    </LazyFallbackProvider>
  );
}
