import type { DeliveryContext } from "../utils/delivery-context.js";

export type TaskRuntime = "subagent" | "acp" | "remote" | "cli" | "cron";

export type TaskStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "timed_out"
  | "cancelled"
  | "lost";

export type TaskDeliveryStatus =
  | "pending"
  | "delivered"
  | "session_queued"
  | "failed"
  | "parent_missing"
  | "not_applicable";

export type TaskNotifyPolicy = "done_only" | "state_changes" | "silent";

export type TaskTerminalOutcome = "succeeded" | "blocked";
export type TaskScopeKind = "session" | "system";
export type TaskExecutionRole = "lead" | "worker" | "subagent" | "remote_peer";
export type TaskWorkerBackend = "in_process" | "out_of_process" | "remote_peer";
export type TaskExecutionEnvironmentKind = "local" | "remote" | "scheduled_remote" | "computer_use";
export type TaskQueueState = "queued" | "launching" | "running" | "refused" | "terminal";
export type TaskNotificationMode = "direct" | "mailbox";
export type TaskQueueDrainPolicy = "oldest_first";

export type TaskLaunchRequest = {
  backend: TaskWorkerBackend;
  mode?: "run" | "session";
  model?: string;
  thinking?: string;
  parentBudget?: number;
  childBudget?: number;
  budgetUsed?: number;
  spawnCount?: number;
  concurrencySlot?: number;
  queueDrainPolicy?: TaskQueueDrainPolicy;
  cleanup?: "delete" | "keep";
  thread?: boolean;
  sandbox?: "inherit" | "require";
  streamTo?: "parent";
  requesterAgentIdOverride?: string;
  resumeSessionId?: string;
  workspaceDir?: string;
};

export type TaskOrchestrationMetadata = {
  executionRole?: TaskExecutionRole;
  workerBackend?: TaskWorkerBackend;
  environmentKind?: TaskExecutionEnvironmentKind;
  controllerSessionKey?: string;
  queueState?: TaskQueueState;
  notificationMode?: TaskNotificationMode;
  stableWorkerId?: string;
  queueDelayMs?: number;
  parentBudget?: number;
  childBudget?: number;
  budgetUsed?: number;
  spawnCount?: number;
  concurrencySlot?: number;
  queueDrainPolicy?: TaskQueueDrainPolicy;
  refusalReason?: string;
  toolCount?: number;
  lastHeartbeatAt?: number;
  lastActivityAt?: number;
  launchRequest?: TaskLaunchRequest;
};

export type TaskStatusCounts = Record<TaskStatus, number>;
export type TaskRuntimeCounts = Record<TaskRuntime, number>;

export type TaskRegistrySummary = {
  total: number;
  active: number;
  terminal: number;
  failures: number;
  byStatus: TaskStatusCounts;
  byRuntime: TaskRuntimeCounts;
};

export type TaskEventKind = TaskStatus | "progress";

export type TaskEventRecord = {
  at: number;
  kind: TaskEventKind;
  summary?: string;
};

export type TaskDeliveryState = {
  taskId: string;
  requesterOrigin?: DeliveryContext;
  lastNotifiedEventAt?: number;
};

export type TaskRecord = {
  taskId: string;
  runtime: TaskRuntime;
  sourceId?: string;
  requesterSessionKey: string;
  ownerKey: string;
  scopeKind: TaskScopeKind;
  childSessionKey?: string;
  parentTaskId?: string;
  agentId?: string;
  runId?: string;
  label?: string;
  task: string;
  status: TaskStatus;
  deliveryStatus: TaskDeliveryStatus;
  notifyPolicy: TaskNotifyPolicy;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  lastEventAt?: number;
  cleanupAfter?: number;
  error?: string;
  progressSummary?: string;
  terminalSummary?: string;
  terminalOutcome?: TaskTerminalOutcome;
  orchestration?: TaskOrchestrationMetadata;
};

export type TaskRegistrySnapshot = {
  tasks: TaskRecord[];
  deliveryStates: TaskDeliveryState[];
};
