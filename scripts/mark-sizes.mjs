// Writes 96 px and 192 px WebP copies of every mark in public/images/marks
// into public/images/marks/96/ and public/images/marks/192/. The 512 px
// originals stay where they are. `Mark` picks the smallest copy that is at
// least twice its display size. Run with `npm run marks:sizes`.

import { mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "images", "marks");
const SIZES = [96, 192];

const files = (await readdir(dir)).filter((name) => name.endsWith(".webp"));
const totals = { original: 0 };
for (const size of SIZES) {
  await mkdir(join(dir, String(size)), { recursive: true });
  totals[size] = 0;
}
for (const name of files) {
  const source = join(dir, name);
  totals.original += (await stat(source)).size;
  for (const size of SIZES) {
    const out = join(dir, String(size), name);
    await sharp(source)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" })
      .webp({ quality: 88, alphaQuality: 100, effort: 6, smartSubsample: true })
      .toFile(out);
    totals[size] += (await stat(out)).size;
  }
}
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(
  `${files.length} marks: 512 px ${kb(totals.original)}, ${SIZES.map((size) => `${size} px ${kb(totals[size])}`).join(", ")}`,
);
