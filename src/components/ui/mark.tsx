/**
 * Decorative 3D mark. Server-safe. The adjacent label carries the meaning,
 * so the image is `alt=""` and hidden from assistive tech.
 *
 * `framed` seats the mark on a soft tile so it holds its own beside text in
 * dense rows; unframed it floats, which suits page headers and empty states.
 *
 * Loads the smallest pre-scaled copy that stays sharp on a 2x screen (96 or
 * 192 px, else the 512 px original), with a 1x / 2x `srcSet`. `priority` loads
 * it eagerly at high priority: page-header marks are often the largest paint.
 */

import { cx } from "@/lib/format";
import { markSrc, type MarkId } from "@/lib/marks";

export function Mark({
  id,
  size = 40,
  framed = false,
  priority = false,
  className,
}: {
  id: MarkId;
  size?: number;
  framed?: boolean;
  /** Eager, high-priority load (above-the-fold header marks). */
  priority?: boolean;
  className?: string;
}) {
  const src1x = markSrc(id, size);
  const src2x = markSrc(id, size * 2);
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- small static WebP, sized by the caller
    <img
      src={src2x}
      srcSet={src1x === src2x ? undefined : `${src1x} 1x, ${src2x} 2x`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      draggable={false}
      className={cx(
        "pointer-events-none shrink-0 select-none object-contain",
        "drop-shadow-[0_2px_6px_rgba(0,0,0,0.18)]",
        !framed && className,
      )}
      style={{ width: size, height: size }}
    />
  );
  if (!framed) return img;
  const pad = Math.round(size * 0.18);
  return (
    <span
      aria-hidden
      className={cx("inline-flex shrink-0 items-center justify-center rounded-xl border border-muted bg-raised", className)}
      style={{ width: size + pad * 2, height: size + pad * 2 }}
    >
      {img}
    </span>
  );
}
