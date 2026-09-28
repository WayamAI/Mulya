"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type MouseEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  History,
  Plus,
  SearchX,
  X,
} from "lucide-react";
import { PageBody, PageHeader } from "@/components/mulya/page";
import {
  StatusChip,
  statusTextClass,
  type TargetStatus,
} from "@/components/mulya/status-chip";
import { Button, ButtonLink, TextAction } from "@/components/ui/button";
import { Dropdown, toOptions } from "@/components/ui/dropdown";
import { SearchInput } from "@/components/ui/field";
import { Mark } from "@/components/ui/mark";
import { EmptyState } from "@/components/ui/primitives";
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
import { useApp } from "@/lib/app-context";
import { MATERIAL_RATES } from "@/lib/costing/rates";
import {
  PARTS,
  PROCESSES,
  PROGRAMMES,
  REGIONS,
  partStatus,
  variancePct,
  type Part,
  type ProcessName,
} from "@/lib/costing/parts";
import { PRESET_PART_NUMBERS } from "@/lib/costing/session";
import { cx, formatDate, formatMoney, formatPct } from "@/lib/format";
import { PROCESS_NAME_MARK, ROUTE_MARK } from "@/lib/marks";

const PAGE_SIZE = 12;

const STATUS_LABELS: Record<TargetStatus, string> = {
  over: "Over target",
  on: "On target",
  under: "Under target",
  pending: "No target",
};

/** Part number → preset, for the three parts that have a full estimate model. */
const PRESET_BY_PART_NUMBER: Record<string, string> = Object.fromEntries(
  Object.entries(PRESET_PART_NUMBERS).map(([preset, number]) => [
    number,
    preset,
  ]),
);

/** Fallback preset per process, when the part has no model of its own. */
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

type SortKey = "estimate" | "target" | "variance" | "date";

interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

interface ActiveFilter {
  label: string;
  clear: () => void;
}

/** Row actions are revealed on hover / focus; always visible on touch screens. */
const revealOnRow =
  "opacity-0 transition-opacity duration-[150ms] group-hover/row:opacity-100 group-focus-within/row:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100";

/** Keeps a click inside a row action from also opening the row. */
const stop = (event: MouseEvent) => event.stopPropagation();

/** Labelled filter over plain string options; `all` reads “All <label>”. */
function FilterField({
  label,
  value,
  onChange,
  options,
  format = (option) => option,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  format?: (option: string) => string;
  className?: string;
}) {
  return (
    <Dropdown
      aria-label={label}
      value={value}
      onChange={onChange}
      options={toOptions(options, (option) => (option === "all" ? `All ${label.toLowerCase()}` : format(option)))}
      shape="pill"
      edited={value !== "all"}
      menuMinWidth={200}
      className={className}
    />
  );
}

/** Part Library: the 50-part catalogue with filters, sortable columns and paging. */
export function LibraryView() {
  const { currency, setFlow } = useApp();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [process, setProcess] = useState("all");
  const [material, setMaterial] = useState("all");
  const [programme, setProgramme] = useState("all");
  const [status, setStatus] = useState("all");
  const [region, setRegion] = useState("all");
  const [sort, setSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(0);

  const openEstimate = (part: Part) => {
    setFlow({
      preset:
        PRESET_BY_PART_NUMBER[part.number] ??
        PRESET_BY_PROCESS[part.process] ??
        "bearing",
      process: PROCESS_KEY[part.process] ?? "sand",
      material: null,
      manual: false,
      comparing: false,
      confirmed: true,
      scenarioId: "base",
      tab: "part",
      unknowns: [],
      source: {
        name: part.name,
        number: part.number,
        revision: part.revision,
        date: part.date,
        engineer: part.engineer,
      },
    });
    router.push("/estimate");
  };

  const clearAll = () => {
    setQuery("");
    setProcess("all");
    setMaterial("all");
    setProgramme("all");
    setStatus("all");
    setRegion("all");
    setPage(0);
  };

  const activeFilters = [
    process !== "all" && {
      label: `Process: ${process}`,
      clear: () => setProcess("all"),
    },
    material !== "all" && {
      label: `Material: ${material}`,
      clear: () => setMaterial("all"),
    },
    programme !== "all" && {
      label: `Programme: ${programme}`,
      clear: () => setProgramme("all"),
    },
    status !== "all" && {
      label: `Status: ${STATUS_LABELS[status as TargetStatus]}`,
      clear: () => setStatus("all"),
    },
    region !== "all" && {
      label: `Region: ${region}`,
      clear: () => setRegion("all"),
    },
    query.trim() !== "" && { label: `“${query}”`, clear: () => setQuery("") },
  ].filter((filter): filter is ActiveFilter => Boolean(filter));

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = PARTS.filter(
      (part) =>
        (needle === "" ||
          part.name.toLowerCase().includes(needle) ||
          part.number.toLowerCase().includes(needle)) &&
        (process === "all" || part.process === process) &&
        (material === "all" || part.material === material) &&
        (programme === "all" || part.programme === programme) &&
        (status === "all" || partStatus(part) === status) &&
        (region === "all" || part.region === region),
    );
    const sortValue = (part: Part): number | string =>
      sort.key === "variance"
        ? (variancePct(part) ?? -Infinity)
        : sort.key === "date"
          ? part.date
          : (part[sort.key] ?? -Infinity);
    return filtered.sort((a, b) => {
      const va = sortValue(a);
      const vb = sortValue(b);
      const diff =
        typeof va === "string" && typeof vb === "string"
          ? va.localeCompare(vb)
          : Number(va) - Number(vb);
      return sort.dir === "asc" ? diff : -diff;
    });
  }, [query, process, material, programme, status, region, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = rows.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  const toggleSort = (key: SortKey) =>
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc",
    }));

  const sortProps = (key: SortKey, label: string) => ({
    sort: sort.key === key ? sort.dir : null,
    onSort: () => toggleSort(key),
    title: `Sort by ${label}`,
  });

  /** Wrap a filter setter so changing it returns to the first page. */
  const resetting = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(0);
  };

  return (
    <>
      <PageHeader
        title="Part Library"
        subtitle={`${PARTS.length} parts`}
        mark={<Mark id={ROUTE_MARK["/library"]} size={44} />}
        actions={
          <ButtonLink href="/new-estimate" variant="primary" icon={Plus}>
            New Estimate
          </ButtonLink>
        }
      />
      <PageBody>
        <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-muted bg-container">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-2 border-b border-muted p-3 sm:flex sm:flex-wrap sm:items-center sm:p-4">
            <SearchInput
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Search part name or number"
              aria-label="Search part name or number"
              className="col-span-2 sm:min-w-[13rem] sm:flex-1"
            />
            <FilterField
              label="Process"
              value={process}
              onChange={resetting(setProcess)}
              options={["all", ...PROCESSES]}
              className="sm:w-40"
            />
            <FilterField
              label="Material"
              value={material}
              onChange={resetting(setMaterial)}
              options={["all", ...MATERIAL_RATES.map((rate) => rate.grade)]}
              className="sm:w-36"
            />
            <FilterField
              label="Programme"
              value={programme}
              onChange={resetting(setProgramme)}
              options={["all", ...PROGRAMMES]}
              className="sm:w-40"
            />
            <FilterField
              label="Status"
              value={status}
              onChange={resetting(setStatus)}
              options={["all", "over", "on", "under", "pending"]}
              format={(option) => STATUS_LABELS[option as TargetStatus]}
              className="sm:w-40"
            />
            <FilterField
              label="Region"
              value={region}
              onChange={resetting(setRegion)}
              options={["all", ...REGIONS]}
              className="col-span-2 sm:col-auto sm:w-32"
            />
          </div>

          {/* Active filters + count */}
          <div className="flex min-h-11 flex-wrap items-center gap-2 border-b border-muted px-3 py-2 sm:px-4">
            {activeFilters.length === 0 ? (
              <span className="text-body-sm text-quaternary">
                All parts, newest estimate first
              </span>
            ) : (
              activeFilters.map((filter) => (
                <button
                  key={filter.label}
                  type="button"
                  onClick={filter.clear}
                  aria-label={`Remove filter ${filter.label}`}
                  className="group/chip inline-flex h-6 max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-info-stroke bg-info-surface pr-1.5 pl-2.5 text-label-sm text-info transition-colors duration-[150ms] outline-none hover:border-info-icon focus-visible:ring-2 focus-visible:ring-active"
                >
                  <span className="truncate">{filter.label}</span>
                  <span className="flex size-4 items-center justify-center rounded-full transition-colors duration-[150ms] group-hover/chip:bg-info-badge group-hover/chip:text-badge">
                    <X size={11} strokeWidth={2} aria-hidden />
                  </span>
                </button>
              ))
            )}
            {activeFilters.length > 1 ? (
              <TextAction onClick={clearAll} className="px-1">
                Clear all
              </TextAction>
            ) : null}
            <span
              className="ml-auto text-caption whitespace-nowrap text-quaternary"
              aria-live="polite"
            >
              <span className="tabular text-secondary">{rows.length}</span> of{" "}
              <span className="tabular">{PARTS.length}</span> parts
            </span>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={SearchX}
              mark={<Mark id="mark-empty-search" size={112} className="mb-2" />}
              title="No parts match these filters"
              detail="Try widening the process or status filter, or clear everything and start again."
              action={
                <Button variant="secondary" onClick={clearAll}>
                  Clear all filters
                </Button>
              }
              className="py-16"
            />
          ) : (
            <>
              {/* Phones: stacked list */}
              <ul className="flex flex-col md:hidden">
                {visible.map((part) => {
                  const partState = partStatus(part);
                  const variance = variancePct(part);
                  return (
                    <li
                      key={part.number}
                      className="border-b border-muted last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() => openEstimate(part)}
                        title={`View estimate for ${part.name}`}
                        className="flex w-full cursor-pointer items-start gap-3 px-3 py-3 text-left transition-colors duration-[150ms] outline-none hover:bg-raised focus-visible:bg-raised focus-visible:shadow-[inset_2px_0_0_var(--stroke-active)]"
                      >
                        <Mark id={PROCESS_NAME_MARK[part.process]} size={24} className="mt-0.5" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-label-md text-primary">
                            {part.name}
                          </span>
                          <span className="mt-0.5 block truncate text-body-sm text-quaternary">
                            <span className="tabular">{part.number}</span> ·{" "}
                            {part.process} · {part.material}
                          </span>
                          <span className="mt-2 flex flex-wrap items-center gap-2">
                            <StatusChip status={partState} size="sm" />
                            <span className="text-body-sm tabular text-quaternary">
                              {formatDate(part.date)}
                            </span>
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className="text-label-md tabular text-primary">
                            {formatMoney(part.estimate, currency)}
                          </span>
                          <span
                            className={cx(
                              "text-body-sm tabular",
                              statusTextClass(partState),
                            )}
                          >
                            {variance == null ? "n/a" : formatPct(variance)}
                          </span>
                        </span>
                        <ChevronRight
                          size={16}
                          strokeWidth={1.75}
                          aria-hidden
                          className="mt-0.5 shrink-0 icon-quaternary"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Tablet and up: table */}
              <Table
                minWidth={1040}
                maxHeight="max(24rem, calc(100dvh - 22rem))"
                className="hidden md:block"
                aria-label="Parts"
              >
                <THead>
                  <tr>
                    <TH className="pl-5">Part</TH>
                    <TH>Spec</TH>
                    <TH align="right" {...sortProps("estimate", "estimate")}>
                      Weight / Estimate
                    </TH>
                    <TH align="right" {...sortProps("target", "target")}>
                      Target
                    </TH>
                    <TH align="right" {...sortProps("variance", "variance")}>
                      Variance
                    </TH>
                    <TH>Status</TH>
                    <TH {...sortProps("date", "date")}>Date</TH>
                    <TH className="w-24">
                      <span className="sr-only">Actions</span>
                    </TH>
                    <TH className="w-10">
                      <span className="sr-only">Open</span>
                    </TH>
                  </tr>
                </THead>
                <TBody>
                  {visible.map((part) => {
                    const partState = partStatus(part);
                    const variance = variancePct(part);
                    return (
                      <TR
                        key={part.number}
                        onClick={() => openEstimate(part)}
                        title={`View estimate for ${part.name}`}
                      >
                        <PrimaryCell
                          className="max-w-[16rem] pl-5"
                          title={part.name}
                          detail={
                            <span className="tabular">{part.number}</span>
                          }
                        />
                        <TD className="max-w-[15rem]">
                          <div className="truncate">
                            {part.process} · {part.material}
                          </div>
                          <div className="mt-0.5 truncate text-body-sm text-quaternary">
                            {part.programme} · {part.region} · Rev{" "}
                            {part.revision}
                          </div>
                        </TD>
                        <NumCell>
                          <div>{formatMoney(part.estimate, currency)}</div>
                          <div className="mt-0.5 text-body-sm text-quaternary">
                            {part.weightKg.toFixed(2)} kg
                          </div>
                        </NumCell>
                        <NumCell muted>
                          {part.target == null
                            ? "n/a"
                            : formatMoney(part.target, currency)}
                        </NumCell>
                        <NumCell>
                          <span
                            className={cx(
                              "text-label-md",
                              statusTextClass(partState),
                            )}
                          >
                            {variance == null ? "n/a" : formatPct(variance)}
                          </span>
                        </NumCell>
                        <TD>
                          <StatusChip status={partState} size="sm" />
                        </TD>
                        <TD className="whitespace-nowrap">
                          <div className="tabular">{formatDate(part.date)}</div>
                          <div className="mt-0.5 text-body-sm text-quaternary">
                            {part.engineer}
                          </div>
                        </TD>
                        <TD align="right" className="pr-0">
                          <div className="flex items-center justify-end gap-0.5">
                            <ButtonLink
                              href="/history"
                              variant="ghost"
                              size="sm"
                              icon={History}
                              aria-label={`History of ${part.name}`}
                              title="History"
                              onClick={stop}
                              className={revealOnRow}
                            />
                            <ButtonLink
                              href="/new-estimate"
                              variant="ghost"
                              size="sm"
                              icon={Copy}
                              aria-label={`Duplicate ${part.name} as a new estimate`}
                              title="Duplicate"
                              onClick={stop}
                              className={revealOnRow}
                            />
                          </div>
                        </TD>
                        <ChevronCell />
                      </TR>
                    );
                  })}
                </TBody>
              </Table>

              {/* Paging */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-muted px-3 py-3 sm:px-5">
                <span className="text-body-sm text-quaternary">
                  Showing{" "}
                  <span className="tabular text-secondary">
                    {currentPage * PAGE_SIZE + 1}
                  </span>
 to 
                  <span className="tabular text-secondary">
                    {Math.min(rows.length, (currentPage + 1) * PAGE_SIZE)}
                  </span>{" "}
                  of{" "}
                  <span className="tabular text-secondary">{rows.length}</span>
                </span>
                <nav aria-label="Pages" className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ChevronLeft}
                    disabled={currentPage === 0}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="min-w-10 text-center text-label-sm tabular text-secondary">
                    {currentPage + 1} / {pageCount}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    iconRight={ChevronRight}
                    disabled={currentPage >= pageCount - 1}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </nav>
              </div>
            </>
          )}
        </section>
      </PageBody>
    </>
  );
}
