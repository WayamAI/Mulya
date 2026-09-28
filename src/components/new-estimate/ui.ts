/** Class recipes shared by the New Estimate panels (Chronos translations of the original look). */

import { cx } from "@/lib/format";

/** Uppercase caption label (`label-caps`). */
export const CAPS = "text-caption tracking-[0.08em] text-quaternary uppercase";

/** Card shell. */
export const CARD = "min-w-0 overflow-hidden rounded-xl border border-muted bg-container";

/** Tinted card header / footer strip. */
export const CARD_BAR = "border-muted bg-raised px-4 py-3";

/** Header strip laid out as a wrapping row. */
export const CARD_BAR_ROW = "flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2 border-muted px-4 py-2.5";

/** Inset callout on a card. */
export const INSET = "rounded-lg border border-muted bg-raised";

/** Accent chip such as “from CAD” / “from geometry”. */
export const INFO_CHIP =
  "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-info-stroke bg-info-surface px-2 text-caption font-medium text-info";

/** Inline text link / text button. */
export const LINK =
  "inline-flex items-center gap-1.5 text-label-sm text-primary underline-offset-2 transition-colors duration-[150ms] hover:underline disabled:opacity-50";

/** Table header cell. */
export const TH = "h-10 text-caption font-normal tracking-[0.08em] text-quaternary uppercase";

/** Row hover for tables. */
export const ROW = "border-b border-muted transition-colors duration-[150ms] last:border-0 hover:bg-raised";

/** Small bordered pill with an icon glyph (viability, input state, thermal status). */
export const GLYPH_CHIP =
  "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-caption font-medium";

/** Tone families for chips and callouts. */
export const TONE = {
  success: "border-success-stroke bg-success-surface text-success",
  neutral: "border-neutral-stroke bg-neutral-surface text-neutral",
  warning: "border-warning-stroke bg-warning-surface text-warning",
  error: "border-error-stroke bg-error-surface text-error",
  info: "border-info-stroke bg-info-surface text-info",
} as const;

/** Selectable list row used for the class / band ladders. */
export function ladderRow(active: boolean) {
  return cx(
    "flex items-center justify-between gap-3 rounded-md border px-2.5 py-1.5 text-body-md transition-colors duration-[150ms]",
    active ? "border-active bg-raised-2 font-medium text-primary" : "border-transparent text-quaternary",
  );
}

/** Lucide defaults used across the flow. */
export const ICON = { size: 16, strokeWidth: 1.75 } as const;
export const ICON_SM = { size: 14, strokeWidth: 1.75 } as const;
