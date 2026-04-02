import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { CronService } from "../cron/service.js";
import type { CronJob } from "../cron/types.js";
import { requestHeartbeatNow } from "../infra/heartbeat-wake.js";
import { enqueueSystemEvent } from "../infra/system-events.js";
import { createTrustedStateAutomationPolicy } from "./super-automation-policy.js";
import {
  getActiveSuperNotificationCenter,
  type SuperNotificationCenter,
} from "./super-notification-center.js";
import type {
  ExecutionEnvironmentRegistry,
  SessionRegistry,
  StateStore,
  SuperExecutionEnvironmentSnapshot,
  SuperShellCapabilityMode,
} from "./super-runtime-seams.js";
import { resolveSuperhumanStateDir } from "./super-state-store.js";

export type SuperRemoteScheduleRecord = {
  jobId: string;
  name: string;
  schedule: string;
  scheduleTimezone: string;
  sessionKey?: string;
  executionEnvironmentId?: string;
  repoRoot?: string;
  prompt: string;
  model?: string;
  connectorIds: string[];
  pluginIds: string[];
  requiredCapabilities: SuperShellCapabilityMode[];
  capabilityAuthority: "scheduled_remote_only" | "allow_local_fallback";
  status: "active" | "paused";
  cronJobId?: string;
  nextRunAtMs?: number;
  createdAt: number;
  updatedAt: number;
  lastRunAt?: number;
  lastBlockedAt?: number;
  lastBlockedCode?:
    | "paused"
    | "missing_execution_environment"
    | "invalid_execution_environment"
    | "missing_capabilities";
  lastBlockedReason?: string;
  lastResolvedEnvironmentId?: string;
  lastResolvedEnvironmentKind?: SuperExecutionEnvironmentSnapshot["kind"];
};

type RemoteScheduleStoreSnapshot = {
  version: 1;
  jobs: SuperRemoteScheduleRecord[];
};

export type SuperRemoteScheduleRuntime = {
  upsertJob: (
    job: Omit<SuperRemoteScheduleRecord, "createdAt" | "updatedAt">,
  ) => Promise<SuperRemoteScheduleRecord>;
  listJobs: () => SuperRemoteScheduleRecord[];
  runJob: (params: { jobId: string }) => {
    status: "queued" | "blocked" | "missing";
    sessionKey?: string;
    code?:
      | "paused"
      | "missing_execution_environment"
      | "invalid_execution_environment"
      | "missing_capabilities";
    reason?: string;
    environmentId?: string;
    environmentKind?: SuperExecutionEnvironmentSnapshot["kind"];
    capabilityMode?: SuperExecutionEnvironmentSnapshot["capabilityMode"];
    missingCapabilities?: SuperShellCapabilityMode[];
  };
  stop: () => void;
};

const STORE_FILE_MODE = 0o600;
const STORE_DIR_MODE = 0o700;

function resolveStorePath(workspaceDir: string): string {
  return path.join(resolveSuperhumanStateDir(workspaceDir), "remote-schedules.json");
}

function loadSnapshot(storePath: string): RemoteScheduleStoreSnapshot {
  if (!fs.existsSync(storePath)) {
    return { version: 1, jobs: [] };
  }
  try {
    const parsed = JSON.parse(
      fs.readFileSync(storePath, "utf8"),
    ) as Partial<RemoteScheduleStoreSnapshot>;
    return {
      version: 1,
      jobs: Array.isArray(parsed.jobs)
        ? parsed.jobs.filter(Boolean).map((record) => ({
            ...record,
            connectorIds: Array.isArray(record.connectorIds) ? [...record.connectorIds] : [],
            pluginIds: Array.isArray(record.pluginIds) ? [...record.pluginIds] : [],
            requiredCapabilities: Array.isArray(record.requiredCapabilities)
              ? [...record.requiredCapabilities]
              : [],
            scheduleTimezone:
              typeof record.scheduleTimezone === "string" && record.scheduleTimezone.trim()
                ? record.scheduleTimezone.trim()
                : "UTC",
            capabilityAuthority:
              record.capabilityAuthority === "allow_local_fallback"
                ? "allow_local_fallback"
                : "scheduled_remote_only",
          }))
        : [],
    };
  } catch {
    return { version: 1, jobs: [] };
  }
}

function persistSnapshot(storePath: string, snapshot: RemoteScheduleStoreSnapshot): void {
  const dir = path.dirname(storePath);
  fs.mkdirSync(dir, { recursive: true, mode: STORE_DIR_MODE });
  fs.chmodSync(dir, STORE_DIR_MODE);
  const tempPath = `${storePath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), { mode: STORE_FILE_MODE });
  fs.renameSync(tempPath, storePath);
  fs.chmodSync(storePath, STORE_FILE_MODE);
}

function supportsCapability(
  required: SuperShellCapabilityMode,
  environment: SuperExecutionEnvironmentSnapshot,
): boolean {
  switch (required) {
    case "semantic_rename":
      return environment.capabilities.supportsSemanticRename;
    case "symbol_references":
      return environment.capabilities.supportsSymbolReferences;
    case "workspace_search_only":
      return environment.capabilities.supportsWorkspaceSearchFallback;
    default:
      return false;
  }
}

function buildJobMessage(
  job: SuperRemoteScheduleRecord,
  sessionKey: string,
  resolvedEnvironment?: SuperExecutionEnvironmentSnapshot,
  usedLocalFallback?: boolean,
): string {
  return [
    "<super-remote-scheduled-run>",
    `job_id: ${job.jobId}`,
    `name: ${job.name}`,
    `session_key: ${sessionKey}`,
    "trigger_source: remote_schedule",
    `schedule_expr: ${job.schedule}`,
    `schedule_timezone: ${job.scheduleTimezone}`,
    `capability_authority: ${job.capabilityAuthority}`,
    ...(job.executionEnvironmentId
      ? [`execution_environment_id: ${job.executionEnvironmentId}`]
      : []),
    ...(resolvedEnvironment
      ? [`resolved_environment_id: ${resolvedEnvironment.environmentId}`]
      : []),
    ...(resolvedEnvironment ? [`resolved_environment_kind: ${resolvedEnvironment.kind}`] : []),
    ...(resolvedEnvironment
      ? [`resolved_capability_mode: ${resolvedEnvironment.capabilityMode}`]
      : []),
    ...(typeof usedLocalFallback === "boolean"
      ? [`used_local_fallback: ${usedLocalFallback ? "true" : "false"}`]
      : []),
    ...(job.repoRoot ? [`repo_root: ${job.repoRoot}`] : []),
    ...(job.model ? [`model: ${job.model}`] : []),
    ...(job.connectorIds.length > 0 ? [`connector_ids: ${job.connectorIds.join(",")}`] : []),
    ...(job.pluginIds.length > 0 ? [`plugin_ids: ${job.pluginIds.join(",")}`] : []),
    ...(job.requiredCapabilities.length > 0
      ? [`required_capabilities: ${job.requiredCapabilities.join(",")}`]
      : []),
    "instruction: run this remote schedule as a self-contained autonomous task, preserve provenance, and do not attempt semantic operations unless the required capabilities are present.",
    `prompt: ${job.prompt}`,
    "</super-remote-scheduled-run>",
  ].join("\n");
}

function cloneJob(record: SuperRemoteScheduleRecord): SuperRemoteScheduleRecord {
  return {
    ...record,
    connectorIds: [...record.connectorIds],
    pluginIds: [...record.pluginIds],
    requiredCapabilities: [...record.requiredCapabilities],
  };
}

function resolveEnvironmentForJob(params: {
  record: SuperRemoteScheduleRecord;
  sessionKey: string;
  executionEnvironmentRegistry: ExecutionEnvironmentRegistry;
}): {
  environment: SuperExecutionEnvironmentSnapshot;
  usedLocalFallback: boolean;
  invalidReason?: string;
} | null {
  const explicitEnvironmentId = params.record.executionEnvironmentId?.trim();
  if (explicitEnvironmentId) {
    const matched = params.executionEnvironmentRegistry
      .listSnapshots()
      .find((snapshot) => snapshot.environmentId === explicitEnvironmentId);
    if (!matched) {
      return null;
    }
    if (matched.kind !== "scheduled_remote" && matched.kind !== "remote") {
      return {
        environment: matched,
        usedLocalFallback: false,
        invalidReason: `environment ${matched.environmentId} is ${matched.kind}, not a remote execution surface`,
      };
    }
    return {
      environment: matched,
      usedLocalFallback: false,
    };
  }

  const scheduledRemote = params.executionEnvironmentRegistry.getSnapshot({
    sessionKey: params.sessionKey,
    kind: "scheduled_remote",
  });
  if (scheduledRemote) {
    return {
      environment: scheduledRemote,
      usedLocalFallback: false,
    };
  }

  if (params.record.capabilityAuthority === "allow_local_fallback") {
    const local = params.executionEnvironmentRegistry.getSnapshot({
      sessionKey: params.sessionKey,
      kind: "local",
    });
    if (local) {
      return {
        environment: local,
        usedLocalFallback: true,
      };
    }
  }

  return null;
}

function buildCronDescription(job: SuperRemoteScheduleRecord): string {
  const details = [
    job.repoRoot ? `repo=${job.repoRoot}` : undefined,
    `tz=${job.scheduleTimezone}`,
    job.executionEnvironmentId ? `env=${job.executionEnvironmentId}` : undefined,
    job.model ? `model=${job.model}` : undefined,
    job.connectorIds.length > 0 ? `connectors=${job.connectorIds.join(",")}` : undefined,
    job.pluginIds.length > 0 ? `plugins=${job.pluginIds.join(",")}` : undefined,
    job.capabilityAuthority === "allow_local_fallback"
      ? "authority=local-fallback"
      : "authority=remote-only",
  ].filter((entry): entry is string => Boolean(entry));
  return details.length > 0
    ? `Superhuman remote schedule (${details.join(" ")})`
    : "Superhuman remote schedule";
}

async function syncMirroredCronJob(params: {
  cron: CronService;
  record: SuperRemoteScheduleRecord;
  resolvedSessionKey: string;
}): Promise<SuperRemoteScheduleRecord> {
  const existingCronJob = params.record.cronJobId
    ? params.cron.getJob(params.record.cronJobId)
    : undefined;
  const cronPatch = {
    sessionKey: params.resolvedSessionKey,
    name: `Superhuman remote: ${params.record.name}`,
    description: buildCronDescription(params.record),
    enabled: params.record.status === "active",
    schedule: {
      kind: "cron" as const,
      expr: params.record.schedule,
      tz: params.record.scheduleTimezone,
    },
    sessionTarget: "main" as const,
    wakeMode: "now" as const,
    payload: {
      kind: "systemEvent" as const,
      text: buildJobMessage(params.record, params.resolvedSessionKey),
    },
  };
  let cronJob: CronJob;
  if (existingCronJob) {
    cronJob = await params.cron.update(existingCronJob.id, cronPatch);
  } else {
    cronJob = await params.cron.add(cronPatch);
  }
  return {
    ...params.record,
    cronJobId: cronJob.id,
    nextRunAtMs: cronJob.state.nextRunAtMs,
  };
}

export function startSuperRemoteScheduleRuntime(params: {
  workspaceDir: string;
  stateStore: StateStore;
  sessionRegistry: SessionRegistry;
  executionEnvironmentRegistry: ExecutionEnvironmentRegistry;
  notificationCenter?: SuperNotificationCenter;
  cron?: CronService;
}): SuperRemoteScheduleRuntime {
  const storePath = resolveStorePath(params.workspaceDir);
  let snapshot = loadSnapshot(storePath);

  const save = () => {
    persistSnapshot(storePath, snapshot);
  };

  const notify = params.notificationCenter ?? getActiveSuperNotificationCenter();

  const listWithCronState = () =>
    snapshot.jobs.map((record) => {
      const cronJob = record.cronJobId ? params.cron?.getJob(record.cronJobId) : undefined;
      return cloneJob({
        ...record,
        nextRunAtMs: cronJob?.state.nextRunAtMs ?? record.nextRunAtMs,
      });
    });

  const synchronizeSnapshot = async (): Promise<void> => {
    if (!params.cron) {
      return;
    }
    let changed = false;
    const synchronizedJobs: SuperRemoteScheduleRecord[] = [];
    for (const record of snapshot.jobs) {
      const resolvedSessionKey =
        record.sessionKey?.trim() || params.sessionRegistry.resolveMainSession();
      try {
        const nextRecord = await syncMirroredCronJob({
          cron: params.cron,
          record: {
            ...record,
            sessionKey: resolvedSessionKey,
          },
          resolvedSessionKey,
        });
        if (
          nextRecord.cronJobId !== record.cronJobId ||
          nextRecord.nextRunAtMs !== record.nextRunAtMs ||
          nextRecord.sessionKey !== record.sessionKey
        ) {
          changed = true;
        }
        synchronizedJobs.push(nextRecord);
      } catch (error) {
        params.stateStore.appendAutomationEvent({
          eventId: `remote-schedule-sync:${crypto.randomUUID()}`,
          sessionKey: resolvedSessionKey,
          automationKind: "remote_schedule_sync",
          triggerSource: "startup",
          reason: error instanceof Error ? error.message : String(error),
          actionSummary: `Failed to resync mirrored cron job for ${record.name}`,
          resultStatus: "failed",
          ...createTrustedStateAutomationPolicy({
            policySummary:
              "Remote schedule startup resync relies on trusted persisted scheduler state and does not itself assert that any queued work was verified.",
            evidenceSources: ["scheduler_state"],
            verificationPosture: "unknown",
          }),
          details: {
            jobId: record.jobId,
            cronJobId: record.cronJobId,
          },
          createdAt: Date.now(),
        });
        synchronizedJobs.push({
          ...record,
          sessionKey: resolvedSessionKey,
        });
      }
    }
    if (changed) {
      snapshot = {
        ...snapshot,
        jobs: synchronizedJobs,
      };
      save();
    }
  };

  // Startup resync is best-effort: remote schedules should stay usable even if
  // the mirrored host cron state needs to be repaired later.
  void synchronizeSnapshot();

  return {
    async upsertJob(job) {
      const now = Date.now();
      const existing = snapshot.jobs.find((record) => record.jobId === job.jobId);
      const resolvedSessionKey =
        job.sessionKey?.trim() || params.sessionRegistry.resolveMainSession();
      const nextBase: SuperRemoteScheduleRecord = {
        ...job,
        sessionKey: resolvedSessionKey,
        scheduleTimezone: job.scheduleTimezone?.trim() || "UTC",
        capabilityAuthority:
          job.capabilityAuthority === "allow_local_fallback"
            ? "allow_local_fallback"
            : "scheduled_remote_only",
        executionEnvironmentId: job.executionEnvironmentId?.trim() || undefined,
        connectorIds: [...job.connectorIds],
        pluginIds: [...job.pluginIds],
        requiredCapabilities: [...job.requiredCapabilities],
        cronJobId: existing?.cronJobId,
        nextRunAtMs: existing?.nextRunAtMs,
        lastBlockedAt: existing?.lastBlockedAt,
        lastBlockedCode: existing?.lastBlockedCode,
        lastBlockedReason: existing?.lastBlockedReason,
        lastResolvedEnvironmentId: existing?.lastResolvedEnvironmentId,
        lastResolvedEnvironmentKind: existing?.lastResolvedEnvironmentKind,
        createdAt: now,
        updatedAt: now,
      };
      const applyNext = (next: SuperRemoteScheduleRecord) => {
        const index = snapshot.jobs.findIndex((record) => record.jobId === job.jobId);
        if (index >= 0) {
          snapshot.jobs[index] = next;
        } else {
          snapshot.jobs.push(next);
        }
        save();
        return cloneJob(next);
      };
      const next = existing
        ? {
            ...nextBase,
            createdAt: existing.createdAt,
          }
        : nextBase;
      params.stateStore.appendAutomationEvent({
        eventId: `remote-schedule-config:${crypto.randomUUID()}`,
        sessionKey: resolvedSessionKey,
        automationKind: "remote_schedule_config",
        triggerSource: "operator",
        reason:
          existing?.status === "paused" && next.status === "active"
            ? "remote schedule resumed"
            : existing?.status === "active" && next.status === "paused"
              ? "remote schedule paused"
              : existing
                ? "remote schedule updated"
                : "remote schedule created",
        actionSummary:
          existing?.status === "paused" && next.status === "active"
            ? `Resumed remote schedule ${next.name}`
            : existing?.status === "active" && next.status === "paused"
              ? `Paused remote schedule ${next.name}`
              : existing
                ? `Updated remote schedule ${next.name}`
                : `Created remote schedule ${next.name}`,
        resultStatus: next.status,
        ...createTrustedStateAutomationPolicy({
          policySummary:
            "Remote schedule configuration is operator-authored metadata; actual remote execution still depends on declared environment authority and capability gating at run time.",
          evidenceSources: ["scheduler_state"],
          verificationPosture: "not_required",
        }),
        details: {
          jobId: next.jobId,
          schedule: next.schedule,
          scheduleTimezone: next.scheduleTimezone,
          executionEnvironmentId: next.executionEnvironmentId,
          capabilityAuthority: next.capabilityAuthority,
          requiredCapabilities: next.requiredCapabilities,
        },
        createdAt: now,
      });
      if (!params.cron) {
        return applyNext(next);
      }
      const synced = await syncMirroredCronJob({
        cron: params.cron,
        record: next,
        resolvedSessionKey,
      });
      return applyNext(synced);
    },

    listJobs() {
      return listWithCronState();
    },

    runJob({ jobId }) {
      const index = snapshot.jobs.findIndex((record) => record.jobId === jobId.trim());
      if (index < 0) {
        return { status: "missing" as const };
      }
      const job = snapshot.jobs[index];
      const sessionKey = job.sessionKey?.trim() || params.sessionRegistry.resolveMainSession();
      const createdAt = Date.now();
      const setBlockedState = (blocked: {
        code:
          | "paused"
          | "missing_execution_environment"
          | "invalid_execution_environment"
          | "missing_capabilities";
        reason: string;
        environmentId?: string;
        environmentKind?: SuperExecutionEnvironmentSnapshot["kind"];
      }) => {
        snapshot.jobs[index] = {
          ...job,
          updatedAt: createdAt,
          lastBlockedAt: createdAt,
          lastBlockedCode: blocked.code,
          lastBlockedReason: blocked.reason,
          lastResolvedEnvironmentId: blocked.environmentId,
          lastResolvedEnvironmentKind: blocked.environmentKind,
        };
        save();
      };
      if (job.status !== "active") {
        setBlockedState({
          code: "paused",
          reason: "job is paused",
        });
        params.stateStore.appendAutomationEvent({
          eventId: `remote-schedule:${crypto.randomUUID()}`,
          sessionKey,
          automationKind: "remote_scheduled_job",
          triggerSource: "remote_schedule",
          reason: "remote schedule is paused",
          actionSummary: `Blocked remote scheduled job ${job.name}`,
          resultStatus: "blocked",
          ...createTrustedStateAutomationPolicy({
            policySummary:
              "Remote scheduled work was blocked by explicit operator pause state before any execution environment was consulted.",
            evidenceSources: ["scheduler_state"],
            verificationPosture: "not_required",
            capabilityPosture: "not_required",
          }),
          details: {
            jobId: job.jobId,
            blockedCode: "paused",
            scheduleTimezone: job.scheduleTimezone,
          },
          createdAt,
        });
        return { status: "blocked" as const, sessionKey, code: "paused", reason: "job is paused" };
      }
      const resolvedEnvironment = resolveEnvironmentForJob({
        record: job,
        sessionKey,
        executionEnvironmentRegistry: params.executionEnvironmentRegistry,
      });
      if (!resolvedEnvironment) {
        const reason = job.executionEnvironmentId
          ? `missing declared execution environment: ${job.executionEnvironmentId}`
          : job.capabilityAuthority === "allow_local_fallback"
            ? "missing declared remote environment and no local fallback environment was available"
            : "missing declared scheduled remote environment";
        setBlockedState({
          code: "missing_execution_environment",
          reason,
        });
        params.stateStore.appendAutomationEvent({
          eventId: `remote-schedule:${crypto.randomUUID()}`,
          sessionKey,
          automationKind: "remote_scheduled_job",
          triggerSource: "remote_schedule",
          reason: "scheduled remote execution environment was not available",
          actionSummary: `Blocked remote scheduled job ${job.name}`,
          resultStatus: "blocked",
          ...createTrustedStateAutomationPolicy({
            policySummary:
              "Remote scheduled work was blocked because the declared execution authority could not be resolved to an available remote execution surface.",
            evidenceSources: ["scheduler_state"],
            verificationPosture: "unknown",
            capabilityPosture: "blocked",
          }),
          details: {
            jobId: job.jobId,
            blockedCode: "missing_execution_environment",
            missingEnvironmentKind: "scheduled_remote",
            executionEnvironmentId: job.executionEnvironmentId,
            capabilityAuthority: job.capabilityAuthority,
            scheduleTimezone: job.scheduleTimezone,
          },
          createdAt,
        });
        notify?.publish({
          kind: "remote_run_failed",
          title: `Remote run blocked: ${job.name}`,
          message: reason,
          sessionKey,
          audit: createTrustedStateAutomationPolicy({
            policySummary:
              "This failure notification exists because scheduled remote capability truth must be declared through explicit execution-environment authority rather than inferred from ambient local state.",
            evidenceSources: ["scheduler_state"],
            verificationPosture: "unknown",
            capabilityPosture: "blocked",
          }),
          metadata: {
            jobId: job.jobId,
            missingEnvironmentKind: "scheduled_remote",
            blockedCode: "missing_execution_environment",
            executionEnvironmentId: job.executionEnvironmentId,
            capabilityAuthority: job.capabilityAuthority,
          },
        });
        return {
          status: "blocked",
          sessionKey,
          code: "missing_execution_environment",
          reason,
        };
      }
      const environment = resolvedEnvironment.environment;
      if (resolvedEnvironment.invalidReason) {
        setBlockedState({
          code: "invalid_execution_environment",
          reason: resolvedEnvironment.invalidReason,
          environmentId: environment.environmentId,
          environmentKind: environment.kind,
        });
        params.stateStore.appendAutomationEvent({
          eventId: `remote-schedule:${crypto.randomUUID()}`,
          sessionKey,
          automationKind: "remote_scheduled_job",
          triggerSource: "remote_schedule",
          reason: "declared execution environment was invalid",
          actionSummary: `Blocked remote scheduled job ${job.name}`,
          resultStatus: "blocked",
          ...createTrustedStateAutomationPolicy({
            policySummary:
              "Remote scheduled work was blocked because the operator-targeted execution environment resolved to a non-remote surface and therefore could not be trusted as scheduled-remote authority.",
            evidenceSources: ["scheduler_state", "runtime_state"],
            verificationPosture: "unknown",
            capabilityPosture: "blocked",
            capabilityMode: environment.capabilityMode,
          }),
          details: {
            jobId: job.jobId,
            blockedCode: "invalid_execution_environment",
            executionEnvironmentId: job.executionEnvironmentId,
            resolvedEnvironmentId: environment.environmentId,
            resolvedEnvironmentKind: environment.kind,
          },
          createdAt,
        });
        notify?.publish({
          kind: "remote_run_failed",
          title: `Remote run blocked: ${job.name}`,
          message: resolvedEnvironment.invalidReason,
          sessionKey,
          audit: createTrustedStateAutomationPolicy({
            policySummary:
              "This failure notification exists because remote schedules must target an explicitly remote execution surface when an environment id is declared.",
            evidenceSources: ["scheduler_state", "runtime_state"],
            verificationPosture: "unknown",
            capabilityPosture: "blocked",
            capabilityMode: environment.capabilityMode,
          }),
          metadata: {
            jobId: job.jobId,
            blockedCode: "invalid_execution_environment",
            executionEnvironmentId: job.executionEnvironmentId,
            resolvedEnvironmentId: environment.environmentId,
            resolvedEnvironmentKind: environment.kind,
          },
        });
        return {
          status: "blocked",
          sessionKey,
          code: "invalid_execution_environment",
          reason: resolvedEnvironment.invalidReason,
          environmentId: environment.environmentId,
          environmentKind: environment.kind,
          capabilityMode: environment.capabilityMode,
        };
      }
      const missingCapabilities = job.requiredCapabilities.filter(
        (required) => !supportsCapability(required, environment),
      );
      if (missingCapabilities.length > 0) {
        const reason = `missing capabilities: ${missingCapabilities.join(", ")}`;
        setBlockedState({
          code: "missing_capabilities",
          reason,
          environmentId: environment.environmentId,
          environmentKind: environment.kind,
        });
        params.stateStore.appendAutomationEvent({
          eventId: `remote-schedule:${crypto.randomUUID()}`,
          sessionKey,
          automationKind: "remote_scheduled_job",
          triggerSource: "remote_schedule",
          reason: "required capabilities unavailable",
          actionSummary: `Blocked remote scheduled job ${job.name}`,
          resultStatus: "blocked",
          ...createTrustedStateAutomationPolicy({
            policySummary:
              "Remote scheduled work was blocked because required semantic capabilities were not present in the declared execution environment.",
            evidenceSources: ["scheduler_state", "runtime_state"],
            verificationPosture: "unknown",
            capabilityPosture: "blocked",
            capabilityMode: environment.capabilityMode,
          }),
          details: {
            jobId: job.jobId,
            missingCapabilities,
            capabilityMode: environment.capabilityMode,
            blockedCode: "missing_capabilities",
            executionEnvironmentId: environment.environmentId,
            executionEnvironmentKind: environment.kind,
            usedLocalFallback: resolvedEnvironment.usedLocalFallback,
          },
          createdAt,
        });
        notify?.publish({
          kind: "remote_run_failed",
          title: `Remote run blocked: ${job.name}`,
          message: `Missing required capabilities: ${missingCapabilities.join(", ")}.`,
          sessionKey,
          audit: createTrustedStateAutomationPolicy({
            policySummary:
              "This failure notification exists because the remote environment could not satisfy the declared capability requirements for the scheduled task.",
            evidenceSources: ["scheduler_state", "runtime_state"],
            verificationPosture: "unknown",
            capabilityPosture: "blocked",
            capabilityMode: environment.capabilityMode,
          }),
          metadata: {
            jobId: job.jobId,
            missingCapabilities,
            blockedCode: "missing_capabilities",
            executionEnvironmentId: environment.environmentId,
            executionEnvironmentKind: environment.kind,
            usedLocalFallback: resolvedEnvironment.usedLocalFallback,
          },
        });
        return {
          status: "blocked" as const,
          sessionKey,
          code: "missing_capabilities",
          reason,
          environmentId: environment.environmentId,
          environmentKind: environment.kind,
          capabilityMode: environment.capabilityMode,
          missingCapabilities,
        };
      }
      enqueueSystemEvent(
        buildJobMessage(job, sessionKey, environment, resolvedEnvironment.usedLocalFallback),
        {
          sessionKey,
          contextKey: `super-remote-schedule:${job.jobId}:${createdAt}`,
          trusted: true,
        },
      );
      requestHeartbeatNow({
        reason: "super-remote-schedule",
        sessionKey,
      });
      snapshot.jobs[index] = {
        ...job,
        updatedAt: createdAt,
        lastRunAt: createdAt,
        lastBlockedAt: undefined,
        lastBlockedCode: undefined,
        lastBlockedReason: undefined,
        lastResolvedEnvironmentId: environment.environmentId,
        lastResolvedEnvironmentKind: environment.kind,
        nextRunAtMs: job.nextRunAtMs,
      };
      save();
      params.stateStore.appendAutomationEvent({
        eventId: `remote-schedule:${crypto.randomUUID()}`,
        sessionKey,
        automationKind: "remote_scheduled_job",
        triggerSource: "remote_schedule",
        reason: "remote schedule fired",
        actionSummary: `Queued remote scheduled job ${job.name}`,
        resultStatus: "queued",
        ...createTrustedStateAutomationPolicy({
          policySummary:
            "Remote scheduled work was queued from durable scheduler state after capability checks passed; the remote run must still apply its own verification and evidence-quality gates.",
          evidenceSources: ["scheduler_state", "runtime_state"],
          verificationPosture: "unknown",
          capabilityPosture: job.requiredCapabilities.length > 0 ? "satisfied" : "not_required",
          capabilityMode: environment.capabilityMode,
        }),
        details: {
          jobId: job.jobId,
          repoRoot: job.repoRoot,
          model: job.model,
          connectorIds: job.connectorIds,
          pluginIds: job.pluginIds,
          requiredCapabilities: job.requiredCapabilities,
          cronJobId: job.cronJobId,
          nextRunAtMs: job.nextRunAtMs,
          scheduleTimezone: job.scheduleTimezone,
          capabilityAuthority: job.capabilityAuthority,
          executionEnvironmentId: environment.environmentId,
          executionEnvironmentKind: environment.kind,
          usedLocalFallback: resolvedEnvironment.usedLocalFallback,
        },
        createdAt,
      });
      notify?.publish({
        kind: "scheduled_run_fired",
        title: `Scheduled run fired: ${job.name}`,
        message: `Queued remote scheduled job ${job.jobId}.`,
        sessionKey,
        audit: createTrustedStateAutomationPolicy({
          policySummary:
            "This notification reflects a remote schedule that passed environment capability checks and was queued from durable scheduler state.",
          evidenceSources: ["scheduler_state", "runtime_state"],
          verificationPosture: "unknown",
          capabilityPosture: job.requiredCapabilities.length > 0 ? "satisfied" : "not_required",
          capabilityMode: environment.capabilityMode,
        }),
        metadata: {
          jobId: job.jobId,
          remote: true,
          executionEnvironmentId: environment.environmentId,
          executionEnvironmentKind: environment.kind,
          usedLocalFallback: resolvedEnvironment.usedLocalFallback,
        },
      });
      return {
        status: "queued" as const,
        sessionKey,
        environmentId: environment.environmentId,
        environmentKind: environment.kind,
        capabilityMode: environment.capabilityMode,
      };
    },

    stop() {},
  };
}
