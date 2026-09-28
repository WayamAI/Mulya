"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Section } from "@/components/mulya/page";
import { statusFor, statusTextClass } from "@/components/mulya/status-chip";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/dropdown";
import { Segmented } from "@/components/ui/segmented";
import { NumCell, TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { useApp } from "@/lib/app-context";
import { CATEGORY_LABEL, type AlignedRow, type CostCategory, type Comparison } from "@/lib/costing/compare";
import { cx, formatMoney, formatPct } from "@/lib/format";
import { signedMoney } from "./verdict";
import type { CompareEntry } from "./types";

type Filter = "all" | "changed";
type SortMode = "category" | "change";

const SORT_OPTIONS = [
  { value: "category" as const, label: "Category" },
  { value: "change" as const, label: "Biggest change" },
];

function deltaClass(delta: number) {
  return delta < 0 ? "text-success" : delta > 0 ? "text-error" : "text-quaternary";
}

/** Diverging bar: left (green) for cheaper, right (red) for dearer, scaled to the largest row move. */
function DivergingBar({ delta, scale, share }: { delta: number; scale: number; share: number }) {
  const width = scale ? Math.min(50, (Math.abs(delta) / scale) * 50) : 0;
  return (
    <div className="relative mx-auto h-2 w-full max-w-[140px] min-w-[88px] rounded-full bg-raised-2" title={`${Math.round(share)}% of the total movement`}>
      <span aria-hidden className="absolute top-[-3px] bottom-[-3px] left-1/2 w-px bg-[var(--stroke-default)]" />
      {width > 0 ? (
        <span
          aria-hidden
          className={cx("absolute top-0 bottom-0 rounded-full", delta < 0 ? "bg-success-icon" : "bg-error-icon")}
          style={delta < 0 ? { right: "50%", width: `${width}%` } : { left: "50%", width: `${width}%` }}
        />
      ) : null}
      <span className="sr-only">{Math.round(share)}% of the total movement</span>
    </div>
  );
}

function Money({ value }: { value: number | null }) {
  const { currency } = useApp();
  if (value == null) return <span className="sr-only">not present</span>;
  return <>{formatMoney(value, currency)}</>;
}

/** Line-by-line table, grouped by category with collapsible subtotals. */
export function LineTable({ a, b, comparison }: { a: CompareEntry; b: CompareEntry; comparison: Comparison }) {
  const { currency } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortMode>("category");
  const [collapsed, setCollapsed] = useState<Set<CostCategory>>(new Set());

  const visible = (row: AlignedRow) => filter === "all" || row.change !== "same";
  const scale = Math.max(0, ...comparison.rows.map((r) => Math.abs(r.delta)));
  const gross = comparison.rows.reduce((sum, r) => sum + Math.abs(r.delta), 0);
  const changedCount = comparison.rows.filter((r) => r.change !== "same").length;

  const flat = useMemo(
    () =>
      [...comparison.rows]
        .filter((row) => filter === "all" || row.change !== "same")
        .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)),
    [comparison.rows, filter],
  );

  const toggle = (category: CostCategory) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });

  const row = (r: AlignedRow, showCategory: boolean) => (
    <TR key={r.key}>
      <TD className={cx("pl-5", sort === "category" && "pl-11")}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-primary">
            {r.labelA && r.labelB && r.labelA !== r.labelB ? (
              <>
                <span className="text-tertiary">{r.labelA}</span> <span aria-hidden className="text-quaternary">→</span>
                <span className="sr-only">renamed to</span> {r.labelB}
              </>
            ) : (
              r.label
            )}
          </span>
          {r.key === "unallocated" ? (
            <Badge tone="neutral" variant="outline" size="sm" icon={false} title="Gap between the recorded lines and the price on file">
              Reconciliation
            </Badge>
          ) : r.change === "added" ? (
            <Badge tone="neutral" size="sm" icon={false}>
              Added
            </Badge>
          ) : r.change === "removed" ? (
            <Badge tone="neutral" size="sm" icon={false}>
              Removed
            </Badge>
          ) : null}
          {showCategory ? <span className="text-body-sm text-quaternary">{CATEGORY_LABEL[r.category]}</span> : null}
        </div>
      </TD>
      <NumCell muted>
        <Money value={r.a} />
      </NumCell>
      <NumCell>
        <Money value={r.b} />
      </NumCell>
      <NumCell className={deltaClass(r.delta)}>{r.delta === 0 ? formatMoney(0, currency) : signedMoney(r.delta, currency)}</NumCell>
      <NumCell className={cx("text-body-sm", r.deltaPct == null ? "text-quaternary" : deltaClass(r.delta))}>
        {r.key === "unallocated" ? null : r.deltaPct == null || r.delta === 0 ? (r.delta === 0 ? "0.0%" : <span className="sr-only">no baseline</span>) : formatPct(r.deltaPct)}
      </NumCell>
      <TD className="pr-5">
        <DivergingBar delta={r.delta} scale={scale} share={gross ? (Math.abs(r.delta) / gross) * 100 : 0} />
      </TD>
    </TR>
  );

  const target = b.target ?? a.target;

  return (
    <Section
      title="Line by line"
      count={comparison.rows.length}
      bodyClassName="p-0"
      action={
        <div className="flex items-center gap-2">
          <Segmented<Filter>
            size="sm"
            ariaLabel="Lines to show"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All lines" },
              { value: "changed", label: "Changed only", count: changedCount },
            ]}
          />
          <Dropdown<SortMode>
            size="sm"
            shape="pill"
            aria-label="Sort lines"
            value={sort}
            onChange={setSort}
            options={SORT_OPTIONS}
            renderValue={(option) => <span className="text-label-sm">Sort: {option?.label}</span>}
            className="hidden sm:flex"
            menuMinWidth={170}
            align="end"
          />
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2 border-b border-muted px-4 py-2 sm:hidden">
        <span className="text-caption tracking-[0.08em] text-quaternary uppercase">Sort</span>
        <Dropdown<SortMode> size="sm" shape="pill" aria-label="Sort lines" value={sort} onChange={setSort} options={SORT_OPTIONS} align="end" />
      </div>
      <Table minWidth={760} aria-label="Cost lines, baseline A against candidate B">
        <THead>
          <tr>
            <TH className="pl-5">Line</TH>
            <TH align="right">A · {a.label}</TH>
            <TH align="right">B · {b.label}</TH>
            <TH align="right">Δ {currency === "EUR" ? "€" : currency}</TH>
            <TH align="right">Δ %</TH>
            <TH align="center" className="pr-5">
              Share of change
            </TH>
          </tr>
        </THead>
        <TBody>
          {sort === "category"
            ? comparison.categories.map((cat) => {
                const rows = cat.rows.filter(visible);
                if (rows.length === 0) return null;
                const open = !collapsed.has(cat.category);
                return (
                  <Fragment key={cat.category}>
                    <tr className="bg-raised/60">
                      <TD className="pl-3">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => toggle(cat.category)}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-sm px-1 text-label-md text-primary outline-none focus-visible:ring-2 focus-visible:ring-active"
                        >
                          <ChevronRight
                            size={14}
                            strokeWidth={1.75}
                            aria-hidden
                            className={cx("icon-tertiary transition-transform duration-[150ms]", open && "rotate-90")}
                          />
                          {cat.label}
                          <span className="text-caption tabular text-quaternary">{rows.length}</span>
                        </button>
                      </TD>
                      <NumCell muted className="text-label-md">{formatMoney(cat.a, currency)}</NumCell>
                      <NumCell strong>{formatMoney(cat.b, currency)}</NumCell>
                      <NumCell className={cx("text-label-md", deltaClass(cat.delta))}>
                        {cat.delta === 0 ? formatMoney(0, currency) : signedMoney(cat.delta, currency)}
                      </NumCell>
                      <NumCell className={cx("text-body-sm", deltaClass(cat.delta))}>
                        {cat.a ? formatPct((cat.delta / Math.abs(cat.a)) * 100) : null}
                      </NumCell>
                      <TD className="pr-5">
                        <DivergingBar delta={cat.delta} scale={Math.max(scale, ...comparison.categories.map((c) => Math.abs(c.delta)))} share={gross ? (Math.abs(cat.delta) / gross) * 100 : 0} />
                      </TD>
                    </tr>
                    {open ? rows.map((r) => row(r, false)) : null}
                  </Fragment>
                );
              })
            : flat.map((r) => row(r, true))}
          <tr>
            <TD className="h-14 border-t border-default bg-raised pl-5 text-label-md text-primary">Total</TD>
            <TD align="right" className="border-t border-default bg-raised font-display text-display-base tabular whitespace-nowrap text-tertiary">
              {formatMoney(comparison.totalA, currency)}
            </TD>
            <TD align="right" className="border-t border-default bg-raised font-display text-display-base tabular whitespace-nowrap text-primary">
              {formatMoney(comparison.totalB, currency)}
            </TD>
            <TD align="right" className={cx("border-t border-default bg-raised font-display text-display-base tabular whitespace-nowrap", deltaClass(comparison.delta))}>
              {signedMoney(comparison.delta, currency)}
            </TD>
            <TD align="right" className={cx("border-t border-default bg-raised text-label-md tabular", deltaClass(comparison.delta))}>
              {formatPct(comparison.deltaPct)}
            </TD>
            <TD className="border-t border-default bg-raised pr-5" />
          </tr>
          {target != null ? (
            <tr>
              <TD className="pl-5">
                vs target{" "}
                {a.target != null && b.target != null && a.target !== b.target ? (
                  <span className="tabular">
                    (A {formatMoney(a.target, currency)} · B {formatMoney(b.target, currency)})
                  </span>
                ) : (
                  <span className="tabular">{formatMoney(target, currency)}</span>
                )}
              </TD>
              {[a, b].map((entry) => {
                const own = entry.target ?? target;
                return (
                  <NumCell key={entry.id}>
                    <span className={cx("text-label-md", statusTextClass(statusFor(entry.cost, own)))}>
                      {formatPct(((entry.cost - own) / own) * 100)}
                    </span>
                  </NumCell>
                );
              })}
              <TD />
              <TD />
              <TD className="pr-5" />
            </tr>
          ) : null}
        </TBody>
      </Table>
      {a.derived || b.derived || comparison.rows.some((r) => r.key === "unallocated") ? (
        <div className="flex flex-col gap-1 border-t border-muted px-5 py-3 text-body-sm text-quaternary">
          {comparison.rows.some((r) => r.key === "unallocated") ? (
            <p>
              Unallocated to lines: the recorded lines do not add up to the price on file, so the gap is shown as its own
              line and the totals stay the prices on file.
            </p>
          ) : null}
          {a.derived || b.derived ? (
            <p>
              Derived lines are split from the estimate&apos;s total using process-typical proportions and the rates in
              Rate Master. Material and the return credit are computed from mass; the total is the figure on file.
            </p>
          ) : null}
        </div>
      ) : null}
    </Section>
  );
}
