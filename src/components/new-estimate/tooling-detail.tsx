"use client";

import { useMemo } from "react";
import { Clock, Coins, Gauge, Info, Layers, Repeat } from "lucide-react";
import dynamic from "next/dynamic";
import { MarkedTitle } from "@/components/estimate/marked-title";
import { MouldViewer } from "@/components/mulya/mould-viewer";
import { Section } from "@/components/mulya/page";
import { KpiTile, Skeleton } from "@/components/ui/primitives";
import { useApp } from "@/lib/app-context";
import {
  PROCESS_NAMES,
  VIABILITY,
  type ProcessInference,
  type ProcessKey,
} from "@/lib/costing/process-detection";
import { TOOLING, type ToolMeasurementGroup, type ToolSpec } from "@/lib/costing/tooling";
import { cx, formatMoney, formatNumber } from "@/lib/format";
import { ToolLayoutPlan } from "./tool-layout-plan";
import { CAPS, ICON, INSET } from "./ui";
import { Badge, ViabilityBadge } from "@/components/ui/badge";
import { NumCell, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

const AmortisationChart = dynamic(() => import("./amortisation-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

/** The Tooling agent's panel: tool cost, the tool itself, measurements, amortisation and the three-way comparison. */
export function ToolingDetail({
  tool,
  inference,
  onProcessChange,
}: {
  tool: ToolSpec;
  inference: ProcessInference;
  onProcessChange: (process: ProcessKey) => void;
}) {
  const { currency } = useApp();
  const lifetime = tool.annualVolume * tool.productionLife;
  const maxLine = Math.max(...tool.lines.map((line) => line.value));
  const total = tool.lines.reduce((sum, line) => sum + line.value, 0);
  const piecePrice = inference.options.find((option) => option.key === tool.process)?.price ?? null;

  // Balance the measurement groups over two columns by row count.
  const columns = useMemo(() => {
    const cols: ToolMeasurementGroup[][] = [[], []];
    const heights = [0, 0];
    for (const group of tool.measurements) {
      const col = heights[0] <= heights[1] ? 0 : 1;
      cols[col].push(group);
      heights[col] += group.rows.length + 1;
    }
    return cols;
  }, [tool]);

  const curve = tool.amortisation.map((point) => ({
    label: point.volume >= 1000 ? `${point.volume / 1000}k` : String(point.volume),
    volume: point.volume,
    perPiece: point.perPiece,
    current: point.volume === tool.annualVolume,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-lg border border-info-stroke bg-info-surface px-4 py-3 text-body-md text-secondary">
        <Info {...ICON} aria-hidden className="mt-0.5 shrink-0 text-info" />
        <p>
          A part cannot be made until its tool is made. This is the tool, {tool.toolType}, costed as a tool shop
          would quote it, and amortised onto the piece price the estimate shows.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Tool build cost"
          value={formatMoney(tool.cost, currency, 0)}
          hint={`${tool.lines.length} quoted line items`}
          mark={<Coins {...ICON} aria-hidden className="text-quaternary" />}
        />
        <KpiTile
          label="Lead time"
          value={`${tool.leadWeeks} wks`}
          hint="Order to first article"
          mark={<Clock {...ICON} aria-hidden className="text-quaternary" />}
        />
        <KpiTile
          label="Tool life"
          value={formatNumber(tool.life)}
          hint={`${tool.lifeUnit} · ${tool.cavities} cavity`}
          mark={<Repeat {...ICON} aria-hidden className="text-quaternary" />}
        />
        <KpiTile
          label="Amortised"
          value={formatMoney(tool.perPiece, currency)}
          hint={`per piece over ${formatNumber(lifetime)} pieces`}
          mark={<Layers {...ICON} aria-hidden className="text-quaternary" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Section title={tool.toolType}>
          <MouldViewer variant={tool.presetKey} kind={tool.kind} height={360} />
          <p className="mt-4 text-body-md leading-relaxed text-tertiary">{tool.note}</p>
        </Section>
        <div className="flex flex-col gap-4">
          <Section title="Where this lands on the part">
            <div className={cx(INSET, "px-4 py-4")}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-body-md text-tertiary">Tool build cost</span>
                <span className="text-heading-md font-normal text-primary tabular">
                  {formatMoney(tool.cost, currency, 0)}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-4">
                <span className="text-body-md text-tertiary">÷ lifetime pieces</span>
                <span className="text-heading-md font-normal text-tertiary tabular">{formatNumber(lifetime)}</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-default pt-3">
                <span className="text-body-md font-medium text-primary">{tool.amortLineLabel}</span>
                <span className="font-display text-display-2xl text-primary tabular">
                  {formatMoney(tool.perPiece, currency)}
                </span>
              </div>
            </div>
            <p className="mt-3 text-body-sm text-quaternary tabular">
              {formatNumber(tool.annualVolume)} pcs/yr × {tool.productionLife} years = {formatNumber(lifetime)} pieces
            </p>
            <p className="mt-4 text-body-md leading-relaxed text-tertiary">
              This is the <span className="font-medium text-primary">“{tool.amortLineLabel}”</span> line in the cost
              breakdown: the tool is not a separate invoice, it is spread across every piece the programme makes.
            </p>
          </Section>
          <Section title="Tool specification" bodyClassName="p-0">
            <dl className="divide-y divide-muted">
              {tool.spec.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                  <dt className="text-body-md text-tertiary">{row.label}</dt>
                  <dd className="text-right text-body-md text-primary tabular">{row.value}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>
      </div>

      <Section title="Tool measurements">
        <div className="grid items-start gap-x-10 gap-y-8 xl:grid-cols-[minmax(340px,1fr)_minmax(0,1.7fr)]">
          <figure className="self-start">
            <ToolLayoutPlan layout={tool.layout} />
            <figcaption className="mt-3 text-body-sm leading-relaxed text-quaternary">
              Plan view, both axes to the same scale. The block is always larger than the part it makes: how much
              larger is most of what you are paying for.
            </figcaption>
          </figure>
          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {columns.map((groups, index) => (
              <div key={index} className="space-y-6">
                {groups.map((group) => (
                  <div key={group.title}>
                    <span className={CAPS}>{group.title}</span>
                    <dl className="mt-2 divide-y divide-muted border-t border-muted">
                      {group.rows.map((row) => (
                        <div key={row.label} className="py-2">
                          <div className="flex items-baseline justify-between gap-4">
                            <dt className={cx("text-body-md", row.key ? "font-medium text-primary" : "text-tertiary")}>
                              {row.label}
                            </dt>
                            <dd
                              className={cx(
                                "text-right text-body-md whitespace-nowrap tabular",
                                row.key ? "font-medium text-primary" : "text-tertiary",
                              )}
                            >
                              {row.value}
                            </dd>
                          </div>
                          {row.note ? (
                            <p className="mt-0.5 text-body-sm leading-relaxed text-quaternary">{row.note}</p>
                          ) : null}
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Tool build cost">
        <div className="space-y-1">
          {tool.lines.map((line) => (
            <div key={line.label} className="grid grid-cols-[minmax(0,1fr)_110px] items-center gap-4 py-1.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-body-md text-primary">{line.label}</span>
                  {line.basis ? <span className="text-body-sm text-quaternary tabular">{line.basis}</span> : null}
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-raised-2">
                  <div
                    className="h-full rounded-full bg-[var(--analytics-series-1)]"
                    style={{ width: `${(line.value / maxLine) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-right text-body-md text-primary tabular">
                {formatMoney(line.value, currency, 0)}
              </span>
            </div>
          ))}
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_110px] gap-4 border-t border-default pt-3">
            <span className="text-body-md font-semibold text-primary">Tool build cost</span>
            <span className="text-right text-body-lg font-semibold text-primary tabular">
              {formatMoney(total, currency, 0)}
            </span>
          </div>
        </div>
        <div className={cx(INSET, "mt-5 flex items-start gap-2.5 rounded-md px-4 py-3")}>
          <Gauge {...ICON} aria-hidden className="mt-0.5 shrink-0 text-quaternary" />
          <div>
            <span className={CAPS}>What complexity costs here</span>
            <p className="mt-1 text-body-md leading-relaxed text-tertiary">{tool.complexityNote}</p>
          </div>
        </div>
      </Section>

      <Section
        title={<MarkedTitle mark="mark-amortisation">Tooling cost per piece against annual volume</MarkedTitle>}
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.9fr)_minmax(280px,1fr)]">
          <div className="h-[260px] min-w-0">
            <AmortisationChart curve={curve} floorsAt={tool.floorsAt} currency={currency} />
          </div>
          <div>
            <div className={cx(INSET, "rounded-md px-4 py-3")}>
              <span className={CAPS}>At {formatNumber(tool.annualVolume)} pcs/yr</span>
              <p className="mt-1 font-display text-display-xl text-primary tabular">
                {formatMoney(tool.perPiece, currency)} / pc
              </p>
              {piecePrice != null ? (
                <p className="mt-1 text-body-sm text-quaternary">
                  {((tool.perPiece / piecePrice) * 100).toFixed(1)}% of the piece price
                </p>
              ) : null}
            </div>
            <p className="mt-4 text-body-md leading-relaxed text-tertiary">
              {tool.floorsAt
                ? tool.floorsAt.note
                : `Tool life is ${formatNumber(tool.life)} ${tool.lifeUnit} and the programme needs ${formatNumber(lifetime)} pieces, so one tool covers it. Every extra piece dilutes the same build cost: the curve keeps falling instead of flooring.`}
            </p>
          </div>
        </div>
      </Section>

      <Section title="The same part, tooled three ways" bodyClassName="p-0">
        <Table minWidth={860}>
          <THead>
            <tr>
              <TH>Process</TH>
              <TH>Tool</TH>
              <TH align="right">Build cost</TH>
              <TH align="right">Lead</TH>
              <TH align="right">Life</TH>
              <TH align="right">Per piece</TH>
              <TH>Viability</TH>
            </tr>
          </THead>
          <TBody>
            {inference.options.map((option) => {
              const alt = TOOLING[`${inference.presetKey}-${option.key}`] as ToolSpec | undefined;
              const current = option.key === tool.process;
              const viability = VIABILITY[option.viability];
              const name = PROCESS_NAMES[option.key];
              return (
                <TR
                  key={option.key}
                  selected={current}
                  onClick={alt && !current ? () => onProcessChange(option.key) : undefined}
                  title={alt && !current ? `Switch to ${name}` : undefined}
                >
                  <TD className={cx("text-label-md", alt ? "text-primary" : "text-quaternary")}>
                    <span className="flex items-center gap-2">
                      {name}
                      {current ? (
                        <Badge tone="info" icon="●" size="sm">
                          current
                        </Badge>
                      ) : null}
                    </span>
                  </TD>
                  <TD className="text-tertiary">{alt ? alt.toolType : "n/a"}</TD>
                  <NumCell>{alt ? formatMoney(alt.cost, currency, 0) : "n/a"}</NumCell>
                  <NumCell muted>{alt ? `${alt.leadWeeks} wks` : "n/a"}</NumCell>
                  <NumCell muted>{alt ? `${formatNumber(alt.life)} ${alt.lifeUnit}` : "n/a"}</NumCell>
                  <NumCell strong>{alt ? formatMoney(alt.perPiece, currency) : "n/a"}</NumCell>
                  <TD>
                    <ViabilityBadge viability={option.viability} size="sm" label={viability.label} />
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        <p className="border-t border-muted px-4 py-3 text-body-sm leading-relaxed text-quaternary">
          Tooling is the cost that behaves differently from every other line: it is paid once and divided, not paid
          per piece. That is why the cheapest tool is rarely the cheapest part.
        </p>
      </Section>
    </div>
  );
}
