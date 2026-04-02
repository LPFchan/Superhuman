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
  SessionRegistry,
  ShellCapabilityRegistry,
  StateStore,
  SuperShellCapabilityMode,
} from "./super-runtime-seams.js";
import { resolveSuperhumanStateDir } from "./super-state-store.js";

export type SuperRemoteScheduleRecord = {
  jobId: string;
  name: string;
  schedule: string;
  sessionKey?: string;
  repoRoot?: string;
  prompt: string;
  model?: string;
  connectorIds: string[];
  pluginIds: string[];
  requiredCapabilities: SuperShellCapabilityMode[];
  status: "active" | "paused";
  cronJobId?: string;
  nextRunAtMs?: number;
  createdAt: number;
  updatedAt: number;
  lastRunAt?: number;
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
    reason?: string;
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
  capabilitySnapshot: ReturnType<ShellCapabilityRegistry["getSnapshot"]>,
): boolean {
  switch (required) {
    case "semantic_rename":
      return capabilitySnapshot.supportsSemanticRename;
    case "symbol_references":
      return capabilitySnapshot.supportsSymbolReferences;
    case "workspace_search_only":
      return capabilitySnapshot.supportsWorkspaceSearchOnly;
    default:
      return false;
  }
}

function buildJobMessage(job: SuperRemoteScheduleRecord, sessionKey: string): string {
  return [
    "<super-remote-scheduled-run>",
    `job_id: ${job.jobId}`,
    `name: ${job.name}`,
    `session_key: ${sessionKey}`,
    "trigger_source: remote_schedule",
    `schedule_expr: ${job.schedule}`,
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

function buildCronDescription(job: SuperRemoteScheduleRecord): string {
  const details = [
    job.repoRoot ? `repo=${job.repoRoot}` : undefined,
    job.model ? `model=${job.model}` : undefined,
    job.connectorIds.length > 0 ? `connectors=${job.connectorIds.join(",")}` : undefined,
    job.pluginIds.length > 0 ? `plugins=${job.pluginIds.join(",")}` : undefined,
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
      tz: "UTC",
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
  shellCapabilityRegistry: ShellCapabilityRegistry;
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
        connectorIds: [...job.connectorIds],
        pluginIds: [...job.pluginIds],
        requiredCapabilities: [...job.requiredCapabilities],
        cronJobId: existing?.cronJobId,
        nextRunAtMs: existing?.nextRunAtMs,
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
      if (job.status !== "active") {
        return { status: "blocked" as const, reason: "job is paused" };
      }
      const sessionKey = job.sessionKey?.trim() || params.sessionRegistry.resolveMainSession();
      const capabilitySnapshot = params.shellCapabilityRegistry.getSnapshot({ sessionKey });
      const missingCapabilities = job.requiredCapabilities.filter(
        (required) => !supportsCapability(required, capabilitySnapshot),
      );
      const createdAt = Date.now();
      if (missingCapabilities.length > 0) {
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
            capabilityMode: capabilitySnapshot.mode,
          }),
          details: {
            jobId: job.jobId,
            missingCapabilities,
            capabilityMode: capabilitySnapshot.mode,
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
            capabilityMode: capabilitySnapshot.mode,
          }),
          metadata: {
            jobId: job.jobId,
            missingCapabilities,
          },
        });
        return {
          status: "blocked" as const,
          sessionKey,
          reason: `missing capabilities: ${missingCapabilities.join(", ")}`,
        };
      }
      enqueueSystemEvent(buildJobMessage(job, sessionKey), {
        sessionKey,
        contextKey: `super-remote-schedule:${job.jobId}:${createdAt}`,
        trusted: true,
      });
      requestHeartbeatNow({
        reason: "super-remote-schedule",
        sessionKey,
      });
      snapshot.jobs[index] = {
        ...job,
        updatedAt: createdAt,
        lastRunAt: createdAt,
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
          capabilityMode: capabilitySnapshot.mode,
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
          capabilityMode: capabilitySnapshot.mode,
        }),
        metadata: {
          jobId: job.jobId,
          remote: true,
        },
      });
      return { status: "queued" as const, sessionKey };
    },

    stop() {},
  };
}
