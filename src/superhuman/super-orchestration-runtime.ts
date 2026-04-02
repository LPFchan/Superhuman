import crypto from "node:crypto";
import { spawnAcpDirect } from "../agents/acp-spawn.js";
import { spawnSubagentDirect } from "../agents/subagent-spawn.js";
import type { OpenClawConfig } from "../config/config.js";
import { callGateway } from "../gateway/call.js";
import { loadGatewaySessionRow } from "../gateway/session-utils.js";
import type { ExecApprovalDecision } from "../infra/exec-approvals.js";
import { requestHeartbeatNow } from "../infra/heartbeat-wake.js";
import { enqueueSystemEvent } from "../infra/system-events.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import {
  createTaskRecord,
  deleteTaskRecordById,
  findTaskByRunId,
  getTaskById,
  patchTaskById,
} from "../tasks/runtime-internal.js";
import { formatTaskTerminalMessage, isTerminalTaskStatus } from "../tasks/task-executor-policy.js";
import {
  configureTaskRegistryRuntime,
  getTaskRegistryHooks,
  type TaskRegistryHookEvent,
} from "../tasks/task-registry.store.js";
import type { TaskQueueState, TaskRecord, TaskStatus } from "../tasks/task-registry.types.js";
import { getActiveSuperNotificationCenter } from "./super-notification-center.js";
import {
  type OrchestrationApprovalHistoryEntry,
  createSuperOrchestrationStore,
  type OrchestrationApprovalRecord,
  type OrchestrationMailboxMessageKind,
  type OrchestrationStore,
  type OrchestrationWorkerRecord,
} from "./super-orchestration-store.js";
import {
  startSuperRemoteSessionManager,
  type SuperRemoteApprovalResolution,
  type SuperRemoteSessionEvent,
  type SuperRemoteSessionManager,
} from "./super-remote-session-manager.js";
import type { ExecutionEnvironmentRegistry, StateStore } from "./super-runtime-seams.js";

const log = createSubsystemLogger("superhuman/orchestration");

export type LaunchWorkerParams = {
  runtime: "subagent" | "acp" | "remote";
  controllerSessionKey: string;
  requesterSessionKey: string;
  task: string;
  label?: string;
  mode?: "run" | "session";
  agentId?: string;
  model?: string;
  thinking?: string;
  parentBudget?: number;
  childBudget?: number;
  budgetUsed?: number;
  spawnCount?: number;
  concurrencySlot?: number;
  runTimeoutSeconds?: number;
  cleanup?: "delete" | "keep";
  thread?: boolean;
  sandbox?: "inherit" | "require";
  resumeSessionId?: string;
  cwd?: string;
  streamTo?: "parent";
  requesterAgentIdOverride?: string;
  workspaceDir?: string;
  agentChannel?: string;
  agentAccountId?: string;
  agentTo?: string;
  agentThreadId?: string | number;
  agentGroupId?: string | null;
  agentGroupChannel?: string | null;
  agentGroupSpace?: string | null;
  sandboxed?: boolean;
  attachments?: Array<{
    name: string;
    content: string;
    encoding?: "utf8" | "base64";
    mimeType?: string;
  }>;
  attachMountPath?: string;
  remoteSessionKey?: string;
  remoteAdapterId?: string;
  remoteProviderId?: string;
  remoteCapabilityMode?: "workspace_search_only" | "symbol_references" | "semantic_rename";
  remoteCapabilityRequirements?: Array<
    | "workspace_search_only"
    | "symbol_references"
    | "semantic_rename"
    | "verification_replay"
    | "artifact_replay"
    | "provenance_replay"
    | "computer_use"
  >;
  remoteSupportsVerificationReplay?: boolean;
  remoteSupportsArtifactReplay?: boolean;
  remoteSupportsProvenanceReplay?: boolean;
};

export type ApprovalMirrorRequestedParams = {
  kind: "exec" | "plugin";
  requestId: string;
  sessionKey?: string | null;
  payload: Record<string, unknown>;
};

export type ApprovalMirrorResolvedParams = {
  kind: "exec" | "plugin";
  requestId: string;
  sessionKey?: string | null;
  status: "approved" | "denied" | "expired";
  payload: Record<string, unknown>;
};

export type OrchestrationRuntime = {
  remoteSessionManager: SuperRemoteSessionManager;
  launchWorker: (params: LaunchWorkerParams) => Promise<OrchestrationWorkerRecord>;
  getWorker: (workerId: string) => OrchestrationWorkerRecord | undefined;
  listWorkers: () => OrchestrationWorkerRecord[];
  continueWorker: (params: {
    workerId: string;
    message: string;
    interrupt?: boolean;
  }) => Promise<boolean>;
  sendWorkerFollowUp: (params: {
    workerId: string;
    message: string;
    interrupt?: boolean;
  }) => Promise<boolean>;
  interruptWorker: (workerId: string) => Promise<boolean>;
  stopWorker: (workerId: string) => Promise<boolean>;
  collectWorker: (params: { workerId: string }) => {
    worker: OrchestrationWorkerRecord;
    terminalMessage?: ReturnType<OrchestrationStore["listMailbox"]>[number];
    approvals: OrchestrationApprovalRecord[];
  } | null;
  waitForWorkerTerminal: (params: { workerId: string; timeoutMs?: number }) => Promise<boolean>;
  listMailboxMessages: (
    recipientSessionKey?: string,
  ) => ReturnType<OrchestrationStore["listMailbox"]>;
  listApprovals: (params?: {
    workerId?: string;
    controllerSessionKey?: string;
    status?: OrchestrationApprovalRecord["status"];
  }) => OrchestrationApprovalRecord[];
  resolveApproval: (params: {
    approvalId: string;
    decision: Extract<ExecApprovalDecision, "allow-once" | "allow-always" | "deny">;
    resolvedBySessionKey?: string | null;
    note?: string;
    paramsOverride?: Record<string, unknown>;
    feedback?: string;
    command?: string;
    cwd?: string | null;
  }) => Promise<boolean>;
  recordApprovalRequested: (params: ApprovalMirrorRequestedParams) => Promise<void>;
  recordApprovalResolved: (params: ApprovalMirrorResolvedParams) => Promise<void>;
  stop: () => void;
};

type QueuePolicy = {
  maxConcurrentWorkersPerLead: number;
  maxQueuedWorkersPerLead: number;
  queueDrainPolicy: "oldest_first";
};

type CoordinatorNotificationStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "killed"
  | "refused";

let activeRuntime: OrchestrationRuntime | null = null;

function resolveWorkerBackend(
  runtime: LaunchWorkerParams["runtime"],
): "in_process" | "out_of_process" | "remote_peer" {
  return runtime === "acp" ? "out_of_process" : runtime === "remote" ? "remote_peer" : "in_process";
}

function isActiveWorkerState(state: OrchestrationWorkerRecord["state"]): boolean {
  return state === "launching" || state === "running";
}

function buildStartedMessage(worker: OrchestrationWorkerRecord): string {
  const label = worker.label?.trim() || worker.task.trim() || "Worker task";
  return `Worker started: ${label}.`;
}

function buildQueuedMessage(worker: OrchestrationWorkerRecord): string {
  const label = worker.label?.trim() || worker.task.trim() || "Worker task";
  return `Worker queued: ${label}.`;
}

function buildQueuedSummary(worker: OrchestrationWorkerRecord): string {
  const position =
    typeof worker.queuePosition === "number" ? ` (queue position ${worker.queuePosition})` : "";
  return `${buildQueuedMessage(worker)}${position}`;
}

function buildApprovalText(params: {
  kind: "exec" | "plugin";
  action: "requested" | "resolved";
  sessionKey?: string;
  status?: string;
}): string {
  const scope = params.kind === "exec" ? "exec" : "plugin";
  if (params.action === "requested") {
    return `Worker ${scope} approval requested${params.sessionKey ? ` from ${params.sessionKey}` : ""}.`;
  }
  return `Worker ${scope} approval ${params.status ?? "resolved"}${params.sessionKey ? ` for ${params.sessionKey}` : ""}.`;
}

function buildApprovalDecisionText(params: {
  kind: "exec" | "plugin";
  decision: Extract<ExecApprovalDecision, "allow-once" | "allow-always" | "deny">;
  sessionKey?: string;
}): string {
  const scope = params.kind === "exec" ? "exec" : "plugin";
  return `Coordinator decided ${params.decision} for worker ${scope} approval${params.sessionKey ? ` from ${params.sessionKey}` : ""}.`;
}

function buildApprovalRecordId(kind: "exec" | "plugin", requestId: string): string {
  return `${kind}:${requestId}`;
}

function buildWorkerControlAuditText(params: {
  action: "continue" | "interrupt" | "stop" | "collect";
  worker: OrchestrationWorkerRecord;
}): string {
  const label = params.worker.label?.trim() || params.worker.task.trim() || "Worker";
  switch (params.action) {
    case "continue":
      return `Coordinator continued worker: ${label}.`;
    case "interrupt":
      return `Coordinator interrupted worker: ${label}.`;
    case "stop":
      return `Coordinator stopped worker: ${label}.`;
    case "collect":
      return `Coordinator collected worker result: ${label}.`;
  }
}

function xmlEscape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function buildTaskNotificationEnvelope(params: {
  worker: OrchestrationWorkerRecord;
  status: CoordinatorNotificationStatus;
  summary: string;
  result?: string;
  usage?: {
    toolUses?: number;
    durationMs?: number;
    queueDelayMs?: number;
  };
}): string {
  const lines = [
    "<task-notification>",
    `<task-id>${xmlEscape(params.worker.workerId)}</task-id>`,
    `<status>${xmlEscape(params.status)}</status>`,
    `<summary>${xmlEscape(params.summary)}</summary>`,
  ];
  const result = params.result?.trim();
  if (result) {
    lines.push(`<result>${xmlEscape(result)}</result>`);
  }
  const usageLines: string[] = [];
  if (typeof params.usage?.toolUses === "number") {
    usageLines.push(`  <tool_uses>${params.usage.toolUses}</tool_uses>`);
  }
  if (typeof params.usage?.durationMs === "number") {
    usageLines.push(`  <duration_ms>${params.usage.durationMs}</duration_ms>`);
  }
  if (typeof params.usage?.queueDelayMs === "number") {
    usageLines.push(`  <queue_delay_ms>${params.usage.queueDelayMs}</queue_delay_ms>`);
  }
  if (usageLines.length > 0) {
    lines.push("<usage>");
    lines.push(...usageLines);
    lines.push("</usage>");
  }
  lines.push("</task-notification>");
  return lines.join("\n");
}

function mapTaskStatusToCoordinatorStatus(
  task: TaskRecord,
  worker?: OrchestrationWorkerRecord,
): CoordinatorNotificationStatus {
  if (task.orchestration?.queueState === "refused" || task.orchestration?.refusalReason) {
    return "refused";
  }
  if (
    typeof worker?.stopRequestedAt === "number" &&
    typeof task.endedAt === "number" &&
    task.endedAt >= worker.stopRequestedAt
  ) {
    return "killed";
  }
  if (task.status === "succeeded") {
    return task.terminalOutcome === "blocked" ? "failed" : "completed";
  }
  if (task.status === "cancelled") {
    return "killed";
  }
  return "failed";
}

function resolveQueuePolicy(cfg: OpenClawConfig): QueuePolicy {
  const maxConcurrentWorkersPerLead = Math.max(
    1,
    Math.floor(cfg.agents?.defaults?.subagents?.maxChildrenPerAgent ?? 5),
  );
  return {
    maxConcurrentWorkersPerLead,
    maxQueuedWorkersPerLead: maxConcurrentWorkersPerLead,
    queueDrainPolicy: "oldest_first",
  };
}

function resolveMailboxSessionBusy(sessionKey: string): boolean {
  const status = loadGatewaySessionRow(sessionKey)?.status?.trim().toLowerCase();
  return status === "running";
}

function queueMailboxMessage(params: {
  store: OrchestrationStore;
  recipientSessionKey: string;
  senderSessionKey?: string;
  workerId?: string;
  kind: OrchestrationMailboxMessageKind;
  text: string;
  payload?: Record<string, unknown>;
}) {
  const now = Date.now();
  const busy = resolveMailboxSessionBusy(params.recipientSessionKey);
  const message = params.store.appendMailbox({
    recipientSessionKey: params.recipientSessionKey,
    senderSessionKey: params.senderSessionKey,
    workerId: params.workerId,
    kind: params.kind,
    text: params.text,
    payload: params.payload,
    deliveryStatus: busy ? "session_queued" : "idle_delivered",
    deliveryStateUpdatedAt: now,
    deliveredAt: busy ? undefined : now,
    correlationId: params.workerId,
  });
  if (!busy) {
    enqueueSystemEvent(params.text, {
      sessionKey: params.recipientSessionKey,
      contextKey: `mailbox:${message.messageId}`,
    });
    requestHeartbeatNow({
      reason: "worker-mailbox",
      sessionKey: params.recipientSessionKey,
    });
  }
  return message;
}

function appendMailboxAuditRecord(params: {
  store: OrchestrationStore;
  recipientSessionKey: string;
  senderSessionKey?: string;
  workerId?: string;
  kind: OrchestrationMailboxMessageKind;
  text: string;
  payload?: Record<string, unknown>;
}) {
  return params.store.appendMailbox({
    recipientSessionKey: params.recipientSessionKey,
    senderSessionKey: params.senderSessionKey,
    workerId: params.workerId,
    kind: params.kind,
    text: params.text,
    payload: params.payload,
    deliveryStatus: "stored",
    deliveryStateUpdatedAt: Date.now(),
    correlationId: params.workerId,
  });
}

function drainMailboxForSession(params: {
  store: OrchestrationStore;
  recipientSessionKey: string;
}) {
  if (resolveMailboxSessionBusy(params.recipientSessionKey)) {
    return;
  }
  const queued = params.store
    .listMailbox(params.recipientSessionKey)
    .filter((message) => message.deliveryStatus === "session_queued")
    .toSorted((left, right) => left.createdAt - right.createdAt);
  for (const message of queued) {
    const deliveredAt = Date.now();
    params.store.patchMailbox(message.messageId, {
      deliveryStatus: "drained",
      deliveryStateUpdatedAt: deliveredAt,
      deliveredAt,
    });
    enqueueSystemEvent(message.text, {
      sessionKey: params.recipientSessionKey,
      contextKey: `mailbox:${message.messageId}`,
    });
  }
  if (queued.length > 0) {
    requestHeartbeatNow({
      reason: "worker-mailbox-drain",
      sessionKey: params.recipientSessionKey,
    });
  }
}

function createApprovalHistoryEntry(params: {
  status: OrchestrationApprovalHistoryEntry["status"];
  payload?: Record<string, unknown>;
}): OrchestrationApprovalHistoryEntry {
  return {
    status: params.status,
    at: Date.now(),
    ...(params.payload ? { payload: params.payload } : {}),
  };
}

function mapApprovalDecisionStatus(
  decision: Extract<ExecApprovalDecision, "allow-once" | "allow-always" | "deny">,
): "approved" | "denied" {
  return decision === "deny" ? "denied" : "approved";
}

function createOrchestrationTaskRecord(params: {
  worker: OrchestrationWorkerRecord;
  queueState: TaskQueueState;
  status?: TaskStatus;
  terminalSummary?: string;
  error?: string;
  refusalReason?: string;
}) {
  const now = Date.now();
  return createTaskRecord({
    runtime: params.worker.runtime,
    ownerKey: params.worker.controllerSessionKey,
    requesterSessionKey: params.worker.requesterSessionKey,
    scopeKind: "session",
    task: params.worker.task,
    label: params.worker.label,
    status: params.status ?? "queued",
    startedAt: params.status === "running" ? now : undefined,
    terminalSummary: params.terminalSummary,
    progressSummary: params.status === "queued" ? buildQueuedMessage(params.worker) : undefined,
    ...(params.error ? { error: params.error } : {}),
    orchestration: {
      executionRole:
        params.worker.runtime === "remote"
          ? "remote_peer"
          : params.worker.runtime === "acp"
            ? "worker"
            : "subagent",
      workerBackend: params.worker.backend,
      controllerSessionKey: params.worker.controllerSessionKey,
      queueState: params.queueState,
      notificationMode: "mailbox",
      stableWorkerId: params.worker.workerId,
      queueDelayMs: 0,
      parentBudget: 0,
      childBudget: 0,
      budgetUsed: 0,
      spawnCount: params.worker.queuePosition ?? 1,
      concurrencySlot:
        typeof params.worker.launchRequest.concurrencySlot === "number"
          ? params.worker.launchRequest.concurrencySlot
          : undefined,
      queueDrainPolicy: params.worker.queueDrainPolicy ?? "oldest_first",
      refusalReason: params.refusalReason,
      toolCount: 0,
      lastHeartbeatAt: now,
      lastActivityAt: now,
      launchRequest: {
        backend: params.worker.backend,
        mode: params.worker.launchRequest.mode === "session" ? "session" : "run",
        model:
          typeof params.worker.launchRequest.model === "string"
            ? params.worker.launchRequest.model
            : undefined,
        thinking:
          typeof params.worker.launchRequest.thinking === "string"
            ? params.worker.launchRequest.thinking
            : undefined,
        cleanup: params.worker.launchRequest.cleanup === "delete" ? "delete" : "keep",
        thread: params.worker.launchRequest.thread === true,
        sandbox: params.worker.launchRequest.sandbox === "require" ? "require" : "inherit",
        streamTo: params.worker.launchRequest.streamTo === "parent" ? "parent" : undefined,
        requesterAgentIdOverride:
          typeof params.worker.launchRequest.requesterAgentIdOverride === "string"
            ? params.worker.launchRequest.requesterAgentIdOverride
            : undefined,
        queueDrainPolicy: params.worker.queueDrainPolicy ?? "oldest_first",
        resumeSessionId:
          typeof params.worker.launchRequest.resumeSessionId === "string"
            ? params.worker.launchRequest.resumeSessionId
            : undefined,
        workspaceDir:
          typeof params.worker.launchRequest.workspaceDir === "string"
            ? params.worker.launchRequest.workspaceDir
            : undefined,
      },
    },
  });
}

async function markLeadSession(sessionKey: string): Promise<void> {
  const trimmed = sessionKey.trim();
  if (!trimmed) {
    return;
  }
  try {
    await callGateway({
      method: "sessions.patch",
      params: {
        key: trimmed,
        executionRole: "lead",
      },
      timeoutMs: 10_000,
    });
  } catch {
    // Best-effort only.
  }
}

function hydrateWorkerFromTask(params: {
  store: OrchestrationStore;
  worker: OrchestrationWorkerRecord;
  task: TaskRecord;
}): OrchestrationWorkerRecord {
  const queueState = params.task.orchestration?.queueState;
  return (
    params.store.patchWorker(params.worker.workerId, {
      taskId: params.task.taskId,
      childSessionKey: params.task.childSessionKey,
      runId: params.task.runId,
      taskStatus: params.task.status,
      state:
        queueState === "refused"
          ? "refused"
          : isTerminalTaskStatus(params.task.status)
            ? "terminal"
            : "running",
      updatedAt: Date.now(),
      refusalReason: params.task.orchestration?.refusalReason,
    }) ?? params.worker
  );
}

export function getActiveSuperOrchestrationRuntime(): OrchestrationRuntime | null {
  return activeRuntime;
}

export function startSuperOrchestrationRuntime(params: {
  cfg: OpenClawConfig;
  workspaceDir: string;
  stateStore: StateStore;
  executionEnvironmentRegistry: ExecutionEnvironmentRegistry;
  remoteSessionManager?: SuperRemoteSessionManager;
}): OrchestrationRuntime {
  const store = createSuperOrchestrationStore({ workspaceDir: params.workspaceDir });
  const previousHooks = getTaskRegistryHooks();
  let stopped = false;
  const launchPromises = new Map<string, Promise<void>>();
  let runtime: OrchestrationRuntime;
  const remoteSessionManager =
    params.remoteSessionManager ??
    startSuperRemoteSessionManager({
      workspaceDir: params.workspaceDir,
      stateStore: params.stateStore,
      environmentRegistry: params.executionEnvironmentRegistry,
    });

  const countActiveWorkersForController = (controllerSessionKey: string): number =>
    store
      .listWorkers()
      .filter(
        (worker) =>
          worker.controllerSessionKey === controllerSessionKey && isActiveWorkerState(worker.state),
      ).length;

  const syncTaskState = (task: TaskRecord) => {
    const workerId = task.orchestration?.stableWorkerId?.trim();
    const controllerSessionKey = task.orchestration?.controllerSessionKey?.trim();
    if (!workerId || !controllerSessionKey) {
      return;
    }
    const worker = store.getWorker(workerId);
    if (!worker) {
      return;
    }
    const updatedWorker = hydrateWorkerFromTask({
      store,
      worker,
      task,
    });
    store.patchWorker(workerId, {
      updatedAt: Date.now(),
      taskStatus: task.status,
      childSessionKey: task.childSessionKey,
      runId: task.runId,
      ...(task.status === "running" ? { queueStartedAt: task.startedAt ?? Date.now() } : {}),
    });
    if (isTerminalTaskStatus(task.status) && worker.state !== "terminal") {
      const summary =
        typeof worker.stopRequestedAt === "number" &&
        typeof task.endedAt === "number" &&
        task.endedAt >= worker.stopRequestedAt &&
        task.status === "cancelled"
          ? "Worker stopped by coordinator."
          : formatTaskTerminalMessage(task);
      getActiveSuperNotificationCenter()?.publish({
        kind: "task_complete",
        title: worker.label?.trim() || worker.task.trim() || "Background task finished",
        message: summary,
        sessionKey: controllerSessionKey,
        runId: task.runId,
        metadata: {
          taskId: task.taskId,
          status: task.status,
          terminalOutcome: task.terminalOutcome,
        },
      });
      queueMailboxMessage({
        store,
        recipientSessionKey: controllerSessionKey,
        senderSessionKey: task.childSessionKey,
        workerId,
        kind: "worker_terminal",
        text: buildTaskNotificationEnvelope({
          worker: updatedWorker,
          status: mapTaskStatusToCoordinatorStatus(task, updatedWorker),
          summary,
          result: task.terminalSummary ?? task.error,
          usage: {
            toolUses: task.orchestration?.toolCount,
            durationMs:
              typeof task.startedAt === "number" && typeof task.endedAt === "number"
                ? task.endedAt - task.startedAt
                : undefined,
            queueDelayMs: task.orchestration?.queueDelayMs,
          },
        }),
        payload: {
          taskId: task.taskId,
          runId: task.runId,
          status: task.status,
          terminalOutcome: task.terminalOutcome,
          summary: task.terminalSummary,
          error: task.error,
        },
      });
      patchTaskById({
        taskId: task.taskId,
        patch: {
          orchestration: {
            queueState: task.orchestration?.queueState === "refused" ? "refused" : "terminal",
            budgetUsed:
              typeof task.startedAt === "number" && typeof task.endedAt === "number"
                ? Math.max(0, task.endedAt - task.startedAt)
                : task.orchestration?.budgetUsed,
            lastHeartbeatAt: Date.now(),
            lastActivityAt: Date.now(),
          },
        },
      });
      drainMailboxForSession({
        store,
        recipientSessionKey: controllerSessionKey,
      });
      void processQueue(controllerSessionKey);
      return;
    }
    if (task.status === "running" && worker.state !== "running") {
      const summary = buildStartedMessage(updatedWorker);
      queueMailboxMessage({
        store,
        recipientSessionKey: controllerSessionKey,
        senderSessionKey: task.childSessionKey,
        workerId,
        kind: "worker_started",
        text: buildTaskNotificationEnvelope({
          worker: updatedWorker,
          status: "running",
          summary,
          usage: {
            queueDelayMs: task.orchestration?.queueDelayMs,
          },
        }),
        payload: {
          taskId: task.taskId,
          runId: task.runId,
          childSessionKey: task.childSessionKey,
        },
      });
      drainMailboxForSession({
        store,
        recipientSessionKey: controllerSessionKey,
      });
    }
  };

  const onTaskRegistryEvent = (event: TaskRegistryHookEvent) => {
    if (stopped) {
      return;
    }
    if (event.kind === "restored") {
      for (const task of event.tasks) {
        syncTaskState(task);
      }
      const controllerKeys = new Set(
        store.listWorkers().map((worker) => worker.controllerSessionKey),
      );
      for (const controllerSessionKey of controllerKeys) {
        void processQueue(controllerSessionKey);
      }
      return;
    }
    if (event.kind === "deleted") {
      const previousControllerSessionKey = event.previous.orchestration?.controllerSessionKey;
      if (previousControllerSessionKey) {
        void processQueue(previousControllerSessionKey);
      }
      return;
    }
    syncTaskState(event.task);
  };

  configureTaskRegistryRuntime({
    hooks: {
      onEvent(event) {
        previousHooks?.onEvent?.(event);
        onTaskRegistryEvent(event);
      },
    },
  });

  const handleRemoteSessionEvent = (event: SuperRemoteSessionEvent) => {
    const worker = store.getWorker(event.workerId);
    if (!worker) {
      return;
    }
    if (event.type === "connected") {
      store.patchWorker(worker.workerId, {
        state: "running",
        updatedAt: event.createdAt,
      });
      if (worker.taskId) {
        patchTaskById({
          taskId: worker.taskId,
          patch: {
            status: "running",
            startedAt: event.createdAt,
            lastEventAt: event.createdAt,
            progressSummary: buildStartedMessage(worker),
            orchestration: {
              queueState: "running",
              lastHeartbeatAt: event.createdAt,
              lastActivityAt: event.createdAt,
            },
          },
        });
      }
      queueMailboxMessage({
        store,
        recipientSessionKey: worker.controllerSessionKey,
        senderSessionKey: worker.childSessionKey,
        workerId: worker.workerId,
        kind: "worker_started",
        text: buildTaskNotificationEnvelope({
          worker,
          status: "running",
          summary: buildStartedMessage(worker),
        }),
        payload: {
          childSessionKey: worker.childSessionKey,
          backend: worker.backend,
          remote: true,
        },
      });
      drainMailboxForSession({
        store,
        recipientSessionKey: worker.controllerSessionKey,
      });
      return;
    }
    if (event.type === "reconnecting") {
      store.patchWorker(worker.workerId, {
        state: "launching",
        updatedAt: event.createdAt,
      });
      queueMailboxMessage({
        store,
        recipientSessionKey: worker.controllerSessionKey,
        workerId: worker.workerId,
        kind: "worker_control",
        text: `Worker reconnecting: ${worker.label?.trim() || worker.task.trim() || worker.workerId}.`,
        payload: {
          action: "reconnecting",
          reason: event.reason,
          remote: true,
        },
      });
      drainMailboxForSession({
        store,
        recipientSessionKey: worker.controllerSessionKey,
      });
      return;
    }
    if (event.type === "progress") {
      appendMailboxAuditRecord({
        store,
        recipientSessionKey: worker.controllerSessionKey,
        senderSessionKey: worker.childSessionKey,
        workerId: worker.workerId,
        kind: "worker_control",
        text: event.summary,
        payload: {
          action: "progress",
          stage: event.stage,
          details: event.details,
          remote: true,
        },
      });
      return;
    }
    if (event.type === "approval_requested") {
      void runtime.recordApprovalRequested({
        kind: "plugin",
        requestId: event.request.requestId,
        sessionKey: worker.childSessionKey,
        payload: {
          toolName: event.request.toolName,
          input: event.request.input,
          summary: event.request.summary,
          capabilityRequirements: event.request.capabilityRequirements,
          verification: event.request.verification,
          provenance: event.request.provenance,
          artifact: event.request.artifact,
          requiresLocalToolStub: event.request.requiresLocalToolStub,
        },
      });
      return;
    }
    if (event.type === "approval_resolved") {
      void runtime.recordApprovalResolved({
        kind: "plugin",
        requestId: event.requestId,
        sessionKey: worker.childSessionKey,
        status:
          event.resolution.decision === "expired"
            ? "expired"
            : event.resolution.decision === "approved"
              ? "approved"
              : "denied",
        payload: {
          resolution: event.resolution,
          remote: true,
        },
      });
      return;
    }
    if (event.type === "approval_cancelled") {
      void runtime.recordApprovalResolved({
        kind: "plugin",
        requestId: event.requestId,
        sessionKey: worker.childSessionKey,
        status: "expired",
        payload: {
          toolCallId: event.toolCallId,
          cancelled: true,
          remote: true,
        },
      });
      return;
    }
    if (event.type === "terminal") {
      store.patchWorker(worker.workerId, {
        state: "terminal",
        updatedAt: event.createdAt,
        taskStatus: event.error ? "failed" : "succeeded",
        lastError: event.error,
      });
      if (worker.taskId) {
        patchTaskById({
          taskId: worker.taskId,
          patch: {
            status: event.error ? "failed" : "succeeded",
            endedAt: event.createdAt,
            lastEventAt: event.createdAt,
            error: event.error,
            terminalSummary: event.result ?? event.summary,
            terminalOutcome: event.error ? "blocked" : "succeeded",
            orchestration: {
              queueState: "terminal",
              lastHeartbeatAt: event.createdAt,
              lastActivityAt: event.createdAt,
            },
          },
        });
      }
      queueMailboxMessage({
        store,
        recipientSessionKey: worker.controllerSessionKey,
        senderSessionKey: worker.childSessionKey,
        workerId: worker.workerId,
        kind: "worker_terminal",
        text: buildTaskNotificationEnvelope({
          worker: {
            ...worker,
            state: "terminal",
          },
          status: event.error ? "failed" : "completed",
          summary: event.summary,
          result: event.result ?? event.error,
        }),
        payload: {
          result: event.result,
          verificationOutcome: event.verificationOutcome,
          provenance: event.provenance,
          artifact: event.artifact,
          error: event.error,
          remote: true,
        },
      });
      drainMailboxForSession({
        store,
        recipientSessionKey: worker.controllerSessionKey,
      });
    }
  };
  remoteSessionManager?.setEventHandler(handleRemoteSessionEvent);

  const processQueue = async (controllerSessionKey: string): Promise<void> => {
    const trimmed = controllerSessionKey.trim();
    if (!trimmed || stopped) {
      return;
    }
    const queuePolicy = resolveQueuePolicy(params.cfg);
    let activeCount = countActiveWorkersForController(trimmed);
    const queuedWorkers = store
      .listWorkers()
      .filter((worker) => worker.controllerSessionKey === trimmed && worker.state === "queued")
      .toSorted((left, right) => left.createdAt - right.createdAt);
    for (const worker of queuedWorkers) {
      if (activeCount >= queuePolicy.maxConcurrentWorkersPerLead) {
        break;
      }
      if (launchPromises.has(worker.workerId)) {
        continue;
      }
      activeCount += 1;
      const launchPromise = launchWorkerRecord(worker).finally(() => {
        launchPromises.delete(worker.workerId);
      });
      launchPromises.set(worker.workerId, launchPromise);
    }
  };

  const launchWorkerRecord = async (worker: OrchestrationWorkerRecord): Promise<void> => {
    if (stopped) {
      return;
    }
    if (worker.taskId) {
      patchTaskById({
        taskId: worker.taskId,
        patch: {
          status: "running",
          startedAt: Date.now(),
          lastEventAt: Date.now(),
          progressSummary: buildStartedMessage(worker),
          orchestration: {
            queueState: "launching",
            queueDelayMs: Date.now() - worker.createdAt,
            lastHeartbeatAt: Date.now(),
            lastActivityAt: Date.now(),
          },
        },
      });
    }
    const current = store.patchWorker(worker.workerId, {
      state: "launching",
      updatedAt: Date.now(),
      queueStartedAt: Date.now(),
    });
    if (!current) {
      return;
    }
    await markLeadSession(current.controllerSessionKey);
    try {
      const launchRequest = current.launchRequest;
      const result =
        current.runtime === "remote"
          ? await (async () => {
              if (!remoteSessionManager) {
                return {
                  status: "error" as const,
                  error: "Remote session manager is unavailable.",
                  childSessionKey: undefined,
                  runId: undefined,
                };
              }
              if (
                typeof launchRequest.remoteSessionKey !== "string" ||
                !launchRequest.remoteSessionKey.trim()
              ) {
                return {
                  status: "error" as const,
                  error: "Remote workers require remoteSessionKey.",
                  childSessionKey: undefined,
                  runId: undefined,
                };
              }
              return await remoteSessionManager
                .launchSession({
                  workerId: current.workerId,
                  sessionKey: launchRequest.remoteSessionKey,
                  controllerSessionKey: current.controllerSessionKey,
                  requesterSessionKey: current.requesterSessionKey,
                  adapterId:
                    typeof launchRequest.remoteAdapterId === "string"
                      ? launchRequest.remoteAdapterId
                      : undefined,
                  providerId:
                    typeof launchRequest.remoteProviderId === "string"
                      ? launchRequest.remoteProviderId
                      : undefined,
                  label: current.label,
                  capabilityMode:
                    launchRequest.remoteCapabilityMode === "symbol_references" ||
                    launchRequest.remoteCapabilityMode === "semantic_rename"
                      ? launchRequest.remoteCapabilityMode
                      : "workspace_search_only",
                  capabilityRequirements: Array.isArray(launchRequest.remoteCapabilityRequirements)
                    ? launchRequest.remoteCapabilityRequirements
                    : [],
                  supportsVerificationReplay:
                    launchRequest.remoteSupportsVerificationReplay !== false,
                  supportsArtifactReplay: launchRequest.remoteSupportsArtifactReplay !== false,
                  supportsProvenanceReplay: launchRequest.remoteSupportsProvenanceReplay !== false,
                })
                .then((record) => ({
                  status: "accepted" as const,
                  childSessionKey: record.sessionKey,
                  runId: `remote:${record.workerId}`,
                  mode: "session" as const,
                }))
                .catch((error: unknown) => ({
                  status: "error" as const,
                  error: error instanceof Error ? error.message : String(error),
                  childSessionKey: undefined,
                  runId: undefined,
                }));
            })()
          : current.runtime === "acp"
            ? await spawnAcpDirect(
                {
                  task: current.task,
                  label: current.label,
                  agentId:
                    typeof launchRequest.agentId === "string" ? launchRequest.agentId : undefined,
                  resumeSessionId:
                    typeof launchRequest.resumeSessionId === "string"
                      ? launchRequest.resumeSessionId
                      : undefined,
                  cwd: typeof launchRequest.cwd === "string" ? launchRequest.cwd : undefined,
                  mode: launchRequest.mode === "session" ? "session" : "run",
                  thread: launchRequest.thread === true,
                  sandbox: launchRequest.sandbox === "require" ? "require" : "inherit",
                  streamTo: launchRequest.streamTo === "parent" ? "parent" : undefined,
                },
                {
                  agentSessionKey: current.requesterSessionKey,
                  agentChannel:
                    typeof launchRequest.agentChannel === "string"
                      ? launchRequest.agentChannel
                      : undefined,
                  agentAccountId:
                    typeof launchRequest.agentAccountId === "string"
                      ? launchRequest.agentAccountId
                      : undefined,
                  agentTo:
                    typeof launchRequest.agentTo === "string" ? launchRequest.agentTo : undefined,
                  agentThreadId:
                    typeof launchRequest.agentThreadId === "string" ||
                    typeof launchRequest.agentThreadId === "number"
                      ? launchRequest.agentThreadId
                      : undefined,
                  agentGroupId:
                    typeof launchRequest.agentGroupId === "string"
                      ? launchRequest.agentGroupId
                      : undefined,
                  sandboxed: launchRequest.sandboxed === true,
                },
              )
            : await spawnSubagentDirect(
                {
                  task: current.task,
                  label: current.label,
                  agentId:
                    typeof launchRequest.agentId === "string" ? launchRequest.agentId : undefined,
                  model: typeof launchRequest.model === "string" ? launchRequest.model : undefined,
                  thinking:
                    typeof launchRequest.thinking === "string" ? launchRequest.thinking : undefined,
                  runTimeoutSeconds:
                    typeof launchRequest.runTimeoutSeconds === "number"
                      ? launchRequest.runTimeoutSeconds
                      : undefined,
                  thread: launchRequest.thread === true,
                  mode: launchRequest.mode === "session" ? "session" : "run",
                  cleanup: launchRequest.cleanup === "delete" ? "delete" : "keep",
                  sandbox: launchRequest.sandbox === "require" ? "require" : "inherit",
                  expectsCompletionMessage: true,
                  attachments: Array.isArray(launchRequest.attachments)
                    ? (launchRequest.attachments as LaunchWorkerParams["attachments"])
                    : undefined,
                  attachMountPath:
                    typeof launchRequest.attachMountPath === "string"
                      ? launchRequest.attachMountPath
                      : undefined,
                },
                {
                  agentSessionKey: current.requesterSessionKey,
                  agentChannel:
                    typeof launchRequest.agentChannel === "string"
                      ? launchRequest.agentChannel
                      : undefined,
                  agentAccountId:
                    typeof launchRequest.agentAccountId === "string"
                      ? launchRequest.agentAccountId
                      : undefined,
                  agentTo:
                    typeof launchRequest.agentTo === "string" ? launchRequest.agentTo : undefined,
                  agentThreadId:
                    typeof launchRequest.agentThreadId === "string" ||
                    typeof launchRequest.agentThreadId === "number"
                      ? launchRequest.agentThreadId
                      : undefined,
                  agentGroupId:
                    typeof launchRequest.agentGroupId === "string"
                      ? launchRequest.agentGroupId
                      : undefined,
                  agentGroupChannel:
                    typeof launchRequest.agentGroupChannel === "string"
                      ? launchRequest.agentGroupChannel
                      : undefined,
                  agentGroupSpace:
                    typeof launchRequest.agentGroupSpace === "string"
                      ? launchRequest.agentGroupSpace
                      : undefined,
                  requesterAgentIdOverride:
                    typeof launchRequest.requesterAgentIdOverride === "string"
                      ? launchRequest.requesterAgentIdOverride
                      : undefined,
                  workspaceDir:
                    typeof launchRequest.workspaceDir === "string"
                      ? launchRequest.workspaceDir
                      : undefined,
                },
              );

      if (result.status !== "accepted") {
        const refusalReason =
          result.status === "forbidden" ? "agent_policy_refused" : "launch_error";
        store.patchWorker(current.workerId, {
          state: "refused",
          updatedAt: Date.now(),
          lastError: result.error,
          childSessionKey: result.childSessionKey,
          runId: result.runId,
          refusalReason,
        });
        if (current.taskId) {
          patchTaskById({
            taskId: current.taskId,
            patch: {
              status: "failed",
              endedAt: Date.now(),
              lastEventAt: Date.now(),
              error: result.error,
              terminalSummary: result.error ?? "Worker launch failed.",
              orchestration: {
                queueState: "refused",
                refusalReason,
                lastHeartbeatAt: Date.now(),
                lastActivityAt: Date.now(),
              },
            },
          });
        }
        const summary = result.error
          ? `Worker launch failed: ${result.error}`
          : "Worker launch failed.";
        queueMailboxMessage({
          store,
          recipientSessionKey: current.controllerSessionKey,
          senderSessionKey: result.childSessionKey,
          workerId: current.workerId,
          kind: "worker_terminal",
          text: buildTaskNotificationEnvelope({
            worker: {
              ...current,
              childSessionKey: result.childSessionKey,
              runId: result.runId,
            },
            status: "refused",
            summary,
            result: result.error,
          }),
          payload: {
            status: result.status,
            error: result.error,
            childSessionKey: result.childSessionKey,
            runId: result.runId,
            refusalReason,
          },
        });
        drainMailboxForSession({
          store,
          recipientSessionKey: current.controllerSessionKey,
        });
        return;
      }

      const runId = result.runId?.trim();
      let task = runId ? findTaskByRunId(runId) : undefined;
      if (!task && current.taskId) {
        patchTaskById({
          taskId: current.taskId,
          patch: {
            runId,
            childSessionKey: result.childSessionKey,
            status: "running",
            startedAt: Date.now(),
            lastEventAt: Date.now(),
            orchestration: {
              queueState: "running",
              queueDelayMs: Date.now() - current.createdAt,
              lastHeartbeatAt: Date.now(),
              lastActivityAt: Date.now(),
            },
          },
        });
        task = getTaskById(current.taskId) ?? undefined;
      }
      if (task) {
        if (current.taskId && current.taskId !== task.taskId) {
          deleteTaskRecordById(current.taskId);
        }
        patchTaskById({
          taskId: task.taskId,
          patch: {
            orchestration: {
              executionRole:
                current.runtime === "remote"
                  ? "remote_peer"
                  : current.runtime === "acp"
                    ? "worker"
                    : "subagent",
              workerBackend: current.backend,
              controllerSessionKey: current.controllerSessionKey,
              queueState: "running",
              notificationMode: "mailbox",
              stableWorkerId: current.workerId,
              queueDelayMs: Date.now() - current.createdAt,
              parentBudget:
                typeof current.launchRequest.parentBudget === "number"
                  ? current.launchRequest.parentBudget
                  : undefined,
              childBudget:
                typeof current.launchRequest.childBudget === "number"
                  ? current.launchRequest.childBudget
                  : undefined,
              budgetUsed:
                typeof current.launchRequest.budgetUsed === "number"
                  ? current.launchRequest.budgetUsed
                  : 0,
              spawnCount:
                typeof current.launchRequest.spawnCount === "number"
                  ? current.launchRequest.spawnCount
                  : undefined,
              concurrencySlot:
                typeof current.launchRequest.concurrencySlot === "number"
                  ? current.launchRequest.concurrencySlot
                  : undefined,
              queueDrainPolicy:
                current.queueDrainPolicy ??
                (current.launchRequest.queueDrainPolicy === "oldest_first"
                  ? "oldest_first"
                  : undefined),
              lastHeartbeatAt: Date.now(),
              lastActivityAt: Date.now(),
              launchRequest: {
                backend: current.backend,
                mode: current.launchRequest.mode === "session" ? "session" : "run",
                model:
                  typeof current.launchRequest.model === "string"
                    ? current.launchRequest.model
                    : undefined,
                thinking:
                  typeof current.launchRequest.thinking === "string"
                    ? current.launchRequest.thinking
                    : undefined,
                parentBudget:
                  typeof current.launchRequest.parentBudget === "number"
                    ? current.launchRequest.parentBudget
                    : undefined,
                childBudget:
                  typeof current.launchRequest.childBudget === "number"
                    ? current.launchRequest.childBudget
                    : undefined,
                budgetUsed:
                  typeof current.launchRequest.budgetUsed === "number"
                    ? current.launchRequest.budgetUsed
                    : undefined,
                spawnCount:
                  typeof current.launchRequest.spawnCount === "number"
                    ? current.launchRequest.spawnCount
                    : undefined,
                concurrencySlot:
                  typeof current.launchRequest.concurrencySlot === "number"
                    ? current.launchRequest.concurrencySlot
                    : undefined,
                queueDrainPolicy:
                  current.launchRequest.queueDrainPolicy === "oldest_first"
                    ? "oldest_first"
                    : undefined,
                cleanup: current.launchRequest.cleanup === "delete" ? "delete" : "keep",
                thread: current.launchRequest.thread === true,
                sandbox: current.launchRequest.sandbox === "require" ? "require" : "inherit",
                streamTo: current.launchRequest.streamTo === "parent" ? "parent" : undefined,
                requesterAgentIdOverride:
                  typeof current.launchRequest.requesterAgentIdOverride === "string"
                    ? current.launchRequest.requesterAgentIdOverride
                    : undefined,
                resumeSessionId:
                  typeof current.launchRequest.resumeSessionId === "string"
                    ? current.launchRequest.resumeSessionId
                    : undefined,
                workspaceDir:
                  typeof current.launchRequest.workspaceDir === "string"
                    ? current.launchRequest.workspaceDir
                    : undefined,
              },
            },
          },
        });
      }
      const patchedWorker = store.patchWorker(current.workerId, {
        state: task && isTerminalTaskStatus(task.status) ? "terminal" : "running",
        updatedAt: Date.now(),
        childSessionKey: result.childSessionKey,
        runId,
        taskId: task?.taskId ?? current.taskId,
        ...(task
          ? {
              taskStatus: task.status,
            }
          : {}),
      });
      if (!task && patchedWorker) {
        const summary = buildStartedMessage(patchedWorker);
        queueMailboxMessage({
          store,
          recipientSessionKey: patchedWorker.controllerSessionKey,
          senderSessionKey: patchedWorker.childSessionKey,
          workerId: patchedWorker.workerId,
          kind: "worker_started",
          text: buildTaskNotificationEnvelope({
            worker: patchedWorker,
            status: "running",
            summary,
          }),
          payload: {
            childSessionKey: patchedWorker.childSessionKey,
            runId: patchedWorker.runId,
          },
        });
        drainMailboxForSession({
          store,
          recipientSessionKey: patchedWorker.controllerSessionKey,
        });
      }
    } catch (error) {
      log.warn("Worker launch failed", { error, workerId: current.workerId });
      const refusalReason = "launch_exception";
      store.patchWorker(current.workerId, {
        state: "refused",
        updatedAt: Date.now(),
        lastError: error instanceof Error ? error.message : String(error),
        refusalReason,
      });
      if (current.taskId) {
        patchTaskById({
          taskId: current.taskId,
          patch: {
            status: "failed",
            endedAt: Date.now(),
            lastEventAt: Date.now(),
            error: error instanceof Error ? error.message : String(error),
            terminalSummary: error instanceof Error ? error.message : String(error),
            orchestration: {
              queueState: "refused",
              refusalReason,
              lastHeartbeatAt: Date.now(),
              lastActivityAt: Date.now(),
            },
          },
        });
      }
      const summary = `Worker launch failed: ${error instanceof Error ? error.message : String(error)}`;
      queueMailboxMessage({
        store,
        recipientSessionKey: current.controllerSessionKey,
        workerId: current.workerId,
        kind: "worker_terminal",
        text: buildTaskNotificationEnvelope({
          worker: current,
          status: "refused",
          summary,
          result: error instanceof Error ? error.message : String(error),
        }),
        payload: {
          error: error instanceof Error ? error.message : String(error),
          refusalReason,
        },
      });
      drainMailboxForSession({
        store,
        recipientSessionKey: current.controllerSessionKey,
      });
    } finally {
      void processQueue(current.controllerSessionKey);
    }
  };

  runtime = {
    remoteSessionManager,
    async launchWorker(launchParams) {
      const workerId = crypto.randomUUID();
      const now = Date.now();
      const controllerSessionKey = launchParams.controllerSessionKey.trim();
      const existingWorkers = store
        .listWorkers()
        .filter((worker) => worker.controllerSessionKey === controllerSessionKey);
      const activeWorkers = existingWorkers.filter((worker) => isActiveWorkerState(worker.state));
      const queuedWorkers = existingWorkers.filter((worker) => worker.state === "queued");
      const queuePolicy = resolveQueuePolicy(params.cfg);
      const spawnCount = existingWorkers.length + 1;
      const concurrencySlot =
        typeof launchParams.concurrencySlot === "number"
          ? launchParams.concurrencySlot
          : activeWorkers.length + 1;
      const record: OrchestrationWorkerRecord = {
        workerId,
        runtime: launchParams.runtime,
        backend: resolveWorkerBackend(launchParams.runtime),
        controllerSessionKey: launchParams.controllerSessionKey,
        requesterSessionKey: launchParams.requesterSessionKey,
        task: launchParams.task,
        label: launchParams.label,
        createdAt: now,
        updatedAt: now,
        state: "queued",
        queuePosition: queuedWorkers.length + 1,
        queueEnteredAt: now,
        queueDrainPolicy: queuePolicy.queueDrainPolicy,
        launchRequest: {
          agentId: launchParams.agentId,
          model: launchParams.model,
          thinking: launchParams.thinking,
          parentBudget: launchParams.parentBudget,
          childBudget: launchParams.childBudget,
          budgetUsed: launchParams.budgetUsed ?? 0,
          spawnCount: launchParams.spawnCount ?? spawnCount,
          concurrencySlot,
          queueDrainPolicy: queuePolicy.queueDrainPolicy,
          runTimeoutSeconds: launchParams.runTimeoutSeconds,
          cleanup: launchParams.cleanup,
          thread: launchParams.thread,
          sandbox: launchParams.sandbox,
          resumeSessionId: launchParams.resumeSessionId,
          cwd: launchParams.cwd,
          streamTo: launchParams.streamTo,
          requesterAgentIdOverride: launchParams.requesterAgentIdOverride,
          workspaceDir: launchParams.workspaceDir,
          agentChannel: launchParams.agentChannel,
          agentAccountId: launchParams.agentAccountId,
          agentTo: launchParams.agentTo,
          agentThreadId: launchParams.agentThreadId,
          agentGroupId: launchParams.agentGroupId ?? undefined,
          agentGroupChannel: launchParams.agentGroupChannel ?? undefined,
          agentGroupSpace: launchParams.agentGroupSpace ?? undefined,
          sandboxed: launchParams.sandboxed === true,
          attachments: launchParams.attachments,
          attachMountPath: launchParams.attachMountPath,
          remoteSessionKey: launchParams.remoteSessionKey,
          remoteAdapterId: launchParams.remoteAdapterId,
          remoteProviderId: launchParams.remoteProviderId,
          remoteCapabilityMode: launchParams.remoteCapabilityMode,
          remoteCapabilityRequirements: launchParams.remoteCapabilityRequirements,
          remoteSupportsVerificationReplay: launchParams.remoteSupportsVerificationReplay,
          remoteSupportsArtifactReplay: launchParams.remoteSupportsArtifactReplay,
          remoteSupportsProvenanceReplay: launchParams.remoteSupportsProvenanceReplay,
          mode: launchParams.mode ?? (launchParams.thread ? "session" : "run"),
        },
      };
      const shouldRefuse =
        activeWorkers.length >= queuePolicy.maxConcurrentWorkersPerLead &&
        queuedWorkers.length >= queuePolicy.maxQueuedWorkersPerLead;
      const taskRecord = createOrchestrationTaskRecord({
        worker: record,
        queueState: shouldRefuse ? "refused" : "queued",
        status: shouldRefuse ? "failed" : "queued",
        terminalSummary: shouldRefuse
          ? "Worker refused because the per-lead queue cap is full."
          : undefined,
        error: shouldRefuse ? "Queue cap reached." : undefined,
        refusalReason: shouldRefuse ? "queue_cap_reached" : undefined,
      });
      const saved = store.upsertWorker({
        ...record,
        taskId: taskRecord.taskId,
        taskStatus: taskRecord.status,
        ...(shouldRefuse ? { state: "refused" as const, refusalReason: "queue_cap_reached" } : {}),
      });
      await markLeadSession(saved.controllerSessionKey);
      if (shouldRefuse) {
        patchTaskById({
          taskId: taskRecord.taskId,
          patch: {
            endedAt: now,
            lastEventAt: now,
            orchestration: {
              queueState: "refused",
              refusalReason: "queue_cap_reached",
            },
          },
        });
        queueMailboxMessage({
          store,
          recipientSessionKey: saved.controllerSessionKey,
          workerId: saved.workerId,
          kind: "worker_terminal",
          text: buildTaskNotificationEnvelope({
            worker: saved,
            status: "refused",
            summary: "Worker refused because the per-lead queue cap is full.",
            result: "queue_cap_reached",
          }),
          payload: {
            refusalReason: "queue_cap_reached",
            maxConcurrentWorkersPerLead: queuePolicy.maxConcurrentWorkersPerLead,
            maxQueuedWorkersPerLead: queuePolicy.maxQueuedWorkersPerLead,
            queueDrainPolicy: queuePolicy.queueDrainPolicy,
            taskId: taskRecord.taskId,
          },
        });
        drainMailboxForSession({
          store,
          recipientSessionKey: saved.controllerSessionKey,
        });
        return saved;
      }
      if (activeWorkers.length >= queuePolicy.maxConcurrentWorkersPerLead) {
        queueMailboxMessage({
          store,
          recipientSessionKey: saved.controllerSessionKey,
          workerId: saved.workerId,
          kind: "worker_queued",
          text: buildTaskNotificationEnvelope({
            worker: saved,
            status: "queued",
            summary: buildQueuedSummary(saved),
            usage: {
              queueDelayMs: 0,
            },
          }),
          payload: {
            queueState: "queued",
            queuePosition: saved.queuePosition,
            queueDrainPolicy: queuePolicy.queueDrainPolicy,
            maxConcurrentWorkersPerLead: queuePolicy.maxConcurrentWorkersPerLead,
            maxQueuedWorkersPerLead: queuePolicy.maxQueuedWorkersPerLead,
            taskId: taskRecord.taskId,
          },
        });
        drainMailboxForSession({
          store,
          recipientSessionKey: saved.controllerSessionKey,
        });
      }
      void processQueue(saved.controllerSessionKey);
      return saved;
    },

    getWorker(workerId) {
      return store.getWorker(workerId);
    },

    listWorkers() {
      return store.listWorkers();
    },

    async continueWorker(params) {
      const worker = store.getWorker(params.workerId);
      const childSessionKey = worker?.childSessionKey?.trim();
      if (!worker) {
        return false;
      }
      const now = Date.now();
      store.patchWorker(worker.workerId, {
        updatedAt: now,
        lastControlAction: "continue",
        lastControlAt: now,
      });
      appendMailboxAuditRecord({
        store,
        recipientSessionKey: worker.controllerSessionKey,
        senderSessionKey: worker.controllerSessionKey,
        workerId: worker.workerId,
        kind: "worker_control",
        text: buildWorkerControlAuditText({ action: "continue", worker }),
        payload: {
          action: "continue",
          childSessionKey,
          interrupt: params.interrupt === true,
        },
      });
      if (worker.runtime === "remote") {
        return (
          (await remoteSessionManager?.continueSession({
            workerId: worker.workerId,
            message: params.message,
            interrupt: params.interrupt,
          })) ?? false
        );
      }
      if (!childSessionKey) {
        return false;
      }
      await callGateway({
        method: params.interrupt ? "sessions.steer" : "sessions.send",
        params: {
          key: childSessionKey,
          message: params.message,
        },
        timeoutMs: 10_000,
      });
      return true;
    },

    async sendWorkerFollowUp(params) {
      return await runtime.continueWorker(params);
    },

    async interruptWorker(workerId) {
      const worker = store.getWorker(workerId);
      const childSessionKey = worker?.childSessionKey?.trim();
      if (!worker) {
        return false;
      }
      const now = Date.now();
      store.patchWorker(worker.workerId, {
        updatedAt: now,
        lastControlAction: "interrupt",
        lastControlAt: now,
      });
      appendMailboxAuditRecord({
        store,
        recipientSessionKey: worker.controllerSessionKey,
        senderSessionKey: worker.controllerSessionKey,
        workerId: worker.workerId,
        kind: "worker_control",
        text: buildWorkerControlAuditText({ action: "interrupt", worker }),
        payload: {
          action: "interrupt",
          childSessionKey,
          runId: worker.runId,
        },
      });
      if (worker.runtime === "remote") {
        return (await remoteSessionManager?.interruptSession(worker.workerId)) ?? false;
      }
      if (!childSessionKey) {
        return false;
      }
      await callGateway({
        method: "sessions.abort",
        params: {
          key: childSessionKey,
          ...(worker.runId ? { runId: worker.runId } : {}),
        },
        timeoutMs: 10_000,
      });
      return true;
    },

    async stopWorker(workerId) {
      const worker = store.getWorker(workerId);
      if (!worker) {
        return false;
      }
      const now = Date.now();
      if (worker.state === "queued") {
        store.patchWorker(worker.workerId, {
          state: "terminal",
          updatedAt: now,
          taskStatus: "cancelled",
          lastControlAction: "stop",
          lastControlAt: now,
          stopRequestedAt: now,
        });
        if (worker.taskId) {
          patchTaskById({
            taskId: worker.taskId,
            patch: {
              status: "cancelled",
              endedAt: now,
              lastEventAt: now,
              terminalSummary: "Worker stopped before launch.",
              progressSummary: "Worker stopped before launch.",
              orchestration: {
                queueState: "terminal",
                lastHeartbeatAt: now,
                lastActivityAt: now,
              },
            },
          });
        }
        queueMailboxMessage({
          store,
          recipientSessionKey: worker.controllerSessionKey,
          workerId: worker.workerId,
          kind: "worker_terminal",
          text: buildTaskNotificationEnvelope({
            worker: {
              ...worker,
              state: "terminal",
              taskStatus: "cancelled",
              stopRequestedAt: now,
            },
            status: "killed",
            summary: "Worker stopped before launch.",
            result: "stopped",
          }),
          payload: {
            status: "cancelled",
            taskId: worker.taskId,
            stoppedBeforeLaunch: true,
          },
        });
        appendMailboxAuditRecord({
          store,
          recipientSessionKey: worker.controllerSessionKey,
          senderSessionKey: worker.controllerSessionKey,
          workerId: worker.workerId,
          kind: "worker_control",
          text: buildWorkerControlAuditText({ action: "stop", worker }),
          payload: {
            action: "stop",
            stoppedBeforeLaunch: true,
          },
        });
        drainMailboxForSession({
          store,
          recipientSessionKey: worker.controllerSessionKey,
        });
        void processQueue(worker.controllerSessionKey);
        return true;
      }

      const childSessionKey = worker.childSessionKey?.trim();
      if (worker.runtime !== "remote" && !childSessionKey) {
        return false;
      }
      store.patchWorker(worker.workerId, {
        updatedAt: now,
        lastControlAction: "stop",
        lastControlAt: now,
        stopRequestedAt: now,
      });
      appendMailboxAuditRecord({
        store,
        recipientSessionKey: worker.controllerSessionKey,
        senderSessionKey: worker.controllerSessionKey,
        workerId: worker.workerId,
        kind: "worker_control",
        text: buildWorkerControlAuditText({ action: "stop", worker }),
        payload: {
          action: "stop",
          childSessionKey,
          runId: worker.runId,
        },
      });
      if (worker.taskId) {
        patchTaskById({
          taskId: worker.taskId,
          patch: {
            progressSummary: "Worker stop requested.",
            lastEventAt: now,
            orchestration: {
              lastHeartbeatAt: now,
              lastActivityAt: now,
            },
          },
        });
      }
      if (worker.runtime === "remote") {
        return (await remoteSessionManager?.stopSession(worker.workerId)) ?? false;
      }
      await callGateway({
        method: "sessions.abort",
        params: {
          key: childSessionKey,
          ...(worker.runId ? { runId: worker.runId } : {}),
        },
        timeoutMs: 10_000,
      });
      return true;
    },

    collectWorker(params) {
      const worker = store.getWorker(params.workerId);
      if (!worker || (worker.state !== "terminal" && worker.state !== "refused")) {
        return null;
      }
      const now = Date.now();
      const updatedWorker =
        store.patchWorker(worker.workerId, {
          updatedAt: now,
          lastControlAction: "collect",
          lastControlAt: now,
          lastCollectedAt: now,
        }) ?? worker;
      appendMailboxAuditRecord({
        store,
        recipientSessionKey: worker.controllerSessionKey,
        senderSessionKey: worker.controllerSessionKey,
        workerId: worker.workerId,
        kind: "worker_control",
        text: buildWorkerControlAuditText({ action: "collect", worker: updatedWorker }),
        payload: {
          action: "collect",
          state: updatedWorker.state,
        },
      });
      const terminalMessage = store
        .listMailbox(worker.controllerSessionKey)
        .filter(
          (message) => message.workerId === worker.workerId && message.kind === "worker_terminal",
        )
        .toSorted((left, right) => right.createdAt - left.createdAt)[0];
      return {
        worker: updatedWorker,
        terminalMessage,
        approvals: store
          .listApprovals()
          .filter((approval) => approval.workerId === worker.workerId),
      };
    },

    async waitForWorkerTerminal(params) {
      const startedAt = Date.now();
      const timeoutMs = params.timeoutMs ?? 30_000;
      while (Date.now() - startedAt < timeoutMs) {
        const worker = store.getWorker(params.workerId);
        if (!worker) {
          return false;
        }
        if (worker.state === "terminal" || worker.state === "refused") {
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      return false;
    },

    listMailboxMessages(recipientSessionKey) {
      return store.listMailbox(recipientSessionKey);
    },

    listApprovals(filter) {
      return store.listApprovals().filter((approval) => {
        if (filter?.workerId && approval.workerId !== filter.workerId) {
          return false;
        }
        if (
          filter?.controllerSessionKey &&
          approval.controllerSessionKey !== filter.controllerSessionKey
        ) {
          return false;
        }
        if (filter?.status && approval.status !== filter.status) {
          return false;
        }
        return true;
      });
    },

    async resolveApproval(resolveParams) {
      const approval = store
        .listApprovals()
        .find((record) => record.approvalId === resolveParams.approvalId);
      if (!approval || approval.status !== "requested") {
        return false;
      }
      const worker = store.getWorker(approval.workerId);
      if (!worker) {
        return false;
      }
      if (worker.runtime === "remote") {
        const resolution: SuperRemoteApprovalResolution | { decision: "expired" } =
          resolveParams.decision === "deny"
            ? {
                decision: "denied",
                behavior: "deny",
                message: resolveParams.feedback ?? resolveParams.note ?? "Denied by coordinator.",
              }
            : {
                decision: "approved",
                behavior: resolveParams.decision === "allow-always" ? "allow_always" : "allow_once",
                message: resolveParams.feedback ?? resolveParams.note,
                updatedInput: resolveParams.paramsOverride,
              };
        appendMailboxAuditRecord({
          store,
          recipientSessionKey: approval.controllerSessionKey,
          senderSessionKey: resolveParams.resolvedBySessionKey ?? approval.controllerSessionKey,
          workerId: approval.workerId,
          kind: "approval_decision",
          text: buildApprovalDecisionText({
            kind: approval.kind,
            decision: resolveParams.decision,
            sessionKey: approval.childSessionKey,
          }),
          payload: {
            approvalId: approval.approvalId,
            requestId: approval.requestId,
            decision: resolveParams.decision,
            remote: true,
          },
        });
        return (
          (await remoteSessionManager?.resolveApproval({
            workerId: worker.workerId,
            requestId: approval.requestId,
            resolution,
          })) ?? false
        );
      }
      await callGateway({
        method: approval.kind === "exec" ? "exec.approval.resolve" : "plugin.approval.resolve",
        params: {
          id: approval.requestId,
          decision: resolveParams.decision,
          ...(approval.kind === "exec" && typeof resolveParams.command === "string"
            ? { command: resolveParams.command }
            : {}),
          ...(approval.kind === "exec" && Object.hasOwn(resolveParams, "cwd")
            ? { cwd: resolveParams.cwd ?? null }
            : {}),
          ...(approval.kind === "exec" && typeof resolveParams.feedback === "string"
            ? { feedback: resolveParams.feedback }
            : {}),
          ...(approval.kind === "plugin" && resolveParams.paramsOverride
            ? { paramsOverride: resolveParams.paramsOverride }
            : {}),
          ...(approval.kind === "plugin" && typeof resolveParams.feedback === "string"
            ? { feedback: resolveParams.feedback }
            : {}),
        },
        timeoutMs: 10_000,
      });
      appendMailboxAuditRecord({
        store,
        recipientSessionKey: approval.controllerSessionKey,
        senderSessionKey: resolveParams.resolvedBySessionKey ?? approval.controllerSessionKey,
        workerId: approval.workerId,
        kind: "approval_decision",
        text: buildApprovalDecisionText({
          kind: approval.kind,
          decision: resolveParams.decision,
          sessionKey: approval.childSessionKey,
        }),
        payload: {
          approvalId: approval.approvalId,
          requestId: approval.requestId,
          decision: resolveParams.decision,
          status: mapApprovalDecisionStatus(resolveParams.decision),
          resolvedBySessionKey: resolveParams.resolvedBySessionKey ?? approval.controllerSessionKey,
          note: resolveParams.note,
          ...(typeof resolveParams.command === "string" ? { command: resolveParams.command } : {}),
          ...(Object.hasOwn(resolveParams, "cwd") ? { cwd: resolveParams.cwd ?? null } : {}),
          ...(resolveParams.paramsOverride ? { paramsOverride: resolveParams.paramsOverride } : {}),
          ...(typeof resolveParams.feedback === "string"
            ? { feedback: resolveParams.feedback }
            : {}),
        },
      });
      return true;
    },

    async recordApprovalRequested(approvalParams) {
      const worker = approvalParams.sessionKey
        ? store.findWorkerByChildSessionKey(approvalParams.sessionKey)
        : undefined;
      if (!worker) {
        return;
      }
      const approvalRecord: OrchestrationApprovalRecord = {
        approvalId: buildApprovalRecordId(approvalParams.kind, approvalParams.requestId),
        requestId: approvalParams.requestId,
        kind: approvalParams.kind,
        workerId: worker.workerId,
        controllerSessionKey: worker.controllerSessionKey,
        childSessionKey: worker.childSessionKey,
        createdAt: Date.now(),
        status: "requested",
        requestPayload: approvalParams.payload,
        history: [
          createApprovalHistoryEntry({ status: "requested", payload: approvalParams.payload }),
        ],
      };
      store.upsertApproval(approvalRecord);
      getActiveSuperNotificationCenter()?.publish({
        kind: "approval_requested",
        title: `Worker ${approvalParams.kind} approval requested`,
        message: buildApprovalText({
          kind: approvalParams.kind,
          action: "requested",
          sessionKey: worker.childSessionKey,
        }),
        sessionKey: worker.controllerSessionKey,
        metadata: {
          requestId: approvalParams.requestId,
          workerId: worker.workerId,
        },
      });
      queueMailboxMessage({
        store,
        recipientSessionKey: worker.controllerSessionKey,
        senderSessionKey: worker.childSessionKey,
        workerId: worker.workerId,
        kind: "approval_requested",
        text: buildApprovalText({
          kind: approvalParams.kind,
          action: "requested",
          sessionKey: worker.childSessionKey,
        }),
        payload: {
          requestId: approvalParams.requestId,
          ...approvalParams.payload,
        },
      });
      drainMailboxForSession({
        store,
        recipientSessionKey: worker.controllerSessionKey,
      });
    },

    async recordApprovalResolved(approvalParams) {
      const worker = approvalParams.sessionKey
        ? store.findWorkerByChildSessionKey(approvalParams.sessionKey)
        : undefined;
      if (!worker) {
        return;
      }
      const approvalId = buildApprovalRecordId(approvalParams.kind, approvalParams.requestId);
      const existing = store.listApprovals().find((record) => record.approvalId === approvalId);
      store.upsertApproval({
        approvalId,
        requestId: approvalParams.requestId,
        kind: approvalParams.kind,
        workerId: worker.workerId,
        controllerSessionKey: worker.controllerSessionKey,
        childSessionKey: worker.childSessionKey,
        createdAt: existing?.createdAt ?? Date.now(),
        resolvedAt: Date.now(),
        status: approvalParams.status,
        requestPayload: existing?.requestPayload,
        resolutionPayload: approvalParams.payload,
        history: [
          ...(existing?.history ?? []),
          createApprovalHistoryEntry({
            status: approvalParams.status,
            payload: approvalParams.payload,
          }),
        ],
      });
      queueMailboxMessage({
        store,
        recipientSessionKey: worker.controllerSessionKey,
        senderSessionKey: worker.childSessionKey,
        workerId: worker.workerId,
        kind: "approval_resolved",
        text: buildApprovalText({
          kind: approvalParams.kind,
          action: "resolved",
          sessionKey: worker.childSessionKey,
          status: approvalParams.status,
        }),
        payload: {
          requestId: approvalParams.requestId,
          status: approvalParams.status,
          ...approvalParams.payload,
        },
      });
      drainMailboxForSession({
        store,
        recipientSessionKey: worker.controllerSessionKey,
      });
    },

    stop() {
      stopped = true;
      configureTaskRegistryRuntime({ hooks: previousHooks });
      if (activeRuntime === runtime) {
        activeRuntime = null;
      }
    },
  };

  activeRuntime = runtime;
  for (const worker of store.listWorkers()) {
    if (worker.state === "launching" && !worker.taskId && !worker.runId) {
      store.patchWorker(worker.workerId, {
        state: "queued",
        updatedAt: Date.now(),
      });
    }
  }
  const controllers = new Set(store.listWorkers().map((worker) => worker.controllerSessionKey));
  for (const controllerSessionKey of controllers) {
    drainMailboxForSession({
      store,
      recipientSessionKey: controllerSessionKey,
    });
    void processQueue(controllerSessionKey);
  }
  return runtime;
}
