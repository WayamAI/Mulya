"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { LazyFallbackProvider, LazyViewerFallback, useDeferredMount } from "@/components/mulya/viewer-chrome";
import { OrthographicPlaceholder, type BoundingBox, type OrthographicViewerProps } from "./orthographic-chrome";

export type { BoundingBox, OrthographicViewerProps };

const loadImpl = () => import("./orthographic-viewer-impl");

const OrthographicViewerImpl = dynamic(() => loadImpl().then((m) => m.OrthographicViewer), {
  ssr: false,
  loading: LazyViewerFallback,
});

/**
 * Four orthographic views (2×2, scissored) of the same CAD model and feature
 * edges the PartViewer uses. "Lines" is a hidden-line technical view; "Shaded"
 * adds the PBR finish with dark edges. Renders on demand only.
 *
 * Renders a same-size placeholder and loads the three.js viewer only once the
 * box is near the screen and the browser is idle.
 */
export function OrthographicViewer(props: OrthographicViewerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useDeferredMount(ref, { preload: loadImpl });
  if (!ready) return <OrthographicPlaceholder {...props} ref={ref} />;
  return (
    <LazyFallbackProvider value={<OrthographicPlaceholder {...props} />}>
      <OrthographicViewerImpl {...props} />
    </LazyFallbackProvider>
  );
}
