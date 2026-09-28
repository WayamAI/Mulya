"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronRight,
  Database,
  Eye,
  History as HistoryIcon,
  X,
} from "lucide-react";
import { PageBody, PageHeader } from "@/components/mulya/page";
import { Badge } from "@/components/ui/badge";
import { Button, TextAction } from "@/components/ui/button";
import { Dropdown, toOptions } from "@/components/ui/dropdown";
import { Mark } from "@/components/ui/mark";
import { EmptyState } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/segmented";
import {
  ChevronCell,
  NumCell,
  PrimaryCell,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui/table";
import {
  StatusChip,
  statusFor,
  statusTextClass,
} from "@/components/mulya/status-chip";
import { useApp } from "@/lib/app-context";
import {
  COLUMN_LABELS,
  NUMERIC_COLUMNS,
  PERSONAS,
  PERSONA_KEYS,
  type ColumnKey,
  type PersonaKey,
} from "@/lib/costing/connectors";
import { QUOTED_ACTUAL } from "@/lib/costing/estimate";
import { PARTS, type ProcessName } from "@/lib/costing/parts";
import { TOOLING } from "@/lib/costing/tooling";
import {
  cx,
  formatDate,
  formatMoney,
  formatNumber,
  formatPct,
  type Currency,
} from "@/lib/format";
import { PERSONA_MARK, ROUTE_MARK } from "@/lib/marks";
import { ESTIMATE_RUNS, type EstimateRun } from "./estimate-runs";

const PRESET_BY_PROCESS: Record<ProcessName, string> = {
  Stamping: "bracket",
  "Sand cast": "bearing",
  "Die cast": "cover",
};

const PROCESS_KEY: Record<ProcessName, string> = {
  Stamping: "stamping",
  "Sand cast": "sand",
  "Die cast": "die",
};

/** A run joined with its catalogue part (programme, region, volume, spend). */
interface HistoryRow extends EstimateRun {
  programme: string;
  region: string;
  volume: number | null;
  annualSpend: number | null;
}

/** Signed % against target, or null when the run has no target. */
function variance(row: HistoryRow): number | null {
  return row.target == null
    ? null
    : ((row.result - row.target) / row.target) * 100;
}

/** One cell for a persona column: numeric columns right-aligned and tabular. */
function renderCell(
  row: HistoryRow,
  column: ColumnKey,
  currency: Currency,
): ReactNode {
  switch (column) {
    case "part":
      return (
        <PrimaryCell
          key={column}
          className="max-w-[16rem] pl-5"
          title={row.part}
          detail={<span className="tabular">{row.number}</span>}
        />
      );
    case "revision":
      return (
        <TD key={column} className="tabular whitespace-nowrap">
          Rev {row.revision}
        </TD>
      );
    case "change":
      return (
        <TD key={column} className="max-w-[16rem]">
          <span className="block truncate" title={row.change}>
            {row.change}
          </span>
        </TD>
      );
    case "process":
      return (
        <TD key={column} className="whitespace-nowrap">
          {row.process}
        </TD>
      );
    case "programme":
      return (
        <TD key={column} className="tabular whitespace-nowrap">
          {row.programme}
        </TD>
      );
    case "region":
      return <TD key={column}>{row.region}</TD>;
    case "engineer":
      return (
        <TD key={column} className="whitespace-nowrap">
          {row.engineer}
        </TD>
      );
    case "result":
      return (
        <NumCell key={column} strong>
          {formatMoney(row.result, currency)}
        </NumCell>
      );
    case "target":
      return (
        <NumCell key={column} muted>
          {row.target == null ? "n/a" : formatMoney(row.target, currency)}
        </NumCell>
      );
    case "variance": {
      const pct = variance(row);
      return (
        <NumCell key={column}>
          <span
            className={cx(
              "text-label-md",
              statusTextClass(statusFor(row.result, row.target)),
            )}
          >
            {pct == null ? "n/a" : formatPct(pct)}
          </span>
        </NumCell>
      );
    }
    case "actual":
      return (
        <NumCell key={column} muted>
          {row.number === "DTV-HSG-0431"
            ? formatMoney(QUOTED_ACTUAL.value, currency)
            : "n/a"}
        </NumCell>
      );
    case "volume":
      return (
        <NumCell key={column} muted>
          {row.volume == null ? "n/a" : `${formatNumber(row.volume)}/yr`}
        </NumCell>
      );
    case "annualSpend":
      return (
        <NumCell key={column} strong>
          {row.annualSpend == null
            ? "n/a"
            : formatMoney(row.annualSpend, currency, 0)}
        </NumCell>
      );
    case "tooling": {
      const tool = Object.values(TOOLING).find(
        (spec) => spec.partNumber === row.number,
      );
      return (
        <NumCell key={column} muted>
          {tool ? formatMoney(tool.cost, currency, 0) : "n/a"}
        </NumCell>
      );
    }
    case "status": {
      const pct = variance(row);
      return (
        <TD key={column} align="right">
          <StatusChip
            size="sm"
            status={statusFor(row.result, row.target)}
            label={pct == null ? "No target" : formatPct(pct)}
          />
        </TD>
      );
    }
    case "time":
      return (
        <TD key={column} className="text-body-sm tabular text-quaternary">
          {row.time}
        </TD>
      );
  }
}

/** Estimate History: every run grouped by day, viewed through one role's columns. */
export function HistoryView() {
  return (
    <>
      <PageHeader
        title="Estimate History"
        mark={<Mark id={ROUTE_MARK["/history"]} size={44} />}
        subtitle="Every estimate run, when and by whom: open any record to see the full breakdown"
      />
      <PageBody>
        <HistoryFeed />
      </PageBody>
    </>
  );
}

function HistoryFeed() {
  const { currency, setFlow } = useApp();
  const router = useRouter();
  const [partFilter, setPartFilter] = useState("all");
  const [personaKey, setPersonaKey] = useState<PersonaKey>("design");
  const persona = PERSONAS[personaKey];

  const openRun = (run: EstimateRun) => {
    setFlow({
      preset: PRESET_BY_PROCESS[run.process] ?? "bearing",
      process: PROCESS_KEY[run.process] ?? "sand",
      material: null,
      manual: false,
      comparing: false,
      confirmed: true,
      tab: "part",
      unknowns: [],
      source: {
        name: run.part,
        number: run.number,
        revision: run.revision,
        date: run.date,
        engineer: run.engineer,
      },
    });
    router.push("/new-estimate");
  };

  const partOptions = useMemo(
    () => [
      "all",
      ...Array.from(new Set(ESTIMATE_RUNS.map((run) => run.part))).sort(),
    ],
    [],
  );

  const rows = useMemo<HistoryRow[]>(
    () =>
      ESTIMATE_RUNS.map((run) => {
        const part = PARTS.find((p) => p.number === run.number);
        return {
          ...run,
          programme: part?.programme ?? "n/a",
          region: part?.region ?? "n/a",
          volume: part?.annualVolume ?? null,
          annualSpend: part ? run.result * part.annualVolume : null,
        };
      }),
    [],
  );

  const filtered = useMemo(
    () =>
      partFilter === "all"
        ? rows
        : rows.filter((row) => row.part === partFilter),
    [partFilter, rows],
  );

  const byDate = useMemo(() => {
    const groups = new Map<string, HistoryRow[]>();
    filtered.forEach((row) =>
      groups.set(row.date, [...(groups.get(row.date) ?? []), row]),
    );
    return Array.from(groups.entries());
  }, [filtered]);

  const colSpan = persona.columns.length + 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Point of view */}
      <section className="flex flex-col gap-3 rounded-xl border border-muted bg-container p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-caption tracking-[0.08em] text-quaternary uppercase">
            <Eye size={14} strokeWidth={1.75} aria-hidden />
            Point of view
          </span>
          <Segmented
            ariaLabel="Point of view"
            value={personaKey}
            onChange={setPersonaKey}
            options={PERSONA_KEYS.map((key) => ({
              value: key,
              label: PERSONAS[key].role,
              icon: <Mark id={PERSONA_MARK[key]} size={20} />,
            }))}
          />
          <Badge
            variant="outline"
            tone="neutral"
            size="sm"
            icon={Database}
            className="lg:ml-auto"
            title="Runs are read from the PLM feed and cannot be edited here"
          >
            Source: Teamcenter · read-only
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Mark id={PERSONA_MARK[personaKey]} size={40} />
          <p className="max-w-[80ch] min-w-0 text-body-md text-tertiary">
            <span className="text-label-md text-primary">
              “{persona.question}”
            </span>{" "}
            {persona.focus.charAt(0).toUpperCase() + persona.focus.slice(1)}.
          </p>
        </div>
      </section>

      {/* Runs */}
      <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-muted bg-container">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-muted p-3 sm:px-4">
          <Dropdown
            aria-label="Part"
            value={partFilter}
            onChange={setPartFilter}
            options={toOptions(partOptions, (option) => (option === "all" ? "All parts" : option))}
            shape="pill"
            edited={partFilter !== "all"}
            className="w-full sm:w-64"
          />
          {partFilter !== "all" ? (
            <TextAction onClick={() => setPartFilter("all")}>
              <X size={12} strokeWidth={1.75} aria-hidden />
              Clear
            </TextAction>
          ) : null}
          <span
            className="ml-auto text-caption text-quaternary"
            aria-live="polite"
          >
            <span className="tabular text-secondary">{filtered.length}</span> of{" "}
            <span className="tabular">{ESTIMATE_RUNS.length}</span> estimates
          </span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            mark={<Mark id="mark-empty-search" size={104} className="mb-2" />}
            title="No runs for this part"
            detail="Pick another part, or show every run."
            action={
              <Button variant="secondary" onClick={() => setPartFilter("all")}>
                Show all parts
              </Button>
            }
          />
        ) : (
          <>
            {/* Phones: grouped list */}
            <div className="md:hidden">
              {byDate.map(([date, dayRows]) => (
                <div key={date}>
                  <h3 className="flex h-9 items-center justify-between border-b border-muted bg-raised px-3 text-caption tracking-[0.08em] text-quaternary uppercase">
                    <span>{formatDate(date)}</span>
                    <span className="tabular">
                      {dayRows.length} {dayRows.length === 1 ? "run" : "runs"}
                    </span>
                  </h3>
                  <ul>
                    {dayRows.map((row) => (
                      <li
                        key={`${row.number}-${row.time}`}
                        className="border-b border-muted"
                      >
                        <button
                          type="button"
                          onClick={() => openRun(row)}
                          title={`Open ${row.part} in the estimate workspace`}
                          className="flex w-full cursor-pointer items-start gap-3 px-3 py-3 text-left transition-colors duration-[150ms] outline-none hover:bg-raised focus-visible:bg-raised focus-visible:shadow-[inset_2px_0_0_var(--stroke-active)]"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-label-md text-primary">
                              {row.part}
                            </span>
                            <span className="mt-0.5 block truncate text-body-sm text-quaternary">
                              <span className="tabular">{row.number}</span> ·
                              Rev {row.revision} · {row.change}
                            </span>
                            <span className="mt-2 flex flex-wrap items-center gap-2">
                              <RunStatus row={row} />
                              <span className="text-body-sm tabular text-quaternary">
                                {row.time} · {row.engineer}
                              </span>
                            </span>
                          </span>
                          <span className="shrink-0 text-label-md tabular text-primary">
                            {formatMoney(row.result, currency)}
                          </span>
                          <ChevronRight
                            size={16}
                            strokeWidth={1.75}
                            aria-hidden
                            className="mt-0.5 shrink-0 icon-quaternary"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Tablet and up: one table, grouped by day */}
            <Table
              minWidth={900}
              maxHeight="max(24rem, calc(100dvh - 24rem))"
              className="hidden md:block"
              aria-label={`Estimate runs, ${persona.role} view`}
            >
              <THead>
                <tr>
                  {persona.columns.map((column) => (
                    <TH
                      key={column}
                      align={
                        NUMERIC_COLUMNS.includes(column) || column === "status"
                          ? "right"
                          : "left"
                      }
                      className={column === "part" ? "pl-5" : undefined}
                    >
                      {COLUMN_LABELS[column]}
                    </TH>
                  ))}
                  <TH className="w-10">
                    <span className="sr-only">Open</span>
                  </TH>
                </tr>
              </THead>
              {byDate.map(([date, dayRows]) => (
                <TBody key={date}>
                  <tr>
                    <th
                      scope="colgroup"
                      colSpan={colSpan}
                      className="sticky top-10 z-[5] h-9 border-b border-muted bg-raised-2 px-5 text-left text-caption font-medium tracking-[0.08em] text-tertiary uppercase"
                    >
                      {formatDate(date)}
                      <span className="ml-2 font-normal text-quaternary">
                        · <span className="tabular">{dayRows.length}</span>{" "}
                        {dayRows.length === 1 ? "run" : "runs"}
                      </span>
                    </th>
                  </tr>
                  {dayRows.map((row) => (
                    <TR
                      key={`${row.number}-${row.time}`}
                      onClick={() => openRun(row)}
                      title={`Open ${row.part} in the estimate workspace`}
                    >
                      {persona.columns.map((column) =>
                        renderCell(row, column, currency),
                      )}
                      <ChevronCell />
                    </TR>
                  ))}
                </TBody>
              ))}
            </Table>
          </>
        )}
      </section>
    </div>
  );
}

/** Status chip carrying the signed variance, as in the table's status column. */
function RunStatus({ row }: { row: HistoryRow }) {
  const pct = variance(row);
  return (
    <StatusChip
      size="sm"
      status={statusFor(row.result, row.target)}
      label={pct == null ? "No target" : formatPct(pct)}
    />
  );
}
