/**
 * Legacy control entry point. `Button` now lives in `@/components/ui/button`
 * and the dropdown in `@/components/ui/dropdown`; this module re-exports them
 * so existing imports keep working.
 */

"use client";

import { Dropdown, toOptions } from "@/components/ui/dropdown";

export {
  Button,
  ButtonLink,
  TextAction,
  buttonClass,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/button";

/**
 * Labelled filter dropdown over plain string options. The value `all` renders
 * as “All <label>”, and an active filter is tinted like an edited field.
 */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  className?: string;
}) {
  return (
    <Dropdown
      aria-label={label}
      value={value}
      onChange={onChange}
      options={toOptions(options, (option) => (option === "all" ? `All ${label.toLowerCase()}` : option))}
      shape="pill"
      edited={value !== "all" && value !== ""}
      className={className}
    />
  );
}
