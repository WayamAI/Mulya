// Exports the production tool for each sample part to binary glTF in public/models.
// Run with `npm run models`. Uses the same geometry builders as the MouldViewer.
// The parts themselves are real CAD, built by `npm run cad` into public/models/parts.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Scene } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { MOULD_DEFAULT_OPEN, buildMould } from "../src/lib/models/mould-geometry.mjs";

/** Each part's real route: sand-cast pattern, progressive stamping die, HPDC die. */
const TOOLS = [
  ["pattern", "bearing"],
  ["progressive", "bracket"],
  ["die", "cover"],
];

// GLTFExporter reads its Blobs back through FileReader, which Node lacks.
if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class FileReader {
    result = null;
    onload = null;
    onloadend = null;
    onerror = null;
    #finish(promise) {
      promise.then(
        (value) => {
          this.result = value;
          this.onload?.({ target: this });
          this.onloadend?.({ target: this });
        },
        (error) => this.onerror?.(error),
      );
    }
    readAsArrayBuffer(blob) {
      this.#finish(blob.arrayBuffer());
    }
    readAsDataURL(blob) {
      this.#finish(
        blob
          .arrayBuffer()
          .then((buf) => `data:${blob.type || "application/octet-stream"};base64,${Buffer.from(buf).toString("base64")}`),
      );
    }
  };
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "models");
const exporter = new GLTFExporter();

async function exportGlb(object, fileName) {
  const scene = new Scene();
  scene.name = fileName.replace(/\.glb$/, "");
  scene.add(object);
  const result = await exporter.parseAsync(scene, { binary: true });
  const bytes = Buffer.from(result);
  await writeFile(join(outDir, fileName), bytes);
  console.log(`${fileName.padEnd(36)} ${(bytes.length / 1024).toFixed(1).padStart(8)} KB`);
}

await mkdir(outDir, { recursive: true });

for (const [kind, variant] of TOOLS) {
  await exportGlb(buildMould(kind, variant, MOULD_DEFAULT_OPEN / 100).root, `mould-${kind}-${variant}.glb`);
  await exportGlb(buildMould(kind, variant, 0).root, `mould-${kind}-${variant}-closed.glb`);
}
