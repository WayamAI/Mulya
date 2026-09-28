"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackSide,
  LineBasicMaterial,
  LineSegments,
  type Material,
  Mesh,
  MeshStandardMaterial,
  Plane,
  Vector3,
} from "three";
import { cx } from "@/lib/format";
import {
  createBoreFinish,
  createFinishMaterial,
  loadManifest,
  loadPartModel,
  manifestDimensions,
  PART_DIMENSIONS,
  PART_FINISH,
  SECTION_CAP_COLOR,
  type PartManifestEntry,
} from "@/lib/models/part-source";
import { ThreeStage, type ViewPreset } from "./three-stage";
import {
  PartStageOverlay,
  PartViewerToolbar,
  StageLoading,
  useFullscreen,
  ViewerStage,
  type Axis,
  type PartViewerProps,
  type ShadeMode,
} from "./viewer-chrome";

/* The three.js half of the PartViewer. Loaded lazily by `part-viewer.tsx`. */

interface PartScene {
  stage: ThreeStage;
  body: Mesh;
  cap: Mesh;
  edges: LineSegments;
  materials: Material[];
  edgeMaterial: LineBasicMaterial;
  plane: Plane;
}

/**
 * Interactive CAD viewer for a part: real STEP-derived mesh when available,
 * photoreal finish per process, feature edges, view presets, wireframe, X-ray,
 * a section plane, fullscreen and file downloads. Drag to orbit, scroll to
 * zoom, right-drag to pan.
 */
export function PartViewer({
  variant = "bearing",
  height = 320,
  controls = true,
  className,
  showToolbar,
  autoRotate = true,
  downloads = true,
  compact = false,
}: PartViewerProps) {
  const toolbar = showToolbar ?? controls;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PartScene | null>(null);
  const { active: fullscreen, toggle: toggleFullscreen } = useFullscreen(wrapperRef);

  const [view, setView] = useState<ViewPreset | null>("iso");
  const [edges, setEdges] = useState(true);
  const [mode, setMode] = useState<ShadeMode>("solid");
  const [section, setSection] = useState(false);
  const [sectionAxis, setSectionAxis] = useState<Axis>("x");
  const [sectionAt, setSectionAt] = useState(50);
  const [source, setSource] = useState<"cad" | "procedural" | null>(null);
  const [entry, setEntry] = useState<PartManifestEntry | undefined>(undefined);

  // Mirror of the display state, so a freshly loaded model starts in it.
  const displayRef = useRef({ edges, mode, section, sectionAxis, sectionAt });

  const applyDisplay = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;
    const { edges: showEdges, mode: shade, section: cut, sectionAxis: axis, sectionAt: at } = displayRef.current;
    const xray = shade === "xray";
    for (const material of [s.body.material].flat() as MeshStandardMaterial[]) {
      material.wireframe = shade === "wireframe";
      material.transparent = xray;
      material.opacity = xray ? 0.16 : 1;
      material.depthWrite = !xray;
      material.needsUpdate = true;
    }
    s.body.castShadow = !xray && shade !== "wireframe";
    s.edges.visible = showEdges || xray;
    s.edgeMaterial.color.set(xray ? 0xdfe7ec : 0x121517);
    s.edgeMaterial.opacity = xray ? 0.85 : 0.55;

    const box = s.stage.box;
    const normal = new Vector3(axis === "x" ? -1 : 0, axis === "y" ? -1 : 0, axis === "z" ? -1 : 0);
    const min = box.min[axis];
    const max = box.max[axis];
    s.plane.set(normal, min + ((max - min) * at) / 100);
    const planes = cut ? [s.plane] : [];
    for (const material of s.materials) material.clippingPlanes = planes;
    s.cap.visible = cut && !xray && shade !== "wireframe";
    s.stage.invalidate();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const stage = new ThreeStage(host, { autoRotate, triad: toolbar && !compact });
    void loadManifest().then((manifest) => {
      if (!cancelled) setEntry(manifest?.[variant]);
    });
    void loadPartModel(variant).then((model) => {
      if (cancelled) return;
      const finish = createFinishMaterial(variant);
      const bore = createBoreFinish();
      const body = new Mesh(model.geometry, model.slots === 2 ? [finish, bore] : finish);
      body.castShadow = true;
      const capMaterial = new MeshStandardMaterial({
        color: SECTION_CAP_COLOR,
        metalness: 0.2,
        roughness: 0.6,
        side: BackSide,
      });
      const cap = new Mesh(model.geometry, capMaterial);
      cap.visible = false;
      const edgeMaterial = new LineBasicMaterial({ color: 0x121517, transparent: true, opacity: 0.55, toneMapped: false });
      const lines = new LineSegments(model.edges, edgeMaterial);
      const compiled = stage.addCompiled(body, cap, lines);
      stage.fit();
      sceneRef.current = {
        stage,
        body,
        cap,
        edges: lines,
        materials: [finish, bore, capMaterial, edgeMaterial],
        edgeMaterial,
        plane: new Plane(),
      };
      applyDisplay();
      // Drop the loading overlay once the first frame can draw without a shader stall.
      void compiled.then(() => {
        if (!cancelled) setSource(model.source);
      });
    });
    const onStart = () => setView(null);
    stage.controls.addEventListener("start", onStart);
    return () => {
      cancelled = true;
      stage.controls.removeEventListener("start", onStart);
      sceneRef.current = null;
      // Materials made here are not shared; `dispose` walks the scene.
      stage.dispose();
    };
  }, [variant, autoRotate, toolbar, compact, applyDisplay]);

  useEffect(() => {
    displayRef.current = { edges, mode, section, sectionAxis, sectionAt };
    applyDisplay();
  }, [edges, mode, section, sectionAxis, sectionAt, applyDisplay]);

  // Keep framing after the stage is resized into / out of fullscreen.
  useEffect(() => {
    const stage = sceneRef.current?.stage;
    if (stage) requestAnimationFrame(() => stage.fit(stage.content, { view: view ?? undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  const goTo = (next: ViewPreset) => {
    setView(next);
    sceneRef.current?.stage.setView(next);
  };

  const dims = manifestDimensions(entry) ?? PART_DIMENSIONS[variant];
  const small = height < 200 && !fullscreen;

  return (
    <div
      ref={wrapperRef}
      className={cx("flex flex-col gap-2", fullscreen && "h-full bg-container p-4", className)}
    >
      <ViewerStage hostRef={hostRef} height={height} fill={fullscreen}>
        {!small ? (
          <PartStageOverlay
            view={view}
            section={section}
            source={source}
            dims={dims}
            finishLabel={toolbar && !compact ? PART_FINISH[variant].label : null}
          />
        ) : null}
        {source == null ? <StageLoading label={small ? undefined : "Loading CAD model"} /> : null}
      </ViewerStage>

      {toolbar ? (
        <PartViewerToolbar
          variant={variant}
          entry={entry}
          compact={compact}
          downloads={downloads}
          view={view}
          onView={goTo}
          edges={edges}
          onEdges={() => setEdges((v) => !v)}
          mode={mode}
          onMode={(next) => setMode((m) => (m === next ? "solid" : next))}
          section={section}
          onSection={() => setSection((v) => !v)}
          sectionAxis={sectionAxis}
          onSectionAxis={setSectionAxis}
          sectionAt={sectionAt}
          onSectionAt={setSectionAt}
          onReset={() => {
            setView("iso");
            sceneRef.current?.stage.setView("iso", { stopRotate: false });
          }}
          fullscreen={fullscreen}
          onFullscreen={toggleFullscreen}
        />
      ) : null}
    </div>
  );
}
