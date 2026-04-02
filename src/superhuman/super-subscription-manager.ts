import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { requestHeartbeatNow } from "../infra/heartbeat-wake.js";
import { enqueueSystemEvent } from "../infra/system-events.js";
import { createStructuredExternalAutomationPolicy } from "./super-automation-policy.js";
import type { StateStore } from "./super-runtime-seams.js";
import { resolveSuperhumanStateDir } from "./super-state-store.js";

export type SuperSubscriptionKind = "pr_review" | "pr_comment" | "ci_result";

export type SuperSubscriptionRecord = {
  subscriptionId: string;
  kind: SuperSubscriptionKind;
  sessionKey: string;
  repo?: string;
  pullRequestNumber?: number;
  workflow?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

export type SuperSubscriptionEvent = {
  eventId?: string;
  subscriptionId?: string;
  kind: SuperSubscriptionKind;
  title: string;
  summary: string;
  repo?: string;
  pullRequestNumber?: number;
  workflow?: string;
  sessionKey?: string;
  payload?: Record<string, unknown>;
};

type SubscriptionStoreSnapshot = {
  version: 1;
  subscriptions: SuperSubscriptionRecord[];
};

export type SuperSubscriptionManager = {
  upsertSubscription: (
    record: Omit<SuperSubscriptionRecord, "createdAt" | "updatedAt">,
  ) => SuperSubscriptionRecord;
  listSubscriptions: (params?: {
    sessionKey?: string;
    kind?: SuperSubscriptionKind;
  }) => SuperSubscriptionRecord[];
  ingestEvent: (event: SuperSubscriptionEvent) => { queued: boolean; sessionKey?: string };
  stop: () => void;
};

const STORE_FILE_MODE = 0o600;
const STORE_DIR_MODE = 0o700;

function resolveStorePath(workspaceDir: string): string {
  return path.join(resolveSuperhumanStateDir(workspaceDir), "subscriptions.json");
}

function loadSnapshot(storePath: string): SubscriptionStoreSnapshot {
  if (!fs.existsSync(storePath)) {
    return { version: 1, subscriptions: [] };
  }
  try {
    const parsed = JSON.parse(
      fs.readFileSync(storePath, "utf8"),
    ) as Partial<SubscriptionStoreSnapshot>;
    return {
      version: 1,
      subscriptions: Array.isArray(parsed.subscriptions)
        ? parsed.subscriptions.filter(Boolean).map((record) => ({ ...record }))
        : [],
    };
  } catch {
    return { version: 1, subscriptions: [] };
  }
}

function persistSnapshot(storePath: string, snapshot: SubscriptionStoreSnapshot): void {
  const dir = path.dirname(storePath);
  fs.mkdirSync(dir, { recursive: true, mode: STORE_DIR_MODE });
  fs.chmodSync(dir, STORE_DIR_MODE);
  const tempPath = `${storePath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), { mode: STORE_FILE_MODE });
  fs.renameSync(tempPath, storePath);
  fs.chmodSync(storePath, STORE_FILE_MODE);
}

function buildEventMessage(event: SuperSubscriptionEvent, sessionKey: string): string {
  return [
    "<super-external-subscription-event>",
    `session_key: ${sessionKey}`,
    `kind: ${event.kind}`,
    ...(event.repo ? [`repo: ${event.repo}`] : []),
    ...(typeof event.pullRequestNumber === "number"
      ? [`pull_request_number: ${event.pullRequestNumber}`]
      : []),
    ...(event.workflow ? [`workflow: ${event.workflow}`] : []),
    `title: ${event.title}`,
    `summary: ${event.summary}`,
    `payload_json: ${JSON.stringify(event.payload ?? {})}`,
    "</super-external-subscription-event>",
  ].join("\n");
}

function matchesSubscription(
  subscription: SuperSubscriptionRecord,
  event: SuperSubscriptionEvent,
): boolean {
  if (!subscription.active || subscription.kind !== event.kind) {
    return false;
  }
  if (subscription.repo && subscription.repo !== event.repo) {
    return false;
  }
  if (
    typeof subscription.pullRequestNumber === "number" &&
    subscription.pullRequestNumber !== event.pullRequestNumber
  ) {
    return false;
  }
  if (subscription.workflow && subscription.workflow !== event.workflow) {
    return false;
  }
  return true;
}

export function startSuperSubscriptionManager(params: {
  workspaceDir: string;
  stateStore: StateStore;
}): SuperSubscriptionManager {
  const storePath = resolveStorePath(params.workspaceDir);
  let snapshot = loadSnapshot(storePath);

  const save = () => {
    persistSnapshot(storePath, snapshot);
  };

  return {
    upsertSubscription(record) {
      const now = Date.now();
      const next: SuperSubscriptionRecord = {
        ...record,
        createdAt: now,
        updatedAt: now,
      };
      const index = snapshot.subscriptions.findIndex(
        (entry) => entry.subscriptionId === record.subscriptionId,
      );
      if (index >= 0) {
        next.createdAt = snapshot.subscriptions[index]?.createdAt ?? now;
        snapshot.subscriptions[index] = next;
      } else {
        snapshot.subscriptions.push(next);
      }
      save();
      return { ...next };
    },

    listSubscriptions(paramsIn) {
      const sessionKey = paramsIn?.sessionKey?.trim();
      return snapshot.subscriptions
        .filter((record) => (sessionKey ? record.sessionKey === sessionKey : true))
        .filter((record) => (paramsIn?.kind ? record.kind === paramsIn.kind : true))
        .map((record) => ({ ...record }));
    },

    ingestEvent(event) {
      const matched =
        event.sessionKey?.trim() ||
        (event.subscriptionId
          ? snapshot.subscriptions.find(
              (record) => record.subscriptionId === event.subscriptionId && record.active,
            )?.sessionKey
          : snapshot.subscriptions.find((record) => matchesSubscription(record, event))
              ?.sessionKey);
      const sessionKey = matched?.trim();
      const createdAt = Date.now();
      params.stateStore.appendAutomationEvent({
        eventId: event.eventId?.trim() || `subscription:${crypto.randomUUID()}`,
        sessionKey,
        automationKind: "subscription_event",
        triggerSource: event.kind,
        reason: event.title,
        actionSummary: sessionKey
          ? "Queued structured subscription event"
          : "Ignored subscription event with no matching session",
        resultStatus: sessionKey ? "queued" : "ignored",
        ...createStructuredExternalAutomationPolicy({
          policySummary:
            "Subscription events are accepted only as structured external input and converted into queued work items instead of being treated as already-verified repository state.",
        }),
        details: {
          repo: event.repo,
          pullRequestNumber: event.pullRequestNumber,
          workflow: event.workflow,
          payload: event.payload,
        },
        createdAt,
      });
      if (!sessionKey) {
        return { queued: false };
      }
      enqueueSystemEvent(buildEventMessage(event, sessionKey), {
        sessionKey,
        contextKey: `super-subscription:${event.eventId ?? createdAt}`,
        trusted: false,
      });
      requestHeartbeatNow({
        reason: `super-subscription:${event.kind}`,
        sessionKey,
      });
      return { queued: true, sessionKey };
    },

    stop() {},
  };
}
