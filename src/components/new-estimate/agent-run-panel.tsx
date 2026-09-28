"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Terminal,
} from "lucide-react";
import { AgentStateBadge, Badge, ConnectorBadge, type AgentState } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { Skeleton } from "@/components/ui/primitives";
import { CREW_STATUS, PHASE_ONE_AGENT_IDS, type AgentId, type AgentRun, type AgentStep } from "@/lib/costing/agents";
import { cx } from "@/lib/format";
import { AGENT_MARK } from "@/lib/marks";
import type { AgentRunController } from "./use-agent-run";

const STEP_GLYPH: Record<AgentStep["kind"], string> = { call: "⇄", read: "·", reason: "›", result: "✓" };

type CardState = "queued" | "running" | "done" | "waiting";

/** One crew member in the pipeline strip. */
function AgentCard({
  agent,
  index,
  state,
  onOpen,
  openable,
}: {
  agent: AgentRun;
  index: number;
  state: CardState;
  onOpen: () => void;
  openable: boolean;
}) {
  const badge: AgentState = state === "running" ? "working" : state;
  return (
    <button
      type="button"
      onClick={() => openable && onOpen()}
      aria-disabled={!openable}
      title={openable ? `${agent.name}: ${agent.role}` : agent.role}
      className={cx(
        "group relative flex h-full min-w-0 flex-1 flex-col gap-2 rounded-lg border px-3 py-3 text-left transition-[background-color,border-color,opacity] duration-[180ms] outline-none focus-visible:ring-2 focus-visible:ring-active",
        state === "running"
          ? "agent-active border-info-stroke bg-info-surface"
          : state === "done"
            ? agent.alert
              ? "border-error-stroke bg-container hover:border-error-icon"
              : "border-muted bg-container hover:border-default"
            : state === "waiting"
              ? "border-dashed border-warning-stroke bg-raised"
              : "border-dashed border-muted bg-raised",
        openable ? "cursor-pointer" : "cursor-default",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span
          className={cx(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-caption tabular",
            state === "done"
              ? agent.alert
                ? "bg-error-badge text-badge"
                : "bg-success-badge text-badge"
              : state === "running"
                ? "bg-info-badge text-badge"
                : "border border-muted text-quaternary",
          )}
        >
          {index + 1}
        </span>
        {state === "done" && agent.alert ? (
          <Badge tone="error" icon="▲" size="sm" title="Finished with a flag">
            Done
          </Badge>
        ) : (
          <AgentStateBadge
            state={badge}
            size="sm"
            variant={state === "done" ? "dot" : undefined}
            label={state === "waiting" ? "Waiting" : undefined}
          />
        )}
      </span>
      <span className="flex min-w-0 items-center gap-2.5">
        <Mark
          id={AGENT_MARK[agent.id]}
          size={32}
          className={cx(
            "transition-[opacity,filter] duration-[180ms]",
            (state === "queued" || state === "waiting") && "opacity-55 grayscale",
          )}
        />
        <span className="min-w-0">
          <span
            className={cx(
              "block truncate text-label-md",
              state === "queued" || state === "waiting" ? "text-tertiary" : "text-primary",
            )}
          >
            {agent.name}
          </span>
          <span
            className={cx(
              "mt-0.5 block truncate text-body-sm tabular",
              state === "done" ? (agent.alert ? "text-error" : "text-secondary") : "text-quaternary",
            )}
          >
            {state === "done" ? agent.result : state === "running" ? "working…" : state === "waiting" ? "needs the route" : "queued"}
          </span>
        </span>
      </span>
    </button>
  );
}

const ICON_XS = { size: 14, strokeWidth: 1.75 } as const;

/** Supervisor strip: crew status, run controls, the agent pipeline, the checkpoint and the live log. */
export function AgentRunPanel({
  agents,
  run,
  onOpenAgent,
  onConfirmProcess,
  confirmed,
}: {
  agents: AgentRun[];
  run: AgentRunController;
  onOpenAgent: (id: AgentId) => void;
  onConfirmProcess: () => void;
  confirmed: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [run.emitted.length, expanded]);

  const active = agents.find((agent) => agent.id === run.activeId);
  const running = run.phase === "running";
  const status =
    run.phase === "idle"
      ? CREW_STATUS.idle
      : run.phase === "awaiting"
        ? CREW_STATUS.awaiting
        : run.phase === "done"
          ? CREW_STATUS.done
          : active
            ? CREW_STATUS.running(active.name, active.role)
            : CREW_STATUS.planning;
  const crewState: AgentState =
    run.phase === "awaiting" ? "waiting" : run.phase === "done" ? "done" : running ? "working" : "queued";
  const crewLabel =
    run.phase === "paused" ? "Paused" : run.phase === "idle" ? "Idle" : undefined;
  const checkpoint = run.atCheckpoint && !confirmed;

  return (
    <section aria-label="Agent run" className="overflow-hidden rounded-xl border border-muted bg-container">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <span className="flex items-center gap-2.5">
          <Mark id={AGENT_MARK.supervisor} size={32} framed />
          <span className="text-heading-sm text-primary">Supervisor</span>
          <AgentStateBadge state={crewState} size="sm" label={crewLabel} pulse={running} />
        </span>
        <p className="order-last min-w-0 basis-full text-body-md text-tertiary md:order-none md:basis-auto md:flex-1" aria-live="polite">
          {status}
        </p>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-1 text-body-sm text-quaternary tabular">
            <span className="text-secondary">{run.doneIds.size}</span> / {agents.length}
          </span>
          {running ? (
            <Button variant="secondary" size="sm" icon={<Pause {...ICON_XS} />} aria-label="Pause run" onClick={run.pause} />
          ) : run.phase === "paused" ? (
            <Button variant="secondary" size="sm" icon={<Play {...ICON_XS} />} aria-label="Resume run" onClick={run.resume} />
          ) : null}
          {running || run.phase === "paused" ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<SkipForward {...ICON_XS} />}
              aria-label="Skip to the end of this stage"
              onClick={run.skip}
            />
          ) : null}
          {run.phase === "done" || run.phase === "awaiting" ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw {...ICON_XS} />}
              aria-label="Run the agents again"
              onClick={run.start}
            />
          ) : null}
        </div>
      </header>

      {/* Segmented progress: one tick per agent. */}
      <div className="flex gap-1 px-4" aria-hidden>
        {agents.map((agent) => {
          const done = run.doneIds.has(agent.id);
          const current = run.activeId === agent.id && run.phase !== "idle" && !done;
          return (
            <span key={agent.id} className="h-1 flex-1 overflow-hidden rounded-full bg-raised-2">
              <span
                className={cx(
                  "block h-full rounded-full transition-[width] duration-300 ease-out",
                  done ? "w-full bg-success-icon" : current ? "w-1/2 bg-info-icon agent-beacon" : "w-0",
                )}
              />
            </span>
          );
        })}
      </div>

      <ol className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 xl:flex xl:items-stretch xl:gap-0">
        {agents.map((agent, index) => {
          const done = run.doneIds.has(agent.id);
          const state: CardState = done
            ? "done"
            : run.activeId === agent.id && run.phase !== "idle"
              ? "running"
              : run.phase === "awaiting" && !PHASE_ONE_AGENT_IDS.includes(agent.id)
                ? "waiting"
                : "queued";
          const next = agents[index + 1];
          return (
            <li key={agent.id} className="flex min-w-0 items-stretch xl:flex-1">
              <AgentCard
                agent={agent}
                index={index}
                state={state}
                openable={state === "done"}
                onOpen={() => onOpenAgent(agent.id)}
              />
              {next ? (
                <span
                  aria-hidden
                  className={cx(
                    "relative hidden w-4 shrink-0 self-center xl:block",
                    "before:absolute before:inset-x-0.5 before:top-1/2 before:h-px before:-translate-y-1/2",
                    done ? "before:bg-success-icon" : "before:bg-[var(--stroke-default)]",
                  )}
                >
                  {done && !run.doneIds.has(next.id) && running ? (
                    <span className="agent-handoff absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-info-icon" />
                  ) : null}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {checkpoint ? (
        <div className="mx-4 mb-4 overflow-hidden rounded-lg border border-warning-stroke bg-warning-surface">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
            <span className="agent-active relative inline-flex size-14 shrink-0 items-center justify-center rounded-full border border-warning-stroke bg-container [--feedback-info-icon:var(--feedback-warning-icon)]">
              <Mark id="mark-checkpoint" size={40} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-heading-sm text-primary">Human checkpoint.</p>
              <p className="mt-1 text-body-md text-secondary">
                The remaining {agents.length - run.doneIds.size} agents cost a route. Confirm the process and they
                continue.
              </p>
            </div>
            <Button onClick={onConfirmProcess} iconRight={ArrowRight} className="self-start sm:self-center">
              Review the verdict
            </Button>
          </div>
        </div>
      ) : null}

      <div className="border-t border-muted bg-raised">
        <div className="flex h-9 items-center justify-between gap-3 border-b border-muted px-4">
          <span className="flex items-center gap-2 text-caption tracking-[0.08em] text-quaternary uppercase">
            <Terminal size={12} strokeWidth={1.75} aria-hidden />
            Activity
            {running ? <span aria-hidden className="agent-beacon size-1.5 rounded-full bg-info-icon" /> : null}
          </span>
          <span className="flex items-center gap-2">
            <span className="text-caption text-quaternary tabular">{run.emitted.length} lines</span>
            <Button
              variant="ghost"
              size="sm"
              className="size-7"
              icon={expanded ? <ChevronsDownUp {...ICON_XS} /> : <ChevronsUpDown {...ICON_XS} />}
              aria-label={expanded ? "Shrink the log" : "Expand the log"}
              onClick={() => setExpanded((v) => !v)}
            />
          </span>
        </div>
        <div
          ref={logRef}
          role="log"
          aria-label="Agent activity"
          className={cx(
            "overflow-y-auto py-2 font-mono transition-[height] duration-200 [scrollbar-width:thin]",
            expanded ? "h-[420px]" : "h-[196px]",
          )}
        >
          {run.emitted.length === 0 ? (
            <p className="py-6 text-center font-sans text-body-md text-quaternary tabular">
              No run yet: load a part and the crew starts.
            </p>
          ) : (
            <ol>
              {run.emitted.map((line, index) => {
                const result = line.step.kind === "result";
                return (
                  <li
                    key={line.id}
                    className={cx(
                      "agent-line grid grid-cols-[2.25rem_1rem_minmax(0,1fr)] items-baseline gap-x-2 px-4 py-0.5 text-body-sm leading-6 sm:grid-cols-[2.25rem_1rem_6.5rem_minmax(0,1fr)]",
                      result ? "bg-success-surface/60 text-primary" : "text-tertiary",
                    )}
                  >
                    <span aria-hidden className="text-right text-quaternary/70 tabular select-none">
                      {String(index + 1).padStart(3, "0")}
                    </span>
                    <span
                      aria-hidden
                      className={cx(
                        "text-center",
                        result ? "text-success" : line.step.kind === "call" ? "text-info" : "text-quaternary",
                      )}
                    >
                      {STEP_GLYPH[line.step.kind]}
                    </span>
                    <span className="hidden truncate text-quaternary sm:block">{line.agentName}</span>
                    <span className="min-w-0 font-sans">
                      <span className="mr-1.5 text-quaternary sm:hidden">{line.agentName} ·</span>
                      <span className={result ? "font-medium" : undefined}>{line.step.text}</span>
                      {line.step.system ? (
                        <span className="ml-2 inline-flex flex-wrap items-center gap-1.5 align-middle">
                          <span className="text-caption text-quaternary">
                            {line.step.system.name} · {line.step.system.method}
                          </span>
                          <ConnectorBadge status={line.step.system.status} size="sm" variant="dot" />
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

export type PlaceholderState = "queued" | "running" | "blocked";

/** Stand-in for a tab whose agent has not finished yet. */
export function AgentPlaceholder({
  agent,
  state,
  onRun,
}: {
  agent: AgentRun | undefined;
  state: PlaceholderState;
  onRun?: () => void;
}) {
  if (!agent) return null;
  return (
    <section className="flex flex-col items-center rounded-xl border border-dashed border-default bg-raised px-6 py-12 text-center">
      <AgentStateBadge
        state={state === "running" ? "working" : state === "blocked" ? "waiting" : "queued"}
        label={state === "blocked" ? "Waiting on the route" : undefined}
      />
      <h2 className="mt-4 text-heading-sm text-primary">
        {state === "running"
          ? `${agent.name} is working on this`
          : state === "blocked"
            ? `${agent.name} is waiting on the route`
            : `${agent.name} has not run yet`}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-body-md text-tertiary">
        {state === "blocked"
          ? "This panel costs a manufacturing route. Confirm the process and the agent will fill it."
          : agent.role}
      </p>
      {state === "running" ? (
        <div className="mt-6 flex w-full max-w-sm flex-col items-center gap-2" aria-hidden>
          {["w-full", "w-4/5", "w-11/12", "w-3/5"].map((width) => (
            <Skeleton key={width} className={cx("h-2", width)} rounded="full" />
          ))}
        </div>
      ) : null}
      {onRun && state === "queued" ? (
        <Button onClick={onRun} className="mt-5" icon={Play}>
          Run the agents
        </Button>
      ) : null}
    </section>
  );
}
