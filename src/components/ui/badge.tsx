/**
 * One badge family for every status in Mūlya.
 *
 * Variants
 * - `soft`    (default) tinted surface, coloured text, 1px tone stroke
 * - `solid`   filled badge colour, white label: for the one thing that must shout
 * - `outline` neutral border, coloured icon · calm, for secondary facts
 * - `dot`     6px dot + label, no chrome: for dense table rows
 *
 * Status is never colour alone: every badge carries a glyph or icon and a
 * label. Glyphs (▲ ● ▼ ○ ✓ ⚠ ✕ ◐) sit in a fixed 10px box so labels align
 * down a column whatever the glyph's natural width.
 *
 * Server-safe: no hooks, no client directive.
 */

import { isValidElement, type ComponentType, type ReactNode } from "react";

import { cx } from "@/lib/format";

export type BadgeTone = "success" | "info" | "neutral" | "warning" | "error" | "brand";
export type BadgeVariant = "soft" | "solid" | "outline" | "dot";
export type BadgeSize = "sm" | "md";

/** A glyph string ("▲"), a rendered node, or a lucide icon component. */
export type BadgeIcon = string | ReactNode | ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const SOFT: Record<BadgeTone, string> = {
  success: "border-success-stroke bg-success-surface text-success",
  info: "border-info-stroke bg-info-surface text-info",
  neutral: "border-neutral-stroke bg-neutral-surface text-neutral",
  warning: "border-warning-stroke bg-warning-surface text-warning",
  error: "border-error-stroke bg-error-surface text-error",
  brand: "border-default bg-raised-2 text-primary",
};

const SOLID: Record<BadgeTone, string> = {
  success: "border-transparent bg-success-badge text-badge",
  info: "border-transparent bg-info-badge text-badge",
  neutral: "border-transparent bg-neutral-badge text-badge",
  warning: "border-transparent bg-warning-badge text-badge",
  error: "border-transparent bg-error-badge text-badge",
  brand: "border-transparent bg-action-primary text-on-color",
};

/** Icon / dot colour for the calm variants. */
const ICON: Record<BadgeTone, string> = {
  success: "text-success-icon",
  info: "text-info-icon",
  neutral: "text-neutral-icon",
  warning: "text-warning-icon",
  error: "text-error-icon",
  brand: "text-primary",
};

const DOT: Record<BadgeTone, string> = {
  success: "bg-success-icon",
  info: "bg-info-icon",
  neutral: "bg-neutral-icon",
  warning: "bg-warning-icon",
  error: "bg-error-icon",
  brand: "bg-action-primary",
};

/** Default glyph per tone, used when no icon is given. */
export const TONE_GLYPH: Record<BadgeTone, string> = {
  success: "✓",
  info: "●",
  neutral: "●",
  warning: "⚠",
  error: "✕",
  brand: "✦",
};

const SIZE: Record<BadgeSize, string> = {
  sm: "h-5 gap-1 px-2 text-caption",
  md: "h-6 gap-1.5 px-2.5 text-label-sm",
};

function renderIcon(icon: BadgeIcon, size: BadgeSize): ReactNode {
  if (icon == null || icon === false || icon === true) return null;
  if (typeof icon === "string" || typeof icon === "number") {
    return (
      <span aria-hidden className="inline-flex size-2.5 shrink-0 items-center justify-center text-[10px] leading-none">
        {icon}
      </span>
    );
  }
  if (isValidElement(icon)) {
    return (
      <span aria-hidden className="inline-flex size-3 shrink-0 items-center justify-center">
        {icon}
      </span>
    );
  }
  if (typeof icon === "function" || (typeof icon === "object" && "render" in (icon as object))) {
    const Icon = icon as ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
    return (
      <span aria-hidden className="inline-flex size-3 shrink-0 items-center justify-center">
        <Icon size={size === "sm" ? 11 : 12} strokeWidth={2} />
      </span>
    );
  }
  return null;
}

export interface BadgeProps {
  children?: ReactNode;
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /**
   * Glyph string, element or lucide component. Omitted → the tone's default
   * glyph; `false` → no icon (only for labels that carry no status meaning).
   */
  icon?: BadgeIcon | false;
  /** Breathing dot/icon for live states (respects reduced motion). */
  pulse?: boolean;
  /** Native tooltip; also a good place for the long form of a short label. */
  title?: string;
  className?: string;
}

/** The single status pill. Everything else in this file maps onto it. */
export function Badge({
  children,
  tone = "neutral",
  variant = "soft",
  size = "md",
  icon,
  pulse = false,
  title,
  className,
}: BadgeProps) {
  const glyph = icon === undefined ? TONE_GLYPH[tone] : icon;
  const pulseClass = pulse ? "agent-beacon" : undefined;

  if (variant === "dot") {
    return (
      <span
        title={title}
        className={cx(
          "inline-flex max-w-full shrink-0 items-center whitespace-nowrap text-secondary",
          size === "sm" ? "h-5 gap-1.5 text-caption" : "h-6 gap-2 text-label-sm",
          className,
        )}
      >
        <span aria-hidden className={cx("size-1.5 shrink-0 rounded-full", DOT[tone], pulseClass)} />
        <span className="min-w-0 truncate">{children}</span>
      </span>
    );
  }

  const chrome =
    variant === "solid"
      ? SOLID[tone]
      : variant === "outline"
        ? "border-default bg-transparent text-secondary"
        : SOFT[tone];

  const iconNode = renderIcon(glyph as BadgeIcon, size);

  return (
    <span
      title={title}
      className={cx(
        "inline-flex max-w-full shrink-0 items-center rounded-full border font-medium whitespace-nowrap transition-colors duration-[150ms]",
        SIZE[size],
        chrome,
        className,
      )}
    >
      {iconNode ? (
        <span className={cx("inline-flex", variant === "outline" && ICON[tone], pulseClass)}>{iconNode}</span>
      ) : null}
      {children != null && children !== false ? <span className="min-w-0 truncate">{children}</span> : null}
    </span>
  );
}

// --- mapped families ----------------------------------------------------------

/** How one domain state renders as a badge. */
export interface BadgeSpec {
  tone: BadgeTone;
  icon: string;
  label: string;
  /** Default variant for this state (e.g. "pending" reads calmer as outline). */
  variant?: BadgeVariant;
  pulse?: boolean;
}

type MappedProps = Omit<BadgeProps, "tone" | "icon" | "children"> & {
  /** Override the label text (the glyph and tone stay). */
  label?: ReactNode;
};

function Mapped({ spec, label, variant, pulse, ...rest }: MappedProps & { spec: BadgeSpec }) {
  return (
    <Badge
      tone={spec.tone}
      icon={spec.icon}
      variant={variant ?? spec.variant ?? "soft"}
      pulse={pulse ?? spec.pulse}
      {...rest}
    >
      {label ?? spec.label}
    </Badge>
  );
}

// Agent run -----------------------------------------------------------------

export type AgentState = "queued" | "working" | "running" | "done" | "waiting" | "blocked";

export const AGENT_STATE_BADGE: Record<AgentState, BadgeSpec> = {
  queued: { tone: "neutral", icon: "○", label: "Queued", variant: "outline" },
  working: { tone: "info", icon: "◐", label: "Working", pulse: true },
  running: { tone: "info", icon: "◐", label: "Working", pulse: true },
  done: { tone: "success", icon: "✓", label: "Done" },
  waiting: { tone: "warning", icon: "●", label: "Waiting on you" },
  blocked: { tone: "error", icon: "▲", label: "Blocked" },
};

export function AgentStateBadge({ state, ...props }: MappedProps & { state: AgentState }) {
  return <Mapped spec={AGENT_STATE_BADGE[state]} {...props} />;
}

// Connectors ------------------------------------------------------------------

/** `available` is the data-layer name for “not connected”. */
export type ConnectorState = "connected" | "available" | "not-connected" | "planned";

export const CONNECTOR_BADGE: Record<ConnectorState, BadgeSpec> = {
  connected: { tone: "success", icon: "●", label: "Connected" },
  available: { tone: "neutral", icon: "○", label: "Not connected", variant: "outline" },
  "not-connected": { tone: "neutral", icon: "○", label: "Not connected", variant: "outline" },
  planned: { tone: "neutral", icon: "◌", label: "Planned", variant: "outline" },
};

export function ConnectorBadge({ status, ...props }: MappedProps & { status: ConnectorState }) {
  return <Mapped spec={CONNECTOR_BADGE[status]} {...props} />;
}

// Process viability ---------------------------------------------------------------

export type ViabilityState = "recommended" | "viable" | "redesign" | "blocked";

export const VIABILITY_BADGE: Record<ViabilityState, BadgeSpec> = {
  recommended: { tone: "success", icon: "✓", label: "Recommended" },
  viable: { tone: "neutral", icon: "●", label: "Viable" },
  redesign: { tone: "warning", icon: "⚠", label: "Needs redesign" },
  blocked: { tone: "error", icon: "✕", label: "Not viable" },
};

export function ViabilityBadge({ viability, ...props }: MappedProps & { viability: ViabilityState }) {
  return <Mapped spec={VIABILITY_BADGE[viability]} {...props} />;
}

// Input provenance ------------------------------------------------------------------

export type ProvenanceState = "read" | "assumed" | "unknown";

export const PROVENANCE_BADGE: Record<ProvenanceState, BadgeSpec> = {
  read: { tone: "success", icon: "✓", label: "Read" },
  assumed: { tone: "warning", icon: "●", label: "Assumed" },
  unknown: { tone: "neutral", icon: "○", label: "Unknown", variant: "outline" },
};

export function ProvenanceBadge({ state, ...props }: MappedProps & { state: ProvenanceState }) {
  return <Mapped spec={PROVENANCE_BADGE[state]} {...props} />;
}

// Run phase -------------------------------------------------------------------

export type PhaseState = "upcoming" | "active" | "done";

export const PHASE_BADGE: Record<PhaseState, BadgeSpec> = {
  upcoming: { tone: "neutral", icon: "○", label: "Upcoming", variant: "outline" },
  active: { tone: "info", icon: "◐", label: "In progress" },
  done: { tone: "success", icon: "✓", label: "Complete" },
};

/** “Phase 1 · Read & route” style chip. */
export function PhaseBadge({
  phase,
  state = "upcoming",
  label,
  ...props
}: MappedProps & { phase?: number | string; state?: PhaseState }) {
  const spec = PHASE_BADGE[state];
  const text = label ?? (phase != null ? `Phase ${phase}` : spec.label);
  return <Mapped spec={spec} label={text} {...props} />;
}

// Cost vs target ------------------------------------------------------------------

/** Cost versus target: over (bad), on, under (good), or no target yet. */
export type TargetStatus = "over" | "on" | "under" | "pending";

export const TARGET_BADGE: Record<TargetStatus, BadgeSpec> = {
  over: { tone: "error", icon: "▲", label: "Over target" },
  on: { tone: "neutral", icon: "●", label: "On target" },
  under: { tone: "success", icon: "▼", label: "Under target" },
  pending: { tone: "neutral", icon: "○", label: "No target", variant: "outline" },
};

/** Target status for a signed variance (%): beyond ±band is over / under. */
export function statusForVariance(pct: number | null | undefined, band = 5): TargetStatus {
  if (pct == null || !Number.isFinite(pct)) return "pending";
  return pct > band ? "over" : pct < -band ? "under" : "on";
}

export function formatSignedPct(pct: number, digits = 1): string {
  const rounded = Number(pct.toFixed(digits));
  if (rounded === 0) return `${(0).toFixed(digits)}%`;
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(digits)}%`;
}

/**
 * Signed variance against target, e.g. `▲ +8.4%`. Tone comes from
 * over / on / under (±`band` %). `null` renders “No target”.
 * `goodWhen="higher"` flips the tones for metrics where up is good.
 */
export function VarianceBadge({
  pct,
  band = 5,
  digits = 1,
  goodWhen = "lower",
  suffix,
  ...props
}: Omit<MappedProps, "label"> & {
  /** Signed percentage (e.g. 8.4 for +8.4 %). */
  pct: number | null | undefined;
  band?: number;
  digits?: number;
  goodWhen?: "lower" | "higher";
  /** Trailing text, e.g. “vs target”. */
  suffix?: ReactNode;
}) {
  const status = statusForVariance(pct, band);
  const base = TARGET_BADGE[status];
  let spec = base;
  if (goodWhen === "higher" && (status === "over" || status === "under")) {
    spec = { ...base, tone: status === "over" ? "success" : "error" };
  }
  const label =
    pct == null || !Number.isFinite(pct) ? (
      base.label
    ) : (
      <span className="tabular">
        {formatSignedPct(pct, digits)}
        {suffix ? <span className="opacity-80"> {suffix}</span> : null}
      </span>
    );
  return <Mapped spec={spec} label={label} {...props} />;
}
