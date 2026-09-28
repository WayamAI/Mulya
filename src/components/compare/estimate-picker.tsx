"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, Plus, SearchX, Sparkles, X } from "lucide-react";
import { Badge, type BadgeSize } from "@/components/ui/badge";
import { Button, TextAction } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/field";
import { Mark } from "@/components/ui/mark";
import { EmptyState } from "@/components/ui/primitives";
import { useApp } from "@/lib/app-context";
import { cx, formatMoney } from "@/lib/format";
import { PROCESS_NAME_MARK } from "@/lib/marks";
import type { CompareEntry, SlotKey } from "./types";

/** Solid “new” tag used on session estimates. */
export function NewBadge({ children = "new", size = "sm" }: { children?: ReactNode; size?: BadgeSize }) {
  return (
    <Badge tone="brand" variant="solid" size={size} icon={Sparkles}>
      {children}
    </Badge>
  );
}

export const SLOT_NAME: Record<SlotKey, string> = { a: "Baseline", b: "Candidate" };

function matches(entry: CompareEntry, needle: string) {
  return (
    !needle ||
    [entry.partName, entry.partNumber, entry.label, entry.process, entry.material]
      .join(" ")
      .toLowerCase()
      .includes(needle)
  );
}

/**
 * Picker popover (a bottom sheet on phones) for one slot: searchable, grouped
 * “This session” / “Revisions of <part>” / “Library”. Combobox keyboard model:
 * type to filter, ↑ ↓ to move, Enter to pick, Esc to close.
 */
export function EstimatePicker({
  slot,
  session,
  library,
  selectedId,
  otherId,
  focusPart,
  onPick,
  onClose,
}: {
  slot: SlotKey;
  session: CompareEntry[];
  library: CompareEntry[];
  selectedId: string | null;
  otherId: string | null;
  /** Part whose revisions get their own group. */
  focusPart: { number: string; name: string } | null;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const { currency } = useApp();
  const baseId = useId();
  const listId = `${baseId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  // -1 until the user moves: then the current pick is the active row.
  const [active, setActive] = useState(-1);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const revisions = focusPart ? library.filter((e) => e.partNumber === focusPart.number) : [];
    const rest = focusPart ? library.filter((e) => e.partNumber !== focusPart.number) : library;
    return [
      { key: "session", title: "This session", entries: session.filter((e) => matches(e, needle)) },
      ...(focusPart
        ? [
            {
              key: "revisions",
              title: `Revisions of ${focusPart.name}`,
              entries: revisions.filter((e) => matches(e, needle)).sort((x, y) => x.isoDate.localeCompare(y.isoDate)),
            },
          ]
        : []),
      { key: "library", title: "Library", entries: rest.filter((e) => matches(e, needle)) },
    ];
  }, [query, session, library, focusPart]);

  const flat = useMemo(() => groups.flatMap((g) => g.entries), [groups]);
  const selectedIndex = Math.max(0, flat.findIndex((e) => e.id === selectedId));
  const activeIndex = Math.min(active < 0 ? selectedIndex : active, Math.max(0, flat.length - 1));

  // Open on the current pick.
  useEffect(() => {
    inputRef.current?.focus();
    const at = flat.findIndex((e) => e.id === selectedId);
    if (at >= 0) {
      requestAnimationFrame(() => scrollToRow(at, true));
    }
    // Only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [onClose]);

  /** Scroll inside the list only (never the page), clearing the sticky group caption. */
  function scrollToRow(at: number, center: boolean) {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-index="${at}"]`);
    if (!list || !row) return;
    const caption = 32;
    if (center) list.scrollTop = row.offsetTop - list.clientHeight / 2 + row.offsetHeight / 2;
    else if (row.offsetTop - caption < list.scrollTop) list.scrollTop = row.offsetTop - caption;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
  }

  function move(to: number) {
    const next = Math.max(0, Math.min(flat.length - 1, to));
    setActive(next);
    scrollToRow(next, false);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(activeIndex - 1);
    } else if (event.key === "Home" && event.ctrlKey) {
      event.preventDefault();
      move(0);
    } else if (event.key === "End" && event.ctrlKey) {
      event.preventDefault();
      move(flat.length - 1);
    } else if (event.key === "PageDown") {
      event.preventDefault();
      move(activeIndex + 8);
    } else if (event.key === "PageUp") {
      event.preventDefault();
      move(activeIndex - 8);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const entry = flat[activeIndex];
      if (entry) onPick(entry.id);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Tab") {
      onClose();
    }
  }

  let index = -1;

  return (
    <>
      <div aria-hidden className="fixed inset-0 z-40 bg-black/30 sm:hidden" />
      <div
        ref={rootRef}
        role="dialog"
        aria-label={`Choose the ${SLOT_NAME[slot].toLowerCase()} estimate`}
        onKeyDown={onKeyDown}
        className={cx(
          "z-50 flex flex-col overflow-hidden border border-default bg-container shadow-[0_12px_40px_rgba(0,0,0,0.18)]",
          "fixed inset-x-0 bottom-0 max-h-[82vh] rounded-t-2xl",
          "sm:absolute sm:inset-x-0 sm:top-[calc(100%+8px)] sm:bottom-auto sm:max-h-[min(520px,70vh)] sm:rounded-xl",
        )}
      >
        <div className="flex items-center gap-2 border-b border-muted p-3">
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder="Search part, number, revision, process or material"
            aria-label={`Search estimates for the ${SLOT_NAME[slot].toLowerCase()}`}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={flat[activeIndex] ? `${baseId}-opt-${activeIndex}` : undefined}
            className="flex-1"
          />
          <Button variant="ghost" size="sm" icon={X} aria-label="Close" onClick={onClose} />
        </div>

        <div ref={listRef} id={listId} role="listbox" aria-label="Estimates" className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
          {flat.length === 0 && query ? (
            <EmptyState
              icon={SearchX}
              compact
              title={`No estimates match “${query}”`}
              action={<TextAction onClick={() => setQuery("")}>Clear search</TextAction>}
              className="py-8"
            />
          ) : null}
          {groups.map((group) => {
            if (group.entries.length === 0 && !(group.key === "session" && !query)) return null;
            return (
              <div key={group.key} role="group" aria-labelledby={`${baseId}-${group.key}`}>
                <p
                  id={`${baseId}-${group.key}`}
                  className="sticky top-0 z-10 flex h-8 items-center justify-between bg-raised px-4 text-caption tracking-[0.08em] text-quaternary uppercase"
                >
                  <span className="truncate">{group.title}</span>
                  <span className="tabular">{group.entries.length}</span>
                </p>
                {group.key === "session" && group.entries.length === 0 ? (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Mark id="mark-empty-compare" size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="text-label-md text-secondary">No new estimates yet</p>
                      <p className="text-body-sm text-quaternary">Anything you calculate in this session shows up here.</p>
                    </div>
                    <Link
                      href="/new-estimate"
                      className="inline-flex shrink-0 items-center gap-1 rounded-sm text-label-sm text-secondary outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-active"
                    >
                      <Plus size={13} strokeWidth={1.75} aria-hidden />
                      New estimate
                    </Link>
                  </div>
                ) : null}
                {group.entries.map((entry) => {
                  index += 1;
                  const i = index;
                  const selected = entry.id === selectedId;
                  const inOther = entry.id === otherId;
                  const isActive = i === activeIndex;
                  return (
                    <div
                      key={entry.id}
                      id={`${baseId}-opt-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={selected}
                      onPointerMove={() => active !== i && setActive(i)}
                      onClick={() => onPick(entry.id)}
                      className={cx(
                        "flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2 transition-colors duration-[100ms]",
                        isActive ? "bg-raised-2" : undefined,
                        selected && "shadow-[inset_2px_0_0_var(--stroke-active)]",
                      )}
                    >
                      <Mark id={PROCESS_NAME_MARK[entry.process]} size={22} framed />
                      <span className="min-w-0 flex-[1.4]">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-label-md text-primary">{entry.partName}</span>
                          {entry.kind === "session" ? <NewBadge /> : null}
                          {inOther ? (
                            <Badge tone="neutral" variant="outline" size="sm" icon={false}>
                              {slot === "a" ? "Candidate" : "Baseline"}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="block truncate text-body-sm text-quaternary">
                          <span className="tabular">{entry.partNumber}</span> · {entry.label}
                          {entry.current ? " · current" : ""}
                        </span>
                      </span>
                      <span className="hidden min-w-0 flex-1 sm:block">
                        <span className="block truncate text-body-sm text-secondary">
                          {entry.process} · {entry.material}
                        </span>
                        <span className="block truncate text-body-sm tabular text-quaternary">{entry.date}</span>
                      </span>
                      <span className="w-20 shrink-0 text-right text-label-md tabular text-primary">
                        {formatMoney(entry.cost, currency)}
                      </span>
                      <span aria-hidden className="flex w-4 shrink-0 justify-center text-primary">
                        {selected ? <Check size={14} strokeWidth={2.25} /> : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <p className="hidden border-t border-muted px-4 py-2 text-caption text-quaternary sm:block">
          ↑ ↓ to move · Enter to choose · Esc to close
        </p>
      </div>
    </>
  );
}
