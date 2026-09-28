// Three-free tool constants shared by the MouldViewer chrome, the tool geometry
// (`mould-geometry.mjs`, which re-exports them) and `scripts/export-models.mjs`.
// Types live in `mould-meta.d.mts`.

/** @type {readonly ["pattern", "die", "progressive"]} */
export const MOULD_KINDS = ["pattern", "die", "progressive"];

/** Tool body colour per kind (original `j`). */
export const MOULD_COLORS = { pattern: 0x6b7175, die: 0x4a4e52, progressive: 0x4a4e52 };

/** Legend label for the tool body material per kind. */
export const MOULD_MATERIAL_LABELS = {
  pattern: "Pattern plate",
  die: "Die steel",
  progressive: "Tool steel",
};

/** Default opening of the tool in the viewer, in percent. */
export const MOULD_DEFAULT_OPEN = 70;
