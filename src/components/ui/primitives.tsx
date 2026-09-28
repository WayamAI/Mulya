/**
 * Shared surface primitives.
 *
 * Built once here so pages compose rather than re-invent. Everything
 * consumes semantic tokens only: no hex, no raw palette. Badges, buttons,
 * fields, tables and segmented controls live beside this file in
 * `badge.tsx`, `button.tsx`, `field.tsx`, `table.tsx`, `segmented.tsx`.
 */

import Link from "next/link";
import { useId, type ReactNode } from "react";
import { ArrowRight, type LucideIcon } from "lucide-react";

import {
  Badge,
  VarianceBadge,
  type BadgeProps,
  type BadgeSize,
  type BadgeVariant,
} from "@/components/ui/badge";
import { cx } from "@/lib/format";

export { Badge, VarianceBadge } from "@/components/ui/badge";

// --- panel -----------------------------------------------------------------

/**
 * Caption header shared by `Panel` and `Section`: h-11, uppercase caption
 * title, optional count pill, and a right slot (custom `action`, or a
 * “View all →” link from `actionHref`).
 */
export function PanelHeader({
  title,
  count,
  action,
  actionHref,
  actionLabel = "View all",
}: {
  title?: ReactNode;
  count?: ReactNode;
  action?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
}) {
  const right =
    action ??
    (actionHref ? (
      <Link
        href={actionHref}
        className="group/va inline-flex items-center gap-1 rounded-sm text-label-sm text-tertiary transition-colors duration-[150ms] outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-active"
      >
        {actionLabel}
        <ArrowRight
          size={13}
          strokeWidth={1.75}
          aria-hidden
          className="transition-transform duration-[150ms] group-hover/va:translate-x-0.5"
        />
      </Link>
    ) : null);
  return (
    <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-muted px-4">
      <div className="flex min-w-0 items-center gap-2">
        {title ? (
          <h2 className="min-w-0 truncate text-caption tracking-[0.08em] text-quaternary uppercase">{title}</h2>
        ) : null}
        {count != null ? (
          <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-raised-2 px-1.5 text-caption tabular text-tertiary">
            {count}
          </span>
        ) : null}
      </div>
      {right ? <div className="flex min-w-0 shrink-0 items-center gap-2">{right}</div> : null}
    </header>
  );
}

/**
 * Top-level card (rounded-xl). `padded` gives the body 16px padding and its own
 * scroll; `inset` renders the inner (rounded-lg) weight for nested cards.
 */
export function Panel({
  title,
  count,
  action,
  actionHref,
  actionLabel,
  children,
  className = "",
  bodyClassName,
  padded = true,
  inset = false,
}: {
  title?: ReactNode;
  count?: ReactNode;
  action?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
  inset?: boolean;
}) {
  return (
    <section
      className={cx(
        "isolate flex h-full min-h-0 min-w-0 flex-col overflow-hidden border border-muted bg-container",
        inset ? "rounded-lg" : "rounded-xl",
        className,
      )}
    >
      {title || action || actionHref || count != null ? (
        <PanelHeader title={title} count={count} action={action} actionHref={actionHref} actionLabel={actionLabel} />
      ) : null}
      <div
        className={cx(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          padded ? "overflow-auto p-4" : "overflow-hidden",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

// --- sparkline ----------------------------------------------------------------

/**
 * Tiny inline trend line from a number series. Stroke is
 * `--analytics-series-1` by default; the last point is marked.
 */
export function Sparkline({
  data,
  width = 88,
  height = 28,
  stroke = "var(--analytics-series-1)",
  fill = true,
  className,
  label,
}: {
  data: readonly number[];
  width?: number;
  height?: number;
  stroke?: string;
  /** Soft area under the line. */
  fill?: boolean;
  className?: string;
  /** Accessible description, e.g. “Cost over last 8 revisions”. */
  label?: string;
}) {
  const gradientId = useId();
  if (data.length < 2) return null;
  const pad = 2.5;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (width - pad * 2),
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${height} L${pts[0][0].toFixed(1)} ${height} Z`;
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cx("shrink-0 overflow-visible", className)}
    >
      {fill ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={2.25} fill={stroke} />
    </svg>
  );
}

// --- KPI -------------------------------------------------------------------

const DELTA_TEXT: Record<StatusTone, string> = {
  success: "text-success",
  info: "text-info",
  neutral: "text-tertiary",
  warning: "text-warning",
  error: "text-error",
};

/**
 * Headline figure tile. Delta can be pre-formatted text (`delta` + `tone`),
 * or a signed % rendered as a `VarianceBadge` (`variance`). Optional
 * `sparkline` series draws a trend in the corner.
 */
export function KpiTile({
  label,
  value,
  delta,
  variance,
  varianceGoodWhen = "lower",
  hint,
  mark,
  sparkline,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  /** Signed text, pre-formatted, e.g. "+4.2%" or "▲ 8% over target". */
  delta?: ReactNode;
  /** Signed % vs target; renders a VarianceBadge (▲/●/▼). */
  variance?: number | null;
  varianceGoodWhen?: "lower" | "higher";
  hint?: ReactNode;
  mark?: ReactNode;
  /** Trend series (oldest → newest). */
  sparkline?: readonly number[];
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex min-h-[124px] min-w-0 flex-col gap-2 rounded-xl border border-muted bg-container px-4 py-3.5 transition-colors duration-[150ms] hover:border-default",
        className,
      )}
    >
      <div className="flex min-h-5 items-center justify-between gap-2">
        <span className="truncate text-caption tracking-[0.08em] text-quaternary uppercase">{label}</span>
        {mark}
      </div>
      <div className="flex min-w-0 items-end justify-between gap-3">
        <span className="min-w-0 truncate font-display text-display-xl tabular text-primary sm:text-display-2xl">
          {value}
        </span>
        {sparkline && sparkline.length > 1 ? <Sparkline data={sparkline} className="mb-1" /> : null}
      </div>
      <div className="mt-auto flex min-h-5 min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {variance !== undefined ? (
          <VarianceBadge pct={variance} size="sm" goodWhen={varianceGoodWhen} />
        ) : null}
        {delta ? <span className={cx("text-body-sm tabular", DELTA_TEXT[tone])}>{delta}</span> : null}
        {hint ? <span className="min-w-0 truncate text-body-sm text-quaternary">{hint}</span> : null}
      </div>
    </div>
  );
}

// --- status --------------------------------------------------------------

export type StatusTone = "success" | "info" | "neutral" | "warning" | "error";

/**
 * Status pill. Now a thin wrapper over `Badge` (default variant `soft`, tone
 * glyph shown). Pass `variant="solid"` for the previous filled look.
 */
export function StatusBadge({
  children,
  tone = "neutral",
  variant = "soft",
  size = "sm",
  icon,
  className,
  title,
}: {
  children: ReactNode;
  tone?: StatusTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: BadgeProps["icon"];
  className?: string;
  title?: string;
}) {
  return (
    <Badge tone={tone} variant={variant} size={size} icon={icon} className={className} title={title}>
      {children}
    </Badge>
  );
}

/**
 * Status dot. Alone it is decorative (`aria-hidden`): pair it with text.
 * Given `children` it renders the dense `dot` badge (dot + label).
 */
export function StatusDot({
  tone = "neutral",
  children,
  pulse = false,
  className,
}: {
  tone?: StatusTone;
  children?: ReactNode;
  pulse?: boolean;
  className?: string;
}) {
  if (children != null) {
    return (
      <Badge variant="dot" tone={tone} size="sm" pulse={pulse} className={className}>
        {children}
      </Badge>
    );
  }
  const bg: Record<StatusTone, string> = {
    success: "bg-success-icon",
    info: "bg-info-icon",
    neutral: "bg-neutral-icon",
    warning: "bg-warning-icon",
    error: "bg-error-icon",
  };
  return (
    <span
      className={cx("inline-block size-1.5 shrink-0 rounded-full", bg[tone], pulse && "agent-beacon", className)}
      aria-hidden
    />
  );
}

// --- empty state -----------------------------------------------------------

/**
 * Nothing-here state: icon puck, title, detail and an optional action.
 * `mark` (legacy) replaces the puck with any node.
 */
export function EmptyState({
  title,
  detail,
  mark,
  icon: Icon,
  action,
  compact = false,
  className,
}: {
  title: string;
  detail?: ReactNode;
  mark?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex h-full flex-col items-center justify-center px-6 text-center",
        compact ? "min-h-[120px] gap-1.5 py-4" : "min-h-[180px] gap-2 py-8",
        className,
      )}
    >
      {mark ??
        (Icon ? (
          <span className="mb-1 flex size-10 items-center justify-center rounded-full border border-muted bg-raised icon-tertiary">
            <Icon size={18} strokeWidth={1.75} aria-hidden />
          </span>
        ) : null)}
      <p className="text-label-md text-secondary">{title}</p>
      {detail ? <p className="max-w-[46ch] text-body-sm text-quaternary">{detail}</p> : null}
      {action ? <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}

// --- skeleton ----------------------------------------------------------------

/**
 * Loading placeholder with a soft shimmer (static under reduced motion).
 * Size it with classes: `<Skeleton className="h-4 w-32" />`.
 */
export function Skeleton({ className, rounded = "md" }: { className?: string; rounded?: "sm" | "md" | "full" }) {
  return (
    <span
      aria-hidden
      className={cx(
        "skeleton block",
        rounded === "full" ? "rounded-full" : rounded === "sm" ? "rounded-sm" : "rounded-md",
        className,
      )}
    />
  );
}

/** Stack of skeleton text lines; the last one is shorter. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span role="status" aria-label="Loading" className={cx("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cx("h-3", i === lines - 1 && lines > 1 ? "w-3/5" : "w-full")} />
      ))}
    </span>
  );
}
