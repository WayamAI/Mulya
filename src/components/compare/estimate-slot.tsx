"use client";

import { useRef } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { PartViewer, type PartVariant } from "@/components/mulya/part-viewer";
import { StatusChip, statusFor } from "@/components/mulya/status-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { useApp } from "@/lib/app-context";
import { PRESET_PART_NUMBERS } from "@/lib/costing/session";
import { cx, formatMoney, formatPct } from "@/lib/format";
import { EstimatePicker, NewBadge, SLOT_NAME } from "./estimate-picker";
import type { CompareEntry, SlotKey } from "./types";

/** Part number → the sample part it is, when it has its own CAD model. */
const MODEL_BY_PART_NUMBER = Object.fromEntries(
  Object.entries(PRESET_PART_NUMBERS).map(([variant, partNumber]) => [partNumber, variant as PartVariant]),
);

/**
 * 3D model for an entry: the part's own CAD model when it is one of the
 * sample parts (a Bearing Housing is a bearing housing whatever its revision
 * is cast by), otherwise the model that stands for its process.
 */
const variantFor = (entry: CompareEntry): PartVariant =>
  MODEL_BY_PART_NUMBER[entry.partNumber] ??
  (entry.process === "Stamping" ? "bracket" : entry.process === "Die cast" ? "cover" : "bearing");

/**
 * One side of the comparison: a compact card with the estimate's identity,
 * its price and a “Change” button that opens the picker. Empty, it is a dashed
 * card that asks for an estimate.
 */
export function EstimateSlot({
  slot,
  entry,
  other,
  session,
  library,
  open,
  onOpenChange,
  onPick,
  onOpenInWorkspace,
  compact,
}: {
  slot: SlotKey;
  entry: CompareEntry | null;
  other: CompareEntry | null;
  session: CompareEntry[];
  library: CompareEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (id: string) => void;
  onOpenInWorkspace: (entry: CompareEntry) => void;
  /** Phone layout: smaller viewer. */
  compact: boolean;
}) {
  const { currency } = useApp();
  const rootRef = useRef<HTMLElement>(null);
  const name = SLOT_NAME[slot];
  const letter = slot.toUpperCase();
  const focus = entry ?? other;

  const close = () => {
    onOpenChange(false);
    rootRef.current?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
  };

  const picker = open ? (
    <EstimatePicker
      slot={slot}
      session={session}
      library={library}
      selectedId={entry?.id ?? null}
      otherId={other?.id ?? null}
      focusPart={focus ? { number: focus.partNumber, name: focus.partName } : null}
      onPick={(id) => {
        onPick(id);
        close();
      }}
      onClose={close}
    />
  ) : null;

  const tag = (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className={cx(
          "inline-flex size-5 items-center justify-center rounded-full text-caption font-semibold",
          slot === "a" ? "bg-raised-2 text-secondary" : "bg-action-primary text-on-color",
        )}
      >
        {letter}
      </span>
      <span className="text-caption tracking-[0.08em] text-quaternary uppercase">
        {name}
        <span className="hidden sm:inline"> ({letter})</span>
      </span>
    </span>
  );

  if (!entry) {
    return (
      <section ref={rootRef} aria-label={`${name} (${letter})`} className="relative min-w-0 flex-1">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
          className="flex h-full min-h-[176px] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-default bg-transparent px-4 py-4 text-center transition-colors duration-[150ms] outline-none hover:border-active hover:bg-raised focus-visible:ring-2 focus-visible:ring-active"
        >
          {tag}
          <Mark id="mark-empty-compare" size={compact ? 72 : 96} className="my-1" />
          <span className="text-label-md text-primary">Choose an estimate</span>
          <span className="text-body-sm text-quaternary">Any revision on file, or one from this session</span>
        </button>
        {picker}
      </section>
    );
  }

  const status = entry.target == null ? null : statusFor(entry.cost, entry.target);

  return (
    <section
      ref={rootRef}
      aria-label={`${name} (${letter}): ${entry.partName} ${entry.label}`}
      className={cx(
        "relative flex min-w-0 flex-1 rounded-xl border bg-container",
        slot === "b" ? "border-default" : "border-muted",
      )}
    >
      <div className="w-28 shrink-0 overflow-hidden rounded-l-xl border-r border-muted sm:w-40">
        <PartViewer variant={variantFor(entry)}height={compact ? 150 : 176} controls={false} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          {tag}
          <Button
              variant="secondary"
            size="sm"
            iconRight={ChevronDown}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`Change the ${name.toLowerCase()} estimate`}
            onClick={() => onOpenChange(!open)}
          >
            Change
          </Button>
        </div>
        <p className="mt-1 flex min-w-0 items-center gap-2">
          <span className="truncate text-heading-sm text-primary">{entry.partName}</span>
          {entry.kind === "session" ? <NewBadge /> : null}
        </p>
        <p className="truncate text-body-sm text-quaternary">
          <span className="tabular">{entry.partNumber}</span> · {entry.label}
          {entry.current ? " · current" : ""} · <span className="tabular">{entry.date}</span>
        </p>
        <p className="truncate text-body-sm text-secondary">
          {entry.process} · {entry.material}
          {entry.spec ? ` · ${entry.spec}` : ""}
        </p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-1">
          <p className="font-display text-display-xl tabular text-primary sm:text-display-2xl">
            {formatMoney(entry.cost, currency)}
          </p>
          <div className="flex items-center gap-2 pb-1">
            {status && entry.target != null ? (
              <StatusChip
                size="sm"
                status={status}
                label={formatPct(((entry.cost - entry.target) / entry.target) * 100)}
                title={`Against target ${formatMoney(entry.target, currency)}`}
              />
            ) : (
              <Badge tone="neutral" variant="outline" size="sm" icon="○">
                No target
              </Badge>
            )}
            <button
              type="button"
              onClick={() => onOpenInWorkspace(entry)}
              aria-label={`Open ${letter} in the estimate workspace`}
              title="Open in the estimate workspace"
              className="inline-flex items-center gap-0.5 rounded-sm text-label-sm text-tertiary outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-active"
            >
              Open {letter}
              <ArrowUpRight size={13} strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </div>
      </div>
      {picker}
    </section>
  );
}
