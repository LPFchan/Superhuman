import crypto from "node:crypto";
import { spawnAcpDirect } from "../agents/acp-spawn.js";
import { spawnSubagentDirect } from "../agents/subagent-spawn.js";
import type { OpenClawConfig } from "../config/config.js";
import { callGateway } from "../gateway/call.js";
import { requestHeartbeatNow } from "../infra/heartbeat-wake.js";
import { enqueueSystemEvent } from "../infra/system-events.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { findTaskByRunId, patchTaskById } from "../tasks/runtime-internal.js";
import { formatTaskTerminalMessage, isTerminalTaskStatus } from "../tasks/task-executor-policy.js";
import {
  configureTaskRegistryRuntime,
  getTaskRegistryHooks,
  type TaskRegistryHookEvent,
} from "../tasks/task-registry.store.js";
import type { TaskRecord } from "../tasks/task-registry.types.js";
import {
  createSuperOrchestrationStore,
  type OrchestrationApprovalRecord,
  type OrchestrationMailboxMessageKind,
  type OrchestrationStore,
  type OrchestrationWorkerRecord,
} from "./super-orchestration-store.js";

const log = createSubsystemLogger("superhuman/orchestration");

export type LaunchWorkerParams = {
  runtime: "subagent" | "acp";
  controllerSessionKey: string;
  requesterSessionKey: string;
  task: string;
  label?: string;
  mode?: "run" | "session";
  agentId?: string;
  model?: string;
  thinking?: string;
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
  launchWorker: (params: LaunchWorkerParams) => Promise<OrchestrationWorkerRecord>;
  getWorker: (workerId: string) => OrchestrationWorkerRecord | undefined;
  listWorkers: () => OrchestrationWorkerRecord[];
  sendWorkerFollowUp: (params: {
    workerId: string;
    message: string;
    interrupt?: boolean;
  }) => Promise<boolean>;
  interruptWorker: (workerId: string) => Promise<boolean>;
  stopWorker: (workerId: string) => Promise<boolean>;
  waitForWorkerTerminal: (params: { workerId: string; timeoutMs?: number }) => Promise<boolean>;
  listMailboxMessages: (
    recipientSessionKey?: string,
  ) => ReturnType<OrchestrationStore["listMailbox"]>;
  recordApprovalRequested: (params: ApprovalMirrorRequestedParams) => Promise<void>;
  recordApprovalResolved: (params: ApprovalMirrorResolvedParams) => Promise<void>;
  stop: () => void;
};

let activeRuntime: OrchestrationRuntime | null = null;

function resolveWorkerBackend(
  runtime: LaunchWorkerParams["runtime"],
): "in_process" | "out_of_process" {
  return runtime === "acp" ? "out_of_process" : "in_process";
}

function isActiveWorkerState(state: OrchestrationWorkerRecord["state"]): boolean {
  return state === "launching" || state === "running";
}

function buildStartedMessage(worker: OrchestrationWorkerRecord): string {
  const label = worker.label?.trim() || worker.task.trim() || "Worker task";
  return `Worker started: ${label}.`;
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

function buildApprovalRecordId(kind: "exec" | "plugin", requestId: string): string {
  return `${kind}:${requestId}`;
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
  const deliveredAt = Date.now();
  const message = params.store.appendMailbox({
    recipientSessionKey: params.recipientSessionKey,
    senderSessionKey: params.senderSessionKey,
    workerId: params.workerId,
    kind: params.kind,
    text: params.text,
    payload: params.payload,
    deliveryStatus: "session_queued",
    deliveredAt,
  });
  enqueueSystemEvent(params.text, {
    sessionKey: params.recipientSessionKey,
    contextKey: `mailbox:${message.messageId}`,
  });
  requestHeartbeatNow({
    reason: "worker-mailbox",
    sessionKey: params.recipientSessionKey,
  });
  return message;
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
  return (
    params.store.patchWorker(params.worker.workerId, {
      taskId: params.task.taskId,
      childSessionKey: params.task.childSessionKey,
      runId: params.task.runId,
      taskStatus: params.task.status,
      state: isTerminalTaskStatus(params.task.status) ? "terminal" : "running",
      updatedAt: Date.now(),
    }) ?? params.worker
  );
}

export function getActiveSuperOrchestrationRuntime(): OrchestrationRuntime | null {
  return activeRuntime;
}

export function startSuperOrchestrationRuntime(params: {
  cfg: OpenClawConfig;
  workspaceDir: string;
}): OrchestrationRuntime {
  const store = createSuperOrchestrationStore({ workspaceDir: params.workspaceDir });
  const previousHooks = getTaskRegistryHooks();
  let stopped = false;
  const launchPromises = new Map<string, Promise<void>>();

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
    if (isTerminalTaskStatus(task.status) && worker.state !== "terminal") {
      queueMailboxMessage({
        store,
        recipientSessionKey: controllerSessionKey,
        senderSessionKey: task.childSessionKey,
        workerId,
        kind: "worker_terminal",
        text: formatTaskTerminalMessage(task),
        payload: {
          taskId: task.taskId,
          runId: task.runId,
          status: task.status,
          terminalOutcome: task.terminalOutcome,
          summary: task.terminalSummary,
          error: task.error,
        },
      });
      void processQueue(controllerSessionKey);
      return;
    }
    if (task.status === "running" && worker.state !== "running") {
      queueMailboxMessage({
        store,
        recipientSessionKey: controllerSessionKey,
        senderSessionKey: task.childSessionKey,
        workerId,
        kind: "worker_started",
        text: buildStartedMessage(updatedWorker),
        payload: {
          taskId: task.taskId,
          runId: task.runId,
          childSessionKey: task.childSessionKey,
        },
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

  const processQueue = async (controllerSessionKey: string): Promise<void> => {
    const trimmed = controllerSessionKey.trim();
    if (!trimmed || stopped) {
      return;
    }
    const maxChildren = params.cfg.agents?.defaults?.subagents?.maxChildrenPerAgent ?? 5;
    let activeCount = countActiveWorkersForController(trimmed);
    const queuedWorkers = store
      .listWorkers()
      .filter((worker) => worker.controllerSessionKey === trimmed && worker.state === "queued")
      .toSorted((left, right) => left.createdAt - right.createdAt);
    for (const worker of queuedWorkers) {
      if (activeCount >= maxChildren) {
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
    const current = store.patchWorker(worker.workerId, {
      state: "launching",
      updatedAt: Date.now(),
    });
    if (!current) {
      return;
    }
    await markLeadSession(current.controllerSessionKey);
    try {
      const launchRequest = current.launchRequest;
      const result =
        current.runtime === "acp"
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
        store.patchWorker(current.workerId, {
          state: "refused",
          updatedAt: Date.now(),
          lastError: result.error,
          childSessionKey: result.childSessionKey,
          runId: result.runId,
        });
        queueMailboxMessage({
          store,
          recipientSessionKey: current.controllerSessionKey,
          senderSessionKey: result.childSessionKey,
          workerId: current.workerId,
          kind: "worker_terminal",
          text: result.error ? `Worker launch failed: ${result.error}` : "Worker launch failed.",
          payload: {
            status: result.status,
            error: result.error,
            childSessionKey: result.childSessionKey,
            runId: result.runId,
          },
        });
        return;
      }

      const runId = result.runId?.trim();
      const task = runId ? findTaskByRunId(runId) : undefined;
      if (task) {
        patchTaskById({
          taskId: task.taskId,
          patch: {
            orchestration: {
              executionRole: current.runtime === "acp" ? "worker" : "subagent",
              workerBackend: current.backend,
              controllerSessionKey: current.controllerSessionKey,
              queueState: "running",
              notificationMode: "mailbox",
              stableWorkerId: current.workerId,
              queueDelayMs: Date.now() - current.createdAt,
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
        ...(task
          ? {
              taskId: task.taskId,
              taskStatus: task.status,
            }
          : {}),
      });
      if (!task && patchedWorker) {
        queueMailboxMessage({
          store,
          recipientSessionKey: patchedWorker.controllerSessionKey,
          senderSessionKey: patchedWorker.childSessionKey,
          workerId: patchedWorker.workerId,
          kind: "worker_started",
          text: buildStartedMessage(patchedWorker),
          payload: {
            childSessionKey: patchedWorker.childSessionKey,
            runId: patchedWorker.runId,
          },
        });
      }
    } catch (error) {
      log.warn("Worker launch failed", { error, workerId: current.workerId });
      store.patchWorker(current.workerId, {
        state: "refused",
        updatedAt: Date.now(),
        lastError: error instanceof Error ? error.message : String(error),
      });
      queueMailboxMessage({
        store,
        recipientSessionKey: current.controllerSessionKey,
        workerId: current.workerId,
        kind: "worker_terminal",
        text: `Worker launch failed: ${error instanceof Error ? error.message : String(error)}`,
        payload: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      void processQueue(current.controllerSessionKey);
    }
  };

  const runtime: OrchestrationRuntime = {
    async launchWorker(launchParams) {
      const workerId = crypto.randomUUID();
      const now = Date.now();
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
        launchRequest: {
          agentId: launchParams.agentId,
          model: launchParams.model,
          thinking: launchParams.thinking,
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
          mode: launchParams.mode ?? (launchParams.thread ? "session" : "run"),
        },
      };
      const saved = store.upsertWorker(record);
      await markLeadSession(saved.controllerSessionKey);
      void processQueue(saved.controllerSessionKey);
      return saved;
    },

    getWorker(workerId) {
      return store.getWorker(workerId);
    },

    listWorkers() {
      return store.listWorkers();
    },

    async sendWorkerFollowUp(params) {
      const worker = store.getWorker(params.workerId);
      const childSessionKey = worker?.childSessionKey?.trim();
      if (!worker || !childSessionKey) {
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

    async interruptWorker(workerId) {
      const worker = store.getWorker(workerId);
      const childSessionKey = worker?.childSessionKey?.trim();
      if (!worker || !childSessionKey) {
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
      return await runtime.interruptWorker(workerId);
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
      };
      store.upsertApproval(approvalRecord);
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
    void processQueue(controllerSessionKey);
  }
  return runtime;
}
