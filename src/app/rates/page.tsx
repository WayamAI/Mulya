"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Info, RotateCcw, Save } from "lucide-react";
import { PageBody, PageHeader } from "@/components/mulya/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { NumberInput } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { BURDEN_RATES, MACHINE_RATES, MATERIAL_RATES, REGION_FACTORS } from "@/lib/costing/rates";
import { cx } from "@/lib/format";
import { ROUTE_MARK } from "@/lib/marks";

const TABS = ["Materials", "Machine rates", "Regions", "Overhead & margin"] as const;
type RateTab = (typeof TABS)[number];

/** Every editable figure, keyed `row.field`, with its catalogue value. */
const BASELINE: Record<string, number> = Object.fromEntries([
  ...MATERIAL_RATES.flatMap((r) => [
    [`mat-${r.grade}.rate`, r.rate],
    [`mat-${r.grade}.scrap`, r.scrap],
  ]),
  ...MACHINE_RATES.flatMap((r) => [
    [`mac-${r.machine}.rate`, r.rate],
    [`mac-${r.machine}.setup`, r.setup],
    [`mac-${r.machine}.utilisation`, r.utilisation],
  ]),
  ...REGION_FACTORS.flatMap((r) => [
    [`reg-${r.region}.factor`, r.factor],
    [`reg-${r.region}.freight`, r.freight],
  ]),
  ...BURDEN_RATES.map((r) => [`ovh-${r.key}.value`, r.value]),
]);

/** Which tab each row key lives on (freight also shows under Overhead). */
function tabsForRow(row: string): RateTab[] {
  if (row.startsWith("mat-")) return ["Materials"];
  if (row.startsWith("mac-")) return ["Machine rates"];
  if (row.startsWith("ovh-")) return ["Overhead & margin"];
  return ["Regions"];
}

/** Figure cells sit tighter on phones so both columns stay in view. */
const NUM_TD = "px-2 sm:px-4";
const STICKY_TH = "sticky left-0 z-[2] pl-3 sm:pl-4 md:static";

const rowOf = (cell: string) => cell.slice(0, cell.lastIndexOf("."));

/** Rate Master: material, machine, region and burden rates behind every estimate. */
export default function RatesPage() {
  const [tab, setTab] = useState<RateTab>("Materials");
  /** Committed values (catalogue + saved edits). */
  const [saved, setSaved] = useState<Record<string, number>>(BASELINE);
  /** Unsaved values; `null` while a field is cleared. */
  const [draft, setDraft] = useState<Record<string, number | null>>({});
  const [savedNote, setSavedNote] = useState<number | null>(null);

  const isEdited = (cell: string) => cell in draft && draft[cell] !== saved[cell];
  const editedCells = Object.keys(draft).filter(isEdited);
  const editedRows = new Set(editedCells.map(rowOf));
  const rowEdited = (row: string) => editedRows.has(row);
  const pending = editedRows.size;
  const invalidCount = editedCells.filter((cell) => draft[cell] == null).length;

  const tabEdits = (name: RateTab) =>
    [...editedRows].filter((row) => tabsForRow(row).includes(name)).length +
    (name === "Overhead & margin" ? [...editedRows].filter((row) => row.startsWith("reg-") && editedCells.includes(`${row}.freight`)).length : 0);

  useEffect(() => {
    if (savedNote == null) return;
    const id = window.setTimeout(() => setSavedNote(null), 3200);
    return () => window.clearTimeout(id);
  }, [savedNote]);

  function save() {
    if (pending === 0 || invalidCount > 0) return;
    const next = { ...saved };
    for (const cell of editedCells) next[cell] = draft[cell] as number;
    setSaved(next);
    setDraft({});
    setSavedNote(pending);
  }

  const discard = () => setDraft({});
  const revertRow = (row: string) =>
    setDraft((prev) => Object.fromEntries(Object.entries(prev).filter(([cell]) => rowOf(cell) !== row)));

  /** Editable figure bound to one cell. */
  const cell = (key: string, unit: string, opts: { step?: number; min?: number; max?: number; label: string }) => {
    const value = key in draft ? draft[key] : saved[key];
    const invalid = key in draft && draft[key] == null;
    return (
      <NumberInput
        aria-label={opts.label}
        value={value}
        onValueChange={(next) => setDraft((prev) => ({ ...prev, [key]: next }))}
        unit={unit}
        step={opts.step ?? 0.01}
        min={opts.min ?? 0}
        max={opts.max}
        size="sm"
        edited={isEdited(key) && !invalid}
        invalid={invalid ? "Enter a value" : undefined}
        className="ml-auto w-24 sm:w-36"
        inputClassName="text-body-md"
      />
    );
  };

  const counts = Object.fromEntries(TABS.map((name) => [name, tabEdits(name)])) as Record<RateTab, number>;

  return (
    <>
      <PageHeader
        title="Rate Master"
        mark={<Mark id={ROUTE_MARK["/rates"]} size={44} />}
        subtitle="Last updated 14 Jul 2026 by Design Operator"
        actions={
          <>
            {savedNote != null ? (
              <Badge tone="success" size="md" className="hidden sm:inline-flex">
                {savedNote} {savedNote === 1 ? "row" : "rows"} saved
              </Badge>
            ) : null}
            <Button icon={Save} disabled={pending === 0 || invalidCount > 0} onClick={save}>
              Save{pending > 0 ? ` (${pending})` : ""}
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-xl border border-muted bg-raised px-4 py-3 text-body-md text-secondary">
            <Info size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-info-icon" />
            Placeholder rates for demonstration. Connect your purchasing rate cards to replace these.
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <Segmented
              ariaLabel="Rate tables"
              idPrefix="rates"
              value={tab}
              onChange={setTab}
              options={TABS.map((name) => ({
                value: name,
                label: name,
                count: counts[name] > 0 ? counts[name] : undefined,
                title: counts[name] > 0 ? `${counts[name]} edited` : undefined,
              }))}
            />
            <p className="text-body-sm text-quaternary">
              Click a figure to edit. <span className="hidden sm:inline">↑ ↓ to step, Shift for ×10.</span>
            </p>
          </div>

          <section
            id={`rates-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`rates-tab-${tab}`}
            className="min-w-0 overflow-hidden rounded-xl border border-muted bg-container"
          >
            {tab === "Materials" ? (
              <Table>
                <THead>
                  <tr>
                    <TH className={STICKY_TH}>Grade</TH>
                    <TH className="hidden md:table-cell">Standard</TH>
                    <TH className="hidden md:table-cell">Process</TH>
                    <TH align="right">Rate</TH>
                    <TH align="right">Scrap return</TH>
                    <TH className="w-12" aria-label="Row actions" />
                  </tr>
                </THead>
                <TBody>
                  {MATERIAL_RATES.map((row) => {
                    const key = `mat-${row.grade}`;
                    return (
                      <RateRow key={key} edited={rowEdited(key)} onRevert={() => revertRow(key)} name={row.grade}>
                        <NameCell edited={rowEdited(key)} tabular detail={`${row.standard} · ${row.process}`}>
                          {row.grade}
                        </NameCell>
                        <TD className="hidden tabular md:table-cell">{row.standard}</TD>
                        <TD className="hidden md:table-cell">
                          <Badge variant="outline" size="sm" icon={false}>
                            {row.process}
                          </Badge>
                        </TD>
                        <TD align="right" className={NUM_TD}>{cell(`${key}.rate`, "€/kg", { label: `${row.grade} rate` })}</TD>
                        <TD align="right" className={NUM_TD}>
                          {cell(`${key}.scrap`, "€/kg", { label: `${row.grade} scrap return` })}
                        </TD>
                      </RateRow>
                    );
                  })}
                </TBody>
              </Table>
            ) : null}

            {tab === "Machine rates" ? (
              <Table minWidth={620}>
                <THead>
                  <tr>
                    <TH className={STICKY_TH}>Machine</TH>
                    <TH align="right">Rate</TH>
                    <TH align="right">Setup</TH>
                    <TH align="right">Utilisation</TH>
                    <TH className="w-12" aria-label="Row actions" />
                  </tr>
                </THead>
                <TBody>
                  {MACHINE_RATES.map((row) => {
                    const key = `mac-${row.machine}`;
                    return (
                      <RateRow key={key} edited={rowEdited(key)} onRevert={() => revertRow(key)} name={row.machine}>
                        <NameCell edited={rowEdited(key)}>{row.machine}</NameCell>
                        <TD align="right" className={NUM_TD}>{cell(`${key}.rate`, "€/h", { step: 1, label: `${row.machine} rate` })}</TD>
                        <TD align="right" className={NUM_TD}>
                          {cell(`${key}.setup`, "min", { step: 5, label: `${row.machine} setup` })}
                        </TD>
                        <TD align="right" className={NUM_TD}>
                          {cell(`${key}.utilisation`, "%", { step: 1, max: 100, label: `${row.machine} utilisation` })}
                        </TD>
                      </RateRow>
                    );
                  })}
                </TBody>
              </Table>
            ) : null}

            {tab === "Regions" ? (
              <>
                <Table>
                  <THead>
                    <tr>
                      <TH className={STICKY_TH}>Region</TH>
                      <TH align="right">Labour factor</TH>
                      <TH align="right">Freight</TH>
                      <TH className="w-12" aria-label="Row actions" />
                    </tr>
                  </THead>
                  <TBody>
                    {REGION_FACTORS.map((row) => {
                      const key = `reg-${row.region}`;
                      return (
                        <RateRow key={key} edited={rowEdited(key)} onRevert={() => revertRow(key)} name={row.region}>
                          <NameCell edited={rowEdited(key)}>{row.region}</NameCell>
                          <TD align="right" className={NUM_TD}>
                            {cell(`${key}.factor`, "factor", { label: `${row.region} labour factor` })}
                          </TD>
                          <TD align="right" className={NUM_TD}>
                            {cell(`${key}.freight`, "€/pc", { label: `${row.region} freight` })}
                          </TD>
                        </RateRow>
                      );
                    })}
                  </TBody>
                </Table>
                <p className="border-t border-muted px-4 py-3 text-body-sm text-quaternary">
                  Material rates are global. Only labour and overhead flex by region.
                </p>
              </>
            ) : null}

            {tab === "Overhead & margin" ? (
              <Table>
                <THead>
                  <tr>
                    <TH className={STICKY_TH}>Item</TH>
                    <TH className="hidden md:table-cell">Covers</TH>
                    <TH align="right">Value</TH>
                    <TH className="w-12" aria-label="Row actions" />
                  </tr>
                </THead>
                <TBody>
                  {BURDEN_RATES.map((row) => {
                    const key = `ovh-${row.key}`;
                    return (
                      <RateRow key={key} edited={rowEdited(key)} onRevert={() => revertRow(key)} name={row.key}>
                        <NameCell edited={rowEdited(key)} detail={row.description}>
                          {row.key}
                        </NameCell>
                        <TD className="hidden max-w-[420px] md:table-cell">{row.description}</TD>
                        <TD align="right" className={NUM_TD}>{cell(`${key}.value`, "%", { step: 0.5, max: 100, label: row.key })}</TD>
                      </RateRow>
                    );
                  })}
                  {REGION_FACTORS.map((row) => {
                    const key = `reg-${row.region}`;
                    const edited = isEdited(`${key}.freight`);
                    return (
                      <RateRow
                        key={`f-${row.region}`}
                        edited={edited}
                        onRevert={() =>
                          setDraft((prev) => {
                            const next = { ...prev };
                            delete next[`${key}.freight`];
                            return next;
                          })
                        }
                        name={`Freight: ${row.region}`}
                      >
                        <NameCell edited={edited} detail="Inbound and outbound transport allocated per piece.">
                          Freight: {row.region}
                        </NameCell>
                        <TD className="hidden max-w-[420px] md:table-cell">Inbound and outbound transport allocated per piece.</TD>
                        <TD align="right" className={NUM_TD}>{cell(`${key}.freight`, "€/pc", { label: `Freight ${row.region}` })}</TD>
                      </RateRow>
                    );
                  })}
                </TBody>
              </Table>
            ) : null}
          </section>

          {/* Pending-changes bar: sticks to the bottom of the scroll area while edits are unsaved. */}
          <div
            aria-live="polite"
            className={cx(
              "sticky bottom-0 z-20 -mb-1 transition-[opacity,transform] duration-[180ms] ease-out motion-reduce:transition-none",
              pending > 0 ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
            )}
          >
            {pending > 0 ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-info-stroke bg-container px-4 py-3 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)]">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-info-icon" />
                  <span className="text-label-md text-primary">
                    <span className="tabular">{pending}</span> unsaved {pending === 1 ? "row" : "rows"}
                  </span>
                  <span className="hidden text-body-sm text-quaternary sm:inline">
                    · {TABS.filter((name) => counts[name] > 0).join(", ")}
                  </span>
                </span>
                {invalidCount > 0 ? (
                  <Badge tone="error" size="sm">
                    {invalidCount} empty {invalidCount === 1 ? "field" : "fields"}
                  </Badge>
                ) : null}
                <span className="ml-auto flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={discard}>
                    Discard
                  </Button>
                  <Button size="sm" icon={Save} disabled={invalidCount > 0} onClick={save}>
                    Save ({pending})
                  </Button>
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </PageBody>
    </>
  );
}

/** Table row with the edited tint and a revert action. */
function RateRow({
  edited,
  onRevert,
  name,
  children,
}: {
  edited: boolean;
  onRevert: () => void;
  name: string;
  children: ReactNode;
}) {
  return (
    <TR className={cx(edited && "bg-info-surface/40 hover:bg-info-surface/60")}>
      {children}
      <TD align="right" className="w-9 pr-2 pl-0 sm:w-12 sm:pr-3">
        {edited ? (
          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            aria-label={`Revert ${name}`}
            onClick={onRevert}
          />
        ) : null}
      </TD>
    </TR>
  );
}

/** Row label with the edited marker. */
function NameCell({
  edited,
  tabular = false,
  detail,
  children,
}: {
  edited: boolean;
  tabular?: boolean;
  /** Secondary line shown only below md, where the detail columns are hidden. */
  detail?: string;
  children: ReactNode;
}) {
  return (
    <TD className={cx("sticky left-0 z-[1] bg-container pr-2 pl-3 text-label-md text-primary sm:pl-4 md:static md:bg-transparent", tabular && "tabular")}>
      <span className="relative inline-flex items-center gap-2">
        <span
          aria-hidden
          className={cx(
            "size-1.5 shrink-0 rounded-full transition-colors duration-[150ms]",
            edited ? "bg-info-icon" : "bg-transparent",
          )}
        />
        {children}
        {edited ? <span className="sr-only">(edited)</span> : null}
      </span>
      {detail ? <span className="mt-0.5 block max-w-[7.5rem] pl-3.5 text-body-sm text-quaternary md:hidden">{detail}</span> : null}
    </TD>
  );
}
