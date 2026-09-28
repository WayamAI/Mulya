import {
  Badge,
  TARGET_BADGE,
  statusForVariance,
  type BadgeSize,
  type BadgeVariant,
  type TargetStatus,
} from "@/components/ui/badge";
import type { StatusTone } from "@/components/ui/primitives";

export type { TargetStatus };
export { VarianceBadge, formatSignedPct, statusForVariance } from "@/components/ui/badge";

/** Chronos feedback tone per status. */
export const STATUS_TONE: Record<TargetStatus, StatusTone> = {
  over: "error",
  on: "neutral",
  under: "success",
  pending: "neutral",
};

/**
 * Glyph, label and the legacy soft-pill class string per status. New code
 * should render `<StatusChip>` / `<Badge>` rather than use `className`.
 */
export const STATUS_META: Record<TargetStatus, { icon: string; label: string; className: string }> = {
  over: { icon: "▲", label: "Over target", className: "text-error bg-error-surface border-error-stroke" },
  on: { icon: "●", label: "On target", className: "text-neutral bg-neutral-surface border-neutral-stroke" },
  under: { icon: "▼", label: "Under target", className: "text-success bg-success-surface border-success-stroke" },
  pending: { icon: "○", label: "No target", className: "text-quaternary bg-transparent border-default" },
};

/** Status from cost vs target: more than ±5 % off is over / under. */
export function statusFor(cost: number, target: number | null | undefined): TargetStatus {
  if (target == null || target === 0) return "pending";
  return statusForVariance(((cost - target) / target) * 100);
}

/** Text colour class for a status (figures, arrows). */
export function statusTextClass(status: TargetStatus): string {
  return status === "over"
    ? "text-error"
    : status === "under"
      ? "text-success"
      : status === "on"
        ? "text-neutral"
        : "text-quaternary";
}

/** The glyph for a status: ▲ ● ▼ ○. */
export function statusIcon(status: TargetStatus): string {
  return STATUS_META[status].icon;
}

/**
 * Target status pill: glyph + label (Over / On / Under target, No target).
 * Built on the shared `Badge`, so it matches every other status in the app.
 */
export function StatusChip({
  status,
  label,
  size = "md",
  variant,
  className,
  title,
}: {
  status: TargetStatus;
  /** Replaces the label text, e.g. a signed variance “+8.4 %”. */
  label?: string;
  size?: BadgeSize;
  variant?: BadgeVariant;
  className?: string;
  title?: string;
}) {
  const spec = TARGET_BADGE[status];
  return (
    <Badge
      tone={spec.tone}
      icon={spec.icon}
      variant={variant ?? spec.variant ?? "soft"}
      size={size}
      className={className}
      title={title ?? (label ? spec.label : undefined)}
    >
      <span className={label ? "tabular" : undefined}>{label ?? spec.label}</span>
    </Badge>
  );
}
