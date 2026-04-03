import crypto from "node:crypto";
import type {
  RuntimeInvocationStatus,
  StateStore,
  SuperVerifierKind,
  VerificationOutcome,
} from "./seams.js";

export type TerminalVerificationResolution = {
  outcome?: VerificationOutcome;
  statusOverride?: RuntimeInvocationStatus;
  latestError?: string;
};

type VerificationStageHooks = {
  enterPlanning: (detail?: string) => void;
  enterExecution: (detail?: string) => void;
  markExecution: (detail: string) => void;
  markPlanning: (detail: string) => void;
};

type PendingVerificationAction = {
  actionId: string;
  toolCallId: string;
  toolName: string;
  verifierKind: SuperVerifierKind;
  command?: string;
  plannedAt: number;
};

function createId(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
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

function resolveVerificationKind(commandText: string | undefined): SuperVerifierKind | undefined {
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

export class SuperRuntimeVerificationTracker {
  private readonly pending = new Map<string, PendingVerificationAction>();
  private codeEditingOccurred = false;
  private outcome?: VerificationOutcome;
  private manualActionId?: string;
  private manualActionCreatedAt?: number;

  constructor(
    private readonly params: {
      stateStore: StateStore;
      runId: string;
      sessionKey?: string;
      hooks: VerificationStageHooks;
    },
  ) {}

  get verificationRequired(): boolean {
    return this.codeEditingOccurred;
  }

  get verificationOutcome(): VerificationOutcome | undefined {
    return this.outcome;
  }

  noteToolStart(params: {
    toolName: string;
    toolCallId?: string;
    data: Record<string, unknown>;
  }): void {
    if (isCodeEditingToolName(params.toolName)) {
      this.codeEditingOccurred = true;
      return;
    }
    if (
      !this.codeEditingOccurred ||
      !params.toolCallId ||
      !isProcessExecutionToolName(params.toolName)
    ) {
      return;
    }
    const command = resolveToolCommandText(params.data);
    const verifierKind = resolveVerificationKind(command);
    if (!verifierKind) {
      return;
    }
    const plannedAt = Date.now();
    const actionId = `verification:${this.params.runId}:${params.toolCallId}`;
    this.pending.set(params.toolCallId, {
      actionId,
      toolCallId: params.toolCallId,
      toolName: params.toolName,
      verifierKind,
      command,
      plannedAt,
    });
    this.params.stateStore.appendAction({
      actionId,
      sessionKey: this.params.sessionKey,
      runId: this.params.runId,
      actionType: "super.runtime.verification",
      actionKind: "verification",
      summary: `Plan verification with ${command ?? params.toolName}`,
      status: "planned",
      createdAt: plannedAt,
      verificationStage: "planned",
      verifierKind,
      command,
      details: {
        toolCallId: params.toolCallId,
        toolName: params.toolName,
      },
    });
  }

  noteToolResult(params: {
    toolCallId?: string;
    phase: string;
    isError: boolean;
    data: Record<string, unknown>;
  }): VerificationOutcome | undefined {
    if (!params.toolCallId) {
      return undefined;
    }
    const pending = this.pending.get(params.toolCallId);
    if (!pending) {
      return undefined;
    }
    const startedAt = Date.now();
    this.params.hooks.enterPlanning(
      `${pending.verifierKind}: ${pending.command ?? pending.toolName}`,
    );
    this.params.hooks.markPlanning(
      `verification planned via ${pending.verifierKind}: ${pending.command ?? pending.toolName}`,
    );
    this.params.hooks.enterExecution(
      `${pending.verifierKind}: ${pending.command ?? pending.toolName}`,
    );
    this.params.stateStore.appendAction({
      actionId: pending.actionId,
      sessionKey: this.params.sessionKey,
      runId: this.params.runId,
      actionType: "super.runtime.verification",
      actionKind: "verification",
      summary: `Run verification with ${pending.command ?? pending.toolName}`,
      status: "running",
      createdAt: pending.plannedAt,
      completedAt: undefined,
      verificationStage: "running",
      verifierKind: pending.verifierKind,
      command: pending.command,
      details: {
        toolCallId: pending.toolCallId,
        toolName: pending.toolName,
      },
    });
    const exitCode = resolveToolResultExitCode(params.data);
    const failed =
      params.phase === "error" ||
      params.isError ||
      (typeof exitCode === "number" && exitCode !== 0);
    const outcome = failed ? "verification_failed" : "verified";
    this.outcome = outcome;
    this.params.stateStore.appendAction({
      actionId: pending.actionId,
      sessionKey: this.params.sessionKey,
      runId: this.params.runId,
      actionType: "super.runtime.verification",
      actionKind: "verification",
      summary: failed
        ? `Verification failed for ${pending.command ?? pending.toolName}`
        : `Verification passed for ${pending.command ?? pending.toolName}`,
      status: failed ? "failed" : "completed",
      createdAt: pending.plannedAt,
      completedAt: startedAt,
      verificationStage: failed ? "failed" : "completed",
      verifierKind: pending.verifierKind,
      command: pending.command,
      exitCode,
      details: {
        toolCallId: pending.toolCallId,
        toolName: pending.toolName,
        outcome,
      },
    });
    this.params.stateStore.appendArtifact({
      artifactId: `verification-log:${pending.actionId}`,
      sessionKey: this.params.sessionKey,
      kind: "verification-log",
      label: pending.command ?? pending.toolName,
      createdAt: startedAt,
      verificationActionId: pending.actionId,
      metadata: {
        verifierKind: pending.verifierKind,
        command: pending.command,
        exitCode,
        outcome,
      },
    });
    this.params.hooks.markExecution(
      `${pending.verifierKind}: ${pending.command ?? pending.toolName}${
        typeof exitCode === "number" ? ` (exit ${String(exitCode)})` : ""
      }`,
    );
    this.pending.delete(params.toolCallId);
    return outcome;
  }

  ensureTerminalOutcome(status: RuntimeInvocationStatus): TerminalVerificationResolution {
    if (!this.codeEditingOccurred || this.outcome) {
      return { outcome: this.outcome };
    }
    const now = Date.now();
    const fallbackActionId = createId("verification");
    this.params.hooks.enterPlanning(
      "code-editing tools ran; runtime requires verification planning",
    );
    this.params.hooks.markPlanning(
      "no explicit verification tool was recorded for this code-editing run",
    );
    this.params.stateStore.appendAction({
      actionId: fallbackActionId,
      sessionKey: this.params.sessionKey,
      runId: this.params.runId,
      actionType: "super.runtime.verification",
      actionKind: "verification",
      summary: "Plan fallback verification outcome",
      status: "planned",
      createdAt: now,
      verificationStage: "planned",
      verifierKind: "runtime",
    });
    this.params.hooks.enterExecution("verification pipeline completed without executable verifier");
    const missingVerificationError =
      "code-editing run completed without explicit verifier execution or declared verification exception";
    this.outcome = "verification_failed";
    this.params.stateStore.appendAction({
      actionId: fallbackActionId,
      sessionKey: this.params.sessionKey,
      runId: this.params.runId,
      actionType: "super.runtime.verification",
      actionKind: "verification",
      summary:
        status === "failed" || status === "aborted"
          ? "Runtime ended before verification could complete"
          : missingVerificationError,
      status: "failed",
      createdAt: now,
      completedAt: now,
      verificationStage: "failed",
      verifierKind: "runtime",
      details: {
        outcome: this.outcome,
        terminalStatus: status,
      },
    });
    this.params.hooks.markExecution(
      status === "failed" || status === "aborted"
        ? "runtime ended before verification could complete"
        : missingVerificationError,
    );
    return {
      outcome: this.outcome,
      ...(status === "completed"
        ? {
            statusOverride: "failed" as const,
            latestError: missingVerificationError,
          }
        : {}),
    };
  }

  noteManualPlanning(detail?: string): void {
    this.codeEditingOccurred = true;
    if (!this.manualActionId) {
      this.manualActionId = createId("verification");
      this.manualActionCreatedAt = Date.now();
    }
    const createdAt = this.manualActionCreatedAt ?? Date.now();
    this.manualActionCreatedAt = createdAt;
    this.params.stateStore.appendAction({
      actionId: this.manualActionId,
      sessionKey: this.params.sessionKey,
      runId: this.params.runId,
      actionType: "super.runtime.verification",
      actionKind: "verification",
      summary: detail?.trim() || "Plan verification",
      status: "planned",
      createdAt,
      verificationStage: "planned",
      verifierKind: "manual",
    });
  }

  noteManualExecution(detail?: string): void {
    this.codeEditingOccurred = true;
    if (!this.manualActionId) {
      this.noteManualPlanning(detail);
    }
    this.params.stateStore.appendAction({
      actionId: this.manualActionId ?? createId("verification"),
      sessionKey: this.params.sessionKey,
      runId: this.params.runId,
      actionType: "super.runtime.verification",
      actionKind: "verification",
      summary: detail?.trim() || "Run verification",
      status: "running",
      createdAt: this.manualActionCreatedAt ?? Date.now(),
      verificationStage: "running",
      verifierKind: "manual",
    });
  }

  recordManualOutcome(outcome: VerificationOutcome, detail?: string): void {
    this.codeEditingOccurred = true;
    this.outcome = outcome;
    if (!this.manualActionId) {
      this.noteManualPlanning(detail);
    }
    const completedAt = Date.now();
    this.params.stateStore.appendAction({
      actionId: this.manualActionId ?? createId("verification"),
      sessionKey: this.params.sessionKey,
      runId: this.params.runId,
      actionType: "super.runtime.verification",
      actionKind: "verification",
      summary:
        detail?.trim() ||
        (outcome === "verified"
          ? "Verification passed"
          : outcome === "verification_failed"
            ? "Verification failed"
            : "Verification not available"),
      status: outcome === "verification_failed" ? "failed" : "completed",
      createdAt: this.manualActionCreatedAt ?? completedAt,
      completedAt,
      verificationStage:
        outcome === "verified"
          ? "completed"
          : outcome === "verification_failed"
            ? "failed"
            : "skipped",
      verifierKind: "manual",
      details: { outcome },
    });
    this.params.stateStore.appendArtifact({
      artifactId: `verification-log:${this.manualActionId ?? createId("verification")}`,
      sessionKey: this.params.sessionKey,
      kind: "verification-log",
      label: detail?.trim() || "Manual verification",
      createdAt: completedAt,
      verificationActionId: this.manualActionId,
      metadata: {
        outcome,
        verifierKind: "manual",
        summary: detail,
      },
    });
  }
}
