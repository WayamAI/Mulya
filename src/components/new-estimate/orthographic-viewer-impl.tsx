"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box3,
  type BufferGeometry,
  DirectionalLight,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  type Material,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  Vector3,
} from "three";
import {
  compileInBackground,
  createEnvironment,
  createRenderer,
  disposeObject,
} from "@/components/mulya/three-stage";
import { createBoreFinish, createFinishMaterial, loadPartModel } from "@/lib/models/part-source";
import { OrthographicFrame, ORTHO_VIEWS as VIEWS, type OrthographicViewerProps } from "./orthographic-chrome";

/* The three.js half of the OrthographicViewer. Loaded lazily by `orthographic-viewer.tsx`. */

/**
 * Four orthographic views (2×2, scissored) of the same CAD model and feature
 * edges the PartViewer uses. "Lines" is a hidden-line technical view; "Shaded"
 * adds the PBR finish with dark edges. Renders on demand only.
 */
export function OrthographicViewer({
  variant,
  bbox,
  height = 300,
  className,
}: OrthographicViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<{ setLines: (on: boolean) => void } | null>(null);
  const [lines, setLines] = useState(true);
  const linesRef = useRef(lines);
  const [loadedVariant, setLoadedVariant] = useState<OrthographicViewerProps["variant"] | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const renderer = createRenderer({ shadows: false });
    renderer.setScissorTest(true);
    host.appendChild(renderer.domElement);
    const scene = new Scene();
    const env = createEnvironment(renderer);
    scene.environment = env;
    scene.environmentIntensity = 0.9;
    scene.add(new HemisphereLight(0xdfe8ef, 0x1b1d1f, 0.4));
    const key = new DirectionalLight(0xffffff, 1.3);
    key.position.set(3, 5, 6);
    scene.add(key);

    const materials: Material[] = [];
    let cameras: OrthographicCamera[] = [];
    let half = 1;
    let frame = 0;
    const render = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = host.clientWidth;
        const fullHeight = host.clientHeight;
        if (!width || !fullHeight || !cameras.length) return;
        renderer.setSize(width, fullHeight, false);
        renderer.setScissorTest(false);
        renderer.clear();
        renderer.setScissorTest(true);
        const cellW = Math.floor(width / 2);
        const cellH = Math.floor(fullHeight / 2);
        cameras.forEach((camera, index) => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          const x = col * cellW;
          const y = fullHeight - (row + 1) * cellH;
          renderer.setViewport(x, y, cellW, cellH);
          renderer.setScissor(x, y, cellW, cellH);
          const aspect = cellW / cellH;
          camera.left = -half * aspect;
          camera.right = half * aspect;
          camera.top = half;
          camera.bottom = -half;
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
        });
      });
    };

    void loadPartModel(variant).then((model) => {
      if (cancelled) return;
      const finish = createFinishMaterial(variant);
      const bore = createBoreFinish();
      const flat = new MeshBasicMaterial({
        color: 0x202427,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
      const body = new Mesh<BufferGeometry, Material | Material[]>(model.geometry, flat);
      const edgeMaterial = new LineBasicMaterial({ color: 0xdfe6ea, toneMapped: false });
      const edges = new LineSegments(model.edges, edgeMaterial);
      scene.add(body, edges);
      materials.push(finish, bore, flat);
      const apply = (on: boolean) => {
        body.material = on ? flat : model.slots === 2 ? [finish, bore] : finish;
        edgeMaterial.color.set(on ? 0xdfe6ea : 0x111416);
        edgeMaterial.transparent = !on;
        edgeMaterial.opacity = on ? 1 : 0.6;
        render();
      };
      handleRef.current = { setLines: apply };

      const box = new Box3().setFromObject(body);
      const size = box.getSize(new Vector3());
      const center = box.getCenter(new Vector3());
      const radius = Math.max(size.x, size.y, size.z);
      half = radius * 0.57;
      cameras = VIEWS.map((view) => {
        const camera = new OrthographicCamera(-half, half, half, -half, radius * 0.05, radius * 20);
        camera.position.set(
          center.x + view.dir[0] * radius * 4,
          center.y + view.dir[1] * radius * 4,
          center.z + view.dir[2] * radius * 4,
        );
        camera.up.set(...view.up);
        camera.lookAt(center);
        return camera;
      });
      // Link the shaders in the background (KHR_parallel_shader_compile) before the first draw.
      void compileInBackground(renderer, scene, cameras[0], () => cancelled)
        .catch(() => undefined)
        .then(() => {
          if (cancelled) return;
          apply(linesRef.current);
          setLoadedVariant(variant);
        });
    });

    const observer = new ResizeObserver(render);
    observer.observe(host);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      disposeObject(scene);
      // Swapped-out materials are not on the scene; dispose is idempotent.
      materials.forEach((material) => material.dispose());
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      handleRef.current = null;
    };
  }, [variant]);

  return (
    <OrthographicFrame
      hostRef={hostRef}
      bbox={bbox}
      height={height}
      className={className}
      lines={lines}
      loading={loadedVariant !== variant}
      onLines={() => {
        const next = !lines;
        setLines(next);
        linesRef.current = next;
        handleRef.current?.setLines(next);
      }}
    />
  );
}
