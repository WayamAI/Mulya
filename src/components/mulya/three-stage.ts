/**
 * Shared three.js stage for every 3D viewer in the app (PartViewer, MouldViewer,
 * OrthographicViewer): a physically based renderer (ACES filmic, sRGB output),
 * a studio environment map for believable metal, a soft shadow on a transparent
 * ground, orbit controls with damping and a gentle auto-rotate, camera fitting,
 * view presets, an optional axis triad and render-on-demand that pauses when the
 * viewer is off screen. Hex colours live here only: the page chrome uses tokens.
 */

import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  BufferGeometry,
  type Camera,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  type Material,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  OrthographicCamera,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  Sphere,
  Sprite,
  SpriteMaterial,
  type Texture,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/* ------------------------------------------------------------------ */
/* Renderer + environment helpers                                      */
/* ------------------------------------------------------------------ */

/** WebGL renderer configured for PBR: ACES filmic, sRGB output, soft shadows. */
export function createRenderer({ shadows = true }: { shadows?: boolean } = {}) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  renderer.localClippingEnabled = true;
  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
  }
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "none";
  return renderer;
}

/** Pre-filtered studio environment (RoomEnvironment) for reflections. */
export function createEnvironment(renderer: WebGLRenderer): Texture {
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const texture = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  return texture;
}

/**
 * Compile the scene's shaders, then wait until the driver reports them linked.
 * With KHR_parallel_shader_compile the linking happens off the main thread, so
 * the first frame after this does not stall; without it, this resolves at once.
 * Gives up quietly after `timeoutMs` or when `stop()` turns true (disposed).
 */
export function compileInBackground(
  renderer: WebGLRenderer,
  scene: Object3D,
  camera: Camera,
  stop: () => boolean,
  timeoutMs = 4000,
) {
  const pending = renderer.compile(scene, camera) as Set<Material>;
  if (!renderer.extensions.has("KHR_parallel_shader_compile")) return Promise.resolve();
  const started = performance.now();
  return new Promise<void>((resolve) => {
    const check = () => {
      if (stop() || performance.now() - started > timeoutMs) return resolve();
      for (const material of pending) {
        const program = (renderer.properties.get(material) as { currentProgram?: { isReady?: () => boolean } })
          .currentProgram;
        if (!program?.isReady || program.isReady()) pending.delete(material);
      }
      if (pending.size === 0) resolve();
      else setTimeout(check, 16);
    };
    check();
  });
}

/** Dispose every geometry, material and texture under `root` (skips `userData.shared`). */
export function disposeObject(root: Object3D) {
  const materials = new Set<Material>();
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.geometry && !mesh.geometry.userData?.shared) mesh.geometry.dispose();
    const material = mesh.material as Material | Material[] | undefined;
    if (material) (Array.isArray(material) ? material : [material]).forEach((m) => materials.add(m));
  });
  materials.forEach(disposeMaterial);
}

export function disposeMaterial(material: Material) {
  if (material.userData?.shared) return;
  for (const value of Object.values(material)) {
    if (value && typeof value === "object" && (value as Texture).isTexture) (value as Texture).dispose();
  }
  material.dispose();
}

/** Soft radial falloff used for the ground glow. */
function radialTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.55, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Single-letter label sprite for the axis triad. */
function labelSprite(text: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = "600 40px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(text, 32, 34);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const sprite = new Sprite(new SpriteMaterial({ map: texture, toneMapped: false, depthTest: false }));
  sprite.scale.setScalar(0.8);
  return sprite;
}

function buildTriad() {
  const group = new Group();
  const axes: [Vector3, number, string, string][] = [
    [new Vector3(1, 0, 0), 0xe5605c, "#f07d79", "X"],
    [new Vector3(0, 1, 0), 0x5fc27e, "#7ed69a", "Y"],
    [new Vector3(0, 0, 1), 0x5c8fe8, "#82a9f0", "Z"],
  ];
  const positions: number[] = [];
  const colors: number[] = [];
  for (const [dir, hex, css, label] of axes) {
    const color = new Color(hex);
    positions.push(0, 0, 0, dir.x * 0.85, dir.y * 0.85, dir.z * 0.85);
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    const cone = new Mesh(new ConeGeometry(0.09, 0.26, 12), new MeshBasicMaterial({ color: hex, toneMapped: false }));
    cone.position.copy(dir).multiplyScalar(0.92);
    cone.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir);
    group.add(cone);
    const sprite = labelSprite(label, css);
    sprite.position.copy(dir).multiplyScalar(1.32);
    group.add(sprite);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  group.add(new LineSegments(geometry, new LineBasicMaterial({ vertexColors: true, toneMapped: false })));
  return group;
}

/* ------------------------------------------------------------------ */
/* View presets                                                        */
/* ------------------------------------------------------------------ */

export type ViewPreset = "iso" | "front" | "top" | "right";

export const VIEW_DIRECTIONS: Record<ViewPreset, [number, number, number]> = {
  iso: [1, 0.72, 1.18],
  front: [0, 0.0001, 1],
  top: [0, 1, 0.0001],
  right: [1, 0.0001, 0],
};

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ------------------------------------------------------------------ */
/* Stage                                                               */
/* ------------------------------------------------------------------ */

export interface StageOptions {
  /** Field of view in degrees. */
  fov?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  /** Draw a small XYZ triad in the bottom-right corner. */
  triad?: boolean;
  /** Allow orbit / zoom / pan. */
  interactive?: boolean;
  /** Extra breathing room when fitting (1 = tight). */
  fitPadding?: number;
  shadows?: boolean;
  /** Strength of the studio reflections (default 0.9). */
  environmentIntensity?: number;
}

/** A per-frame hook; return `true` while it still needs frames. */
export type FrameHook = (delta: number) => boolean;

export class ThreeStage {
  readonly host: HTMLElement;
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly controls: OrbitControls;
  /** Everything the camera fits to goes in here. */
  readonly content = new Group();

  private readonly env: Texture;
  private readonly key: DirectionalLight;
  private readonly ground: Mesh;
  private readonly glow: Mesh;
  private readonly triadScene: Scene | null = null;
  private readonly triadCamera: OrthographicCamera | null = null;
  private readonly hooks = new Set<FrameHook>();
  private readonly fitPadding: number;
  private readonly resizeObserver: ResizeObserver;
  private readonly intersection: IntersectionObserver;
  private visible = true;
  private running = false;
  private dirty = true;
  private frame = 0;
  private lastTime = 0;
  private disposed = false;
  /** While shaders compile in the background, frames are held back. */
  private holding = false;
  private tween: {
    from: Vector3;
    to: Vector3;
    fromTarget: Vector3;
    toTarget: Vector3;
    fromDist: number;
    toDist: number;
    start: number;
    duration: number;
  } | null = null;
  /** Bounding sphere of the fitted content. */
  readonly bounds = new Sphere(new Vector3(), 1);
  readonly box = new Box3();
  private viewDir = new Vector3(...VIEW_DIRECTIONS.iso).normalize();

  constructor(host: HTMLElement, options: StageOptions = {}) {
    const {
      fov = 32,
      autoRotate = true,
      autoRotateSpeed = 0.7,
      triad = false,
      interactive = true,
      fitPadding = 1.1,
      shadows = true,
      environmentIntensity = 0.9,
    } = options;
    this.host = host;
    this.fitPadding = fitPadding;
    this.renderer = createRenderer({ shadows });
    host.appendChild(this.renderer.domElement);
    const width = host.clientWidth || 400;
    const height = host.clientHeight || 300;
    this.renderer.setSize(width, height, false);

    this.camera = new PerspectiveCamera(fov, width / height, 0.1, 1000);
    this.env = createEnvironment(this.renderer);
    this.scene.environment = this.env;
    this.scene.environmentIntensity = environmentIntensity;
    this.scene.add(this.content);

    // Lights: environment does most of the work; a key light casts the shadow.
    this.scene.add(new HemisphereLight(0xdfe8ef, 0x1b1d1f, 0.35));
    this.scene.add(new AmbientLight(0xffffff, 0.08));
    this.key = new DirectionalLight(0xffffff, 1.7);
    this.key.castShadow = shadows;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.radius = 6;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    this.scene.add(this.key, this.key.target);
    const rim = new DirectionalLight(0x9fe6d6, 0.55);
    rim.position.set(-4, 2.5, -5);
    this.scene.add(rim);

    // Ground: shadow catcher plus a faint radial glow.
    this.ground = new Mesh(new PlaneGeometry(1, 1), new ShadowMaterial({ opacity: 0.42, transparent: true }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.renderOrder = -1;
    this.scene.add(this.ground);
    this.glow = new Mesh(
      new CircleGeometry(0.5, 48),
      new MeshBasicMaterial({
        map: radialTexture(),
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.renderOrder = -2;
    this.scene.add(this.glow);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.autoRotate = autoRotate;
    this.controls.autoRotateSpeed = autoRotateSpeed;
    this.controls.enabled = interactive;
    this.controls.zoomToCursor = true;
    this.controls.addEventListener("start", () => {
      this.controls.autoRotate = false;
      this.tween = null;
      this.invalidate();
    });
    this.controls.addEventListener("change", () => this.invalidate());
    this.renderer.domElement.style.cursor = interactive ? "grab" : "default";

    if (triad) {
      this.triadScene = new Scene();
      this.triadScene.add(buildTriad());
      this.triadCamera = new OrthographicCamera(-1.7, 1.7, 1.7, -1.7, 0.1, 20);
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.intersection = new IntersectionObserver(
      (entries) => {
        this.visible = entries.some((entry) => entry.isIntersecting);
        if (this.visible) this.invalidate();
      },
      { rootMargin: "80px" },
    );
    this.intersection.observe(host);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.invalidate();
  }

  private onVisibility = () => {
    if (!document.hidden) this.invalidate();
  };

  /** Resize the drawing buffer to the host. */
  resize() {
    if (this.disposed) return;
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  /** Request at least one more frame. */
  invalidate() {
    this.dirty = true;
    if (!this.running && !this.disposed) {
      this.running = true;
      this.lastTime = performance.now();
      this.frame = requestAnimationFrame(this.loop);
    }
  }

  /**
   * Add objects to the content group and draw them only once their shaders are
   * ready. Where the browser supports KHR_parallel_shader_compile this keeps
   * program linking off the main thread instead of one long first frame.
   */
  async addCompiled(...objects: Object3D[]) {
    this.content.add(...objects);
    this.holding = true;
    try {
      await compileInBackground(this.renderer, this.scene, this.camera, () => this.disposed);
    } catch {
      /* fall back to compiling on the first frame */
    }
    this.holding = false;
    if (!this.disposed) this.invalidate();
  }

  addFrameHook(hook: FrameHook) {
    this.hooks.add(hook);
    this.invalidate();
    return () => this.hooks.delete(hook);
  }

  setAutoRotate(on: boolean) {
    this.controls.autoRotate = on;
    this.invalidate();
  }

  private loop = (time: number) => {
    if (this.disposed) return;
    if (!this.visible || document.hidden) {
      this.running = false;
      return;
    }
    const delta = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    let animating = this.controls.autoRotate;
    for (const hook of this.hooks) if (hook(delta)) animating = true;
    if (this.tween) {
      animating = true;
      this.stepTween(time);
    }
    if (this.controls.update(delta)) animating = true;
    if (!this.holding) {
      if (this.dirty || animating) this.render();
      this.dirty = false;
    }
    if (animating) {
      this.frame = requestAnimationFrame(this.loop);
    } else {
      this.running = false;
    }
  };

  /** Draw the scene (and the triad) now. */
  render() {
    const { renderer } = this;
    this.updateKeyLight();
    renderer.setScissorTest(false);
    renderer.autoClear = true;
    renderer.render(this.scene, this.camera);
    if (this.triadScene && this.triadCamera) {
      const size = 88;
      const width = this.host.clientWidth;
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.setScissorTest(true);
      renderer.setViewport(width - size - 6, 6, size, size);
      renderer.setScissor(width - size - 6, 6, size, size);
      const offset = new Vector3().subVectors(this.camera.position, this.controls.target).normalize().multiplyScalar(6);
      this.triadCamera.position.copy(offset);
      this.triadCamera.up.copy(this.camera.up);
      this.triadCamera.lookAt(0, 0, 0);
      renderer.render(this.triadScene, this.triadCamera);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, width, this.host.clientHeight);
      renderer.autoClear = true;
    }
  }

  /** The key light follows the camera azimuth a little so shading stays readable while spinning. */
  private updateKeyLight() {
    const { center, radius } = this.bounds;
    const offset = new Vector3().subVectors(this.camera.position, this.controls.target);
    const azimuth = Math.atan2(offset.x, offset.z) + 0.75;
    this.key.position.set(
      center.x + Math.sin(azimuth) * radius * 2.6,
      center.y + radius * 2.6,
      center.z + Math.cos(azimuth) * radius * 2.6,
    );
    this.key.target.position.copy(center);
    this.key.target.updateMatrixWorld();
  }

  /**
   * Fit the camera to `object` (defaults to the content group). The ground sits
   * at the bottom of its box and the shadow camera is sized to it.
   */
  fit(object: Object3D = this.content, { view, animate = false }: { view?: ViewPreset; animate?: boolean } = {}) {
    object.updateMatrixWorld(true);
    this.box.setFromObject(object);
    if (this.box.isEmpty()) return;
    this.box.getBoundingSphere(this.bounds);
    const { center, radius } = this.bounds;

    const size = this.box.getSize(new Vector3());
    const floor = this.box.min.y - Math.max(size.y * 0.002, radius * 0.002);
    this.ground.position.set(center.x, floor, center.z);
    this.ground.scale.setScalar(radius * 10);
    this.glow.position.set(center.x, floor - radius * 0.001, center.z);
    this.glow.scale.setScalar(radius * 3.4);

    const shadow = this.key.shadow.camera;
    shadow.left = shadow.bottom = -radius * 1.6;
    shadow.right = shadow.top = radius * 1.6;
    shadow.near = radius * 0.2;
    shadow.far = radius * 8;
    shadow.updateProjectionMatrix();
    this.key.shadow.normalBias = radius * 0.006;

    this.camera.near = radius / 50;
    this.camera.far = radius * 60;
    this.camera.updateProjectionMatrix();
    this.controls.minDistance = radius * 0.6;
    this.controls.maxDistance = radius * 12;

    if (view) this.viewDir.set(...VIEW_DIRECTIONS[view]).normalize();
    const distance = this.fitDistance();
    const targetPos = center.clone().addScaledVector(this.viewDir, distance);
    if (animate) {
      const from = new Vector3().subVectors(this.camera.position, this.controls.target);
      this.tween = {
        from: from.clone().normalize(),
        to: this.viewDir.clone(),
        fromTarget: this.controls.target.clone(),
        toTarget: center.clone(),
        fromDist: from.length(),
        toDist: distance,
        start: performance.now(),
        duration: 650,
      };
    } else {
      this.tween = null;
      this.controls.target.copy(center);
      this.camera.position.copy(targetPos);
      this.camera.lookAt(center);
      this.controls.update();
    }
    this.invalidate();
  }

  /** Animate to a named view around the current bounds. */
  setView(view: ViewPreset, { stopRotate = true }: { stopRotate?: boolean } = {}) {
    if (stopRotate) this.controls.autoRotate = false;
    this.fit(this.content, { view, animate: true });
  }

  /** Distance along `viewDir` at which the box's projected corners fill the frame. */
  private fitDistance() {
    const vFov = (this.camera.fov * Math.PI) / 180;
    const tanV = Math.tan(vFov / 2);
    const tanH = tanV * this.camera.aspect;
    const forward = this.viewDir.clone().negate();
    const worldUp = Math.abs(forward.y) > 0.99 ? new Vector3(0, 0, -1) : new Vector3(0, 1, 0);
    const right = new Vector3().crossVectors(forward, worldUp).normalize();
    const up = new Vector3().crossVectors(right, forward).normalize();
    const center = this.box.getCenter(new Vector3());
    let distance = 0;
    const corner = new Vector3();
    for (let i = 0; i < 8; i++) {
      corner.set(
        i & 1 ? this.box.max.x : this.box.min.x,
        i & 2 ? this.box.max.y : this.box.min.y,
        i & 4 ? this.box.max.z : this.box.min.z,
      );
      corner.sub(center);
      const depth = corner.dot(forward); // + is away from the camera
      const need = Math.max(Math.abs(corner.dot(right)) / tanH, Math.abs(corner.dot(up)) / tanV) - depth;
      distance = Math.max(distance, need);
    }
    return distance * this.fitPadding;
  }

  private stepTween(time: number) {
    const tween = this.tween;
    if (!tween) return;
    const t = Math.min((time - tween.start) / tween.duration, 1);
    const k = ease(t);
    const dir = tween.from.clone().lerp(tween.to, k);
    if (dir.lengthSq() < 1e-6) dir.copy(tween.to);
    dir.normalize();
    const dist = tween.fromDist + (tween.toDist - tween.fromDist) * k;
    this.controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
    this.camera.position.copy(this.controls.target).addScaledVector(dir, dist);
    this.camera.lookAt(this.controls.target);
    if (t >= 1) this.tween = null;
  }

  /** Tear down: GPU resources, observers, listeners and the canvas. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.intersection.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.controls.dispose();
    disposeObject(this.scene);
    if (this.triadScene) disposeObject(this.triadScene);
    this.env.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
