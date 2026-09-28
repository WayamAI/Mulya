"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { FileText, RotateCcw } from "lucide-react";
import type { MouldKind } from "@/lib/models/mould-meta";
import {
  LazyFallbackProvider,
  LazyViewerFallback,
  MouldViewerPlaceholder,
  useDeferredMount,
  type MouldViewerProps,
} from "./viewer-chrome";

export type { MouldKind, MouldViewerProps };
/** Icons the original chunk re-exported for the estimate pages. */
export { FileText, RotateCcw };

const loadImpl = () => import("./mould-viewer-impl");

const MouldViewerImpl = dynamic(() => loadImpl().then((m) => m.MouldViewer), {
  ssr: false,
  loading: LazyViewerFallback,
});

/**
 * The tool that makes the part: two-plate pattern / die, or a progressive die
 * set. A slider opens and closes it; drag to orbit, scroll to zoom.
 *
 * Renders a same-size placeholder and loads the three.js viewer only once the
 * box is near the screen and the browser is idle.
 */
export function MouldViewer(props: MouldViewerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useDeferredMount(ref, { preload: loadImpl });
  if (!ready) return <MouldViewerPlaceholder {...props} ref={ref} />;
  return (
    <LazyFallbackProvider value={<MouldViewerPlaceholder {...props} />}>
      <MouldViewerImpl {...props} />
    </LazyFallbackProvider>
  );
}
