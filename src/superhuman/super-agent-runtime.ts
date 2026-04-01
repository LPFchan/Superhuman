import crypto from "node:crypto";
import type { AgentEventPayload } from "../infra/agent-events.js";
import { classifySuperCommandRisk } from "./super-command-risk-classifier.js";
import type {
  AgentRuntimeStage,
  RuntimeBudgetExhaustionReason,
  RuntimeInvocationMode,
  RuntimeInvocationStatus,
  StateAbortNodeRecord,
  StateIterationBudgetRecord,
  StateRuntimeInvocationRecord,
  StateStore,
  VerificationOutcome,
} from "./super-runtime-seams.js";
import { createSuperhumanStateStore } from "./super-state-store.js";

type RuntimeBudgetState = StateIterationBudgetRecord;
type RuntimeAbortNodeState = StateAbortNodeRecord;
type PendingVerificationToolCall = {
  toolCallId: string;
  verifierKind: string;
  command?: string;
  toolName: string;
};

export type RuntimeAbortScope = {
  abortNodeId: string;
  controller: AbortController;
  signal: AbortSignal;
  abort: (reason?: unknown) => void;
  dispose: () => void;
};

function createId(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

function abortControllerWithReason(controller: AbortController, reason?: unknown): void {
  controller.abort(reason);
}

function mergeAbortSignals(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(signals);
  }
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      abortControllerWithReason(controller, signal.reason);
      return controller.signal;
    }
  }
  const cleanups: Array<() => void> = [];
  const abortFromSignal = (signal: AbortSignal) => {
    for (const cleanup of cleanups) {
      cleanup();
    }
    abortControllerWithReason(controller, signal.reason);
  };
  for (const signal of signals) {
    const onAbort = () => abortFromSignal(signal);
    signal.addEventListener("abort", onAbort, { once: true });
    cleanups.push(() => signal.removeEventListener("abort", onAbort));
  }
  return controller.signal;
}

function describeRiskFromEvent(event: AgentEventPayload): string | undefined {
  if (event.stream !== "tool") {
    return undefined;
  }
  const phase = typeof event.data.phase === "string" ? event.data.phase : "";
  const name = typeof event.data.name === "string" ? event.data.name : "tool";
  if (phase !== "start") {
    return undefined;
  }
  const classification = classifySuperCommandRisk({
    toolName: name,
    args: event.data.args,
  });
  if (classification.risk === "low") {
    return undefined;
  }
  return `${classification.risk}: ${classification.reasons.join(", ")}`;
}

function isProcessExecutionToolName(toolName: string): boolean {
  const normalized = toolName.trim().toLowerCase();
  return (
    normalized === "bash" ||
    normalized === "exec" ||
    normalized === "process" ||
    normalized === "shell" ||
    normalized === "terminal" ||
    normalized === "run_command"
  );
}

function resolveToolCommandText(data: Record<string, unknown>): string | undefined {
  const nestedArgs =
    data.args && typeof data.args === "object" && !Array.isArray(data.args)
      ? (data.args as Record<string, unknown>)
      : undefined;
  if (nestedArgs) {
    const nestedCommand = resolveToolCommandText(nestedArgs);
    if (nestedCommand) {
      return nestedCommand;
    }
  }
  const candidates = [data.command, data.cmd, data.script];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  if (Array.isArray(data.argv)) {
    const argv = data.argv.filter(
      (entry): entry is string => typeof entry === "string" && entry.length > 0,
    );
    if (argv.length > 0) {
      return argv.join(" ").trim();
    }
  }
  return undefined;
}

function resolveVerificationKind(commandText: string | undefined): string | undefined {
  const normalized = commandText?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (
    normalized.includes("vitest") ||
    normalized.includes("jest") ||
    normalized.includes("pnpm test") ||
    normalized.includes("bun test") ||
    normalized.includes("npm test")
  ) {
    return "test_command";
  }
  if (
    normalized.includes("lint") ||
    normalized.includes("eslint") ||
    normalized.includes("oxlint")
  ) {
    return "lint";
  }
  if (
    normalized.includes("typecheck") ||
    normalized.includes("tsc") ||
    normalized.includes("tsgo")
  ) {
    return "typecheck";
  }
  if (normalized.includes("build")) {
    return "runtime";
  }
  if (normalized.includes("verify") || normalized.includes("check")) {
    return "shell_command";
  }
  return undefined;
}

function resolveToolResultExitCode(data: Record<string, unknown>): number | undefined {
  const candidates = [data.exitCode, data.exit_code, data.code];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  const result =
    data.result && typeof data.result === "object" && !Array.isArray(data.result)
      ? (data.result as Record<string, unknown>)
      : undefined;
  if (!result) {
    return undefined;
  }
  return resolveToolResultExitCode(result);
}

function isCodeEditingToolName(toolName: string): boolean {
  const normalized = toolName.trim().toLowerCase();
  return (
    normalized === "write" ||
    normalized === "edit" ||
    normalized === "apply_patch" ||
    normalized === "vscode_renamesymbol" ||
    normalized === "symbol_rename"
  );
}

export class SuperhumanAgentRuntimeTurn {
  private readonly stateStore: StateStore;
  private readonly invocation: StateRuntimeInvocationRecord;
  private readonly budgets = new Map<string, RuntimeBudgetState>();
  private readonly abortNodes = new Map<string, RuntimeAbortNodeState>();
  private activeStage?: AgentRuntimeStage;
  private awaitingPostToolContinuation = false;
  private codeEditingOccurred = false;
  private pendingVerificationToolCalls = new Map<string, PendingVerificationToolCall>();

  constructor(params: {
    workspaceDir: string;
    runId: string;
    sessionId: string;
    sessionKey?: string;
    mode: RuntimeInvocationMode;
    trigger?: string;
    maxIterations: number;
    parentRunId?: string;
    stateStore?: StateStore;
  }) {
    this.stateStore =
      params.stateStore ?? createSuperhumanStateStore({ workspaceDir: params.workspaceDir });
    const now = Date.now();
    const rootBudgetId = createId("budget");
    const rootAbortNodeId = createId("abort");
    this.invocation = {
      runId: params.runId,
      sessionKey: params.sessionKey,
      sessionId: params.sessionId,
      workspaceDir: params.workspaceDir,
      mode: params.mode,
      trigger: params.trigger,
      status: "running",
      startedAt: now,
      updatedAt: now,
      parentRunId: params.parentRunId,
      rootBudgetId,
      rootAbortNodeId,
    };
    const rootBudget: RuntimeBudgetState = {
      budgetId: rootBudgetId,
      runId: params.runId,
      label: "root",
      maxIterations: Math.max(1, params.maxIterations),
      usedIterations: 0,
      refundedIterations: 0,
      createdAt: now,
      updatedAt: now,
    };
    const rootAbortNode: RuntimeAbortNodeState = {
      abortNodeId: rootAbortNodeId,
      runId: params.runId,
      kind: "runtime",
      label: "root",
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.budgets.set(rootBudgetId, rootBudget);
    this.abortNodes.set(rootAbortNodeId, rootAbortNode);
    this.stateStore.upsertRuntimeInvocation(this.invocation);
    this.stateStore.upsertIterationBudget(rootBudget);
    this.stateStore.upsertAbortNode(rootAbortNode);
  }

  get rootBudgetId(): string {
    return this.invocation.rootBudgetId;
  }

  enterStage(stage: AgentRuntimeStage, detail?: string): void {
    const now = Date.now();
    if (this.activeStage && this.activeStage !== stage) {
      this.exitStage(this.activeStage);
    }
    this.activeStage = stage;
    this.invocation.currentStage = stage;
    this.invocation.updatedAt = now;
    this.stateStore.upsertRuntimeInvocation(this.invocation);
    this.stateStore.appendRuntimeStageEvent({
      eventId: createId("runtime-stage"),
      runId: this.invocation.runId,
      sessionKey: this.invocation.sessionKey,
      stage,
      boundary: "enter",
      detail,
      createdAt: now,
    });
  }

  exitStage(stage: AgentRuntimeStage, detail?: string): void {
    const now = Date.now();
    this.stateStore.appendRuntimeStageEvent({
      eventId: createId("runtime-stage"),
      runId: this.invocation.runId,
      sessionKey: this.invocation.sessionKey,
      stage,
      boundary: "exit",
      detail,
      createdAt: now,
    });
    if (this.activeStage === stage) {
      this.activeStage = undefined;
      this.invocation.currentStage = undefined;
      this.invocation.updatedAt = now;
      this.stateStore.upsertRuntimeInvocation(this.invocation);
    }
  }

  markStage(stage: AgentRuntimeStage, detail: string): void {
    this.stateStore.appendRuntimeStageEvent({
      eventId: createId("runtime-stage"),
      runId: this.invocation.runId,
      sessionKey: this.invocation.sessionKey,
      stage,
      boundary: "mark",
      detail,
      createdAt: Date.now(),
    });
  }

  beginVerification(detail?: string): void {
    this.enterStage("verification_planning", detail);
  }

  executeVerification(detail?: string): void {
    this.enterStage("verification_execution", detail);
  }

  recordVerificationOutcome(outcome: VerificationOutcome, detail?: string): void {
    this.invocation.verificationRequired = true;
    this.invocation.verificationOutcome = outcome;
    this.invocation.updatedAt = Date.now();
    this.stateStore.upsertRuntimeInvocation(this.invocation);
    if (detail) {
      this.markStage("verification_execution", detail);
    }
  }

  private ensureExplicitVerificationOutcome(status: RuntimeInvocationStatus): void {
    if (!this.codeEditingOccurred || this.invocation.verificationOutcome) {
      return;
    }
    this.beginVerification("code-editing tools ran; runtime requires verification planning");
    this.markStage(
      "verification_planning",
      "no explicit verification tool was recorded for this code-editing run",
    );
    this.executeVerification("verification pipeline completed without executable verifier");
    this.recordVerificationOutcome(
      status === "failed" || status === "aborted" ? "verification_failed" : "not_verifiable",
      status === "failed" || status === "aborted"
        ? "runtime ended before verification could complete"
        : "verification unavailable: no explicit verification command result recorded",
    );
  }

  consumeIteration(detail?: string): void {
    const budget = this.budgets.get(this.rootBudgetId);
    if (!budget) {
      return;
    }
    budget.usedIterations += 1;
    budget.updatedAt = Date.now();
    this.stateStore.upsertIterationBudget(budget);
    if (detail) {
      this.markStage("model_call", detail);
    }
  }

  refundIteration(detail?: string): void {
    const budget = this.budgets.get(this.rootBudgetId);
    if (!budget) {
      return;
    }
    budget.refundedIterations += 1;
    budget.updatedAt = Date.now();
    this.stateStore.upsertIterationBudget(budget);
    if (detail) {
      this.markStage("model_call", detail);
    }
  }

  refundChildBudgetIterations(params: {
    budgetId: string;
    refundedIterations: number;
    detail?: string;
  }): void {
    const budget = this.budgets.get(params.budgetId);
    if (!budget) {
      return;
    }
    budget.refundedIterations = Math.max(0, budget.refundedIterations + params.refundedIterations);
    budget.updatedAt = Date.now();
    this.stateStore.upsertIterationBudget(budget);
    if (params.detail) {
      this.markStage("tool_execution", params.detail);
    }
  }

  markBudgetExhausted(reason: RuntimeBudgetExhaustionReason, detail?: string): void {
    const budget = this.budgets.get(this.rootBudgetId);
    if (!budget) {
      return;
    }
    budget.exhaustedReason = reason;
    budget.updatedAt = Date.now();
    this.stateStore.upsertIterationBudget(budget);
    if (detail) {
      this.markStage("model_call", detail);
    }
  }

  createChildBudget(params: {
    label: string;
    maxIterations: number;
    parentBudgetId?: string;
  }): string {
    const now = Date.now();
    const budgetId = createId("budget");
    const budget: RuntimeBudgetState = {
      budgetId,
      runId: this.invocation.runId,
      parentBudgetId: params.parentBudgetId ?? this.rootBudgetId,
      label: params.label,
      maxIterations: Math.max(1, params.maxIterations),
      usedIterations: 0,
      refundedIterations: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.budgets.set(budgetId, budget);
    this.stateStore.upsertIterationBudget(budget);
    return budgetId;
  }

  updateChildBudget(
    budgetId: string,
    params: {
      usedIterations?: number;
      refundedIterations?: number;
      exhaustedReason?: RuntimeBudgetExhaustionReason;
    },
  ): void {
    const budget = this.budgets.get(budgetId);
    if (!budget) {
      return;
    }
    if (typeof params.usedIterations === "number") {
      budget.usedIterations = params.usedIterations;
    }
    if (typeof params.refundedIterations === "number") {
      budget.refundedIterations = params.refundedIterations;
    }
    if (params.exhaustedReason) {
      budget.exhaustedReason = params.exhaustedReason;
    }
    budget.updatedAt = Date.now();
    this.stateStore.upsertIterationBudget(budget);
  }

  createAbortNode(params: { kind: string; label: string; parentAbortNodeId?: string }): string {
    const now = Date.now();
    const abortNodeId = createId("abort");
    const node: RuntimeAbortNodeState = {
      abortNodeId,
      runId: this.invocation.runId,
      parentAbortNodeId: params.parentAbortNodeId ?? this.invocation.rootAbortNodeId,
      kind: params.kind,
      label: params.label,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.abortNodes.set(abortNodeId, node);
    this.stateStore.upsertAbortNode(node);
    return abortNodeId;
  }

  markAbortNodeCompleted(abortNodeId: string): void {
    const node = this.abortNodes.get(abortNodeId);
    if (!node) {
      return;
    }
    node.status = "completed";
    node.completedAt = Date.now();
    node.updatedAt = node.completedAt;
    this.stateStore.upsertAbortNode(node);
  }

  markAbortNodeAborted(abortNodeId: string, reason?: string): void {
    const node = this.abortNodes.get(abortNodeId);
    if (!node) {
      return;
    }
    node.status = "aborted";
    node.reason = reason;
    node.abortedAt = Date.now();
    node.updatedAt = node.abortedAt;
    this.stateStore.upsertAbortNode(node);
  }

  createAbortScope(params: {
    kind: string;
    label: string;
    parentSignal?: AbortSignal;
    parentAbortNodeId?: string;
  }): RuntimeAbortScope {
    const abortNodeId = this.createAbortNode({
      kind: params.kind,
      label: params.label,
      parentAbortNodeId: params.parentAbortNodeId,
    });
    const controller = new AbortController();
    const trackedSignals = [controller.signal];
    if (params.parentSignal) {
      trackedSignals.push(params.parentSignal);
    }
    const signal = mergeAbortSignals(trackedSignals);

    let disposed = false;
    let status: "active" | "completed" | "aborted" = "active";
    const onAbort = () => {
      if (status !== "active") {
        return;
      }
      status = "aborted";
      this.markAbortNodeAborted(abortNodeId, String(signal.reason ?? "aborted"));
    };
    signal.addEventListener("abort", onAbort, { once: true });

    const dispose = () => {
      if (disposed) {
        return;
      }
      disposed = true;
      signal.removeEventListener("abort", onAbort);
      if (status === "active") {
        status = "completed";
        this.markAbortNodeCompleted(abortNodeId);
      }
    };

    return {
      abortNodeId,
      controller,
      signal,
      abort: (reason?: unknown) => {
        abortControllerWithReason(controller, reason);
      },
      dispose,
    };
  }

  attachAbortSignal(signal: AbortSignal | undefined, label: string): () => void {
    if (!signal) {
      return () => {};
    }
    const abortScope = this.createAbortScope({ kind: "signal", label, parentSignal: signal });
    return () => {
      abortScope.dispose();
    };
  }

  handleAgentEvent(event: AgentEventPayload): void {
    if (event.runId !== this.invocation.runId) {
      return;
    }
    if (event.stream === "tool") {
      const phase = typeof event.data.phase === "string" ? event.data.phase : "";
      const toolName = typeof event.data.name === "string" ? event.data.name : "tool";
      const toolCallId =
        typeof event.data.toolCallId === "string" && event.data.toolCallId.trim()
          ? event.data.toolCallId.trim()
          : undefined;
      if (phase === "start") {
        if (isCodeEditingToolName(toolName)) {
          this.codeEditingOccurred = true;
          this.invocation.verificationRequired = true;
          this.invocation.updatedAt = Date.now();
          this.stateStore.upsertRuntimeInvocation(this.invocation);
        }
        if (this.codeEditingOccurred && isProcessExecutionToolName(toolName) && toolCallId) {
          const command = resolveToolCommandText(event.data);
          const verifierKind = resolveVerificationKind(command);
          if (verifierKind) {
            this.pendingVerificationToolCalls.set(toolCallId, {
              toolCallId,
              verifierKind,
              command,
              toolName,
            });
            this.markStage(
              "tool_planning",
              `verification planned via ${verifierKind}: ${command ?? toolName}`,
            );
          }
        }
        this.enterStage("tool_planning", toolName);
        this.markStage("tool_planning", `start ${toolName}`);
        this.enterStage("tool_execution", toolName);
        const riskSummary = describeRiskFromEvent(event);
        if (riskSummary) {
          this.markStage("tool_execution", `${toolName} risk ${riskSummary}`);
        }
        this.awaitingPostToolContinuation = true;
        return;
      }
      if (phase === "result" || phase === "end" || phase === "error") {
        this.exitStage("tool_execution", toolName);
        if (toolCallId) {
          const verification = this.pendingVerificationToolCalls.get(toolCallId);
          if (verification) {
            const exitCode = resolveToolResultExitCode(event.data);
            const failed =
              phase === "error" ||
              event.data.isError === true ||
              (typeof exitCode === "number" && exitCode !== 0);
            this.beginVerification(
              `${verification.verifierKind}: ${verification.command ?? verification.toolName}`,
            );
            this.executeVerification(
              `${verification.verifierKind}: ${verification.command ?? verification.toolName}`,
            );
            this.recordVerificationOutcome(
              failed ? "verification_failed" : "verified",
              `${verification.verifierKind}: ${verification.command ?? verification.toolName}${
                typeof exitCode === "number" ? ` (exit ${String(exitCode)})` : ""
              }`,
            );
            this.pendingVerificationToolCalls.delete(toolCallId);
          }
        }
        this.enterStage("post_tool_continuation", toolName);
        return;
      }
    }
    if (event.stream === "assistant" && this.awaitingPostToolContinuation) {
      this.awaitingPostToolContinuation = false;
      this.exitStage("post_tool_continuation", "assistant resumed");
      this.enterStage("model_call", "assistant continuation");
    }
  }

  finish(status: RuntimeInvocationStatus, latestError?: string): void {
    const now = Date.now();
    if (this.activeStage) {
      this.exitStage(this.activeStage);
    }
    this.ensureExplicitVerificationOutcome(status);
    this.invocation.status = status;
    this.invocation.updatedAt = now;
    this.invocation.endedAt = now;
    this.invocation.latestError = latestError;
    this.stateStore.upsertRuntimeInvocation(this.invocation);
    const rootAbortNode = this.abortNodes.get(this.invocation.rootAbortNodeId);
    if (rootAbortNode && rootAbortNode.status === "active") {
      if (status === "aborted") {
        this.markAbortNodeAborted(rootAbortNode.abortNodeId, latestError);
      } else {
        this.markAbortNodeCompleted(rootAbortNode.abortNodeId);
      }
    }
  }
}

export function resolveSuperRuntimeInvocationMode(params: {
  trigger?: string;
  lane?: string;
}): RuntimeInvocationMode {
  if (params.trigger === "cron") {
    return "scheduled";
  }
  if (params.lane === "nested" || params.lane === "subagent") {
    return "remote";
  }
  if (
    params.trigger === "heartbeat" ||
    params.trigger === "memory" ||
    params.trigger === "manual"
  ) {
    return "background";
  }
  return "interactive";
}
