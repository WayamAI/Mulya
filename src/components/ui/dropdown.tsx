"use client";

/**
 * Dropdown: the one custom select in Mūlya.
 *
 * Select-only combobox pattern (WAI-ARIA APG): a button trigger in the shared
 * field frame opens a listbox rendered in a portal, so it never clips inside a
 * scrolling panel or table. Keyboard: ↑ ↓ Home End PageUp PageDown move,
 * Enter / Space pick, Esc closes, Tab picks and moves on, typing jumps to the
 * first match. Long lists get a search box automatically.
 */

import { Check, ChevronDown, Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cx } from "@/lib/format";

import { fieldFrameClass, type FieldShape, type FieldSize } from "./field";

export interface DropdownOption<T extends string = string> {
  value: T;
  label: ReactNode;
  /** Plain text used for search and type-ahead; defaults to `label` when it is a string, else `value`. */
  text?: string;
  /** Second line under the label. */
  description?: ReactNode;
  /** Leading icon or swatch. */
  icon?: ReactNode;
  /** Trailing detail, e.g. a rate or a count. */
  meta?: ReactNode;
  /** Options sharing a group render under one caption header, in first-seen order. */
  group?: string;
  disabled?: boolean;
}

export interface DropdownProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly DropdownOption<T>[];
  /** Accessible name when there is no visible `<label>` (use `id` + `htmlFor` otherwise). */
  "aria-label"?: string;
  id?: string;
  placeholder?: string;
  size?: FieldSize;
  shape?: FieldShape;
  surface?: "container" | "action";
  /** Value differs from its default (info tint). */
  edited?: boolean;
  invalid?: boolean | string;
  disabled?: boolean;
  /** Show a search box in the menu. Defaults to on for more than 8 options. */
  searchable?: boolean;
  /** Menu edge aligned to the trigger. */
  align?: "start" | "end";
  /** Minimum menu width in px; the menu is never narrower than the trigger. */
  menuMinWidth?: number;
  /** Custom trigger content for the selected option. */
  renderValue?: (option: DropdownOption<T> | undefined) => ReactNode;
  /** Adds a hidden input so the value posts with a form. */
  name?: string;
  title?: string;
  className?: string;
  triggerClassName?: string;
}

const MENU_GAP = 6;
const MENU_MAX_HEIGHT = 288;

function optionText<T extends string>(option: DropdownOption<T>): string {
  if (option.text) return option.text;
  return typeof option.label === "string" ? option.label : option.value;
}

export function Dropdown<T extends string = string>({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
  id,
  placeholder = "Select…",
  size = "md",
  shape = "rounded",
  surface,
  edited,
  invalid,
  disabled,
  searchable,
  align = "start",
  menuMinWidth = 0,
  renderValue,
  name,
  title,
  className,
  triggerClassName,
}: DropdownProps<T>) {
  const autoId = useId();
  const triggerId = id ?? `dd-${autoId}`;
  const listId = `${triggerId}-list`;
  const optionId = (index: number) => `${triggerId}-opt-${index}`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ buffer: "", at: 0 });

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
    placement: "below" | "above";
  } | null>(null);

  const withSearch = searchable ?? options.length > 8;
  const selected = options.find((option) => option.value === value);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => optionText(option).toLowerCase().includes(q));
  }, [options, query]);

  const enabledIndex = useCallback(
    (from: number, step: 1 | -1) => {
      for (let i = from; i >= 0 && i < visible.length; i += step) {
        if (!visible[i].disabled) return i;
      }
      return -1;
    },
    [visible],
  );

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP - 8;
    const spaceAbove = rect.top - MENU_GAP - 8;
    const menuHeight = menuRef.current?.offsetHeight ?? MENU_MAX_HEIGHT;
    const placement = spaceBelow < Math.min(menuHeight, 200) && spaceAbove > spaceBelow ? "above" : "below";
    const width = Math.max(rect.width, menuMinWidth);
    const left =
      align === "end"
        ? Math.max(8, rect.right - width)
        : Math.min(rect.left, window.innerWidth - width - 8);
    setPosition({
      left: Math.max(8, left),
      top: placement === "below" ? rect.bottom + MENU_GAP : rect.top - MENU_GAP,
      width,
      maxHeight: Math.max(160, Math.min(MENU_MAX_HEIGHT, placement === "below" ? spaceBelow : spaceAbove)),
      placement,
    });
  }, [align, menuMinWidth]);

  const openMenu = useCallback(
    (focus: "selected" | "first" | "last" = "selected") => {
      if (disabled) return;
      setQuery("");
      const selectedIndex = options.findIndex((option) => option.value === value);
      const start =
        focus === "last"
          ? options.length - 1
          : focus === "first" || selectedIndex < 0
            ? 0
            : selectedIndex;
      let index = start;
      while (index >= 0 && index < options.length && options[index].disabled) index += focus === "last" ? -1 : 1;
      setActive(index);
      setOpen(true);
    },
    [disabled, options, value],
  );

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setQuery("");
    if (refocus) triggerRef.current?.focus();
  }, []);

  const pick = useCallback(
    (index: number, refocus = true) => {
      const option = visible[index];
      if (!option || option.disabled) return;
      if (option.value !== value) onChange(option.value);
      close(refocus);
    },
    [close, onChange, value, visible],
  );

  // Position before paint, then keep it pinned to the trigger.
  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place, visible.length]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => place();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    };
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, place, close]);

  // The menu mounts once it has a position, so focus the search box then.
  const mounted = open && position !== null;
  useEffect(() => {
    if (mounted && withSearch) searchRef.current?.focus();
  }, [mounted, withSearch]);

  // Keep the active option in view.
  useEffect(() => {
    if (!open || active < 0) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function jumpTo(character: string) {
    const now = Date.now();
    const state = typeahead.current;
    state.buffer = now - state.at > 600 ? character : state.buffer + character;
    state.at = now;
    const needle = state.buffer.toLowerCase();
    const from = open ? active + (state.buffer.length === 1 ? 1 : 0) : options.findIndex((o) => o.value === value) + 1;
    const pool = open ? visible : options;
    for (let step = 0; step < pool.length; step++) {
      const index = (Math.max(0, from) + step) % pool.length;
      const option = pool[index];
      if (!option.disabled && optionText(option).toLowerCase().startsWith(needle)) {
        if (open) setActive(index);
        else if (option.value !== value) onChange(option.value);
        return;
      }
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const fromSearch = event.currentTarget === searchRef.current;

    if (!open) {
      if (["ArrowDown", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu(event.key === "ArrowDown" ? "selected" : "selected");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        openMenu("selected");
      } else if (event.key === "Home") {
        event.preventDefault();
        openMenu("first");
      } else if (event.key === "End") {
        event.preventDefault();
        openMenu("last");
      } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        jumpTo(event.key);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const next = enabledIndex(active + 1, 1);
        if (next >= 0) setActive(next);
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        if (event.altKey) {
          pick(active);
          break;
        }
        const prev = enabledIndex(active - 1, -1);
        if (prev >= 0) setActive(prev);
        break;
      }
      case "Home":
        if (fromSearch) return;
        event.preventDefault();
        setActive(enabledIndex(0, 1));
        break;
      case "End":
        if (fromSearch) return;
        event.preventDefault();
        setActive(enabledIndex(visible.length - 1, -1));
        break;
      case "PageDown":
        event.preventDefault();
        setActive(enabledIndex(Math.min(visible.length - 1, active + 8), -1));
        break;
      case "PageUp":
        event.preventDefault();
        setActive(enabledIndex(Math.max(0, active - 8), 1));
        break;
      case "Enter":
        event.preventDefault();
        pick(active);
        break;
      case " ":
        if (fromSearch) return;
        event.preventDefault();
        pick(active);
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        pick(active, false);
        break;
      default:
        if (!fromSearch && event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          jumpTo(event.key);
        }
    }
  }

  /** Option index under a pointer event, via delegation on the listbox. */
  function indexFromEvent(event: MouseEvent<HTMLUListElement>): number {
    const node = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
    return node ? Number(node.dataset.index) : -1;
  }

  function onListClick(event: MouseEvent<HTMLUListElement>) {
    const index = indexFromEvent(event);
    if (index >= 0) pick(index);
  }

  function onListPointerMove(event: MouseEvent<HTMLUListElement>) {
    const index = indexFromEvent(event);
    if (index >= 0 && index !== active && !visible[index]?.disabled) setActive(index);
  }

  // Group headers, in first-seen order.
  const rows: ({ kind: "group"; label: string } | { kind: "option"; option: DropdownOption<T>; index: number })[] = [];
  let lastGroup: string | undefined;
  visible.forEach((option, index) => {
    if (option.group && option.group !== lastGroup) rows.push({ kind: "group", label: option.group });
    lastGroup = option.group;
    rows.push({ kind: "option", option, index });
  });

  const frame = fieldFrameClass({ size, shape, edited, invalid, disabled, surface, className });
  const activeDescendant = open && active >= 0 ? optionId(active) : undefined;

  const menu =
    open && position
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              left: position.left,
              top: position.top,
              width: position.width,
              transform: position.placement === "above" ? "translateY(-100%)" : undefined,
            }}
            className={cx(
              "z-[200] flex flex-col overflow-hidden rounded-xl border border-default bg-container shadow-lg shadow-black/10",
              "origin-top animate-[dropdown-in_120ms_ease-out] motion-reduce:animate-none",
              position.placement === "above" && "origin-bottom",
            )}
          >
            {withSearch ? (
              <div className="border-b border-muted p-1.5">
                <label className="flex h-8 items-center gap-2 rounded-lg bg-raised px-2.5 text-body-md text-primary focus-within:ring-2 focus-within:ring-active">
                  <Search size={13} strokeWidth={1.75} aria-hidden className="shrink-0 icon-tertiary" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setActive(0);
                    }}
                    onKeyDown={onKeyDown}
                    role="combobox"
                    aria-expanded
                    aria-controls={listId}
                    aria-activedescendant={activeDescendant}
                    aria-autocomplete="list"
                    aria-label={`Search ${ariaLabel ?? "options"}`}
                    placeholder="Search…"
                    className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-quaternary"
                  />
                </label>
              </div>
            ) : null}
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              aria-labelledby={ariaLabel ? undefined : triggerId}
              tabIndex={-1}
              onClick={onListClick}
              onPointerMove={onListPointerMove}
              style={{ maxHeight: position.maxHeight - (withSearch ? 45 : 0) }}
              className="overflow-y-auto overscroll-contain p-1 outline-none"
            >
              {rows.length === 0 ? (
                <li className="px-2.5 py-3 text-center text-body-sm text-quaternary">No matches</li>
              ) : (
                rows.map((row) =>
                  row.kind === "group" ? (
                    <li
                      key={`g-${row.label}`}
                      role="presentation"
                      className="px-2.5 pt-2.5 pb-1 text-caption tracking-[0.08em] text-quaternary uppercase first:pt-1"
                    >
                      {row.label}
                    </li>
                  ) : (
                    <li
                      key={row.option.value}
                      id={optionId(row.index)}
                      data-index={row.index}
                      role="option"
                      aria-selected={row.option.value === value}
                      aria-disabled={row.option.disabled || undefined}
                      className={cx(
                        "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-body-md transition-colors duration-[100ms]",
                        row.option.description ? "py-2" : "min-h-8 py-1.5",
                        row.option.disabled
                          ? "cursor-not-allowed text-quaternary"
                          : row.index === active
                            ? "bg-raised-2 text-primary"
                            : "text-secondary",
                        row.option.value === value && !row.option.disabled && "text-primary",
                      )}
                    >
                      {row.option.icon ? <span className="flex shrink-0 items-center">{row.option.icon}</span> : null}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={cx("truncate", row.option.value === value && "font-medium")}>
                          {row.option.label}
                        </span>
                        {row.option.description ? (
                          <span className="truncate text-body-sm text-quaternary">{row.option.description}</span>
                        ) : null}
                      </span>
                      {row.option.meta ? (
                        <span className="shrink-0 text-body-sm tabular text-quaternary">{row.option.meta}</span>
                      ) : null}
                      <Check
                        size={14}
                        strokeWidth={2}
                        aria-hidden
                        className={cx("shrink-0 icon-primary", row.option.value === value ? "opacity-100" : "opacity-0")}
                      />
                    </li>
                  ),
                )
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={frame}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={withSearch ? undefined : activeDescendant}
        aria-label={ariaLabel}
        aria-invalid={invalid ? true : undefined}
        title={title}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
        className={cx(
          "flex h-full min-w-0 flex-1 items-center gap-2 bg-transparent text-left outline-none",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
          shape === "pill" ? "pr-8 pl-3.5" : "pr-8 pl-3",
          triggerClassName,
        )}
      >
        {renderValue ? (
          renderValue(selected)
        ) : selected ? (
          <>
            {selected.icon ? <span className="flex shrink-0 items-center">{selected.icon}</span> : null}
            <span className="min-w-0 flex-1 truncate text-primary">{selected.label}</span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-quaternary">{placeholder}</span>
        )}
      </button>
      <ChevronDown
        size={13}
        strokeWidth={1.75}
        aria-hidden
        className={cx(
          "pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 icon-tertiary transition-transform duration-[150ms]",
          open && "rotate-180",
        )}
      />
      {name ? <input type="hidden" name={name} value={value} /> : null}
      {menu}
    </div>
  );
}

/** Plain string options → `DropdownOption`s, with an optional label formatter. */
export function toOptions<T extends string>(
  values: readonly T[],
  label: (value: T) => ReactNode = (value) => value,
): DropdownOption<T>[] {
  return values.map((value) => {
    const rendered = label(value);
    return { value, label: rendered, text: typeof rendered === "string" ? rendered : value };
  });
}
