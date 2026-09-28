"use client";

/**
 * Segmented control / tabs: a pill track with a sliding active thumb.
 *
 * `role="tablist"` + roving tabindex, ←/→ (and Home/End) move and select.
 * The thumb is measured from the active segment, so labels of any width
 * work; it snaps without animation on first paint and under reduced motion.
 */

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { cx } from "@/lib/format";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Leading icon element (size 14). */
  icon?: ReactNode;
  /** Trailing count or badge. */
  count?: ReactNode;
  disabled?: boolean;
  /** Tooltip / accessible description. */
  title?: string;
}

export type SegmentedSize = "sm" | "md";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  fullWidth = false,
  ariaLabel,
  idPrefix,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly (SegmentedOption<T> | T)[];
  size?: SegmentedSize;
  /** Stretch segments to fill the container equally. */
  fullWidth?: boolean;
  ariaLabel: string;
  /**
   * When set, each segment gets `id={idPrefix}-tab-{value}` and
   * `aria-controls={idPrefix}-panel-{value}` so it can drive tab panels.
   */
  idPrefix?: string;
  className?: string;
}) {
  const items: SegmentedOption<T>[] = options.map((o) =>
    typeof o === "string" ? { value: o as T, label: o } : (o as SegmentedOption<T>),
  );
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const active = track.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!active) return setThumb(null);
      setThumb({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [value, options.length]);

  useLayoutEffect(() => {
    if (!thumb || animate) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [thumb, animate]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const enabled = items.filter((i) => !i.disabled);
    const index = enabled.findIndex((i) => i.value === value);
    let next: SegmentedOption<T> | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = enabled[(index + 1) % enabled.length];
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = enabled[(index - 1 + enabled.length) % enabled.length];
    else if (event.key === "Home") next = enabled[0];
    else if (event.key === "End") next = enabled[enabled.length - 1];
    if (!next) return;
    event.preventDefault();
    onChange(next.value);
    const btn = trackRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(next.value)}"]`);
    btn?.focus();
  }

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cx(
        "relative isolate max-w-full items-center rounded-full border border-muted bg-action p-0.5",
        fullWidth ? "flex w-full" : "inline-flex w-fit",
        "overflow-x-auto [scrollbar-width:none]",
        className,
      )}
    >
      {thumb ? (
        <span
          aria-hidden
          className={cx(
            "absolute top-0.5 bottom-0.5 left-0 -z-10 rounded-full border border-muted bg-container shadow-[0_1px_2px_rgba(0,0,0,0.06)] in-data-[theme=dark]:bg-raised-2",
            animate && "transition-[transform,width] duration-[180ms] ease-out motion-reduce:transition-none",
          )}
          style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }}
        />
      ) : null}
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            data-value={item.value}
            id={idPrefix ? `${idPrefix}-tab-${item.value}` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-panel-${item.value}` : undefined}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            title={item.title}
            onClick={() => onChange(item.value)}
            className={cx(
              "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full whitespace-nowrap transition-colors duration-[150ms] outline-none",
              "focus-visible:ring-2 focus-visible:ring-active disabled:cursor-not-allowed disabled:text-quaternary",
              size === "sm" ? "h-7 px-3 text-label-sm" : "h-8 px-3.5 text-label-sm",
              fullWidth && "flex-1",
              selected ? "text-primary" : "text-tertiary hover:text-primary",
              // Before measurement (SSR / first paint) the active segment carries its own fill.
              selected && !thumb && "bg-container shadow-[inset_0_0_0_1px_var(--stroke-muted)]",
            )}
          >
            {item.icon ? <span className="inline-flex shrink-0 [&_svg]:size-3.5">{item.icon}</span> : null}
            <span>{item.label}</span>
            {item.count != null ? (
              <span
                className={cx(
                  "rounded-full px-1.5 text-caption tabular",
                  selected ? "bg-raised-2 text-secondary" : "text-quaternary",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
