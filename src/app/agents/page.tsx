import type { ReactNode } from "react";
import { ArrowRight, Eye, UserCheck } from "lucide-react";
import { Page, Section } from "@/components/mulya/page";
import { AgentCard, AgentPhaseBadge } from "@/components/agents/agent-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { AGENTS, CHECKPOINT, PHASES, type AgentDefinition } from "@/lib/costing/agents";
import { cx } from "@/lib/format";
import { AGENT_MARK, ROUTE_MARK } from "@/lib/marks";

/** The crew that produces an estimate: pipeline, phases, and one card per agent. */
export default function AgentsPage() {
  const phaseOne = AGENTS.filter((agent) => agent.phase === 1);
  const phaseTwo = AGENTS.filter((agent) => agent.phase === 2);
  const [firstPhase, secondPhase] = PHASES;

  return (
    <Page
      title="Agents"
      mark={<Mark id={ROUTE_MARK["/agents"]} size={44} />}
      subtitle="The crew that produces an estimate: what each one reads, what it hands on, and where it stops and asks"
      actions={
        <ButtonLink href="/new-estimate" variant="primary" iconRight={ArrowRight}>
          Watch a run
        </ButtonLink>
      }
    >
      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <Mark id={AGENT_MARK.supervisor} size={22} />
            How a run is organised
          </span>
        }
        count={AGENTS.length}
        bodyClassName="p-0"
      >
        <div className="px-4 pt-5 pb-4 sm:px-5">
          <ol
            aria-label="Run pipeline"
            className="flex flex-col md:flex-row md:items-start"
          >
            {phaseOne.map((agent, index) => (
              <PipelineStep key={agent.id} agent={agent} index={index} first={index === 0} />
            ))}
            <CheckpointGate />
            {phaseTwo.map((agent, index) => (
              <PipelineStep
                key={agent.id}
                agent={agent}
                index={phaseOne.length + index}
                last={index === phaseTwo.length - 1}
              />
            ))}
          </ol>
        </div>

        <div className="grid border-t border-muted md:grid-cols-[1fr_1fr_1fr]">
          <PhaseCard
            caption={<AgentPhaseBadge phase={1} size="sm" />}
            title={firstPhase.title}
            detail={firstPhase.detail}
          />
          <PhaseCard
            gate
            caption={
              <Badge tone="error" size="sm" icon="▲">
                Between them
              </Badge>
            }
            title={CHECKPOINT.title}
            detail={CHECKPOINT.detail}
          />
          <PhaseCard
            caption={<AgentPhaseBadge phase={2} size="sm" />}
            title={secondPhase.title}
            detail={secondPhase.detail}
          />
        </div>
      </Section>

      <PhaseGroup
        phase={1}
        title="Phase 1 · read and recommend"
        description="Runs on upload. Produces evidence, commits to nothing."
      >
        {phaseOne.map((agent, index) => (
          <AgentCard key={agent.id} spec={agent} index={index} />
        ))}
      </PhaseGroup>

      <div className="flex items-center gap-3 py-1" role="separator" aria-label={CHECKPOINT.title}>
        <span className="h-px flex-1 border-t border-dashed border-error-stroke" />
        <Badge tone="error" icon="▲">
          {CHECKPOINT.title} · a person confirms the process
        </Badge>
        <span className="h-px flex-1 border-t border-dashed border-error-stroke" />
      </div>

      <PhaseGroup
        phase={2}
        title="Phase 2 · cost the committed route"
        description="Released by confirming the process. Everything here is priced against that decision."
      >
        {phaseTwo.map((agent, index) => (
          <AgentCard key={agent.id} spec={agent} index={phaseOne.length + index} />
        ))}
      </PhaseGroup>

      <Section title="What the agents are, and are not">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex max-w-[72ch] flex-col gap-3 text-body-lg leading-relaxed text-secondary">
            <p>
              Each agent narrates work the tool is genuinely doing: reading the model, scoring complexity, matching
              process signatures, dividing a tool across a programme. Every figure an agent reports is the figure on the
              panel it fills, so the console and the workspace cannot disagree.
            </p>
            <p>
              This build is a mockup. The rules are standard cost-engineering formulas, not a model trained on your
              data, and the run is paced rather than computed. When the historical catalogue is released, the same crew
              reports figures a trained model produces: the agents are the interface, not the estimate.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Principle icon={<Eye size={16} strokeWidth={1.75} />} title="Systems are named honestly">
              An agent that cannot reach a system says so and names what it fell back to. A rate defaulted from the Rate
              Master is never presented as a price somebody paid.
            </Principle>
            <Principle icon={<UserCheck size={16} strokeWidth={1.75} />} title="A person confirms the route">
              The crew recommends a process and stops. Nothing downstream is costed until a human accepts or overrides
              that recommendation.
            </Principle>
          </div>
        </div>
      </Section>
    </Page>
  );
}

// --- pipeline ------------------------------------------------------------------

/** Connector segment classes: horizontal on md+, vertical below. */
const LINE_H = "md:absolute md:top-5 md:h-px md:w-1/2";
const LINE_V = "absolute left-5 w-px -translate-x-1/2 md:hidden";

/** One numbered stop on the pipeline strip. */
function PipelineStep({
  agent,
  index,
  first = false,
  last = false,
}: {
  agent: AgentDefinition;
  index: number;
  first?: boolean;
  last?: boolean;
}) {
  const one = agent.phase === 1;
  return (
    <li className="relative flex min-w-0 gap-3 pb-4 md:flex-1 md:flex-col md:items-center md:gap-2 md:px-1 md:pb-0 md:text-center">
      {/* connecting line */}
      {!first ? <span aria-hidden className={cx("hidden bg-default md:left-0 md:block", LINE_H)} /> : null}
      {!last ? <span aria-hidden className={cx("hidden bg-default md:right-0 md:block", LINE_H)} /> : null}
      {!last ? <span aria-hidden className={cx(LINE_V, "top-10 bottom-0 bg-default")} /> : null}

      <a
        href={`#agent-${agent.id}`}
        className={cx(
          "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border bg-container transition-colors duration-[150ms] outline-none focus-visible:ring-2 focus-visible:ring-active",
          one ? "border-info-stroke hover:border-info-icon" : "border-default hover:border-active",
        )}
        aria-label={`${index + 1}. ${agent.name}`}
      >
        <Mark id={AGENT_MARK[agent.id]} size={26} />
      </a>
      <div className="min-w-0 pt-1 md:pt-0">
        <div className="truncate text-label-md text-primary">
          <span className={cx("tabular mr-1.5", one ? "text-info" : "text-quaternary")}>{index + 1}</span>
          {agent.name}
        </div>
        <div className="truncate text-body-sm text-quaternary">{agent.panel} panel</div>
      </div>
    </li>
  );
}

/** The human checkpoint between the phases, drawn as a gate on the line. */
function CheckpointGate() {
  return (
    <li
      className="relative flex min-w-0 gap-3 pb-4 md:w-36 md:shrink-0 md:flex-col md:items-center md:gap-2 md:px-1 md:pb-0 md:text-center"
      title={CHECKPOINT.detail}
    >
      <span aria-hidden className={cx("hidden border-t border-dashed border-error-stroke md:left-0 md:block", LINE_H, "md:h-0")} />
      <span aria-hidden className={cx("hidden border-t border-dashed border-error-stroke md:right-0 md:block", LINE_H, "md:h-0")} />
      <span aria-hidden className={cx(LINE_V, "top-10 bottom-0 w-0 border-l border-dashed border-error-stroke")} />
      <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-lg border border-error-stroke bg-error-surface ring-4 ring-container">
        <Mark id="mark-checkpoint" size={28} />
      </span>
      <div className="min-w-0 pt-1 md:pt-0">
        <div className="text-label-md text-error">{CHECKPOINT.title}</div>
        <div className="text-body-sm text-quaternary">Confirm the process</div>
      </div>
    </li>
  );
}

/** Phase / gate explainer column below the strip. */
function PhaseCard({
  caption,
  title,
  detail,
  gate = false,
}: {
  caption: ReactNode;
  title: string;
  detail: string;
  gate?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-2 border-muted p-4 sm:p-5 [&:not(:first-child)]:border-t md:[&:not(:first-child)]:border-t-0 md:[&:not(:first-child)]:border-l",
        gate && "bg-error-surface/50",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {caption}
        {gate ? <Mark id="mark-checkpoint" size={32} className="-my-1" /> : null}
      </div>
      <h3 className={cx("text-label-md", gate ? "text-error" : "text-primary")}>{title}</h3>
      <p className="text-body-md leading-relaxed text-secondary">{detail}</p>
    </div>
  );
}

// --- sections --------------------------------------------------------------------

/** Heading + description above a stack of agent cards. */
function PhaseGroup({
  phase,
  title,
  description,
  children,
}: {
  phase: 1 | 2;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="pt-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-heading-sm font-semibold tracking-tight text-primary">{title}</h2>
        <AgentPhaseBadge phase={phase} size="sm" />
      </div>
      <p className="mt-1 max-w-[70ch] text-body-md text-secondary">{description}</p>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </div>
  );
}

/** Icon + heading + body principle card. */
function Principle({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-muted bg-raised p-4">
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full border border-muted bg-container icon-tertiary">
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-label-md text-primary">{title}</h3>
        <p className="mt-1 text-body-md leading-relaxed text-secondary">{children}</p>
      </div>
    </div>
  );
}
