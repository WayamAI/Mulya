"use client";

import type { ReactNode } from "react";
import { FileDown, Printer, Share2 } from "lucide-react";
import { Page } from "@/components/mulya/page";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { useApp } from "@/lib/app-context";
import { BASE_LINES, QUOTED_ACTUAL, REVISION_HISTORY } from "@/lib/costing/estimate";
import { cx, formatMoney, formatNumber } from "@/lib/format";
import { ROUTE_MARK } from "@/lib/marks";

const TARGET_COST = 42;
const ANNUAL_VOLUME = 2000;

/** Small caps section heading with its running number. */
function SheetHeading({ n, children, className }: { n: string; children: ReactNode; className?: string }) {
  return (
    <h3 className={cx("mb-3 flex items-baseline gap-2 text-caption font-semibold tracking-[0.14em] uppercase", className)}>
      <span className="doc-muted tabular font-normal">{n}</span>
      {children}
    </h3>
  );
}

/** Label left, figure right: one line of the sheet. */
function SheetRow({ label, value, strong = false }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="doc-rule flex items-baseline justify-between gap-6 border-b border-dotted py-1.5 last:border-b-0">
      <span className={cx("text-body-md", strong ? "font-medium" : "doc-muted")}>{label}</span>
      <span className={cx("text-right text-body-md tabular", strong && "font-semibold")}>{value}</span>
    </div>
  );
}

/** Printable cost estimate sheet for the bearing housing, issued to purchasing. */
export default function ReportPage() {
  const { currency } = useApp();
  const money = (value: number, digits?: number) => formatMoney(value, currency, digits);
  const total = BASE_LINES.reduce((sum, line) => sum + line.value, 0);
  const history = REVISION_HISTORY.find((entry) => entry.partNumber === "DTV-HSG-0431");
  const vsActual = ((total - QUOTED_ACTUAL.value) / QUOTED_ACTUAL.value) * 100;

  return (
    <Page
      title="Cost Report"
      mark={<Mark id={ROUTE_MARK["/report"]} size={44} />}
      subtitle="Formatted estimate sheet for issue to purchasing"
      actions={
        <>
          <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="secondary" icon={FileDown}>
            Export PDF
          </Button>
          <Button variant="secondary" icon={Share2}>
            Share
          </Button>
        </>
      }
    >
      <div className="-mx-4 flex justify-center rounded-none bg-raised px-0 py-0 sm:mx-0 sm:rounded-xl sm:border sm:border-muted sm:px-6 sm:py-8">
        <article className="doc-sheet w-full max-w-[820px] border px-5 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-16px_rgba(0,0,0,0.18)] sm:rounded-sm sm:px-12 sm:py-12">
          {/* masthead */}
          <header className="flex flex-col gap-6 pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG mark, must print as-is */}
              <img src="/brand/mulya-mark.svg" alt="" width={44} height={44} className="size-11 rounded-[11px]" />
              <span className="flex items-baseline gap-2">
                <span className="font-display text-display-lg tracking-[0.04em]">MŪLYA</span>
                <span lang="sa" className="doc-muted text-body-sm">
                  मूल्य
                </span>
              </span>
            </div>
            <div className="sm:text-right">
              <h2 className="text-caption font-semibold tracking-[0.18em]">COST ESTIMATE</h2>
              <p className="mt-1.5 text-label-md tabular">CE-2026-0431-C</p>
              <p className="doc-muted text-body-sm tabular">Issued 19 June 2026</p>
            </div>
          </header>

          {/* headline figures */}
          <div className="doc-rule grid grid-cols-2 border-y-2 sm:grid-cols-4">
            {[
              { label: "Piece price", value: money(total), hero: true },
              { label: "Target cost", value: money(TARGET_COST) },
              { label: "Variance to target", value: "+14.8% ▲" },
              { label: `Lot (${formatNumber(ANNUAL_VOLUME)})`, value: money(total * ANNUAL_VOLUME, 0) },
            ].map((figure, index) => (
              <div
                key={figure.label}
                className={cx(
                  "doc-rule flex flex-col gap-1 py-4",
                  index > 0 && "sm:border-l sm:pl-4",
                  index % 2 === 1 && "border-l pl-4",
                  index >= 2 && "border-t sm:border-t-0",
                )}
              >
                <span className="doc-muted text-caption tracking-[0.08em] uppercase">{figure.label}</span>
                <span
                  className={cx(
                    "tabular",
                    figure.hero ? "font-display text-display-xl" : "text-heading-sm font-semibold",
                  )}
                >
                  {figure.value}
                </span>
              </div>
            ))}
          </div>

          <div className="grid gap-8 py-7 sm:grid-cols-2 sm:gap-10">
            <div>
              <SheetHeading n="01">Part</SheetHeading>
              <p className="text-label-md">Bearing Housing</p>
              <p className="text-body-md tabular">DTV-HSG-0431 · Rev C</p>
              <p className="doc-muted text-body-md">Programme HDT-2027</p>
              <SheetHeading n="02" className="mt-6">
                Manufacturing
              </SheetHeading>
              <p className="text-body-md">Sand casting</p>
              <p className="text-body-md tabular">EN-GJL-250 (GG25)</p>
              <p className="text-body-md tabular">12.4 kg net / 15.8 kg pour</p>
              <p className="text-body-md tabular">ISO 2768-m</p>
            </div>
            <div>
              <SheetHeading n="03">Commercial</SheetHeading>
              <SheetRow label="Annual volume" value={`${formatNumber(ANNUAL_VOLUME)} pcs`} />
              <SheetRow label="Production life" value="3 years" />
              <SheetRow label="Region" value="EU" />
              <SheetRow label="Target cost" value={money(TARGET_COST)} />
              <SheetHeading n="04" className="mt-6">
                Result
              </SheetHeading>
              <SheetRow label="Piece price" value={money(total)} strong />
              <SheetRow label="Variance to target" value="+14.8% ▲" />
              <SheetRow label="Actual / quoted" value={money(QUOTED_ACTUAL.value)} />
              <SheetRow label="Estimate vs. actual" value={`${vsActual.toFixed(1)}%`} />
              <SheetRow label={`Lot (${formatNumber(ANNUAL_VOLUME)})`} value={money(total * ANNUAL_VOLUME, 0)} />
            </div>
          </div>

          <div className="doc-rule border-t" />
          <section className="py-7">
            <SheetHeading n="05">Cost breakdown</SheetHeading>
            <table className="w-full border-collapse">
              <thead>
                <tr className="doc-rule border-b">
                  <th className="doc-muted pb-2 text-left text-caption font-normal tracking-[0.08em] uppercase">Line</th>
                  <th className="doc-muted w-20 pb-2 text-right text-caption font-normal tracking-[0.08em] uppercase">
                    Share
                  </th>
                  <th className="doc-muted w-28 pb-2 text-right text-caption font-normal tracking-[0.08em] uppercase">
                    {currency} / pc
                  </th>
                </tr>
              </thead>
              <tbody>
                {BASE_LINES.map((line) => (
                  <tr key={line.label} className="doc-rule border-b border-dotted">
                    <td className="py-1.5 text-body-md">{line.label}</td>
                    <td className="doc-muted py-1.5 text-right text-body-sm tabular">
                      {((line.value / total) * 100).toFixed(1)}%
                    </td>
                    <td className="py-1.5 text-right text-body-md tabular">{money(line.value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="doc-rule border-t-2">
                  <td className="pt-2.5 text-label-md">Total</td>
                  <td className="doc-muted pt-2.5 text-right text-body-sm tabular">100.0%</td>
                  <td className="pt-2.5 text-right text-label-md font-semibold tabular">{money(total)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <div className="doc-rule border-t" />
          <section className="py-7">
            <SheetHeading n="06">Assumptions</SheetHeading>
            <div className="grid sm:grid-cols-2 sm:gap-x-10">
              <div>
                <SheetRow label="Material rate" value="GG25 @ € 0.95/kg" />
                <SheetRow label="Machining rate" value="€ 54.00/hr" />
                <SheetRow label="Pattern" value="€ 18,000 / 6,000 pcs" />
                <SheetRow label="Basis" value="Piece price (incl. margin)" />
              </div>
              <div>
                <SheetRow label="Rate Master" value="v14 Jul 2026" />
                <SheetRow label="Overhead" value="8%" />
                <SheetRow label="Margin" value="5.5%" />
                <SheetRow label="Currency" value={currency} />
              </div>
            </div>
          </section>

          <div className="doc-rule border-t" />
          <section className="py-7">
            <SheetHeading n="07">Revision history</SheetHeading>
            <div className="grid sm:grid-cols-2 sm:gap-x-10">
              <div>
                {history?.revisions.map((rev) => (
                  <SheetRow key={rev.rev} label={`Rev ${rev.rev}  ·  ${rev.date}`} value={money(rev.cost)} />
                ))}
              </div>
              <div>
                <SheetRow label="Saving vs. Rev A" value={`${money(14.9)} / pc`} strong />
              </div>
            </div>
          </section>

          <div className="doc-rule border-t" />
          <footer className="pt-10">
            <div className="grid grid-cols-2 gap-6 sm:gap-10">
              {["Prepared by", "Reviewed by"].map((role) => (
                <div key={role}>
                  <div className="doc-rule mb-1.5 border-b pb-10" />
                  <span className="doc-muted text-caption tracking-[0.08em] uppercase">{role}</span>
                </div>
              ))}
            </div>
            <div className="doc-muted mt-10 flex flex-wrap items-baseline justify-between gap-2 text-body-sm">
              <p>Model v0.1 · illustrative estimate, not a quotation.</p>
              <p className="tabular">CE-2026-0431-C · page 1 of 1</p>
            </div>
          </footer>
        </article>
      </div>
    </Page>
  );
}
