import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveSuperhumanStateDir } from "./super-state-store.js";

export type OrchestrationWorkerState = "queued" | "launching" | "running" | "terminal" | "refused";

export type OrchestrationMailboxMessageKind =
  | "worker_started"
  | "worker_terminal"
  | "approval_requested"
  | "approval_resolved";

export type OrchestrationMailboxDeliveryStatus = "stored" | "session_queued";

export type OrchestrationWorkerRecord = {
  workerId: string;
  runtime: "subagent" | "acp";
  backend: "in_process" | "out_of_process";
  controllerSessionKey: string;
  requesterSessionKey: string;
  task: string;
  label?: string;
  createdAt: number;
  updatedAt: number;
  state: OrchestrationWorkerState;
  taskId?: string;
  childSessionKey?: string;
  runId?: string;
  lastError?: string;
  taskStatus?: string;
  launchRequest: Record<string, unknown>;
};

export type OrchestrationMailboxMessageRecord = {
  messageId: string;
  recipientSessionKey: string;
  senderSessionKey?: string;
  workerId?: string;
  kind: OrchestrationMailboxMessageKind;
  createdAt: number;
  deliveryStatus: OrchestrationMailboxDeliveryStatus;
  deliveredAt?: number;
  text: string;
  payload?: Record<string, unknown>;
};

export type OrchestrationApprovalRecord = {
  approvalId: string;
  requestId: string;
  kind: "exec" | "plugin";
  workerId: string;
  controllerSessionKey: string;
  childSessionKey?: string;
  createdAt: number;
  resolvedAt?: number;
  status: "requested" | "approved" | "denied" | "expired";
  requestPayload?: Record<string, unknown>;
  resolutionPayload?: Record<string, unknown>;
};

type OrchestrationStoreSnapshot = {
  version: 1;
  workers: OrchestrationWorkerRecord[];
  mailbox: OrchestrationMailboxMessageRecord[];
  approvals: OrchestrationApprovalRecord[];
};

const STORE_FILE_MODE = 0o600;
const STORE_DIR_MODE = 0o700;

function resolveOrchestrationStorePath(workspaceDir: string): string {
  return path.join(resolveSuperhumanStateDir(workspaceDir), "orchestration.json");
}

function cloneWorker(record: OrchestrationWorkerRecord): OrchestrationWorkerRecord {
  return {
    ...record,
    launchRequest: { ...record.launchRequest },
  };
}

function cloneMailbox(
  record: OrchestrationMailboxMessageRecord,
): OrchestrationMailboxMessageRecord {
  return {
    ...record,
    ...(record.payload ? { payload: { ...record.payload } } : {}),
  };
}

function cloneApproval(record: OrchestrationApprovalRecord): OrchestrationApprovalRecord {
  return {
    ...record,
    ...(record.requestPayload ? { requestPayload: { ...record.requestPayload } } : {}),
    ...(record.resolutionPayload ? { resolutionPayload: { ...record.resolutionPayload } } : {}),
  };
}

function createEmptySnapshot(): OrchestrationStoreSnapshot {
  return {
    version: 1,
    workers: [],
    mailbox: [],
    approvals: [],
  };
}

function loadSnapshot(pathname: string): OrchestrationStoreSnapshot {
  if (!fs.existsSync(pathname)) {
    return createEmptySnapshot();
  }
  try {
    const parsed = JSON.parse(
      fs.readFileSync(pathname, "utf8"),
    ) as Partial<OrchestrationStoreSnapshot>;
    return {
      version: 1,
      workers: Array.isArray(parsed.workers)
        ? parsed.workers.filter(Boolean).map((record) => cloneWorker(record))
        : [],
      mailbox: Array.isArray(parsed.mailbox)
        ? parsed.mailbox.filter(Boolean).map((record) => cloneMailbox(record))
        : [],
      approvals: Array.isArray(parsed.approvals)
        ? parsed.approvals.filter(Boolean).map((record) => cloneApproval(record))
        : [],
    };
  } catch {
    return createEmptySnapshot();
  }
}

function persistSnapshot(pathname: string, snapshot: OrchestrationStoreSnapshot): void {
  const dir = path.dirname(pathname);
  fs.mkdirSync(dir, { recursive: true, mode: STORE_DIR_MODE });
  fs.chmodSync(dir, STORE_DIR_MODE);
  const tempPath = `${pathname}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), { mode: STORE_FILE_MODE });
  fs.renameSync(tempPath, pathname);
  fs.chmodSync(pathname, STORE_FILE_MODE);
}

export type OrchestrationStore = {
  listWorkers: () => OrchestrationWorkerRecord[];
  getWorker: (workerId: string) => OrchestrationWorkerRecord | undefined;
  findWorkerByChildSessionKey: (sessionKey: string) => OrchestrationWorkerRecord | undefined;
  upsertWorker: (record: OrchestrationWorkerRecord) => OrchestrationWorkerRecord;
  patchWorker: (
    workerId: string,
    patch: Partial<OrchestrationWorkerRecord>,
  ) => OrchestrationWorkerRecord | undefined;
  listMailbox: (recipientSessionKey?: string) => OrchestrationMailboxMessageRecord[];
  appendMailbox: (
    record: Omit<OrchestrationMailboxMessageRecord, "messageId" | "createdAt"> & {
      messageId?: string;
      createdAt?: number;
    },
  ) => OrchestrationMailboxMessageRecord;
  listApprovals: () => OrchestrationApprovalRecord[];
  upsertApproval: (record: OrchestrationApprovalRecord) => OrchestrationApprovalRecord;
};

export function createSuperOrchestrationStore(params: {
  workspaceDir: string;
}): OrchestrationStore {
  const pathname = resolveOrchestrationStorePath(params.workspaceDir);
  let snapshot = loadSnapshot(pathname);

  const save = () => {
    persistSnapshot(pathname, snapshot);
  };

  return {
    listWorkers: () => snapshot.workers.map((record) => cloneWorker(record)),

    getWorker: (workerId) => {
      const trimmed = workerId.trim();
      const record = snapshot.workers.find((worker) => worker.workerId === trimmed);
      return record ? cloneWorker(record) : undefined;
    },

    findWorkerByChildSessionKey: (sessionKey) => {
      const trimmed = sessionKey.trim();
      if (!trimmed) {
        return undefined;
      }
      const record = snapshot.workers.find((worker) => worker.childSessionKey === trimmed);
      return record ? cloneWorker(record) : undefined;
    },

    upsertWorker: (record) => {
      const normalized = cloneWorker(record);
      const index = snapshot.workers.findIndex((worker) => worker.workerId === normalized.workerId);
      if (index >= 0) {
        snapshot.workers[index] = normalized;
      } else {
        snapshot.workers.push(normalized);
      }
      save();
      return cloneWorker(normalized);
    },

    patchWorker: (workerId, patch) => {
      const trimmed = workerId.trim();
      const index = snapshot.workers.findIndex((worker) => worker.workerId === trimmed);
      if (index < 0) {
        return undefined;
      }
      const current = snapshot.workers[index];
      const next: OrchestrationWorkerRecord = {
        ...current,
        ...patch,
        launchRequest: {
          ...current.launchRequest,
          ...patch.launchRequest,
        },
      };
      snapshot.workers[index] = next;
      save();
      return cloneWorker(next);
    },

    listMailbox: (recipientSessionKey) => {
      const filtered = recipientSessionKey?.trim()
        ? snapshot.mailbox.filter(
            (record) => record.recipientSessionKey === recipientSessionKey.trim(),
          )
        : snapshot.mailbox;
      return filtered.map((record) => cloneMailbox(record));
    },

    appendMailbox: (record) => {
      const next: OrchestrationMailboxMessageRecord = {
        messageId: record.messageId?.trim() || crypto.randomUUID(),
        recipientSessionKey: record.recipientSessionKey,
        senderSessionKey: record.senderSessionKey,
        workerId: record.workerId,
        kind: record.kind,
        createdAt: record.createdAt ?? Date.now(),
        deliveryStatus: record.deliveryStatus,
        deliveredAt: record.deliveredAt,
        text: record.text,
        payload: record.payload ? { ...record.payload } : undefined,
      };
      snapshot.mailbox.push(next);
      save();
      return cloneMailbox(next);
    },

    listApprovals: () => snapshot.approvals.map((record) => cloneApproval(record)),

    upsertApproval: (record) => {
      const normalized = cloneApproval(record);
      const index = snapshot.approvals.findIndex(
        (approval) => approval.approvalId === normalized.approvalId,
      );
      if (index >= 0) {
        snapshot.approvals[index] = normalized;
      } else {
        snapshot.approvals.push(normalized);
      }
      save();
      return cloneApproval(normalized);
    },
  };
}
