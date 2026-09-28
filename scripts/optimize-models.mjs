// Builds the web copies of the CAD parts the viewers load. Run with `npm run models:web`.
//
// For each part it reads `public/models/parts/<v>.glb` (mesh `body`) and
// `<v>.edges.json` (feature-edge segments), adds the edges to the same file as
// a LINES primitive on a node named `edges`, then quantizes and
// meshopt-compresses everything into `public/models/parts/<v>.web.glb`.
//
// The originals stay untouched: the Download menu and external tools use
// `<v>.glb` / `<v>.edges.json`; only the in-app viewer reads `.web.glb`.

import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO, Primitive } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "public", "models", "parts");
const VARIANTS = ["bearing", "bracket", "cover"];

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

for (const variant of VARIANTS) {
  const glbPath = join(dir, `${variant}.glb`);
  const edgesPath = join(dir, `${variant}.edges.json`);
  const outPath = join(dir, `${variant}.web.glb`);

  const document = await io.read(glbPath);
  const scene = document.getRoot().getDefaultScene() ?? document.getRoot().listScenes()[0];
  const buffer = document.getRoot().listBuffers()[0];

  const data = JSON.parse(await readFile(edgesPath, "utf8"));
  const flat = Array.isArray(data) ? data : (data.segments ?? data.positions ?? []);
  if (flat.length < 6 || flat.length % 6 !== 0) throw new Error(`${variant}: unexpected edge data (${flat.length} values)`);

  const position = document
    .createAccessor("edges-position")
    .setType("VEC3")
    .setArray(new Float32Array(flat))
    .setBuffer(buffer);
  const lines = document.createPrimitive().setMode(Primitive.Mode.LINES).setAttribute("POSITION", position);
  const mesh = document.createMesh("edges").addPrimitive(lines);
  scene.addChild(document.createNode("edges").setMesh(mesh));

  // "high": reorder, quantize (positions 14 bit, normals octahedral), meshopt filters.
  await document.transform(meshopt({ encoder: MeshoptEncoder, level: "high" }));
  await io.write(outPath, document);

  const [glb, edges, web] = await Promise.all([stat(glbPath), stat(edgesPath), stat(outPath)]);
  console.log(
    `${variant.padEnd(8)} glb ${kb(glb.size).padStart(10)} + edges ${kb(edges.size).padStart(10)} = ${kb(glb.size + edges.size).padStart(10)}  ->  web.glb ${kb(web.size).padStart(9)}`,
  );
}
