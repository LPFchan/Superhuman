import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { requestHeartbeatNow } from "../infra/heartbeat-wake.js";
import { enqueueSystemEvent } from "../infra/system-events.js";
import type { SuperAutomationPolicyAudit } from "./super-automation-policy.js";
import type { StateStore } from "./super-runtime-seams.js";
import { resolveSuperhumanStateDir } from "./super-state-store.js";

export type SuperNotificationKind =
  | "task_complete"
  | "approval_requested"
  | "proactive_action_taken"
  | "scheduled_run_fired"
  | "remote_run_failed";

export type SuperNotificationRecord = {
  notificationId: string;
  kind: SuperNotificationKind;
  title: string;
  message: string;
  sessionKey?: string;
  runId?: string;
  artifactIds: string[];
  createdAt: number;
  deliveryStatus: "stored" | "session_queued";
  metadata?: Record<string, unknown>;
};

type NotificationStoreSnapshot = {
  version: 1;
  notifications: SuperNotificationRecord[];
};

export type SuperNotificationCenter = {
  publish: (params: {
    kind: SuperNotificationKind;
    title: string;
    message: string;
    sessionKey?: string;
    runId?: string;
    artifactIds?: string[];
    audit?: SuperAutomationPolicyAudit;
    metadata?: Record<string, unknown>;
  }) => SuperNotificationRecord;
  publishArtifact: (params: {
    sessionKey?: string;
    runId?: string;
    title: string;
    message: string;
    label: string;
    storagePath: string;
    mimeType?: string;
    audit?: SuperAutomationPolicyAudit;
    metadata?: Record<string, unknown>;
  }) => SuperNotificationRecord;
  listNotifications: (params?: {
    sessionKey?: string;
    limit?: number;
  }) => SuperNotificationRecord[];
  stop: () => void;
};

let activeCenter: SuperNotificationCenter | null = null;

const STORE_FILE_MODE = 0o600;
const STORE_DIR_MODE = 0o700;

function resolveStorePath(workspaceDir: string): string {
  return path.join(resolveSuperhumanStateDir(workspaceDir), "notifications.json");
}

function loadSnapshot(storePath: string): NotificationStoreSnapshot {
  if (!fs.existsSync(storePath)) {
    return { version: 1, notifications: [] };
  }
  try {
    const parsed = JSON.parse(
      fs.readFileSync(storePath, "utf8"),
    ) as Partial<NotificationStoreSnapshot>;
    return {
      version: 1,
      notifications: Array.isArray(parsed.notifications)
        ? parsed.notifications.filter(Boolean).map((record) => ({
            ...record,
            artifactIds: Array.isArray(record.artifactIds) ? [...record.artifactIds] : [],
            metadata:
              record.metadata && typeof record.metadata === "object"
                ? { ...record.metadata }
                : undefined,
          }))
        : [],
    };
  } catch {
    return { version: 1, notifications: [] };
  }
}

function persistSnapshot(storePath: string, snapshot: NotificationStoreSnapshot): void {
  const dir = path.dirname(storePath);
  fs.mkdirSync(dir, { recursive: true, mode: STORE_DIR_MODE });
  fs.chmodSync(dir, STORE_DIR_MODE);
  const tempPath = `${storePath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), { mode: STORE_FILE_MODE });
  fs.renameSync(tempPath, storePath);
  fs.chmodSync(storePath, STORE_FILE_MODE);
}

function buildNotificationMessage(record: SuperNotificationRecord): string {
  return [
    "<super-notification>",
    `kind: ${record.kind}`,
    `title: ${record.title}`,
    `message: ${record.message}`,
    ...(record.artifactIds.length > 0 ? [`artifact_ids: ${record.artifactIds.join(",")}`] : []),
    "</super-notification>",
  ].join("\n");
}

export function getActiveSuperNotificationCenter(): SuperNotificationCenter | null {
  return activeCenter;
}

export function startSuperNotificationCenter(params: {
  workspaceDir: string;
  stateStore: StateStore;
  onChange?: (payload: Record<string, unknown>) => void;
}): SuperNotificationCenter {
  const storePath = resolveStorePath(params.workspaceDir);
  let snapshot = loadSnapshot(storePath);

  const save = () => {
    persistSnapshot(storePath, snapshot);
  };

  const publishNotification = (record: SuperNotificationRecord): SuperNotificationRecord => {
    snapshot.notifications.push(record);
    save();
    if (record.sessionKey) {
      enqueueSystemEvent(buildNotificationMessage(record), {
        sessionKey: record.sessionKey,
        contextKey: `super-notification:${record.notificationId}`,
        trusted: true,
      });
      requestHeartbeatNow({
        reason: `super-notification:${record.kind}`,
        sessionKey: record.sessionKey,
      });
    }
    params.stateStore.appendAutomationEvent({
      eventId: `automation:${record.notificationId}`,
      sessionKey: record.sessionKey,
      runId: record.runId,
      automationKind: "notification",
      triggerSource: record.kind,
      reason: record.title,
      actionSummary: record.message,
      resultStatus: record.deliveryStatus,
      ...(record.metadata?.automationAudit &&
      typeof record.metadata.automationAudit === "object" &&
      !Array.isArray(record.metadata.automationAudit)
        ? (record.metadata.automationAudit as SuperAutomationPolicyAudit)
        : {}),
      details: {
        notificationKind: record.kind,
        artifactIds: record.artifactIds,
        ...record.metadata,
      },
      createdAt: record.createdAt,
    });
    params.onChange?.({
      kind: "notification",
      notificationId: record.notificationId,
      notificationKind: record.kind,
      sessionKey: record.sessionKey,
      runId: record.runId,
      createdAt: record.createdAt,
      artifactIds: record.artifactIds,
    });
    return {
      ...record,
      artifactIds: [...record.artifactIds],
      ...(record.metadata ? { metadata: { ...record.metadata } } : {}),
    };
  };

  const center: SuperNotificationCenter = {
    publish(notification) {
      const createdAt = Date.now();
      const metadata = {
        ...(notification.metadata ? { ...notification.metadata } : {}),
        ...(notification.audit ? { automationAudit: { ...notification.audit } } : {}),
      };
      return publishNotification({
        notificationId: crypto.randomUUID(),
        kind: notification.kind,
        title: notification.title,
        message: notification.message,
        sessionKey: notification.sessionKey,
        runId: notification.runId,
        artifactIds: notification.artifactIds ? [...notification.artifactIds] : [],
        createdAt,
        deliveryStatus: notification.sessionKey ? "session_queued" : "stored",
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
    },

    publishArtifact(notification) {
      const createdAt = Date.now();
      const metadata = {
        ...(notification.metadata ? { ...notification.metadata } : {}),
        ...(notification.audit ? { automationAudit: { ...notification.audit } } : {}),
      };
      const artifactId = `operator-delivery:${crypto.randomUUID()}`;
      params.stateStore.appendArtifact({
        artifactId,
        sessionKey: notification.sessionKey,
        kind: "operator-delivery-file",
        label: notification.label,
        location: notification.storagePath,
        createdAt,
        storagePath: notification.storagePath,
        metadata: {
          mimeType: notification.mimeType,
          intendedFor: "operator",
          ...notification.metadata,
        },
      });
      return publishNotification({
        notificationId: crypto.randomUUID(),
        kind: "task_complete",
        title: notification.title,
        message: notification.message,
        sessionKey: notification.sessionKey,
        runId: notification.runId,
        artifactIds: [artifactId],
        createdAt,
        deliveryStatus: notification.sessionKey ? "session_queued" : "stored",
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
    },

    listNotifications(paramsIn) {
      const limit =
        typeof paramsIn?.limit === "number" && Number.isFinite(paramsIn.limit)
          ? Math.max(1, Math.floor(paramsIn.limit))
          : 50;
      const sessionKey = paramsIn?.sessionKey?.trim();
      const filtered = sessionKey
        ? snapshot.notifications.filter((record) => record.sessionKey === sessionKey)
        : snapshot.notifications;
      return filtered
        .slice()
        .toSorted((left, right) => right.createdAt - left.createdAt)
        .slice(0, limit)
        .map((record) => ({
          ...record,
          artifactIds: [...record.artifactIds],
          ...(record.metadata ? { metadata: { ...record.metadata } } : {}),
        }));
    },

    stop() {
      if (activeCenter === center) {
        activeCenter = null;
      }
    },
  };

  activeCenter = center;
  return center;
}
