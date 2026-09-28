"use client";

/**
 * Viewer chrome shared by the 3D viewers: toolbar pills, captions, the dark
 * stage box, the loading overlay, fullscreen, downloads and the placeholders
 * the lazy wrappers show before three.js arrives. No runtime three.js import
 * lives here (type-only imports are erased), so pages can render all of this
 * without pulling the 3D engine into their first bundle.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import {
  Box,
  ChevronDown,
  Download,
  Maximize2,
  Minimize2,
  RotateCcw,
  Scan,
  Scissors,
  Spline,
} from "lucide-react";
import type { Mesh, MeshStandardMaterial, Object3D } from "three";
import { cx } from "@/lib/format";
import type { PartVariant } from "@/lib/models/part-geometry";
import {
  downloadLinks,
  loadManifest,
  manifestDimensions,
  PART_DIMENSIONS,
  PART_FINISH,
  type Dimensions,
  type PartManifestEntry,
} from "@/lib/models/part-meta";
import { MOULD_COLORS, MOULD_DEFAULT_OPEN, MOULD_MATERIAL_LABELS, type MouldKind } from "@/lib/models/mould-meta";
import type { ViewPreset } from "./three-stage";

/** Imperative handle shared by the viewers. */
export interface ViewerHandle {
  fit: () => void;
  setWireframe: (on: boolean) => void;
}

/** Toggle every mesh in a subtree between solid and wireframe. */
export function setWireframe(root: Object3D, on: boolean) {
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      (material as MeshStandardMaterial).wireframe = on;
    });
  });
}

/** Small pill used under every 3D viewport. */
export const viewerButtonClass = (pressed = false) =>
  cx(
    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-label-sm whitespace-nowrap transition-colors duration-[150ms] outline-none focus-visible:ring-2 focus-visible:ring-active",
    pressed
      ? "border-active bg-raised-2 text-primary"
      : "border-muted bg-action text-secondary hover:bg-raised-2 hover:text-primary",
  );

/** Caption text drawn over the dark stage. */
export const stageCaptionClass =
  "pointer-events-none text-caption tracking-[0.08em] text-white/55 uppercase select-none";

export const formatDimensions = (d: Dimensions) =>
  `${Math.round(d.x)} × ${Math.round(d.y)} × ${Math.round(d.z)} mm`;

/* ------------------------------------------------------------------ */
/* Shared chrome                                                       */
/* ------------------------------------------------------------------ */

/** Fullscreen state for a wrapper element. */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const onChange = () => setActive(document.fullscreenElement === ref.current && ref.current != null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [ref]);
  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => undefined);
  }, [ref]);
  return { active, toggle };
}

export const VIEW_LABELS: Record<ViewPreset, string> = { iso: "Iso", front: "Front", top: "Top", right: "Right" };
export const VIEW_TITLES: Record<ViewPreset, string> = {
  iso: "Isometric",
  front: "Front view",
  top: "Top view",
  right: "Right view",
};

/** Iso / Front / Top / Right segmented pill. */
export function ViewPresets({
  value,
  onChange,
}: {
  value: ViewPreset | null;
  onChange: (view: ViewPreset) => void;
}) {
  return (
    <div role="group" aria-label="View" className="inline-flex h-7 shrink-0 rounded-full border border-muted bg-action p-0.5">
      {(Object.keys(VIEW_LABELS) as ViewPreset[]).map((view) => (
        <button
          key={view}
          type="button"
          onClick={() => onChange(view)}
          aria-pressed={value === view}
          className={cx(
            "rounded-full px-2.5 text-label-sm transition-colors duration-[150ms] outline-none focus-visible:ring-2 focus-visible:ring-active",
            value === view ? "bg-container text-primary shadow-sm" : "text-tertiary hover:text-primary",
          )}
        >
          {VIEW_LABELS[view]}
        </button>
      ))}
    </div>
  );
}

/** Pill that opens a small list of file downloads. */
export function DownloadMenu({ variant, entry }: { variant: PartVariant; entry?: PartManifestEntry }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={viewerButtonClass(open)}
      >
        <Download size={14} strokeWidth={1.75} aria-hidden /> Download
        <ChevronDown size={12} strokeWidth={1.75} aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 bottom-full z-30 mb-1.5 w-52 overflow-hidden rounded-md border border-muted bg-container py-1 shadow-lg"
        >
          {downloadLinks(variant, entry).map((link) => (
            <a
              key={link.ext}
              role="menuitem"
              href={link.href}
              download
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 px-3 py-2 text-body-md text-secondary transition-colors duration-[150ms] hover:bg-raised-2 hover:text-primary"
            >
              <span>{link.label}</span>
              <span className="text-caption text-quaternary tabular">{link.ext}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Dark stage box plus overlay slots; `fill` makes it grow (fullscreen). */
export function ViewerStage({
  hostRef,
  height,
  fill,
  children,
}: {
  hostRef?: RefObject<HTMLDivElement | null>;
  height: number;
  fill?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      style={fill ? undefined : { height }}
      className={cx("viewport relative w-full overflow-hidden rounded-lg border border-muted", fill && "min-h-0 flex-1")}
    >
      <div ref={hostRef} className="absolute inset-0" />
      {children}
    </div>
  );
}

/**
 * Loading overlay for the dark stage: a soft pulsing silhouette puck and a
 * thin spinner ring, so the viewport never reads as broken while the GLB
 * streams in. Static under reduced motion.
 */
export function StageLoading({ label = "Loading model" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label ?? "Loading model"}
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 select-none"
    >
      <span className="relative flex size-12 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-white/[0.04] motion-safe:animate-pulse" />
        <span className="absolute inset-1 animate-spin rounded-full border-2 border-white/10 border-t-white/60 [animation-duration:900ms] motion-reduce:animate-none" />
        <Box size={16} strokeWidth={1.5} aria-hidden className="text-white/45" />
      </span>
      {label ? <span className="text-caption tracking-[0.08em] text-white/45 uppercase">{label}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Deferred mounting                                                   */
/* ------------------------------------------------------------------ */

/** Nearest scrolling ancestor, so the look-ahead margin applies to the app's scroll pane. */
function scrollRoot(el: HTMLElement): Element | null {
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") return node;
  }
  return null;
}

function whenIdle(timeout: number) {
  return new Promise<void>((resolve) => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => resolve(), { timeout });
    else setTimeout(resolve, 200);
  });
}

/**
 * Viewers start one at a time: each waits for an idle moment after the one
 * before it, so several 3D stages on a page never set up in a single long task.
 */
let startQueue: Promise<void> = Promise.resolve();

/**
 * `true` once the element is within `margin` px of the visible area and the
 * browser has had an idle moment (or `timeout` ms passed), so heavy viewers
 * start after first paint and never compete with the largest paint. `preload`
 * (the viewer's chunk) is awaited first, so the swap happens in one step.
 */
export function useDeferredMount(
  ref: RefObject<HTMLElement | null>,
  { margin = 200, timeout = 1200, preload }: { margin?: number; timeout?: number; preload?: () => Promise<unknown> } = {},
) {
  const [ready, setReady] = useState(false);
  const preloadRef = useRef(preload);
  useEffect(() => {
    const el = ref.current;
    if (ready || !el) return;
    let cancelled = false;
    const start = () => {
      startQueue = startQueue
        .then(() => whenIdle(timeout))
        .then(() => (cancelled ? undefined : preloadRef.current?.()))
        .then(() => {
          if (!cancelled) setReady(true);
        })
        .catch(() => {
          if (!cancelled) setReady(true);
        });
    };
    if (typeof IntersectionObserver !== "function") {
      start();
      return () => {
        cancelled = true;
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        start();
      },
      { root: scrollRoot(el), rootMargin: `${margin}px 0px` },
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [ref, ready, margin, timeout]);
  return ready;
}

/**
 * The placeholder a lazy viewer shows while its chunk downloads. The wrapper
 * provides it; `next/dynamic`'s `loading` renders `<LazyViewerFallback />`,
 * which sits in the same tree position and reads it, so the swap is seamless.
 */
const FallbackContext = createContext<ReactNode>(null);
export const LazyFallbackProvider = FallbackContext.Provider;
export function LazyViewerFallback() {
  return <>{useContext(FallbackContext)}</>;
}

/** Manifest entry for a variant, shared with the real viewer (one fetch per page). */
function useManifestEntry(variant: PartVariant) {
  const [entry, setEntry] = useState<PartManifestEntry | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    void loadManifest().then((manifest) => {
      if (!cancelled) setEntry(manifest?.[variant]);
    });
    return () => {
      cancelled = true;
    };
  }, [variant]);
  return entry;
}

const noop = () => undefined;

/* ------------------------------------------------------------------ */
/* PartViewer chrome                                                   */
/* ------------------------------------------------------------------ */

export type ShadeMode = "solid" | "wireframe" | "xray";
export type Axis = "x" | "y" | "z";

/** Captions over the PartViewer stage. */
export function PartStageOverlay({
  view,
  section,
  source,
  dims,
  finishLabel,
}: {
  view: ViewPreset | null;
  section: boolean;
  source: "cad" | "procedural" | null;
  dims: Dimensions;
  finishLabel: string | null;
}) {
  return (
    <>
      <span className={cx(stageCaptionClass, "absolute top-2.5 left-3")}>
        {view ? VIEW_TITLES[view] : "Orbit"}
        {section ? " · section" : ""}
      </span>
      {source ? (
        <span className={cx(stageCaptionClass, "absolute top-2.5 right-3 text-white/40")}>
          {source === "cad" ? "CAD · STEP AP214" : "Preview solid"}
        </span>
      ) : null}
      <span className="pointer-events-none absolute bottom-2.5 left-3 flex flex-col gap-0.5 select-none">
        <span className="text-label-sm text-white/80 tabular">{formatDimensions(dims)}</span>
        {finishLabel ? <span className="text-caption text-white/45">{finishLabel}</span> : null}
      </span>
    </>
  );
}

/** Views, display toggles, section controls, reset, fullscreen and downloads. */
export function PartViewerToolbar({
  variant,
  entry,
  compact,
  downloads,
  view,
  onView,
  edges,
  onEdges,
  mode,
  onMode,
  section,
  onSection,
  sectionAxis,
  onSectionAxis,
  sectionAt,
  onSectionAt,
  onReset,
  fullscreen,
  onFullscreen,
  inert,
}: {
  variant: PartVariant;
  entry?: PartManifestEntry;
  compact: boolean;
  downloads: boolean;
  view: ViewPreset | null;
  onView: (view: ViewPreset) => void;
  edges: boolean;
  onEdges: () => void;
  mode: ShadeMode;
  onMode: (mode: "wireframe" | "xray") => void;
  section: boolean;
  onSection: () => void;
  sectionAxis: Axis;
  onSectionAxis: (axis: Axis) => void;
  sectionAt: number;
  onSectionAt: (at: number) => void;
  onReset: () => void;
  fullscreen: boolean;
  onFullscreen: () => void;
  /** Placeholder copy: rendered, not interactive. */
  inert?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2" inert={inert}>
      <div className="flex flex-wrap items-center gap-2">
        <ViewPresets value={view} onChange={onView} />
        {!compact ? (
          <>
            <button
              type="button"
              onClick={onEdges}
              aria-pressed={edges}
              className={viewerButtonClass(edges)}
              title="CAD edge lines"
            >
              <Spline size={14} strokeWidth={1.75} aria-hidden /> Edges
            </button>
            <button
              type="button"
              onClick={() => onMode("wireframe")}
              aria-pressed={mode === "wireframe"}
              className={viewerButtonClass(mode === "wireframe")}
            >
              <Box size={14} strokeWidth={1.75} aria-hidden /> Wireframe
            </button>
            <button
              type="button"
              onClick={() => onMode("xray")}
              aria-pressed={mode === "xray"}
              className={viewerButtonClass(mode === "xray")}
            >
              <Scan size={14} strokeWidth={1.75} aria-hidden /> X-ray
            </button>
            <button
              type="button"
              onClick={onSection}
              aria-pressed={section}
              className={viewerButtonClass(section)}
            >
              <Scissors size={14} strokeWidth={1.75} aria-hidden /> Section
            </button>
          </>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className={viewerButtonClass()}
            title="Reset view"
            aria-label="Reset view"
          >
            <RotateCcw size={14} strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onFullscreen}
            className={viewerButtonClass(fullscreen)}
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? (
              <Minimize2 size={14} strokeWidth={1.75} aria-hidden />
            ) : (
              <Maximize2 size={14} strokeWidth={1.75} aria-hidden />
            )}
          </button>
          {downloads && !compact ? <DownloadMenu variant={variant} entry={entry} /> : null}
        </div>
      </div>
      {section && !compact ? (
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-caption tracking-[0.08em] text-quaternary uppercase">Section</span>
          <div role="group" aria-label="Section axis" className="inline-flex h-7 rounded-full border border-muted bg-action p-0.5">
            {(["x", "y", "z"] as Axis[]).map((axis) => (
              <button
                key={axis}
                type="button"
                onClick={() => onSectionAxis(axis)}
                aria-pressed={sectionAxis === axis}
                className={cx(
                  "rounded-full px-2.5 text-label-sm uppercase transition-colors duration-[150ms] outline-none focus-visible:ring-2 focus-visible:ring-active",
                  sectionAxis === axis ? "bg-container text-primary shadow-sm" : "text-tertiary hover:text-primary",
                )}
              >
                {axis}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={sectionAt}
            onChange={(event) => onSectionAt(Number(event.target.value))}
            aria-label="Section plane position"
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-raised-2 accent-[var(--action-primary-default)]"
          />
          <span className="w-10 shrink-0 text-right text-body-sm text-tertiary tabular">{sectionAt}%</span>
        </div>
      ) : null}
    </div>
  );
}

export interface PartViewerProps {
  variant?: PartVariant;
  height?: number;
  /** Show the toolbar (legacy name; `showToolbar` overrides). */
  controls?: boolean;
  className?: string;
  showToolbar?: boolean;
  autoRotate?: boolean;
  /** Include the Download menu in the toolbar. */
  downloads?: boolean;
  /** Short toolbar: views, fit and fullscreen only. */
  compact?: boolean;
}

/** Same box as the loading PartViewer (stage, captions, toolbar), with no three.js. */
export function PartViewerPlaceholder({
  variant = "bearing",
  height = 320,
  controls = true,
  className,
  showToolbar,
  downloads = true,
  compact = false,
  ref,
}: PartViewerProps & { ref?: Ref<HTMLDivElement> }) {
  const toolbar = showToolbar ?? controls;
  const entry = useManifestEntry(variant);
  const small = height < 200;
  const dims = manifestDimensions(entry) ?? PART_DIMENSIONS[variant];
  return (
    <div ref={ref} className={cx("flex flex-col gap-2", className)}>
      <ViewerStage height={height}>
        {!small ? (
          <PartStageOverlay
            view="iso"
            section={false}
            source={null}
            dims={dims}
            finishLabel={toolbar && !compact ? PART_FINISH[variant].label : null}
          />
        ) : null}
        <StageLoading label={small ? undefined : "Loading CAD model"} />
      </ViewerStage>
      {toolbar ? (
        <PartViewerToolbar
          inert
          variant={variant}
          entry={entry}
          compact={compact}
          downloads={downloads}
          view="iso"
          onView={noop}
          edges
          onEdges={noop}
          mode="solid"
          onMode={noop}
          section={false}
          onSection={noop}
          sectionAxis="x"
          onSectionAxis={noop}
          sectionAt={50}
          onSectionAt={noop}
          onReset={noop}
          fullscreen={false}
          onFullscreen={noop}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MouldViewer chrome                                                  */
/* ------------------------------------------------------------------ */

/** Warm bronze so the part reads against the grey tool. */
export const PART_IN_TOOL_COLOR = 0xc9a66b;

const hex = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

/** Caption and material legend over the MouldViewer stage. */
export function MouldStageOverlay({ kind }: { kind: MouldKind }) {
  return (
    <>
      <span className={cx(stageCaptionClass, "absolute top-2.5 left-3")}>
        {kind === "progressive" ? "Die set · strip direction →" : "Tool · parting plane"}
      </span>
      <div className="pointer-events-none absolute bottom-2.5 left-3 flex items-center gap-3 text-caption text-white/65 select-none">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2 w-2 rounded-[2px] ring-1 ring-white/20"
            style={{ background: hex(MOULD_COLORS[kind]) }}
          />
          {MOULD_MATERIAL_LABELS[kind]}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full bg-white/85 ring-1 ring-white/20" />
          Guides
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2 w-2 rounded-[2px] ring-1 ring-white/20"
            style={{ background: hex(PART_IN_TOOL_COLOR) }}
          />
          Part
        </span>
      </div>
    </>
  );
}

/** Open / close slider, fit, wireframe and fullscreen. */
export function MouldViewerToolbar({
  open,
  onOpen,
  onFit,
  wireframe,
  onWireframe,
  fullscreen,
  onFullscreen,
  inert,
}: {
  open: number;
  onOpen: (open: number) => void;
  onFit: () => void;
  wireframe: boolean;
  onWireframe: () => void;
  fullscreen: boolean;
  onFullscreen: () => void;
  inert?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3" inert={inert}>
      <label className="flex min-w-[180px] flex-1 items-center gap-3">
        <span className="shrink-0 text-caption tracking-[0.08em] text-quaternary uppercase">Tool</span>
        <input
          type="range"
          min={0}
          max={100}
          value={open}
          onChange={(event) => onOpen(Number(event.target.value))}
          aria-label="Open or close the tool"
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-raised-2 accent-[var(--action-primary-default)]"
        />
        <span className="w-12 shrink-0 text-right text-body-sm text-tertiary tabular">
          {open === 0 ? "closed" : open === 100 ? "open" : `${open}%`}
        </span>
      </label>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onFit} className={viewerButtonClass()}>
          <RotateCcw size={14} strokeWidth={1.75} aria-hidden /> Fit
        </button>
        <button
          type="button"
          onClick={onWireframe}
          aria-pressed={wireframe}
          className={viewerButtonClass(wireframe)}
        >
          <Box size={14} strokeWidth={1.75} aria-hidden /> Wireframe
        </button>
        <button
          type="button"
          onClick={onFullscreen}
          className={viewerButtonClass(fullscreen)}
          aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {fullscreen ? (
            <Minimize2 size={14} strokeWidth={1.75} aria-hidden />
          ) : (
            <Maximize2 size={14} strokeWidth={1.75} aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

export interface MouldViewerProps {
  variant: PartVariant;
  kind: MouldKind;
  height?: number;
  className?: string;
  autoRotate?: boolean;
}

/** Same box as the MouldViewer (stage, legend, controls), with no three.js. */
export function MouldViewerPlaceholder({
  kind,
  height = 340,
  className,
  ref,
}: MouldViewerProps & { ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className={cx("flex flex-col gap-3", className)}>
      <ViewerStage height={height}>
        <MouldStageOverlay kind={kind} />
        <StageLoading label="Loading tool" />
      </ViewerStage>
      <MouldViewerToolbar
        inert
        open={MOULD_DEFAULT_OPEN}
        onOpen={noop}
        onFit={noop}
        wireframe={false}
        onWireframe={noop}
        fullscreen={false}
        onFullscreen={noop}
      />
    </div>
  );
}
