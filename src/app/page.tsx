"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ButtonLink, FilterSelect } from "@/components/mulya/controls";
import { PageBody, PageHeader, Section } from "@/components/mulya/page";
import { StatusChip } from "@/components/mulya/status-chip";
import { MarkedTitle } from "@/components/estimate/marked-title";
import { FeaturedPart } from "@/components/dashboard/featured-part";
import { useOpenPartEstimate } from "@/components/dashboard/use-open-part";
import { VarianceChart } from "@/components/dashboard/variance-chart";
import { Badge, VarianceBadge, type BadgeTone } from "@/components/ui/badge";
import { Mark } from "@/components/ui/mark";
import { KpiTile } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/segmented";
import { ChevronCell, NumCell, PrimaryCell, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useApp } from "@/lib/app-context";
import { MONTHLY_DRIFT } from "@/lib/costing/estimate";
import { PARTS, PROCESSES, PROGRAMMES, partStatus, variancePct, type Part } from "@/lib/costing/parts";
import { formatMoney, formatPct } from "@/lib/format";
import { ROUTE_MARK } from "@/lib/marks";

const QUARTERS = ["Q3 2026", "Q2 2026", "All quarters"] as const;
type Quarter = (typeof QUARTERS)[number];
const Q3_START = "2026-07-01";
/** Months the trend series covers, matching the variance chart. */
const MONTHS = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"];

/** Delta chip for a KPI: glyph + label, tone carries the meaning. */
function Delta({ tone, glyph, children }: { tone: BadgeTone; glyph: string; children: string }) {
  return (
    <Badge tone={tone} icon={glyph} size="sm">
      {children}
    </Badge>
  );
}

/** Per-month series over the given parts. */
function monthly(parts: Part[], pick: (month: Part[]) => number) {
  return MONTHS.map((m) => pick(parts.filter((part) => part.date.startsWith(m))));
}

/** Dashboard: cost overview across the part catalogue. */
export default function DashboardPage() {
  const openPart = useOpenPartEstimate();
  const { currency } = useApp();
  const [quarter, setQuarter] = useState<Quarter>("Q3 2026");
  const [programme, setProgramme] = useState("all");
  const [process, setProcess] = useState("all");

  const inScope = useMemo(
    () =>
      PARTS.filter(
        (part) => (programme === "all" || part.programme === programme) && (process === "all" || part.process === process),
      ),
    [programme, process],
  );
  const inView = useMemo(
    () =>
      inScope.filter(
        (part) =>
          quarter === "All quarters" || (quarter === "Q3 2026" ? part.date >= Q3_START : part.date < Q3_START),
      ),
    [inScope, quarter],
  );

  const isDefaultView = programme === "all" && process === "all" && quarter === "Q3 2026";
  const allOver = PARTS.filter((part) => partStatus(part) === "over");
  const overInView = inView.filter((part) => partStatus(part) === "over");
  const withTarget = inView.filter((part) => part.target != null);
  const avgVariance = withTarget.length
    ? withTarget.reduce((sum, part) => sum + (variancePct(part) ?? 0), 0) / withTarget.length
    : 0;

  const kpis = isDefaultView
    ? { estimates: "47", variance: "−2.4%", over: "14", saving: formatMoney(182400, currency, 0) }
    : {
        estimates: String(inView.length),
        variance: formatPct(avgVariance),
        over: String(overInView.length),
        saving: formatMoney(Math.round(inView.length * 3880), currency, 0),
      };
  const varianceNow = isDefaultView ? -2.4 : avgVariance;

  // Trend lines for the tiles, from the same months as the variance chart.
  const trends = useMemo(() => {
    const counts = monthly(inScope, (m) => m.length);
    const cumulative = counts.map((_, i) => counts.slice(0, i + 1).reduce((a, b) => a + b, 0));
    const drift =
      programme === "all" && process === "all"
        ? MONTHLY_DRIFT.map((point) => point.value)
        : monthly(inScope, (m) => {
            const t = m.filter((part) => part.target != null);
            return t.length ? t.reduce((s, part) => s + (variancePct(part) ?? 0), 0) / t.length : 0;
          });
    const over = monthly(inScope, (m) => m.filter((part) => partStatus(part) === "over").length);
    return { cumulative, drift, over };
  }, [inScope, programme, process]);

  const needsAttention = [...allOver].sort((a, b) => (variancePct(b) ?? 0) - (variancePct(a) ?? 0)).slice(0, 3);
  const recent = [...inView].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Cost Overview"
        subtitle={quarter}
        mark={<Mark id={ROUTE_MARK["/"]} size={44} />}
        actions={
          <ButtonLink href="/new-estimate" variant="primary" icon={Plus}>
            New Estimate
          </ButtonLink>
        }
      />
      <PageBody>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              ariaLabel="Quarter"
              value={quarter}
              onChange={setQuarter}
              options={QUARTERS}
              className="max-sm:w-full"
              fullWidth={false}
            />
            <FilterSelect
              label="Programme"
              value={programme}
              onChange={setProgramme}
              options={["all", ...PROGRAMMES]}
              className="w-[calc(50%-4px)] sm:w-44"
            />
            <FilterSelect
              label="Process"
              value={process}
              onChange={setProcess}
              options={["all", ...PROCESSES]}
              className="w-[calc(50%-4px)] sm:w-44"
            />
            <span className="text-caption text-quaternary sm:ml-auto">
              <span className="tabular text-secondary">{inView.length}</span> parts in view
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Estimates"
              mark={<Mark id="mark-kpi-estimates" size={40} />}
              value={kpis.estimates}
              sparkline={trends.cumulative}
              delta={
                <Delta tone={isDefaultView ? "info" : "neutral"} glyph={isDefaultView ? "▲" : "●"}>
                  12 vs Q2
                </Delta>
              }
            />
            <KpiTile
              label="Avg variance"
              mark={<Mark id="mark-kpi-variance" size={40} />}
              value={kpis.variance}
              sparkline={trends.drift}
              delta={<VarianceBadge pct={varianceNow - 1.8} band={0.5} size="sm" suffix="pts" />}
              hint="from +1.8%"
            />
            <KpiTile
              label="Over target"
              mark={<Mark id="mark-kpi-over" size={40} />}
              value={kpis.over}
              sparkline={trends.over}
              delta={
                <Delta tone="error" glyph="▲">
                  30% of parts
                </Delta>
              }
            />
            <KpiTile
              label="Annual saving"
              mark={<Mark id="mark-saving" size={40} />}
              value={kpis.saving}
              delta={
                <Delta tone="success" glyph="▲">
                  €41k vs Q2
                </Delta>
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Section
              title={<MarkedTitle mark="mark-kpi-trend">Average variance to target</MarkedTitle>}
              className="lg:col-span-2"
              action={<span className="hidden text-caption text-quaternary sm:inline">Feb to Jul 2026 · monthly</span>}
            >
              <VarianceChart data={MONTHLY_DRIFT} />
            </Section>

            <FeaturedPart />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Section
              title={<MarkedTitle mark="mark-risk">Needs attention</MarkedTitle>}
              count={allOver.length}
              bodyClassName="p-0"
              actionHref="/library"
              actionLabel={`View all ${allOver.length}`}
            >
              <ul className="divide-y divide-muted">
                {needsAttention.map((part) => (
                  <li key={part.number}>
                    <button
                      type="button"
                      onClick={() => openPart(part)}
                      title={`View estimate for ${part.name}`}
                      className="group/na flex min-h-[72px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-[150ms] outline-none hover:bg-raised focus-visible:bg-raised focus-visible:shadow-[inset_2px_0_0_var(--stroke-active)]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-label-md text-primary">{part.name}</div>
                        <div className="mt-0.5 truncate text-body-sm tabular text-quaternary">
                          {part.number} · {part.process}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <VarianceBadge pct={variancePct(part)} size="sm" />
                        <span className="text-body-sm tabular text-secondary">
                          {formatMoney(part.estimate, currency)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Recent estimates" className="lg:col-span-2" bodyClassName="p-0" actionHref="/history">
              <Table minWidth={680}>
                <THead>
                  <tr>
                    <TH>Part</TH>
                    <TH>Process</TH>
                    <TH align="right">Estimate</TH>
                    <TH align="right">Target</TH>
                    <TH align="right">Variance</TH>
                    <TH>Status</TH>
                    <TH aria-label="Open" className="w-10 px-0" />
                  </tr>
                </THead>
                <TBody>
                  {recent.map((part) => {
                    const variance = variancePct(part);
                    return (
                      <TR key={part.number} onClick={() => openPart(part)} title={`View estimate for ${part.name}`}>
                        <PrimaryCell title={part.name} detail={<span className="tabular">{part.number}</span>} />
                        <TD>{part.process}</TD>
                        <NumCell strong>{formatMoney(part.estimate, currency)}</NumCell>
                        <NumCell muted>{part.target == null ? "n/a" : formatMoney(part.target, currency)}</NumCell>
                        <NumCell muted>{variance == null ? "n/a" : formatPct(variance)}</NumCell>
                        <TD>
                          <StatusChip status={partStatus(part)} size="sm" />
                        </TD>
                        <ChevronCell />
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </Section>
          </div>
        </div>
      </PageBody>
    </>
  );
}
