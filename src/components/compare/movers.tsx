"use client";

import { Section } from "@/components/mulya/page";
import { Mark } from "@/components/ui/mark";
import { useApp } from "@/lib/app-context";
import type { AlignedRow, Comparison, CostCategory } from "@/lib/costing/compare";
import { cx, formatPct } from "@/lib/format";
import type { MarkId } from "@/lib/marks";
import { TOOL_NAME } from "./entries";
import type { CompareEntry } from "./types";
import { signedMoney } from "./verdict";

const CATEGORY_MARK: Record<CostCategory, MarkId> = {
  material: "mark-material",
  conversion: "mark-labour",
  tooling: "mark-amortisation",
  overhead: "mark-overhead",
};

/** One plain sentence on why a line moved. */
function explain(row: AlignedRow, a: CompareEntry, b: CompareEntry): string {
  const down = row.delta < 0;
  const processChanged = a.process !== b.process;
  const materialChanged = a.material !== b.material;
  if (row.change === "added") return `New in B: ${b.process.toLowerCase()} needs this step and A did not.`;
  if (row.change === "removed") return `Gone in B: the ${b.process.toLowerCase()} route drops this step.`;
  switch (row.category) {
    case "material":
      if (row.key === "return-credit")
        return down ? "More scrap sold back per piece." : "Less scrap to sell back, because less metal is bought.";
      if (materialChanged) return `${a.material} to ${b.material}${down ? ", and less metal bought per piece" : " costs more per piece"}.`;
      return down ? "Less metal bought per piece: a lighter part or a better yield." : "More metal per piece: a heavier part or a poorer yield.";
    case "tooling":
      if (a.toolKind !== b.toolKind)
        return `${TOOL_NAME[a.toolKind]} to ${TOOL_NAME[b.toolKind].toLowerCase()}: the tool ${down ? "costs less per piece" : "costs more to build and amortise"}.`;
      return down ? "Tool cost spread over more pieces." : "Tool cost spread over fewer pieces.";
    case "overhead":
      return down ? "Follows the lower cost base: overhead and margin are a percentage." : "Follows the higher cost base: overhead and margin are a percentage.";
    default:
      if (processChanged) return `Route change ${a.process.toLowerCase()} to ${b.process.toLowerCase()} ${down ? "shortens" : "lengthens"} this operation.`;
      return down ? "Less time on this operation per piece." : "More time on this operation per piece.";
  }
}

/** Top three lines by absolute change, each with its mark and a one-line reason. */
export function Movers({ a, b, comparison }: { a: CompareEntry; b: CompareEntry; comparison: Comparison }) {
  const { currency } = useApp();
  return (
    <Section title="Biggest movers" className="flex flex-col" bodyClassName="flex flex-1 flex-col p-0">
      {comparison.movers.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-5">
          <Mark id="mark-empty-compare" size={56} />
          <p className="text-body-md text-tertiary">No line moved: the two estimates are line for line the same.</p>
        </div>
      ) : (
        <ol className="divide-y divide-[var(--stroke-muted)]">
          {comparison.movers.map((row) => (
            <li key={row.key} className="flex items-start gap-3 px-4 py-3">
              <Mark id={CATEGORY_MARK[row.category]} size={28} framed />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-label-md text-primary" title={row.label}>
                    {row.labelB ?? row.labelA}
                  </p>
                  <p className={cx("shrink-0 text-label-md tabular", row.delta < 0 ? "text-success" : "text-error")}>
                    <span aria-hidden className="mr-1 text-caption">{row.delta < 0 ? "▼" : "▲"}</span>
                    {signedMoney(row.delta, currency)}
                    {row.deltaPct != null ? (
                      <span className="ml-1.5 text-body-sm text-tertiary">{formatPct(row.deltaPct)}</span>
                    ) : null}
                  </p>
                </div>
                <p className="mt-0.5 text-body-sm text-tertiary">{explain(row, a, b)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <Summary comparison={comparison} />
    </Section>
  );
}

/** Gross movement across every line: how much came out, how much went in. */
function Summary({ comparison }: { comparison: Comparison }) {
  const { currency } = useApp();
  const down = comparison.rows.filter((r) => r.delta < 0);
  const up = comparison.rows.filter((r) => r.delta > 0);
  const sum = (rows: AlignedRow[]) => rows.reduce((total, r) => total + r.delta, 0);
  return (
    <dl className="mt-auto grid grid-cols-2 border-t border-muted">
      <div className="flex flex-col gap-0.5 px-4 py-3">
        <dt className="text-caption tracking-[0.08em] text-quaternary uppercase">Came out</dt>
        <dd className="text-label-md tabular text-success">
          {signedMoney(sum(down), currency)}
          <span className="ml-1.5 text-body-sm text-tertiary">
            {down.length} {down.length === 1 ? "line" : "lines"}
          </span>
        </dd>
      </div>
      <div className="flex flex-col gap-0.5 border-l border-muted px-4 py-3">
        <dt className="text-caption tracking-[0.08em] text-quaternary uppercase">Went in</dt>
        <dd className={cx("text-label-md tabular", up.length ? "text-error" : "text-tertiary")}>
          {signedMoney(sum(up), currency)}
          <span className="ml-1.5 text-body-sm text-tertiary">
            {up.length} {up.length === 1 ? "line" : "lines"}
          </span>
        </dd>
      </div>
    </dl>
  );
}
