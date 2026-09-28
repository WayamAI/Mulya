"use client";

import { useEffect, useRef, useState } from "react";
import {
  CanvasTexture,
  type CylinderGeometry,
  type Group,
  type Material,
  type Mesh,
  MeshPhysicalMaterial,
  RepeatWrapping,
} from "three";
import { cx } from "@/lib/format";
import { buildMould, MOULD_DEFAULT_OPEN, openOffset, type MouldKind } from "@/lib/models/mould-geometry";
import { disposeMaterial, ThreeStage } from "./three-stage";
import {
  MouldStageOverlay,
  MouldViewerToolbar,
  PART_IN_TOOL_COLOR,
  setWireframe,
  useFullscreen,
  ViewerStage,
  type MouldViewerProps,
} from "./viewer-chrome";

/* The three.js half of the MouldViewer. Loaded lazily by `mould-viewer.tsx`. */

/** Fine directional streaks: reads as ground / brushed tool steel in the roughness channel. */
function brushedRoughnessMap() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "rgb(118,118,118)";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const v = 70 + Math.random() * 90;
      ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 30 + Math.random() * 140, 1);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/** PBR materials for the tool: body per kind, polished chrome pins, the part. */
function toolMaterials(kind: MouldKind) {
  const roughnessMap = brushedRoughnessMap();
  const body = new MeshPhysicalMaterial(
    kind === "pattern"
      ? // Resin-coated aluminium match plate: satin, mostly dielectric coat.
        { color: 0x5f676c, metalness: 0.25, roughness: 1.4, roughnessMap }
      : // Hardened H13 / D2 tool steel, surface ground.
        { color: 0x4f555a, metalness: 0.85, roughness: 1.15, roughnessMap },
  );
  const chrome = new MeshPhysicalMaterial({ color: 0xf0f3f5, metalness: 1, roughness: 0.06 });
  const part = new MeshPhysicalMaterial({ color: PART_IN_TOOL_COLOR, metalness: 0.75, roughness: 0.38 });
  return { body, chrome, part };
}

/**
 * The tool that makes the part: two-plate pattern / die, or a progressive die
 * set. A slider opens and closes it; drag to orbit, scroll to zoom.
 */
export function MouldViewer({
  variant,
  kind,
  height = 340,
  className,
  autoRotate = true,
}: MouldViewerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<{ stage: ThreeStage; root: Group } | null>(null);
  const targetRef = useRef(MOULD_DEFAULT_OPEN / 100);
  const [wireframe, setWireframeState] = useState(false);
  const [open, setOpen] = useState(MOULD_DEFAULT_OPEN);
  const { active: fullscreen, toggle: toggleFullscreen } = useFullscreen(wrapperRef);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const stage = new ThreeStage(host, { autoRotate, autoRotateSpeed: 0.55, fov: 30, fitPadding: 1.04, environmentIntensity: 0.55 });
    const { root, upper, materials } = buildMould(kind, variant, 1);

    // Swap the flat builder materials for PBR ones.
    const pbr = toolMaterials(kind);
    root.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.material === materials.tool) {
        const cylinder = mesh.geometry.type === "CylinderGeometry" ? (mesh.geometry as CylinderGeometry) : null;
        const pin = cylinder != null && cylinder.parameters.radiusTop <= 0.1;
        mesh.material = pin ? pbr.chrome : pbr.body;
      } else if (mesh.material === materials.part) {
        mesh.material = pbr.part;
      }
    });
    ([materials.tool, materials.part] as Material[]).forEach(disposeMaterial);

    void stage.addCompiled(root);
    // Frame the fully open tool so the camera never has to move while it opens.
    stage.fit(root);
    let current = targetRef.current;
    upper.position.y = openOffset(current);
    stageRef.current = { stage, root };
    const removeHook = stage.addFrameHook((delta) => {
      const diff = targetRef.current - current;
      if (Math.abs(diff) < 0.0005) {
        if (current !== targetRef.current) {
          current = targetRef.current;
          upper.position.y = openOffset(current);
        }
        return false;
      }
      current += diff * (1 - Math.exp(-delta * 9));
      upper.position.y = openOffset(current);
      return true;
    });
    return () => {
      removeHook();
      stageRef.current = null;
      stage.dispose();
    };
  }, [variant, kind, autoRotate]);

  useEffect(() => {
    const s = stageRef.current;
    if (s) requestAnimationFrame(() => s.stage.fit(s.root));
  }, [fullscreen]);

  const changeOpen = (next: number) => {
    setOpen(next);
    targetRef.current = next / 100;
    stageRef.current?.stage.invalidate();
  };

  return (
    <div ref={wrapperRef} className={cx("flex flex-col gap-3", fullscreen && "h-full bg-container p-4", className)}>
      <ViewerStage hostRef={hostRef} height={height} fill={fullscreen}>
        <MouldStageOverlay kind={kind} />
      </ViewerStage>
      <MouldViewerToolbar
        open={open}
        onOpen={changeOpen}
        onFit={() => {
          const s = stageRef.current;
          if (s) s.stage.setView("iso", { stopRotate: false });
        }}
        wireframe={wireframe}
        onWireframe={() => {
          const next = !wireframe;
          setWireframeState(next);
          const s = stageRef.current;
          if (s) {
            setWireframe(s.root, next);
            s.stage.invalidate();
          }
        }}
        fullscreen={fullscreen}
        onFullscreen={toggleFullscreen}
      />
    </div>
  );
}
