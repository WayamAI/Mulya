"use client";

import { MouldViewer } from "@/components/mulya/mould-viewer";
import { Section } from "@/components/mulya/page";
import { Badge } from "@/components/ui/badge";
import { MarkedTitle } from "./marked-title";
import type { ToolSpec } from "@/lib/costing/tooling";
import { cx, formatMoney, formatNumber, type Currency } from "@/lib/format";
import { TOOL_MARK } from "@/lib/marks";
import type { PartVariant } from "@/lib/models/part-geometry";

const captionClass = "text-caption tracking-[0.08em] text-quaternary uppercase";

/**
 * The tool behind the chosen route: 3D mould, build cost and amortisation.
 * When a what-if changes the tool, it also shows how that compares with the route's own tool.
 */
export function ToolingPanel({
  tool,
  baseTool,
  variant,
  currency,
}: {
  tool: ToolSpec;
  /** The tool this part's detected process would otherwise use. */
  baseTool: ToolSpec | undefined;
  variant: PartVariant;
  currency: Currency;
}) {
  const money = (value: number, digits?: number) => formatMoney(value, currency, digits);
  const lifetimePieces = tool.annualVolume * tool.productionLife;
  const changed = baseTool != null && tool.key !== baseTool.key;

  return (
    <Section
      title={<MarkedTitle mark={TOOL_MARK[tool.kind]}>Mould &amp; tooling</MarkedTitle>}
      actionHref="/new-estimate"
      actionLabel="Full tooling detail"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(300px,1fr)_minmax(0,1.9fr)] lg:gap-8">
        <MouldViewer variant={variant} kind={tool.kind} height={300} className="order-2 lg:order-1" />
        <div className="order-1 lg:order-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-heading-sm font-semibold text-primary">{tool.toolType}</h3>
            <span className="text-body-md text-quaternary tabular">
              {tool.leadWeeks} week lead · {formatNumber(tool.life)} {tool.lifeUnit}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-muted bg-[var(--stroke-muted)] sm:grid-cols-3">
            {[
              { label: "Build cost", value: money(tool.cost, 0) },
              { label: "Lifetime pieces", value: formatNumber(lifetimePieces) },
              { label: tool.amortLineLabel, value: `${money(tool.perPiece)} / pc` },
            ].map((cell) => (
              <div key={cell.label} className="bg-container px-4 py-3">
                <span className={captionClass}>{cell.label}</span>
                <p className="mt-1 text-heading-md font-medium text-primary tabular">{cell.value}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 max-w-[70ch] text-body-md leading-relaxed text-secondary">
            {money(tool.cost, 0)} ÷ {formatNumber(lifetimePieces)} lifetime pieces ={" "}
            <span className="font-medium text-primary tabular">{money(tool.perPiece)}</span>, the “
            {tool.amortLineLabel}” line in the breakdown above. The tool is paid once and divided, not paid per piece.
          </p>

          {changed && baseTool ? (
            <ToolComparison tool={tool} baseTool={baseTool} money={money} />
          ) : null}
        </div>
      </div>
    </Section>
  );
}

function ToolComparison({
  tool,
  baseTool,
  money,
}: {
  tool: ToolSpec;
  baseTool: ToolSpec;
  money: (value: number, digits?: number) => string;
}) {
  const perPieceUp = tool.perPiece > baseTool.perPiece;
  const leadDiff = Math.abs(tool.leadWeeks - baseTool.leadWeeks);
  return (
    <div className="mt-4 flex flex-col items-start gap-2 rounded-lg border border-muted bg-raised px-4 py-3 text-body-md text-secondary sm:flex-row">
      <Badge tone={perPieceUp ? "error" : "success"} icon={perPieceUp ? "▲" : "▼"} size="sm" className="sm:mt-0.5">
        {perPieceUp ? "Tooling up" : "Tooling down"}
      </Badge>
      <p>
        Against the {baseTool.toolType.toLowerCase()} this process would otherwise use, tooling{" "}
        {perPieceUp ? "rises" : "falls"}{" "}
        <span className={cx("font-medium tabular", perPieceUp ? "text-error" : "text-success")}>
          {money(Math.abs(tool.perPiece - baseTool.perPiece))}
        </span>{" "}
        per piece and{" "}
        <span className={cx("font-medium tabular", tool.cost > baseTool.cost ? "text-error" : "text-success")}>
          {money(Math.abs(tool.cost - baseTool.cost), 0)}
        </span>{" "}
        to build, at {leadDiff} week{leadDiff === 1 ? "" : "s"}{" "}
        {tool.leadWeeks > baseTool.leadWeeks ? "longer" : "shorter"} lead time.
      </p>
    </div>
  );
}
