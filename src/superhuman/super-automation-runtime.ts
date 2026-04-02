import crypto from "node:crypto";
import type { CronEvent } from "../cron/service.js";
import type { BootRunResult } from "../gateway/boot.js";
import type { AgentEventPayload } from "../infra/agent-events.js";
import { onAgentEvent } from "../infra/agent-events.js";
import { requestHeartbeatNow } from "../infra/heartbeat-wake.js";
import { enqueueSystemEvent } from "../infra/system-events.js";
import { onSessionTranscriptUpdate } from "../sessions/transcript-events.js";
import { createTrustedStateAutomationPolicy } from "./super-automation-policy.js";
import { getActiveSuperNotificationCenter } from "./super-notification-center.js";
import { SuperProactiveLoop } from "./super-proactive-loop.js";
import type {
  SessionRegistry,
  StateActionAppend,
  StateAutomationEventAppend,
  StateStore,
} from "./super-runtime-seams.js";

export type SuperAutomationRuntime = {
  proactiveLoop: SuperProactiveLoop;
  recordBootRun: (params: { result: BootRunResult; agentId?: string }) => void;
  recordCronEvent: (event: CronEvent) => void;
  stop: () => void;
};

let activeRuntime: SuperAutomationRuntime | null = null;

function createId(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

function appendMirroredAction(stateStore: StateStore, event: StateAutomationEventAppend): void {
  const summary = event.actionSummary ?? `${event.automationKind}: ${event.resultStatus}`;
  const action: StateActionAppend = {
    actionId: `automation:${event.eventId}`,
    sessionKey: event.sessionKey,
    runId: event.runId,
    actionType: `super.automation.${event.automationKind}`,
    actionKind: "automation",
    summary,
    status: event.resultStatus,
    createdAt: event.createdAt,
    completedAt: event.createdAt,
    details: {
      triggerSource: event.triggerSource,
      reason: event.reason,
      planSummary: event.planSummary,
      policySummary: event.policySummary,
      evidencePosture: event.evidencePosture,
      evidenceSources: event.evidenceSources,
      verificationPosture: event.verificationPosture,
      verificationOutcome: event.verificationOutcome,
      capabilityPosture: event.capabilityPosture,
      capabilityMode: event.capabilityMode,
      ...event.details,
    },
  };
  stateStore.appendAction(action);
}

function appendAutomationEvent(stateStore: StateStore, event: StateAutomationEventAppend): void {
  stateStore.appendAutomationEvent(event);
  appendMirroredAction(stateStore, event);
}

function recordActivityFromAgentEvent(
  proactiveLoop: SuperProactiveLoop,
  mainSessionKey: string,
  event: AgentEventPayload,
): void {
  if (!event.sessionKey || event.sessionKey !== mainSessionKey) {
    return;
  }
  proactiveLoop.recordActivity({
    sessionKey: event.sessionKey,
    at: event.ts,
  });
}

export function getActiveSuperAutomationRuntime(): SuperAutomationRuntime | null {
  return activeRuntime;
}

export function startSuperAutomationRuntime(params: {
  stateStore: StateStore;
  sessionRegistry: SessionRegistry;
}): SuperAutomationRuntime {
  const mainSessionKey = params.sessionRegistry.resolveMainSession();
  const proactiveLoop = new SuperProactiveLoop({
    stateStore: params.stateStore,
    sessionKey: mainSessionKey,
    enqueueSystemEvent: ({ sessionKey, text, contextKey }) => {
      enqueueSystemEvent(text, {
        sessionKey,
        contextKey,
        trusted: true,
      });
    },
    requestHeartbeatNow: ({ reason, sessionKey }) => {
      requestHeartbeatNow({ reason, sessionKey });
    },
  });
  proactiveLoop.start();

  const unsubscribers = [
    onAgentEvent((event) => {
      recordActivityFromAgentEvent(proactiveLoop, mainSessionKey, event);
    }),
    onSessionTranscriptUpdate((update) => {
      if (!update.sessionKey || update.sessionKey !== mainSessionKey) {
        return;
      }
      proactiveLoop.recordActivity({ sessionKey: update.sessionKey });
    }),
  ];

  const runtime: SuperAutomationRuntime = {
    proactiveLoop,

    recordBootRun({ result, agentId }): void {
      const sessionKey = params.sessionRegistry.resolveMainSession(agentId);
      const createdAt = Date.now();
      appendAutomationEvent(params.stateStore, {
        eventId: createId("automation"),
        sessionKey,
        automationKind: "boot",
        triggerSource: "boot",
        reason:
          result.status === "failed"
            ? result.reason
            : result.status === "skipped"
              ? result.reason
              : "boot workflow completed",
        actionSummary:
          result.status === "ran"
            ? "Executed BOOT.md automation"
            : result.status === "skipped"
              ? "Skipped BOOT.md automation"
              : "BOOT.md automation failed",
        resultStatus: result.status,
        ...createTrustedStateAutomationPolicy({
          policySummary:
            "BOOT.md execution was allowed by trusted workspace startup state; downstream work still uses the normal runtime verification and provenance rules.",
          evidenceSources: ["runtime_state"],
        }),
        details:
          result.status === "failed"
            ? { reason: result.reason }
            : result.status === "skipped"
              ? { reason: result.reason }
              : undefined,
        createdAt,
      });
    },

    recordCronEvent(event: CronEvent): void {
      const createdAt = Date.now();
      appendAutomationEvent(params.stateStore, {
        eventId: createId("automation"),
        sessionKey: event.sessionKey,
        runId: event.sessionId,
        automationKind: "scheduled_job",
        triggerSource: "scheduled_job",
        reason: event.error ?? event.summary,
        actionSummary: `Cron ${event.action}: ${event.jobId}`,
        resultStatus: event.action === "finished" ? (event.status ?? "finished") : event.action,
        ...createTrustedStateAutomationPolicy({
          policySummary:
            "Host cron fired this job from durable scheduler state; any resulting agent work remains subject to the same verification and capability gates as manual runs.",
          evidenceSources: ["scheduler_state"],
          verificationPosture: "unknown",
        }),
        details: {
          jobId: event.jobId,
          action: event.action,
          durationMs: event.durationMs,
          nextRunAtMs: event.nextRunAtMs,
          delivered: event.delivered,
          deliveryStatus: event.deliveryStatus,
          deliveryError: event.deliveryError,
          sessionKey: event.sessionKey,
        },
        createdAt,
      });
      if (event.action === "finished") {
        getActiveSuperNotificationCenter()?.publish({
          kind: "scheduled_run_fired",
          title: `Scheduled run finished: ${event.jobId}`,
          message: event.summary ?? `Cron job ${event.jobId} completed.`,
          sessionKey: event.sessionKey,
          runId: event.sessionId,
          audit: createTrustedStateAutomationPolicy({
            policySummary:
              "This notification was emitted from a durable cron completion event; verification posture of the underlying run remains runtime-owned.",
            evidenceSources: ["scheduler_state"],
            verificationPosture: "unknown",
          }),
          metadata: {
            jobId: event.jobId,
            status: event.status,
          },
        });
      }
      if (event.sessionKey) {
        proactiveLoop.recordActivity({ sessionKey: event.sessionKey, at: createdAt });
      }
    },

    stop(): void {
      proactiveLoop.stop();
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
      if (activeRuntime === runtime) {
        activeRuntime = null;
      }
    },
  };

  activeRuntime = runtime;
  return runtime;
}
