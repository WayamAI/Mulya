"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Section } from "@/components/mulya/page";
import { MarkedTitle } from "./marked-title";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/primitives";
import { NumCell, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { VolumePoint } from "@/lib/costing/estimate";
import { formatMoney, formatNumber, type Currency } from "@/lib/format";

const PriceBreaksChart = dynamic(() => import("./price-breaks-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

/** Unit and lot price by annual volume: table plus curve, current volume highlighted. */
export function PriceBreaksPanel({
  breaks,
  annualVolume,
  note,
  currency,
}: {
  breaks: VolumePoint[];
  annualVolume: number;
  note: string;
  currency: Currency;
}) {
  const domain = useMemo<[number, number]>(() => {
    if (!breaks.length) return [0, 1];
    const units = breaks.map((point) => point.unit);
    const min = Math.min(...units);
    const max = Math.max(...units);
    const pad = Math.max((max - min) * 0.25, max * 0.02);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [breaks]);
  const current = breaks.find((point) => point.volume === annualVolume);

  return (
    <Section title={<MarkedTitle mark="mark-price-breaks">Price breaks</MarkedTitle>} count={breaks.length}>
      <div className="grid gap-6 lg:grid-cols-[minmax(340px,1fr)_minmax(0,1.4fr)] lg:gap-8">
        <div className="min-w-0 overflow-hidden rounded-lg border border-muted">
          <Table minWidth={340} density="compact">
            <THead>
              <tr>
                <TH>Annual volume</TH>
                <TH align="right">Unit price</TH>
                <TH align="right">Lot total</TH>
              </tr>
            </THead>
            <TBody>
              {breaks.map((point) => {
                const isCurrent = point.volume === annualVolume;
                return (
                  <TR key={point.volume} selected={isCurrent}>
                    <TD className="whitespace-nowrap text-primary tabular">
                      {formatNumber(point.volume)} / yr
                      {isCurrent ? (
                        <Badge tone="info" icon="●" size="sm" className="ml-2 align-middle">
                          current
                        </Badge>
                      ) : null}
                    </TD>
                    <NumCell strong={isCurrent}>{formatMoney(point.unit, currency)}</NumCell>
                    <NumCell muted>{formatMoney(point.lot, currency, 0)}</NumCell>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>

        <div className="min-w-0">
          <div className="h-[220px]">
            <PriceBreaksChart breaks={breaks} domain={domain} current={current} currency={currency} />
          </div>
          <p className="mt-3 max-w-[70ch] text-body-sm text-quaternary">{note}</p>
        </div>
      </div>
    </Section>
  );
}
