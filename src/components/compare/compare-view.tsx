"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, Check, Download, Link2, Plus } from "lucide-react";
import { PageBody, PageHeader, Section } from "@/components/mulya/page";
import { Button, ButtonLink } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { EmptyState } from "@/components/ui/primitives";
import { useApp } from "@/lib/app-context";
import { CATEGORY_LABEL, compareEstimates, type Comparison } from "@/lib/costing/compare";
import { CURRENCIES, cx, type Currency } from "@/lib/format";
import { ROUTE_MARK } from "@/lib/marks";
import { CostWalk } from "./cost-walk";
import { defaultPair, suggestions, useCompareEntries } from "./entries";
import { EstimateSlot } from "./estimate-slot";
import { LineTable } from "./line-table";
import { Movers } from "./movers";
import { SpecDiff } from "./spec-diff";
import type { CompareEntry, SlotKey } from "./types";
import { useMedia } from "./use-media";
import { KpiStrip, VerdictBanner } from "./verdict";

const csvCell = (value: string | number | null) => {
  if (value == null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

function comparisonCsv(a: CompareEntry, b: CompareEntry, comparison: Comparison, currency: Currency): string {
  const rate = CURRENCIES[currency].rate;
  const money = (value: number | null) => (value == null ? null : (value * rate).toFixed(2));
  const pct = (value: number | null) => (value == null ? null : value.toFixed(1));
  const rows: (string | number | null)[][] = [
    ["Baseline (A)", `${a.partName} ${a.partNumber} ${a.label}`, `${a.process} ${a.material}`, a.date],
    ["Candidate (B)", `${b.partName} ${b.partNumber} ${b.label}`, `${b.process} ${b.material}`, b.date],
    [],
    ["Category", "Line", "A line", "B line", `A (${currency})`, `B (${currency})`, `Delta (${currency})`, "Delta %", "Change"],
  ];
  for (const category of comparison.categories) {
    for (const row of category.rows) {
      rows.push([
        CATEGORY_LABEL[row.category],
        row.label,
        row.labelA,
        row.labelB,
        money(row.a),
        money(row.b),
        money(row.delta),
        pct(row.deltaPct),
        row.change,
      ]);
    }
    rows.push([category.label, "Subtotal", null, null, money(category.a), money(category.b), money(category.delta), null, null]);
  }
  rows.push(["Total", "Total", null, null, money(comparison.totalA), money(comparison.totalB), money(comparison.delta), pct(comparison.deltaPct), null]);
  const target = b.target ?? a.target;
  if (target != null) {
    const vs = (entry: CompareEntry) => {
      const own = entry.target ?? target;
      return pct(((entry.cost - own) / own) * 100);
    };
    rows.push(["Target", `vs target ${money(target)}`, null, null, vs(a), vs(b), null, null, null]);
  }
  rows.push(["Annual", `Impact at ${comparison.volume} pcs/yr`, null, null, null, null, money(comparison.annualImpact), null, null]);
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

/** Compare Estimates v2: any two estimates, a verdict above the fold, and where the money moved. */
export function CompareView() {
  const { currency, setFlow } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const compact = useMedia("(max-width: 639px)");
  const { library, session, all } = useCompareEntries();

  const fallback = defaultPair(library, session);
  const aId = params.get("a") ?? fallback.a;
  const bId = params.get("b") ?? fallback.b;
  const a = all.find((entry) => entry.id === aId) ?? null;
  const b = all.find((entry) => entry.id === bId) ?? null;

  const [openSlot, setOpenSlot] = useState<SlotKey | null>(null);
  const [copied, setCopied] = useState(false);

  const pairKey = `${a?.id ?? ""}|${b?.id ?? ""}`;
  const [volumeEdit, setVolumeEdit] = useState<{ pair: string; value: number } | null>(null);
  const defaultVolume = b?.annualVolume ?? a?.annualVolume ?? 1000;
  const volume = volumeEdit?.pair === pairKey ? volumeEdit.value : defaultVolume;

  const comparison = useMemo(() => (a && b ? compareEstimates(a, b, volume) : null), [a, b, volume]);

  const setPair = useCallback(
    (nextA: string, nextB: string) => {
      const query = new URLSearchParams({ a: nextA, b: nextB });
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  const pick = (slot: SlotKey, id: string) => {
    if (slot === "a") setPair(id, id === bId ? aId : bId);
    else setPair(id === aId ? bId : aId, id);
  };

  const swap = () => setPair(bId, aId);

  const shareUrl = () => `${window.location.origin}${pathname}?${new URLSearchParams({ a: aId, b: bId }).toString()}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const downloadCsv = () => {
    if (!a || !b || !comparison) return;
    const blob = new Blob([comparisonCsv(a, b, comparison, currency)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `compare-${a.partNumber}-${a.rev ?? "new"}-vs-${b.partNumber}-${b.rev ?? "new"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const openInWorkspace = (entry: CompareEntry) => {
    setFlow({
      preset: entry.preset,
      process: entry.processKey,
      material: entry.kind === "session" ? entry.material : null,
      manual: false,
      comparing: false,
      confirmed: true,
      scenarioId: "base",
      tab: "part",
      unknowns: [],
      source:
        entry.kind === "file"
          ? {
              name: entry.partName,
              number: entry.partNumber,
              revision: entry.rev ?? "",
              date: entry.isoDate,
              engineer: entry.engineer ?? "",
            }
          : null,
    });
    router.push("/estimate");
  };

  const chips = suggestions(library, session);

  const slot = (key: SlotKey) => (
    <EstimateSlot
      slot={key}
      entry={key === "a" ? a : b}
      other={key === "a" ? b : a}
      session={session}
      library={library}
      open={openSlot === key}
      onOpenChange={(open) => setOpenSlot(open ? key : null)}
      onPick={(id) => pick(key, id)}
      onOpenInWorkspace={openInWorkspace}
      compact={compact}
    />
  );

  return (
    <>
      <PageHeader
        title="Compare Estimates"
        mark={<Mark id={ROUTE_MARK["/compare"]} size={44} />}
        subtitle="Any two estimates side by side: the verdict, where the money moved, and why"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={copied ? Check : Link2} onClick={copyLink} aria-live="polite">
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button variant="secondary" size="sm" icon={Download} onClick={downloadCsv} disabled={!comparison}>
              <span className="hidden sm:inline">Download </span>CSV
            </Button>
          </div>
        }
      />
      <PageBody>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-stretch gap-2 md:flex-row md:gap-3">
            {slot("a")}
            <div className="flex items-center justify-center">
              <Button
                variant="secondary"
                size="md"
                icon={<ArrowLeftRight size={15} strokeWidth={1.75} aria-hidden className="rotate-90 md:rotate-0" />}
                aria-label="Swap baseline and candidate"
                onClick={swap}
                disabled={!aId && !bId}
              />
            </div>
            {slot("b")}
          </div>

          {chips.length ? (
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
              <span className="shrink-0 text-caption tracking-[0.08em] text-quaternary uppercase">Suggested</span>
              {chips.map((chip) => {
                const active = chip.a === aId && chip.b === bId;
                return (
                  <button
                    key={`${chip.a}|${chip.b}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPair(chip.a, chip.b)}
                    className={cx(
                      "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-label-sm whitespace-nowrap transition-colors duration-[150ms] outline-none focus-visible:ring-2 focus-visible:ring-active",
                      active
                        ? "border-default bg-raised-2 text-primary"
                        : "border-muted bg-action text-tertiary hover:border-default hover:text-primary",
                    )}
                  >
                    {active ? <Check size={12} strokeWidth={2} aria-hidden /> : null}
                    {chip.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {a && b && comparison ? (
            <>
              <VerdictBanner a={a} b={b} comparison={comparison} />
              <KpiStrip
                a={a}
                b={b}
                comparison={comparison}
                volume={volume}
                onVolume={(value) => setVolumeEdit({ pair: pairKey, value })}
              />

              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
                <Section title="Cost walk" bodyClassName="px-3 pt-4 pb-3 sm:px-4">
                  <CostWalk walk={comparison.walk} labelA={`A · ${a.label}`} labelB={`B · ${b.label}`} />
                </Section>
                <Movers a={a} b={b} comparison={comparison} />
              </div>

              <SpecDiff a={a} b={b} />
              <LineTable a={a} b={b} comparison={comparison} />
            </>
          ) : (
            <section className="rounded-xl border border-dashed border-default">
              <EmptyState
                mark={<Mark id="mark-empty-compare" size={112} className="mb-2" />}
                title={a || b ? "Choose one more estimate" : "Choose two estimates"}
                detail="Pick a baseline and a candidate above: any revision on file, or an estimate you produced in this session. Or start from a suggestion."
                action={
                  <>
                    <Button variant="primary" onClick={() => setOpenSlot(a ? "b" : "a")}>
                      Choose an estimate
                    </Button>
                    <ButtonLink href="/new-estimate" icon={Plus}>
                      New estimate
                    </ButtonLink>
                  </>
                }
                className="py-12"
              />
            </section>
          )}
        </div>
      </PageBody>
    </>
  );
}
