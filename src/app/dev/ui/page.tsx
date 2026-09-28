"use client";

/**
 * Internal design-system showcase (/dev/ui). Not in the nav.
 * Renders every shared primitive so light/dark and density can be checked
 * in one place.
 */

import { ArrowRight, Download, Inbox, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { PageBody, PageHeader, Section } from "@/components/mulya/page";
import { StatusChip } from "@/components/mulya/status-chip";
import { useTrail } from "@/components/layout/trail-context";
import {
  AgentStateBadge,
  Badge,
  ConnectorBadge,
  PhaseBadge,
  ProvenanceBadge,
  VarianceBadge,
  ViabilityBadge,
  type BadgeTone,
  type BadgeVariant,
} from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dropdown, toOptions } from "@/components/ui/dropdown";
import { Mark } from "@/components/ui/mark";
import { Field, Input, NumberInput, SearchInput } from "@/components/ui/field";
import {
  EmptyState,
  KpiTile,
  Panel,
  Skeleton,
  SkeletonText,
  StatusBadge,
  StatusDot,
} from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/segmented";
import { ChevronCell, NumCell, PrimaryCell, TBody, TD, TH, THead, TR, Table, useSort } from "@/components/ui/table";
import { MARK_IDS } from "@/lib/marks";

const TONES: BadgeTone[] = ["success", "info", "neutral", "warning", "error", "brand"];
const VARIANTS: BadgeVariant[] = ["soft", "solid", "outline", "dot"];

const ROWS = [
  { id: "BRK-2210", name: "Cab mount bracket", detail: "Steel S355 · Laser + bend", cost: 18.42, target: 17.1, qty: 12000 },
  { id: "HSG-0412", name: "Gearbox cover", detail: "AlSi9Cu3 · HPDC", cost: 42.9, target: 44.0, qty: 4000 },
  { id: "BRG-1180", name: "Hub bearing carrier", detail: "EN-GJS-500 · Sand cast", cost: 63.15, target: null, qty: 2500 },
  { id: "PLT-0907", name: "Heat shield plate", detail: "1.4301 · Progressive die", cost: 6.08, target: 6.1, qty: 30000 },
];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-24 shrink-0 text-caption tracking-[0.08em] text-quaternary uppercase">{label}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export default function UiShowcasePage() {
  useTrail("UI kit");
  const [tab, setTab] = useState<"should" | "piece" | "tooling">("should");
  const [lot, setLot] = useState("1000");
  const [rate, setRate] = useState<number | null>(2.35);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState("eu");
  const [process, setProcess] = useState("all");
  const [grade, setGrade] = useState("GG25");
  const [part, setPart] = useState("DTV-HSG-0431");
  const { rows, thProps } = useSort(
    ROWS,
    {
      name: (r) => r.name,
      cost: (r) => r.cost,
      variance: (r) => (r.target == null ? null : ((r.cost - r.target) / r.target) * 100),
      qty: (r) => r.qty,
    },
    { key: "cost", dir: "desc" },
  );

  return (
    <>
      <PageHeader
        title="UI kit"
        subtitle="Every shared primitive in one place: badges, buttons, fields, segmented controls, tables, KPI tiles, empty and loading states."
        actions={
          <>
            <Button variant="secondary" icon={Download}>
              Export
            </Button>
            <Button icon={Plus}>New estimate</Button>
          </>
        }
      />
      <PageBody>
        <div className="flex flex-col gap-4">
          <Section title="Badges" count={TONES.length * VARIANTS.length * 2}>
            <div className="flex flex-col gap-4">
              {VARIANTS.map((variant) => (
                <div key={variant} className="flex flex-col gap-2">
                  <Row label={variant}>
                    {TONES.map((tone) => (
                      <Badge key={tone} tone={tone} variant={variant}>
                        {tone}
                      </Badge>
                    ))}
                  </Row>
                  <Row label={`${variant} · sm`}>
                    {TONES.map((tone) => (
                      <Badge key={tone} tone={tone} variant={variant} size="sm">
                        {tone}
                      </Badge>
                    ))}
                  </Row>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Status families">
            <div className="flex flex-col gap-3">
              <Row label="Target">
                <StatusChip status="over" />
                <StatusChip status="on" />
                <StatusChip status="under" />
                <StatusChip status="pending" />
                <StatusChip status="over" size="sm" label="+8.4%" />
              </Row>
              <Row label="Variance">
                <VarianceBadge pct={8.4} />
                <VarianceBadge pct={1.2} />
                <VarianceBadge pct={-6.7} />
                <VarianceBadge pct={null} />
                <VarianceBadge pct={-12} size="sm" suffix="vs target" />
                <VarianceBadge pct={4} variant="dot" />
              </Row>
              <Row label="Agents">
                <AgentStateBadge state="queued" />
                <AgentStateBadge state="working" />
                <AgentStateBadge state="done" />
                <AgentStateBadge state="waiting" />
                <AgentStateBadge state="blocked" />
              </Row>
              <Row label="Connectors">
                <ConnectorBadge status="connected" />
                <ConnectorBadge status="available" />
                <ConnectorBadge status="planned" />
              </Row>
              <Row label="Viability">
                <ViabilityBadge viability="recommended" />
                <ViabilityBadge viability="viable" />
                <ViabilityBadge viability="redesign" />
                <ViabilityBadge viability="blocked" />
              </Row>
              <Row label="Inputs">
                <ProvenanceBadge state="read" size="sm" />
                <ProvenanceBadge state="assumed" size="sm" />
                <ProvenanceBadge state="unknown" size="sm" />
              </Row>
              <Row label="Phase">
                <PhaseBadge phase={1} state="done" label="Phase 1 · Read & route" />
                <PhaseBadge phase={2} state="active" label="Phase 2 · Cost" />
                <PhaseBadge phase={3} state="upcoming" />
              </Row>
              <Row label="Legacy">
                <StatusBadge tone="warning">Assumed</StatusBadge>
                <StatusBadge tone="info" variant="solid">
                  New
                </StatusBadge>
                <StatusDot tone="success">Synced</StatusDot>
                <StatusDot tone="info" pulse>
                  Running
                </StatusDot>
              </Row>
            </div>
          </Section>

          <Section title="Buttons">
            <div className="flex flex-col gap-3">
              {(["primary", "secondary", "ghost", "danger"] as const).map((variant) => (
                <Row key={variant} label={variant}>
                  <Button variant={variant} size="sm">
                    Small
                  </Button>
                  <Button variant={variant} icon={variant === "danger" ? Trash2 : Plus}>
                    Medium
                  </Button>
                  <Button variant={variant} size="lg" iconRight={ArrowRight}>
                    Large
                  </Button>
                  <Button variant={variant} icon={Pencil} aria-label="Edit" />
                  <Button variant={variant} disabled>
                    Disabled
                  </Button>
                  <Button variant={variant} loading>
                    Loading
                  </Button>
                </Row>
              ))}
              <Row label="Link">
                <ButtonLink href="/library" iconRight={ArrowRight}>
                  Open library
                </ButtonLink>
                <Button
                  variant="secondary"
                  icon={RefreshCw}
                  loading={loading}
                  onClick={() => {
                    setLoading(true);
                    setTimeout(() => setLoading(false), 1200);
                  }}
                >
                  Recalculate
                </Button>
              </Row>
            </div>
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Fields">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Part name" hint="As printed on the drawing">
                  {(id) => <Input id={id} placeholder="Cab mount bracket" />}
                </Field>
                <Field label="Material rate" aside="Edited">
                  {(id) => (
                    <NumberInput id={id} value={rate} onValueChange={setRate} step={0.05} unit="€/kg" edited />
                  )}
                </Field>
                <Field label="Wall thickness" error="Must be at least 1.5 mm">
                  {(id) => <NumberInput id={id} value={0.8} onValueChange={() => {}} unit="mm" invalid />}
                </Field>
                <Field label="Supplier region">
                  {(id) => (
                    <Dropdown
                      id={id}
                      value={region}
                      onChange={setRegion}
                      options={[
                        { value: "eu", label: "Europe", meta: "× 1.00" },
                        { value: "in", label: "India", meta: "× 0.42" },
                        { value: "cn", label: "China", meta: "× 0.55" },
                      ]}
                    />
                  )}
                </Field>
                <Field label="Disabled">
                  {(id) => <Input id={id} value="Locked by rate master" disabled readOnly />}
                </Field>
                <Field label="Search">
                  {(id) => <SearchInput id={id} placeholder="Search parts…" shortcut="Ctrl K" />}
                </Field>
              </div>
            </Section>

            <Section title="Dropdowns">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Filter · pill" hint="Tints when a filter is active">
                  {(id) => (
                    <Dropdown
                      id={id}
                      value={process}
                      onChange={setProcess}
                      options={toOptions(["all", "Stamping", "Sand cast", "Die cast"], (option) =>
                        option === "all" ? "All process" : option,
                      )}
                      shape="pill"
                      edited={process !== "all"}
                    />
                  )}
                </Field>
                <Field label="Grade · rich options" hint="Description and meta columns">
                  {(id) => (
                    <Dropdown
                      id={id}
                      value={grade}
                      onChange={setGrade}
                      menuMinWidth={260}
                      options={[
                        { value: "GG25", label: "GG25", description: "EN-GJL-250", meta: "€ 0.95/kg" },
                        { value: "GGG40", label: "GGG40", description: "EN-GJS-400-15", meta: "€ 1.25/kg" },
                        { value: "GS-52", label: "GS-52", description: "EN 10293", meta: "€ 1.90/kg" },
                      ]}
                    />
                  )}
                </Field>
                <Field label="Part · grouped + search" hint="Searchable when there are more than 8 options">
                  {(id) => (
                    <Dropdown
                      id={id}
                      value={part}
                      onChange={setPart}
                      menuMinWidth={280}
                      options={[
                        { value: "DTV-HSG-0431", label: "Bearing Housing", meta: "HSG-0431", group: "Sand cast" },
                        { value: "DTV-HSG-4339", label: "Battery Housing", meta: "HSG-4339", group: "Sand cast" },
                        { value: "DTV-CAP-0604", label: "Axle Bearing Cap", meta: "CAP-0604", group: "Sand cast" },
                        { value: "DTV-CVR-0288", label: "Gearbox End Cover", meta: "CVR-0288", group: "Die cast" },
                        { value: "DTV-HSG-9557", label: "Brake Housing", meta: "HSG-9557", group: "Die cast" },
                        { value: "DTV-PAN-0073", label: "Oil Pan", meta: "PAN-0073", group: "Die cast" },
                        { value: "DTV-BRK-0117", label: "Cab Mount Bracket", meta: "BRK-0117", group: "Stamping" },
                        { value: "DTV-BRK-0342", label: "Air Tank Strap", meta: "BRK-0342", group: "Stamping" },
                        { value: "DTV-PNL-7920", label: "Alternator Shield", meta: "PNL-7920", group: "Stamping" },
                        { value: "DTV-BRK-0455", label: "Steering Bracket", meta: "BRK-0455", group: "Stamping", disabled: true },
                      ]}
                    />
                  )}
                </Field>
                <Field label="States">
                  {(id) => (
                    <div className="flex flex-col gap-2">
                      <Dropdown id={id} value="" onChange={() => {}} options={toOptions(["A", "B"])} placeholder="Choose a region…" />
                      <Dropdown aria-label="Invalid" value="" onChange={() => {}} options={toOptions(["A"])} placeholder="Required" invalid />
                      <Dropdown aria-label="Disabled" value="A" onChange={() => {}} options={toOptions(["A"])} disabled />
                    </div>
                  )}
                </Field>
              </div>
            </Section>

            <Section title="Segmented">
              <div className="flex flex-col gap-4">
                <Segmented
                  ariaLabel="Point of view"
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: "should", label: "Should-cost" },
                    { value: "piece", label: "Piece price" },
                    { value: "tooling", label: "Tooling", count: 3 },
                  ]}
                />
                <Segmented
                  ariaLabel="Lot size"
                  size="sm"
                  value={lot}
                  onChange={setLot}
                  options={["100", "1000", "10000", "custom"]}
                />
                <Segmented
                  ariaLabel="Full width"
                  fullWidth
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: "should", label: "Inputs" },
                    { value: "piece", label: "Process" },
                    { value: "tooling", label: "Tooling", disabled: true },
                  ]}
                />
              </div>
            </Section>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile label="Avg piece cost" value="€18.42" variance={8.4} hint="vs target" sparkline={[16, 16.4, 17.2, 17, 17.8, 18.1, 18.42]} />
            <KpiTile label="Parts under target" value="64%" variance={-6.2} varianceGoodWhen="higher" hint="of 212" sparkline={[70, 69, 68, 66, 67, 65, 64]} />
            <KpiTile label="Estimates this month" value="37" delta="+12 vs Aug" tone="success" />
            <KpiTile label="Tooling spend" value="€412k" variance={null} hint="no budget set" />
          </div>

          <Panel title="Recent estimates" count={ROWS.length} actionHref="/history" padded={false}>
            <Table minWidth={640}>
              <THead>
                <tr>
                  <TH {...thProps("name")}>Part</TH>
                  <TH {...thProps("qty")} align="right">
                    Annual qty
                  </TH>
                  <TH {...thProps("cost")} align="right">
                    Piece cost
                  </TH>
                  <TH {...thProps("variance")}>Status</TH>
                  <TH aria-label="Open" className="w-10" />
                </tr>
              </THead>
              <TBody>
                {rows.map((row) => (
                  <TR key={row.id} onClick={() => {}}>
                    <PrimaryCell title={row.name} detail={`${row.id} · ${row.detail}`} />
                    <NumCell muted>{row.qty.toLocaleString("en-GB")}</NumCell>
                    <NumCell strong>€{row.cost.toFixed(2)}</NumCell>
                    <TD>
                      <VarianceBadge
                        size="sm"
                        pct={row.target == null ? null : ((row.cost - row.target) / row.target) * 100}
                      />
                    </TD>
                    <ChevronCell />
                  </TR>
                ))}
              </TBody>
            </Table>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Empty state">
              <EmptyState
                icon={Inbox}
                title="No estimates match these filters"
                detail="Clear a filter or start a new estimate from a STEP file."
                action={
                  <Button variant="secondary" size="sm">
                    Clear filters
                  </Button>
                }
              />
            </Panel>
            <Panel title="Loading">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton rounded="full" className="size-9" />
                  <div className="flex-1">
                    <SkeletonText lines={2} />
                  </div>
                </div>
                <Skeleton className="h-24 w-full" />
                <SkeletonText lines={3} />
              </div>
            </Panel>
          </div>

          <Section title="Marks" count={MARK_IDS.length}>
            <p className="mb-4 max-w-[80ch] text-body-md text-secondary">
              Decorative 3D marks from <code className="font-mono text-body-sm">@/lib/marks</code>. Each is shown floating
              (page headers, empty states) and framed (dense rows and cards). A mark never carries meaning on its own.
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {MARK_IDS.map((id) => (
                <li key={id} className="flex min-w-0 flex-col gap-2 rounded-lg border border-muted bg-container p-3" title={id}>
                  <div className="flex items-center gap-3">
                    <Mark id={id} size={40} />
                    <Mark id={id} size={28} framed />
                  </div>
                  <code className="truncate font-mono text-caption text-tertiary">{id}</code>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </PageBody>
    </>
  );
}
