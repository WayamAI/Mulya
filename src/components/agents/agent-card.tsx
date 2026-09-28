import { ArrowRight, Hand } from "lucide-react";
import { ConnectorBadge, PhaseBadge } from "@/components/ui/badge";
import { Mark } from "@/components/ui/mark";
import type { AgentDefinition } from "@/lib/costing/agents";
import { AGENTS } from "@/lib/costing/agents";
import { CONNECTORS } from "@/lib/costing/connectors";
import { cx } from "@/lib/format";
import { AGENT_MARK } from "@/lib/marks";

const captionClass = "text-caption tracking-[0.08em] text-quaternary uppercase";

/** Phase chip for an agent: phase 1 runs on upload (info), phase 2 waits for the checkpoint. */
export function AgentPhaseBadge({ phase, size = "md" }: { phase: 1 | 2; size?: "sm" | "md" }) {
  return (
    <PhaseBadge
      phase={phase}
      size={size}
      state={phase === 1 ? "active" : "upcoming"}
      title={phase === 1 ? "Runs on upload" : "Runs after the process is confirmed"}
    />
  );
}

/** Named system an agent reads from, with its connector status. */
export function SystemChip({ name }: { name: string }) {
  const status = CONNECTORS.find((connector) => connector.name === name)?.status ?? "available";
  return (
    <ConnectorBadge
      status={status}
      size="md"
      label={
        <>
          <span className="text-primary">{name}</span>
          <span className="opacity-70"> · {status === "connected" ? "Connected" : status === "planned" ? "Planned" : "Not connected"}</span>
        </>
      }
    />
  );
}

/**
 * Agent identity: its framed mark with the run-order number pinned to the
 * corner (info for phase 1, neutral for phase 2), so order still reads first.
 */
export function AgentMark({
  spec,
  index,
  size = 32,
}: {
  spec: Pick<AgentDefinition, "id" | "phase">;
  index: number;
  size?: number;
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <Mark id={AGENT_MARK[spec.id]} size={size} framed />
      <span
        aria-hidden
        className={cx(
          "tabular absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full border text-caption ring-2 ring-container",
          spec.phase === 1 ? "border-info-stroke bg-info-surface text-info" : "border-default bg-raised text-secondary",
        )}
      >
        {index + 1}
      </span>
    </span>
  );
}

/** Captioned list; renders nothing when empty. */
function ItemList({ label, items, tone }: { label: string; items: string[]; tone: "in" | "out" }) {
  if (!items.length) return null;
  return (
    <div className="min-w-0">
      <span className={captionClass}>{label}</span>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-body-md text-secondary">
            <span
              aria-hidden
              className={cx(
                "mt-[7px] size-1.5 shrink-0 rounded-full",
                tone === "out" ? "bg-success-icon" : "border border-default bg-transparent",
              )}
            />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One crew member: what it takes, produces, waits for, reads from, and where it stops. */
export function AgentCard({ spec, index }: { spec: AgentDefinition; index: number }) {
  const hasMeta = spec.dependsOn.length > 0 || spec.systems.length > 0;
  return (
    <section
      id={`agent-${spec.id}`}
      className="scroll-mt-4 overflow-hidden rounded-xl border border-muted bg-container transition-colors duration-[150ms] hover:border-default"
    >
      <header className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-muted px-4 py-4 sm:px-5">
        <AgentMark spec={spec} index={index} />
        <div className="min-w-0 flex-1 sm:pt-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="text-heading-sm font-semibold text-primary">
              <span className="sr-only">{index + 1}. </span>
              {spec.name}
            </h3>
            <AgentPhaseBadge phase={spec.phase} size="sm" />
          </div>
          <p className="mt-0.5 text-body-md text-tertiary">{spec.role}</p>
        </div>
        <span className="flex items-center gap-1.5 text-body-sm text-quaternary sm:mt-1.5">
          fills the
          <span className="rounded-md border border-muted bg-raised px-1.5 py-0.5 text-label-sm text-secondary">
            {spec.panel}
          </span>
          panel
        </span>
      </header>

      <div className="flex flex-col gap-5 px-4 py-5 sm:px-5">
        <p className="max-w-[80ch] text-body-lg leading-relaxed text-secondary">{spec.summary}</p>

        <div className="grid gap-4 rounded-lg border border-muted bg-raised p-4 md:grid-cols-[1fr_auto_1fr] md:gap-6">
          <ItemList label="Takes" items={spec.inputs} tone="in" />
          <div aria-hidden className="hidden items-center md:flex">
            <span className="flex size-7 items-center justify-center rounded-full border border-muted bg-container icon-tertiary">
              <ArrowRight size={14} strokeWidth={1.75} />
            </span>
          </div>
          <ItemList label="Produces" items={spec.outputs} tone="out" />
        </div>

        {hasMeta ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-10">
            {spec.dependsOn.length > 0 ? (
              <div className="min-w-0">
                <span className={captionClass}>Waits for</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {spec.dependsOn.map((dependency) => {
                    const at = AGENTS.findIndex((agent) => agent.name === dependency);
                    const target = AGENTS[at];
                    return (
                      <a
                        key={dependency}
                        href={target ? `#agent-${target.id}` : undefined}
                        className="inline-flex h-6 items-center gap-1.5 rounded-full border border-muted bg-container px-2.5 text-label-sm text-secondary transition-colors duration-[150ms] outline-none hover:border-default hover:text-primary focus-visible:ring-2 focus-visible:ring-active"
                      >
                        {at >= 0 ? <span className="tabular text-quaternary">{at + 1}</span> : null}
                        {dependency}
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {spec.systems.length > 0 ? (
              <div className="min-w-0">
                <span className={captionClass}>Reads from</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {spec.systems.map((system) => (
                    <SystemChip key={system} name={system} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-start gap-3 rounded-lg border border-dashed border-default px-4 py-3">
          <Hand size={15} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 icon-tertiary" />
          <p className="text-body-md leading-relaxed text-secondary">
            <span className="font-medium text-primary">Where it stops. </span>
            {spec.limit}
          </p>
        </div>
      </div>
    </section>
  );
}

