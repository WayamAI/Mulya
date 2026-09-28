"use client";

/**
 * Table primitives: one rhythm for every list in Mūlya.
 *
 * - `Table` scrolls horizontally inside its panel (never the page) and,
 *   given `maxHeight`, vertically with a sticky header.
 * - Header: `bg-raised`, caption labels, sortable `TH` with `aria-sort`.
 * - Body: 14px text, ~52px rows, no zebra, `hover:bg-raised`; clickable rows
 *   get a pointer, keyboard activation and a chevron that fades in on hover.
 */

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from "lucide-react";
import {
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cx } from "@/lib/format";

export type SortDir = "asc" | "desc";
export interface SortState<K extends string = string> {
  key: K;
  dir: SortDir;
}
type Align = "left" | "right" | "center";

const ALIGN: Record<Align, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

// --- frame --------------------------------------------------------------------

export function Table({
  children,
  className,
  tableClassName,
  minWidth,
  maxHeight,
  density = "default",
  ...props
}: ComponentPropsWithoutRef<"table"> & {
  /** Classes for the scroll wrapper. */
  className?: string;
  tableClassName?: string;
  /** Minimum table width before it scrolls sideways, e.g. 720 or "48rem". */
  minWidth?: number | string;
  /** Vertical scroll inside the wrapper (keeps the header sticky). */
  maxHeight?: number | string;
  /** `compact` drops rows to ~44px for dense side panels. */
  density?: "default" | "compact";
}) {
  return (
    <div
      data-density={density}
      className={cx("group/table relative min-w-0 overflow-auto overscroll-x-contain", className)}
      style={maxHeight != null ? { maxHeight } : undefined}
    >
      <table
        {...props}
        className={cx("w-full border-separate border-spacing-0 text-left", tableClassName)}
        style={{ minWidth, ...props.style }}
      >
        {children}
      </table>
    </div>
  );
}

export function THead({ children, className, ...props }: ComponentPropsWithoutRef<"thead">) {
  return (
    <thead {...props} className={cx("sticky top-0 z-10", className)}>
      {children}
    </thead>
  );
}

export function TBody({ children, className, ...props }: ComponentPropsWithoutRef<"tbody">) {
  return (
    <tbody {...props} className={cx("[&>tr:last-child>td]:border-b-0", className)}>
      {children}
    </tbody>
  );
}

// --- header cell ---------------------------------------------------------------

/**
 * Header cell. Pass `sort` (current direction for this column, or `null` when
 * sorted by another column) plus `onSort` to make it a sort button.
 */
export function TH({
  children,
  align = "left",
  sort,
  onSort,
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"th">, "align"> & {
  align?: Align;
  sort?: SortDir | null;
  onSort?: () => void;
}) {
  const sortable = onSort != null;
  const Icon = sort === "asc" ? ArrowUp : sort === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <th
      scope="col"
      {...props}
      aria-sort={sortable ? (sort === "asc" ? "ascending" : sort === "desc" ? "descending" : "none") : undefined}
      className={cx(
        "h-10 border-b border-muted bg-raised px-4 align-middle text-caption font-medium tracking-[0.08em] whitespace-nowrap text-quaternary uppercase",
        ALIGN[align],
        className,
      )}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cx(
            "group/sort -mx-1 inline-flex cursor-pointer items-center gap-1 rounded-sm px-1 uppercase transition-colors duration-[150ms] outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-active",
            align === "right" && "flex-row-reverse",
            sort ? "text-secondary" : undefined,
          )}
        >
          <span>{children}</span>
          <Icon
            size={12}
            strokeWidth={1.75}
            aria-hidden
            className={cx(
              "shrink-0 transition-opacity duration-[150ms]",
              sort ? "opacity-100" : "opacity-0 group-hover/sort:opacity-70 group-focus-visible/sort:opacity-70",
            )}
          />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

// --- rows ------------------------------------------------------------------------

/**
 * Body row. With `onClick` it becomes keyboard-activatable (Enter / Space),
 * shows a pointer and lets a trailing `<ChevronCell />` fade in.
 */
export function TR({
  children,
  onClick,
  selected = false,
  className,
  onKeyDown,
  ...props
}: ComponentPropsWithoutRef<"tr"> & { selected?: boolean }) {
  const interactive = onClick != null;
  return (
    <tr
      {...props}
      onClick={onClick}
      tabIndex={interactive ? (props.tabIndex ?? 0) : props.tabIndex}
      aria-selected={selected || undefined}
      onKeyDown={(event: KeyboardEvent<HTMLTableRowElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || !interactive) return;
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.currentTarget.click();
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          (event.currentTarget.nextElementSibling as HTMLElement | null)?.focus();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          (event.currentTarget.previousElementSibling as HTMLElement | null)?.focus();
        }
      }}
      className={cx(
        "group/row transition-colors duration-[150ms] outline-none",
        interactive && "cursor-pointer focus-visible:bg-raised focus-visible:shadow-[inset_2px_0_0_var(--stroke-active)]",
        selected ? "bg-raised-2" : "hover:bg-raised",
        className,
      )}
    >
      {children}
    </tr>
  );
}

// --- cells -------------------------------------------------------------------------

export function TD({
  children,
  align = "left",
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"td">, "align"> & { align?: Align }) {
  return (
    <td
      {...props}
      className={cx(
        "h-13 border-b border-muted px-4 py-2 align-middle text-body-md text-secondary",
        "group-data-[density=compact]/table:h-11",
        ALIGN[align],
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Right-aligned tabular figure. `muted` for secondary figures. */
export function NumCell({
  children,
  muted = false,
  strong = false,
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"td">, "align"> & { muted?: boolean; strong?: boolean }) {
  return (
    <TD
      {...props}
      align="right"
      className={cx(
        "tabular whitespace-nowrap",
        muted ? "text-tertiary" : strong ? "text-label-md text-primary" : "text-primary",
        className,
      )}
    >
      {children}
    </TD>
  );
}

/** Two-line identity cell: name (label-md primary) over a quaternary detail. */
export function PrimaryCell({
  title,
  detail,
  lead,
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"td">, "title" | "children" | "align"> & {
  title: ReactNode;
  detail?: ReactNode;
  /** Leading thumbnail / icon puck. */
  lead?: ReactNode;
}) {
  return (
    <TD {...props} className={className}>
      <div className="flex min-w-0 items-center gap-3">
        {lead ? <span className="shrink-0">{lead}</span> : null}
        <div className="min-w-0">
          <div className="truncate text-label-md text-primary">{title}</div>
          {detail ? <div className="mt-0.5 truncate text-body-sm text-quaternary">{detail}</div> : null}
        </div>
      </div>
    </TD>
  );
}

/** Trailing chevron for clickable rows; visible on hover / focus. */
export function ChevronCell({ className, ...props }: Omit<ComponentPropsWithoutRef<"td">, "children">) {
  return (
    <TD {...props} className={cx("w-10 pr-3 pl-0", className)} align="right">
      <ChevronRight
        size={16}
        strokeWidth={1.75}
        aria-hidden
        className="ml-auto icon-quaternary opacity-0 transition-[opacity,transform] duration-[150ms] group-hover/row:translate-x-0.5 group-hover/row:opacity-100 group-focus-visible/row:opacity-100"
      />
    </TD>
  );
}

// --- sorting ------------------------------------------------------------------------

type SortValue = string | number | boolean | null | undefined | Date;

function compare(a: SortValue, b: SortValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Client-side sort state. `accessors` maps a column key to a sort value.
 *
 * ```tsx
 * const { rows, thProps } = useSort(data, { name: (r) => r.name, cost: (r) => r.cost }, { key: "cost", dir: "desc" });
 * <TH {...thProps("cost")} align="right">Cost</TH>
 * ```
 * First click on a new column sorts numbers descending and text ascending.
 */
export function useSort<T, K extends string>(
  data: readonly T[],
  accessors: Record<K, (row: T) => SortValue>,
  initial: SortState<NoInfer<K>> | null = null,
) {
  const [sort, setSort] = useState<SortState<K> | null>(initial);

  const rows = useMemo(() => {
    if (!sort) return [...data];
    const get = accessors[sort.key];
    const mul = sort.dir === "asc" ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va == null || vb == null) return compare(va, vb);
      return compare(va, vb) * mul;
    });
    // accessors are expected to be stable per render shape
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sort]);

  function toggle(key: K) {
    setSort((prev) => {
      if (prev?.key === key) return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      const sample = data.find((row) => accessors[key](row) != null);
      const numeric = sample != null && typeof accessors[key](sample) === "number";
      return { key, dir: numeric ? "desc" : "asc" };
    });
  }

  function thProps(key: K) {
    return { sort: sort?.key === key ? sort.dir : null, onSort: () => toggle(key) } as const;
  }

  return { rows, sort, setSort, toggle, thProps };
}
