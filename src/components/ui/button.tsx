/**
 * The one Mūlya button.
 *
 * Pill, four weights (primary / secondary / ghost / danger), three sizes,
 * optional leading/trailing icon, icon-only (square pill with a tooltip from
 * its aria-label), and a loading state that keeps the width steady.
 *
 * Server-safe: no hooks, no client directive: usable from server pages.
 */

import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  isValidElement,
  type ComponentPropsWithoutRef,
  type ComponentType,
  type ReactNode,
} from "react";

import { cx } from "@/lib/format";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type IconLike = ReactNode | ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const VARIANT: Record<ButtonVariant, string> = {
  primary: [
    "bg-action-primary text-on-color hover:bg-action-primary-hover active:bg-action-primary-focused",
    "disabled:bg-action-primary-disabled disabled:text-on-color/70",
  ].join(" "),
  secondary: [
    "border border-muted bg-action text-secondary hover:border-default hover:bg-raised-2 hover:text-primary active:bg-action-secondary-focused",
    "disabled:border-disabled disabled:bg-action-secondary-disabled disabled:text-quaternary",
  ].join(" "),
  ghost: [
    "text-tertiary hover:bg-action-tertiary-hover hover:text-primary active:bg-action-tertiary-focused",
    "disabled:bg-transparent disabled:text-quaternary",
  ].join(" "),
  danger: [
    "border border-error-stroke bg-error-surface text-error hover:bg-error-badge hover:text-badge hover:border-transparent",
    "disabled:border-disabled disabled:bg-action-secondary-disabled disabled:text-quaternary",
  ].join(" "),
};

const SIZE: Record<ButtonSize, { text: string; icon: string; px: string; iconPx: number }> = {
  sm: { text: "h-8 gap-1.5 text-label-sm", icon: "size-8", px: "px-3", iconPx: 14 },
  md: { text: "h-9 gap-2 text-label-md", icon: "size-9", px: "px-4", iconPx: 15 },
  lg: { text: "h-10 gap-2 text-label-md", icon: "size-10", px: "px-5", iconPx: 16 },
};

/** Ghost buttons sit tighter to text; others keep the full pill padding. */
function padFor(variant: ButtonVariant, size: ButtonSize) {
  if (variant !== "ghost") return SIZE[size].px;
  return size === "lg" ? "px-4" : "px-3";
}

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square pill for a single icon. */
  iconOnly?: boolean;
  fullWidth?: boolean;
  className?: string;
}

/** Class string for anything that should look like a button (links, labels). */
export function buttonClass({
  variant = "primary",
  size = "md",
  iconOnly = false,
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cx(
    "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full whitespace-nowrap select-none",
    "transition-[background-color,border-color,color,box-shadow] duration-[150ms] ease-out outline-none",
    "focus-visible:ring-2 focus-visible:ring-active focus-visible:ring-offset-1 focus-visible:ring-offset-page",
    "disabled:cursor-not-allowed aria-disabled:cursor-not-allowed aria-disabled:pointer-events-none",
    SIZE[size].text,
    iconOnly ? cx(SIZE[size].icon, "px-0") : padFor(variant, size),
    fullWidth && "w-full",
    VARIANT[variant],
    className,
  );
}

function renderIcon(icon: IconLike, px: number): ReactNode {
  if (icon == null || icon === false) return null;
  if (isValidElement(icon) || typeof icon === "string" || typeof icon === "number") return icon as ReactNode;
  if (typeof icon === "function" || (typeof icon === "object" && "render" in (icon as object))) {
    const Icon = icon as ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
    return <Icon size={px} strokeWidth={1.75} aria-hidden className="shrink-0" />;
  }
  return null;
}

type OwnProps = ButtonStyleOptions & {
  /** Leading icon: lucide component (`icon={Plus}`) or element. */
  icon?: IconLike;
  /** Trailing icon, e.g. `ArrowRight`. */
  iconRight?: IconLike;
  /** Shows a spinner, sets aria-busy and blocks clicks. */
  loading?: boolean;
  children?: ReactNode;
};

export type ButtonProps = ComponentPropsWithoutRef<"button"> & OwnProps;

function Inner({
  icon,
  iconRight,
  loading,
  size = "md",
  children,
}: Pick<OwnProps, "icon" | "iconRight" | "loading" | "size" | "children">) {
  const px = SIZE[size].iconPx;
  const lead = renderIcon(icon, px);
  const trail = renderIcon(iconRight, px);
  return (
    <>
      {loading ? (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={px} strokeWidth={2} className="animate-spin motion-reduce:animate-none" />
        </span>
      ) : null}
      <span className={cx("inline-flex items-center gap-[inherit]", loading && "invisible")}>
        {lead}
        {children}
        {trail}
      </span>
    </>
  );
}

/**
 * Pill button. `variant` primary | secondary | ghost | danger (default
 * primary), `size` sm | md | lg (default md). Icon-only when there are no
 * children and an `icon` · give it an `aria-label`; it becomes the tooltip.
 */
export function Button({
  variant = "primary",
  size = "md",
  iconOnly,
  fullWidth,
  icon,
  iconRight,
  loading = false,
  className,
  type = "button",
  disabled,
  title,
  children,
  ...props
}: ButtonProps) {
  const square = iconOnly ?? (children == null && icon != null);
  return (
    <button
      type={type}
      {...props}
      title={title ?? (square ? props["aria-label"] : undefined)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, iconOnly: square, fullWidth, className })}
    >
      <Inner icon={icon} iconRight={iconRight} loading={loading} size={size}>
        {children}
      </Inner>
    </button>
  );
}

/** A Next link that looks like a `Button`. */
export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  iconOnly,
  fullWidth,
  icon,
  iconRight,
  className,
  title,
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof Link>, "children"> & Omit<OwnProps, "loading">) {
  const square = iconOnly ?? (children == null && icon != null);
  return (
    <Link
      href={href}
      {...props}
      title={title ?? (square ? props["aria-label"] : undefined)}
      className={buttonClass({ variant, size, iconOnly: square, fullWidth, className })}
    >
      <Inner icon={icon} iconRight={iconRight} size={size}>
        {children}
      </Inner>
    </Link>
  );
}

/** Tight inline text action, e.g. a panel header's “View all →”. */
export function TextAction({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex cursor-pointer items-center gap-1 rounded-sm text-label-sm text-tertiary transition-colors duration-[150ms] outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-active disabled:cursor-not-allowed disabled:text-quaternary",
        className,
      )}
    >
      {children}
    </button>
  );
}
