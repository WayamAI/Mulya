"use client";

/**
 * Form fields: one look for every input in Mūlya.
 *
 * `Field` wraps a label, hint and error around any control. `Input`,
 * `NumberInput`, `SearchInput` and `SelectInput` share one frame:
 * `bg-container border-muted`, hover `border-default`, focus `ring-active`,
 * optional unit suffix, edited (info) and invalid (error) states.
 */

import { Search } from "lucide-react";
import {
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";

import { cx } from "@/lib/format";

export type FieldSize = "sm" | "md" | "lg";
export type FieldShape = "rounded" | "pill";

const FRAME_SIZE: Record<FieldSize, string> = {
  sm: "h-8 text-body-sm",
  md: "h-9 text-body-md",
  lg: "h-10 text-body-md",
};

export interface FrameOptions {
  size?: FieldSize;
  /** `rounded` = 8px corners (forms), `pill` = toolbar/search fields. */
  shape?: FieldShape;
  /** Value differs from its default: info dot + subtle info surface. */
  edited?: boolean;
  /** Error stroke. A string also renders as the message under a `Field`. */
  invalid?: boolean | string;
  disabled?: boolean;
  /** Resting fill: `container` (forms, default) or `action` (toolbars on the page background). */
  surface?: "container" | "action";
  className?: string;
}

/** Class string for the shared field frame (for bespoke controls). */
export function fieldFrameClass({
  size = "md",
  shape = "rounded",
  edited = false,
  invalid = false,
  disabled = false,
  surface = "container",
  className,
}: FrameOptions = {}): string {
  const rest = surface === "action" ? "bg-action hover:bg-raised-2" : "bg-container";
  return cx(
    "group/field relative flex min-w-0 items-center border transition-[background-color,border-color,box-shadow] duration-[150ms] ease-out",
    "focus-within:ring-2 focus-within:ring-active",
    FRAME_SIZE[size],
    shape === "pill" ? "rounded-full" : "rounded-lg",
    disabled
      ? "cursor-not-allowed border-disabled bg-action-secondary-disabled text-quaternary"
      : invalid
        ? cx("border-error-stroke hover:border-error-icon", rest)
        : edited
          ? "border-info-stroke bg-info-surface hover:border-info-icon"
          : cx("border-muted hover:border-default", rest),
    className,
  );
}

const INNER =
  "h-full min-w-0 flex-1 bg-transparent text-primary outline-none placeholder:text-quaternary disabled:cursor-not-allowed disabled:text-quaternary";

function padX(size: FieldSize, shape: FieldShape) {
  if (shape === "pill") return size === "sm" ? "px-3" : "px-3.5";
  return size === "sm" ? "px-2.5" : "px-3";
}

// --- Field wrapper -------------------------------------------------------------

/**
 * Label + control + hint/error. Pass the control's id as `htmlFor` (or let
 * `Field` generate one via the render-prop form: `children={(id) => …}`).
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  aside,
  className,
  children,
}: {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  /** Error message; shown in place of the hint. */
  error?: ReactNode;
  required?: boolean;
  /** Right side of the label row, e.g. an “Edited · Reset” action. */
  aside?: ReactNode;
  className?: string;
  children: ReactNode | ((id: string) => ReactNode);
}) {
  const auto = useId();
  const id = htmlFor ?? auto;
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      {label || aside ? (
        <div className="flex min-h-4 items-center justify-between gap-2">
          {label ? (
            <label htmlFor={id} className="truncate text-caption tracking-[0.08em] text-quaternary uppercase">
              {label}
              {required ? <span className="ml-0.5 text-error">*</span> : null}
            </label>
          ) : (
            <span />
          )}
          {aside ? <div className="shrink-0 text-caption text-tertiary">{aside}</div> : null}
        </div>
      ) : null}
      {typeof children === "function" ? children(id) : children}
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : hint ? (
        <p className="text-body-sm text-quaternary">{hint}</p>
      ) : null}
    </div>
  );
}

// --- Input --------------------------------------------------------------------

export type InputProps = Omit<ComponentPropsWithoutRef<"input">, "size"> &
  Omit<FrameOptions, "className"> & {
    /** Leading icon or text inside the frame. */
    leading?: ReactNode;
    /** Unit suffix inside the frame, e.g. “€/kg”, “mm”. */
    unit?: ReactNode;
    /** Right-aligned tabular figures. */
    numeric?: boolean;
    /** Class for the outer frame. */
    className?: string;
    /** Class for the `<input>` itself. */
    inputClassName?: string;
    ref?: Ref<HTMLInputElement>;
  };

export function Input({
  size = "md",
  shape = "rounded",
  edited,
  invalid,
  disabled,
  surface,
  leading,
  unit,
  numeric,
  className,
  inputClassName,
  ref,
  ...props
}: InputProps) {
  return (
    <div className={fieldFrameClass({ size, shape, edited, invalid, disabled, surface, className })}>
      {edited && !invalid && !leading ? (
        <span
          aria-hidden
          title="Edited"
          className={cx("size-1.5 shrink-0 rounded-full bg-info-icon", shape === "pill" ? "ml-3" : "ml-2.5")}
        />
      ) : null}
      {leading ? (
        <span className={cx("flex shrink-0 items-center icon-tertiary", shape === "pill" ? "pl-3" : "pl-2.5")}>
          {leading}
        </span>
      ) : null}
      <input
        ref={ref}
        {...props}
        disabled={disabled}
        aria-invalid={invalid ? true : props["aria-invalid"]}
        className={cx(
          INNER,
          padX(size, shape),
          (leading || edited) ? "pl-2" : undefined,
          unit ? "pr-1.5" : undefined,
          numeric && "text-right tabular",
          inputClassName,
        )}
      />
      {unit ? (
        <span
          className={cx(
            "shrink-0 text-body-sm whitespace-nowrap text-quaternary",
            shape === "pill" ? "pr-3.5" : "pr-3",
          )}
        >
          {unit}
        </span>
      ) : null}
    </div>
  );
}

// --- NumberInput ------------------------------------------------------------------

function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[\s,]/g, "").replace(/−/g, "-");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function clamp(n: number, min?: number, max?: number) {
  if (min != null && n < min) return min;
  if (max != null && n > max) return max;
  return n;
}

/**
 * Numeric field: right-aligned tabular figures, unit suffix, ArrowUp/Down
 * steps (Shift ×10), commits on blur and clamps to min/max. Emits `null`
 * when cleared.
 */
export function NumberInput({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  format,
  onBlur,
  onFocus,
  onKeyDown,
  ...props
}: Omit<InputProps, "value" | "onChange" | "type" | "min" | "max" | "step" | "defaultValue"> & {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Display format when not focused (e.g. thousands separators). */
  format?: (value: number) => string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value == null ? "" : format ? format(value) : String(value));

  function nudge(event: KeyboardEvent<HTMLInputElement>, dir: 1 | -1) {
    event.preventDefault();
    const base = parseNumber(draft ?? "") ?? value ?? 0;
    const precision = (String(step).split(".")[1] ?? "").length;
    const next = clamp(Number((base + dir * step * (event.shiftKey ? 10 : 1)).toFixed(precision)), min, max);
    setDraft(String(next));
    onValueChange(next);
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      numeric
      value={shown}
      aria-valuemin={min}
      aria-valuemax={max}
      onFocus={(event) => {
        setDraft(value == null ? "" : String(value));
        onFocus?.(event);
      }}
      onChange={(event) => {
        setDraft(event.target.value);
        const n = parseNumber(event.target.value);
        if (n != null) onValueChange(n);
        else if (event.target.value.trim() === "") onValueChange(null);
      }}
      onBlur={(event) => {
        const n = parseNumber(draft ?? "");
        if (n != null) {
          const clamped = clamp(n, min, max);
          if (clamped !== value) onValueChange(clamped);
        }
        setDraft(null);
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp") nudge(event, 1);
        else if (event.key === "ArrowDown") nudge(event, -1);
        onKeyDown?.(event);
      }}
    />
  );
}

// --- SearchInput --------------------------------------------------------------------

/** Pill search field with a leading magnifier and optional shortcut hint. */
export function SearchInput({
  shortcut,
  shape = "pill",
  placeholder = "Search…",
  ...props
}: Omit<InputProps, "type" | "leading"> & {
  /** Keyboard hint rendered at the right edge, e.g. “Ctrl K”. */
  shortcut?: ReactNode;
}) {
  return (
    <Input
      {...props}
      type="search"
      shape={shape}
      placeholder={placeholder}
      leading={<Search size={14} strokeWidth={1.75} aria-hidden />}
      unit={
        shortcut ? (
          <kbd className="rounded border border-muted px-1 text-caption text-quaternary">{shortcut}</kbd>
        ) : (
          props.unit
        )
      }
      inputClassName={cx("[&::-webkit-search-cancel-button]:hidden", props.inputClassName)}
    />
  );
}

// Selects are custom: see `Dropdown` in ./dropdown.tsx, which uses `fieldFrameClass`.
