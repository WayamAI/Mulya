"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type BaseProps = {
  icon: LucideIcon;
  /** Shown when the rail is expanded; always the aria-label when it is not. */
  label: string;
  active?: boolean;
  disabled?: boolean;
  /** Rail state. Collapsed renders a circular icon button only. */
  expanded?: boolean;
  /** Fired after a route link is followed used to close the mobile drawer. */
  onNavigate?: () => void;
};

type SidebarItemProps = BaseProps &
  (
    | { href: string; onClick?: never }
    | { href?: undefined; onClick?: () => void }
  );

function puckClass(active: boolean, disabled: boolean) {
  return [
    "flex size-9 shrink-0 items-center justify-center rounded-full",
    "transition-[background-color,color] duration-[180ms] ease-out",
    active
      ? "bg-action-primary icon-on-color"
      : "bg-action icon-tertiary group-hover:bg-raised-2 group-hover:icon-secondary",
    disabled ? "bg-action-secondary-disabled icon-quaternary" : "",
  ].join(" ");
}

/**
 * One navigation control. Renders as a link when given `href`, otherwise a
 * button, so utility controls and routes share the same visual treatment.
 */
export function SidebarItem({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  expanded = false,
  href,
  onClick,
  onNavigate,
}: SidebarItemProps) {
  const wrapper = [
    "group relative flex items-center rounded-full outline-none",
    "transition-colors duration-[180ms] ease-out",
    "focus-visible:ring-2 focus-visible:ring-active",
    expanded ? "w-full gap-3 pr-3" : "justify-center",
    disabled ? "pointer-events-none" : "",
  ].join(" ");

  const content = (
    <>
      <span className={puckClass(active, disabled)}>
        <Icon size={17} strokeWidth={1.75} aria-hidden />
      </span>
      {expanded ? (
        <span
          className={[
            "truncate text-label-sm transition-colors duration-[180ms]",
            active ? "text-primary" : "text-tertiary group-hover:text-secondary",
          ].join(" ")}
        >
          {label}
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        title={expanded ? undefined : label}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={wrapper}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={expanded ? undefined : label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={wrapper}
    >
      {content}
    </button>
  );
}

export function SidebarTreeLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={[
        "px-3 py-1 text-caption tracking-[0.08em] text-quaternary uppercase",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </p>
  );
}
