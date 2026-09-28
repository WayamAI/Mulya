import { ArrowRight, Info } from "lucide-react";
import { PageBody, PageHeader, Section } from "@/components/mulya/page";
import { Badge, ConnectorBadge } from "@/components/ui/badge";
import { TextAction } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { CONNECTORS, CONNECTOR_STATUS } from "@/lib/costing/connectors";
import { FEATURE_IMPORTANCE } from "@/lib/costing/estimate";
import { cx } from "@/lib/format";
import { CONNECTOR_MARK, ROUTE_MARK } from "@/lib/marks";
import { CatalogueDropZone } from "./drop-zone";

const MODEL_FACTS = [
  { label: "Version", value: "v0.1" },
  { label: "Type", value: "Rules-based" },
  { label: "Basis", value: "Cost-engineering formulas" },
  { label: "Processes", value: "3" },
  { label: "Materials", value: "13" },
  { label: "Updated", value: "14 Jul 2026" },
];

const ROADMAP = [
  "Catalogue ingestion & cleaning",
  "Feature engineering",
  "Model training & validation",
  "Accuracy reporting vs. actual quotes",
];

const EXPECTED_COLUMNS = [
  "part number",
  "process",
  "material grade",
  "thickness",
  "coating",
  "weight",
  "surface area",
  "cut length",
  "feature count",
  "annual volume",
  "region",
  "actual cost",
  "date",
];

/** Bar scale used by the original: the widest bar is 31 %. */
const WEIGHT_SCALE = 31;

const CAPTION = "text-caption tracking-[0.08em] text-quaternary uppercase";

/** Data & Model: how the estimate is produced and how to feed it real data. */
export default function ModelPage() {
  const connectedCount = CONNECTORS.filter((connector) => connector.status === "connected").length;

  return (
    <>
      <PageHeader
        title="Data & Model"
        subtitle="How the estimate is produced"
        mark={<Mark id={ROUTE_MARK["/model"]} size={44} />}
      />
      <PageBody>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-xl border border-info-stroke bg-info-surface px-4 py-3 text-body-md text-primary">
            <Info size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-info-icon" />
            Model v0.1 is illustrative. Cost logic derived from standard cost-engineering formulas. Connect your
            historical catalogue to train a data-driven model.
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <Section title="Current model" action={<Badge tone="info" size="sm" icon="◐">Illustrative</Badge>}>
              <dl className="-my-1 divide-y divide-muted">
                {MODEL_FACTS.map((fact) => (
                  <div key={fact.label} className="flex min-h-12 items-center justify-between gap-4 py-2">
                    <dt className={CAPTION}>{fact.label}</dt>
                    <dd className="text-right text-label-md tabular text-primary">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </Section>

            <Section
              title="What drives the estimate"
              action={<span className="hidden text-caption text-quaternary sm:inline">Share of explained cost</span>}
            >
              <ol className="flex flex-col gap-3.5">
                {FEATURE_IMPORTANCE.map((item, index) => (
                  <li
                    key={item.feature}
                    className="grid grid-cols-[1.25rem_minmax(0,1fr)_3rem] items-center gap-x-3 gap-y-1.5"
                    title={`${item.feature}: ${item.weight}%`}
                  >
                    <span className="text-caption tabular text-quaternary">{index + 1}</span>
                    <span className="truncate text-body-md text-primary">{item.feature}</span>
                    <span className="text-right text-label-md tabular text-primary">{item.weight}%</span>
                    <span aria-hidden />
                    <span aria-hidden className="col-span-2 block h-1.5 overflow-hidden rounded-full bg-raised-2">
                      <span
                        className={cx(
                          "block h-full rounded-full transition-[width] duration-200",
                          index < 3 ? "bg-series-1" : "bg-series-1/45",
                        )}
                        style={{ width: `${(item.weight / WEIGHT_SCALE) * 100}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ol>
            </Section>
          </div>

          <Section title="Connect your cost catalogue">
            <CatalogueDropZone />
            <div className="mt-6">
              <div className="flex items-baseline justify-between gap-3">
                <div className={CAPTION}>Expected columns</div>
                <span className="text-caption tabular text-quaternary">{EXPECTED_COLUMNS.length}</span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {EXPECTED_COLUMNS.map((column) => (
                  <code
                    key={column}
                    className="inline-flex h-6 items-center rounded-md border border-muted bg-raised px-2 font-mono text-body-sm text-secondary"
                  >
                    {column}
                  </code>
                ))}
              </div>
              <p className="mt-4 max-w-[70ch] text-body-md text-secondary">
                With ~2,000 historical parts a trained model typically reaches ±8 to 12% mean absolute error against
                quoted price.
              </p>
            </div>
          </Section>

          <Section
            title="Connect a system of record"
            action={
              <span className="text-body-sm text-quaternary">
                <span className="tabular text-primary">{connectedCount}</span> of{" "}
                <span className="tabular">{CONNECTORS.length}</span> connected
              </span>
            }
          >
            <p className="max-w-[80ch] text-body-lg leading-relaxed text-secondary">
              Cost data is never in one place. Geometry and revisions live in PLM, rates and paid prices in ERP, quotes
              in sourcing. Mūlya reads from each rather than asking you to assemble a spreadsheet.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {CONNECTORS.map((connector) => {
                const connected = connector.status === "connected";
                return (
                  <div
                    key={connector.name}
                    className={cx(
                      "flex flex-col rounded-lg border p-4 transition-colors duration-[150ms]",
                      connected ? "border-success-stroke bg-success-surface/40" : "border-muted bg-container hover:border-default",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Mark id={CONNECTOR_MARK[connector.category] ?? "mark-connector"} size={28} framed />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-label-md text-primary">{connector.name}</div>
                        <p className="truncate text-body-sm text-quaternary">
                          {connector.vendor} · {connector.category}
                        </p>
                      </div>
                      <ConnectorBadge
                        status={connector.status}
                        size="sm"
                        label={CONNECTOR_STATUS[connector.status].label}
                      />
                    </div>
                    <p className="mt-3 text-body-md leading-relaxed text-secondary">{connector.supplies}</p>
                    <p className="mt-1.5 text-body-sm leading-relaxed text-quaternary">Feeds {connector.feeds}</p>
                    <div className="mt-auto pt-3"><div className="flex flex-wrap items-center justify-between gap-2 border-t border-muted pt-3">
                      <span className="min-w-0 truncate text-caption text-quaternary">{connector.method}</span>
                      {connector.records ? (
                        <span className="text-label-sm tabular text-success">{connector.records}</span>
                      ) : (
                        <TextAction className="text-primary">
                          Configure <ArrowRight size={13} strokeWidth={1.75} aria-hidden />
                        </TextAction>
                      )}
                    </div></div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 max-w-[80ch] text-body-sm leading-relaxed text-quaternary">
              Connections are read-only by design. Mūlya never writes to your systems of record, except the roadmap
              REST API, which writes the estimate back onto the part in PLM once you ask it to.
            </p>
          </Section>

          <Section
            title="Roadmap to a trained model"
            action={<span className="text-caption text-quaternary">Step 1 of {ROADMAP.length}</span>}
          >
            <ol className="flex flex-col md:flex-row md:items-start">
              {ROADMAP.map((step, index) => {
                const current = index === 0;
                const last = index === ROADMAP.length - 1;
                return (
                  <li
                    key={step}
                    aria-current={current ? "step" : undefined}
                    className="relative flex min-w-0 gap-3 pb-5 last:pb-0 md:flex-1 md:flex-col md:gap-3 md:pr-4 md:pb-0"
                  >
                    {!last ? (
                      <>
                        <span
                          aria-hidden
                          className="absolute top-8 bottom-0 left-4 w-px -translate-x-1/2 bg-default md:hidden"
                        />
                        <span
                          aria-hidden
                          className="absolute top-4 right-0 left-8 hidden h-px bg-default md:block"
                        />
                      </>
                    ) : null}
                    <span
                      className={cx(
                        "tabular relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-label-sm",
                        current
                          ? "border-info-icon bg-info-surface text-info ring-4 ring-info-surface"
                          : "border-default bg-container text-quaternary",
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-col items-start gap-1.5 pt-1 md:pt-0">
                      <span className={cx("text-label-md", current ? "text-primary" : "text-secondary")}>{step}</span>
                      <Badge tone={current ? "info" : "neutral"} variant={current ? "soft" : "outline"} size="sm" icon="○">
                        awaiting data
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Section>
        </div>
      </PageBody>
    </>
  );
}
