"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";
import { PHASE_ONE_AGENT_IDS, type AgentId, type AgentRun, type AgentStep } from "@/lib/costing/agents";

/** Base delay per log line, ms. */
const STEP_MS = 190;
/** A `result` line lingers this many times longer. */
const RESULT_HOLD = 2.4;

export type RunPhase = "idle" | "running" | "paused" | "awaiting" | "done";

export interface EmittedStep {
  id: string;
  agentId: AgentId;
  agentName: string;
  step: AgentStep;
}

export interface AgentRunController {
  phase: RunPhase;
  emitted: EmittedStep[];
  activeId: AgentId | null;
  doneIds: Set<AgentId>;
  progress: number;
  atCheckpoint: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  complete: () => void;
  reset: () => void;
}

interface RunState {
  phase: RunPhase;
  cursor: number;
  runId: number;
}

type RunAction =
  | { type: "start" }
  | { type: "tick" }
  | { type: "jump"; to: number; phase?: RunPhase }
  | { type: "phase"; phase: RunPhase }
  | { type: "reset" };

function reducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case "start":
      return { phase: "running", cursor: 0, runId: state.runId + 1 };
    case "tick":
      return { ...state, phase: "running", cursor: state.cursor + 1 };
    case "jump":
      return { ...state, cursor: action.to, phase: action.phase ?? "running" };
    case "phase":
      return { ...state, phase: action.phase };
    case "reset":
      return { ...state, phase: "idle", cursor: 0 };
  }
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

/**
 * Plays the scripted agent log line by line. Phase-one agents (Geometry, Process)
 * run first; the rest wait at a human checkpoint until the process is `confirmed`.
 */
export function useAgentRun(agents: AgentRun[], confirmed: boolean): AgentRunController {
  const steps = useMemo(
    () =>
      agents.flatMap((agent, agentIndex) =>
        agent.steps.map((step) => ({ agentIndex, agentId: agent.id, agentName: agent.name, step })),
      ),
    [agents],
  );
  const phaseOneCount = useMemo(
    () => steps.filter((s) => PHASE_ONE_AGENT_IDS.includes(s.agentId)).length,
    [steps],
  );
  const total = steps.length;
  const limit = confirmed ? total : phaseOneCount;

  const [state, dispatch] = useReducer(reducer, { phase: "idle", cursor: 0, runId: 0 });
  const { cursor, runId } = state;

  // The stored phase advances on ticks; checkpoint and completion are derived from where the cursor sits.
  let phase: RunPhase = state.phase;
  if (phase === "awaiting" && confirmed) phase = "running";
  if (phase === "running") {
    if (total === 0) phase = "done";
    else if (cursor >= limit) phase = cursor >= total ? "done" : "awaiting";
  }

  useEffect(() => {
    if (phase !== "running") return;
    if (prefersReducedMotion()) {
      const id = setTimeout(() => dispatch({ type: "jump", to: limit }), 0);
      return () => clearTimeout(id);
    }
    const current = steps[cursor];
    const weight = (current.step.weight ?? 1) * (current.step.kind === "result" ? RESULT_HOLD : 1);
    const id = setTimeout(() => dispatch({ type: "tick" }), STEP_MS * weight);
    return () => clearTimeout(id);
  }, [phase, cursor, steps, limit]);

  const start = useCallback(() => dispatch({ type: "start" }), []);
  const pause = useCallback(() => {
    if (phase === "running") dispatch({ type: "phase", phase: "paused" });
  }, [phase]);
  const resume = useCallback(() => {
    if (phase === "paused") dispatch({ type: "phase", phase: "running" });
  }, [phase]);
  const skip = useCallback(
    () => dispatch({ type: "jump", to: confirmed ? total : phaseOneCount, phase: confirmed ? "done" : "awaiting" }),
    [confirmed, total, phaseOneCount],
  );
  const complete = useCallback(() => dispatch({ type: "jump", to: total, phase: "done" }), [total]);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  const emitted = useMemo(
    () =>
      steps.slice(0, cursor).map((s, index) => ({
        agentId: s.agentId,
        agentName: s.agentName,
        step: s.step,
        id: `${runId}-${index}`,
      })),
    [steps, cursor, runId],
  );

  const doneIds = useMemo(() => {
    if (phase === "done") return new Set(agents.map((agent) => agent.id));
    const needed = new Map<AgentId, number>();
    for (const s of steps) needed.set(s.agentId, (needed.get(s.agentId) ?? 0) + 1);
    const seen = new Map<AgentId, number>();
    for (const s of steps.slice(0, cursor)) seen.set(s.agentId, (seen.get(s.agentId) ?? 0) + 1);
    return new Set([...needed.entries()].filter(([id, count]) => (seen.get(id) ?? 0) >= count).map(([id]) => id));
  }, [steps, cursor, phase, agents]);

  return {
    phase,
    emitted,
    activeId: cursor > 0 ? (steps[Math.min(cursor, total) - 1]?.agentId ?? null) : null,
    doneIds,
    progress: total ? cursor / total : 0,
    atCheckpoint: phase === "awaiting",
    start,
    pause,
    resume,
    skip,
    complete,
    reset,
  };
}
