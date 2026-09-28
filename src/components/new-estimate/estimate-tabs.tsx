"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import type { AgentId } from "@/lib/costing/agents";
import { cx } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ICON_SM } from "./ui";

export type AgentTabState = "queued" | "running" | "done";

export interface EstimateTab {
  key: AgentId;
  label: string;
  badge?: string;
  alert?: boolean;
  disabled?: boolean;
  agent?: AgentTabState;
}

/** Sticky section tabs; each tab carries its agent's state and a badge. Segmented look with a sliding thumb. */
export function EstimateTabBar({
  tabs,
  active,
  onSelect,
  lockedHint,
  action,
}: {
  tabs: EstimateTab[];
  active: string;
  onSelect: (key: AgentId) => void;
  lockedHint: string;
  action?: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const el = track.querySelector<HTMLElement>('[aria-selected="true"]');
      setThumb(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [active, tabs]);

  useEffect(() => {
    if (!thumb || animate) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [thumb, animate]);

  // Keep the active tab in view on narrow screens.
  useEffect(() => {
    const track = trackRef.current;
    const scroller = track?.parentElement;
    const el = track?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!scroller || !el || scroller.scrollWidth <= scroller.clientWidth) return;
    // Horizontal only: never move the page vertically.
    const left = el.offsetLeft - 16;
    const right = el.offsetLeft + el.offsetWidth + 16 - scroller.clientWidth;
    if (scroller.scrollLeft > left) scroller.scrollTo({ left });
    else if (scroller.scrollLeft < right) scroller.scrollTo({ left: right });
  }, [active]);

  const enabled = tabs.filter((tab) => !tab.disabled);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = enabled.findIndex((tab) => tab.key === active);
    let next: EstimateTab | undefined;
    if (event.key === "ArrowRight") next = enabled[(index + 1) % enabled.length];
    else if (event.key === "ArrowLeft") next = enabled[(index - 1 + enabled.length) % enabled.length];
    if (!next) return;
    event.preventDefault();
    onSelect(next.key);
    trackRef.current?.querySelector<HTMLElement>(`[data-tab="${next.key}"]`)?.focus();
  };

  return (
    <div className="sticky -top-4 z-20 -mx-4 border-b border-muted bg-page/90 px-4 py-2.5 backdrop-blur-md sm:-top-5 sm:-mx-5 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="-mx-4 min-w-0 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <div
            ref={trackRef}
            role="tablist"
            aria-label="Estimate sections"
            onKeyDown={onKeyDown}
            className="relative isolate inline-flex items-center rounded-full border border-muted bg-action p-0.5"
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
            {tabs.map((tab) => {
              const selected = tab.key === active;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  data-tab={tab.key}
                  aria-selected={selected}
                  aria-disabled={tab.disabled}
                  tabIndex={selected ? 0 : -1}
                  title={tab.disabled ? lockedHint : undefined}
                  onClick={() => !tab.disabled && onSelect(tab.key)}
                  className={cx(
                    "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-label-md whitespace-nowrap transition-colors duration-[150ms] outline-none focus-visible:ring-2 focus-visible:ring-active",
                    selected && !thumb && "bg-container shadow-[inset_0_0_0_1px_var(--stroke-muted)]",
                    tab.disabled
                      ? "cursor-not-allowed text-quaternary/70"
                      : cx(
                          "cursor-pointer",
                          tab.agent === "running"
                            ? "text-info"
                            : selected
                              ? "text-primary"
                              : "text-tertiary hover:text-primary",
                        ),
                  )}
                >
                  {tab.agent && tab.agent !== "done" && !tab.disabled ? (
                    <span
                      aria-hidden
                      className={cx(
                        "inline-flex size-2.5 items-center justify-center text-[10px] leading-none",
                        tab.agent === "running" ? "agent-beacon text-info" : "text-quaternary",
                      )}
                    >
                      {tab.agent === "running" ? "◐" : "○"}
                    </span>
                  ) : null}
                  {tab.label}
                  {tab.disabled ? (
                    <Lock size={12} strokeWidth={1.75} aria-label="Locked" className="shrink-0" />
                  ) : tab.badge ? (
                    <span
                      className={cx(
                        "inline-flex h-5 items-center rounded-full border px-1.5 text-caption tabular",
                        tab.alert
                          ? "border-error-stroke bg-error-surface text-error"
                          : selected
                            ? "border-muted bg-raised-2 text-secondary"
                            : "border-transparent text-quaternary",
                      )}
                    >
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
    </div>
  );
}

/** Previous / next buttons at the foot of a tab. */
export function EstimateTabPager({
  tabs,
  active,
  onSelect,
  lockedHint,
}: {
  tabs: EstimateTab[];
  active: string;
  onSelect: (key: AgentId) => void;
  lockedHint: string;
}) {
  const index = tabs.findIndex((tab) => tab.key === active);
  const prev = index > 0 ? tabs[index - 1] : undefined;
  const next = index >= 0 && index < tabs.length - 1 ? tabs[index + 1] : undefined;
  if (!prev && !next) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-muted pt-5">
      {prev ? (
        <Button variant="secondary" icon={ArrowLeft} onClick={() => onSelect(prev.key)}>
          {prev.label}
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        <Button
          onClick={() => !next.disabled && onSelect(next.key)}
          aria-disabled={next.disabled}
          disabled={next.disabled}
          title={next.disabled ? lockedHint : undefined}
          iconRight={next.disabled ? <Lock {...ICON_SM} aria-hidden /> : ArrowRight}
        >
          {next.label}
        </Button>
      ) : null}
    </div>
  );
}
