import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

function requireSuperhumanRuntime(
  context: Parameters<NonNullable<GatewayRequestHandlers[string]>>[0]["context"],
) {
  const runtime = context.superhumanRuntime;
  if (!runtime) {
    return {
      error: errorShape(ErrorCodes.UNAVAILABLE, "superhuman runtime unavailable", {
        retryable: true,
      }),
    } as const;
  }
  return { runtime } as const;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export const automationHandlers: GatewayRequestHandlers = {
  "automation.events.list": ({ params, respond, context }) => {
    const resolved = requireSuperhumanRuntime(context);
    if ("error" in resolved) {
      respond(false, undefined, resolved.error);
      return;
    }
    const limitRaw =
      typeof params.limit === "number" && Number.isFinite(params.limit) ? params.limit : undefined;
    respond(
      true,
      {
        events: resolved.runtime.stateStore.listAutomationEvents({
          sessionKey: asString(params.sessionKey),
          limit: limitRaw,
        }),
      },
      undefined,
    );
  },

  "automation.loop.get": ({ params, respond, context }) => {
    const resolved = requireSuperhumanRuntime(context);
    if ("error" in resolved) {
      respond(false, undefined, resolved.error);
      return;
    }
    const sessionKey =
      asString(params.sessionKey) ?? resolved.runtime.sessionRegistry.resolveMainSession();
    respond(
      true,
      {
        loopState: resolved.runtime.stateStore.getAutomationLoopState(sessionKey),
      },
      undefined,
    );
  },

  "automation.loop.set": ({ params, respond, context }) => {
    const resolved = requireSuperhumanRuntime(context);
    if ("error" in resolved) {
      respond(false, undefined, resolved.error);
      return;
    }
    const mode = asString(params.state);
    const reason = asString(params.reason);
    const loop = resolved.runtime.automationRuntime.proactiveLoop;
    switch (mode) {
      case "active":
        loop.resume(reason);
        break;
      case "paused":
        loop.pause(reason);
        break;
      case "disabled":
        loop.disable(reason);
        break;
      case "sleeping": {
        const wakeAt =
          typeof params.wakeAt === "number" && Number.isFinite(params.wakeAt)
            ? params.wakeAt
            : Date.now() + 15 * 60_000;
        loop.sleepUntil(wakeAt, reason);
        break;
      }
      default:
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            "invalid automation.loop.set params: state must be active, paused, sleeping, or disabled",
          ),
        );
        return;
    }
    context.broadcast("automation.changed", {
      kind: "loop",
      action: mode,
      sessionKey:
        asString(params.sessionKey) ?? resolved.runtime.sessionRegistry.resolveMainSession(),
      reason,
    });
    respond(true, { loopState: loop.getState() }, undefined);
  },

  "automation.notifications.list": ({ params, respond, context }) => {
    const resolved = requireSuperhumanRuntime(context);
    if ("error" in resolved) {
      respond(false, undefined, resolved.error);
      return;
    }
    const limitRaw =
      typeof params.limit === "number" && Number.isFinite(params.limit) ? params.limit : undefined;
    respond(
      true,
      {
        notifications: resolved.runtime.notificationCenter.listNotifications({
          sessionKey: asString(params.sessionKey),
          limit: limitRaw,
        }),
      },
      undefined,
    );
  },

  "automation.artifacts.list": ({ params, respond, context }) => {
    const resolved = requireSuperhumanRuntime(context);
    if ("error" in resolved) {
      respond(false, undefined, resolved.error);
      return;
    }
    const sessionKey = asString(params.sessionKey);
    const kind = asString(params.kind);
    const artifacts = resolved.runtime.stateStore
      .getArtifacts({ sessionKey })
      .filter((artifact) => (kind ? artifact.kind === kind : true));
    respond(true, { artifacts }, undefined);
  },

  "automation.subscriptions.list": ({ params, respond, context }) => {
    const resolved = requireSuperhumanRuntime(context);
    if ("error" in resolved) {
      respond(false, undefined, resolved.error);
      return;
    }
    respond(
      true,
      {
        subscriptions: resolved.runtime.subscriptionManager.listSubscriptions({
          sessionKey: asString(params.sessionKey),
          kind: asString(params.kind) as "pr_review" | "pr_comment" | "ci_result" | undefined,
        }),
      },
      undefined,
    );
  },

  "automation.subscriptions.upsert": ({ params, respond, context }) => {
    const resolved = requireSuperhumanRuntime(context);
    if ("error" in resolved) {
      respond(false, undefined, resolved.error);
      return;
    }
    const subscriptionId = asString(params.subscriptionId);
    const kind = asString(params.kind) as "pr_review" | "pr_comment" | "ci_result" | undefined;
    const sessionKey = asString(params.sessionKey);
    if (!subscriptionId || !kind || !sessionKey) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "invalid automation.subscriptions.upsert params: subscriptionId, kind, and sessionKey required",
        ),
      );
      return;
    }
    const active = typeof params.active === "boolean" ? params.active : true;
    const record = resolved.runtime.subscriptionManager.upsertSubscription({
      subscriptionId,
      kind,
      sessionKey,
      repo: asString(params.repo),
      pullRequestNumber:
        typeof params.pullRequestNumber === "number" && Number.isFinite(params.pullRequestNumber)
          ? params.pullRequestNumber
          : undefined,
      workflow: asString(params.workflow),
      active,
    });
    context.broadcast("automation.changed", {
      kind: "subscription",
      action: "upserted",
      subscriptionId: record.subscriptionId,
      sessionKey: record.sessionKey,
      subscriptionKind: record.kind,
    });
    respond(true, { subscription: record }, undefined);
  },

  "automation.subscriptions.ingest": ({ params, respond, context }) => {
    const resolved = requireSuperhumanRuntime(context);
    if ("error" in resolved) {
      respond(false, undefined, resolved.error);
      return;
    }
    const kind = asString(params.kind) as "pr_review" | "pr_comment" | "ci_result" | undefined;
    const title = asString(params.title);
    const summary = asString(params.summary);
    if (!kind || !title || !summary) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "invalid automation.subscriptions.ingest params: kind, title, and summary required",
        ),
      );
      return;
    }
    const result = resolved.runtime.subscriptionManager.ingestEvent({
      eventId: asString(params.eventId),
      subscriptionId: asString(params.subscriptionId),
      kind,
      title,
      summary,
      repo: asString(params.repo),
      pullRequestNumber:
        typeof params.pullRequestNumber === "number" && Number.isFinite(params.pullRequestNumber)
          ? params.pullRequestNumber
          : undefined,
      workflow: asString(params.workflow),
      sessionKey: asString(params.sessionKey),
      payload:
        params.payload && typeof params.payload === "object" && !Array.isArray(params.payload)
          ? (params.payload as Record<string, unknown>)
          : undefined,
    });
    context.broadcast("automation.changed", {
      kind: "subscription_event",
      action: result.queued ? "queued" : "ignored",
      sessionKey: result.sessionKey,
      subscriptionKind: kind,
    });
    respond(true, result, undefined);
  },

  "automation.remoteSchedules.list": ({ respond, context }) => {
    const resolved = requireSuperhumanRuntime(context);
    if ("error" in resolved) {
      respond(false, undefined, resolved.error);
      return;
    }
    respond(true, { jobs: resolved.runtime.remoteScheduleRuntime.listJobs() }, undefined);
  },

  "automation.remoteSchedules.upsert": async ({ params, respond, context }) => {
    const resolved = requireSuperhumanRuntime(context);
    if ("error" in resolved) {
      respond(false, undefined, resolved.error);
      return;
    }
    const jobId = asString(params.jobId);
    const name = asString(params.name);
    const schedule = asString(params.schedule);
    const prompt = asString(params.prompt);
    if (!jobId || !name || !schedule || !prompt) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "invalid automation.remoteSchedules.upsert params: jobId, name, schedule, and prompt required",
        ),
      );
      return;
    }
    const status = asString(params.status) === "paused" ? "paused" : "active";
    const job = await resolved.runtime.remoteScheduleRuntime.upsertJob({
      jobId,
      name,
      schedule,
      scheduleTimezone: asString(params.scheduleTimezone) ?? "UTC",
      sessionKey: asString(params.sessionKey),
      executionEnvironmentId: asString(params.executionEnvironmentId),
      repoRoot: asString(params.repoRoot),
      prompt,
      model: asString(params.model),
      connectorIds: asStringArray(params.connectorIds),
      pluginIds: asStringArray(params.pluginIds),
      requiredCapabilities: asStringArray(params.requiredCapabilities) as Array<
        "workspace_search_only" | "symbol_references" | "semantic_rename"
      >,
      status,
      capabilityAuthority:
        asString(params.capabilityAuthority) === "allow_local_fallback"
          ? "allow_local_fallback"
          : "scheduled_remote_only",
      lastRunAt:
        typeof params.lastRunAt === "number" && Number.isFinite(params.lastRunAt)
          ? params.lastRunAt
          : undefined,
    });
    context.broadcast("automation.changed", {
      kind: "remote_schedule",
      action: "upserted",
      jobId: job.jobId,
      sessionKey: job.sessionKey,
      status: job.status,
    });
    respond(true, { job }, undefined);
  },

  "automation.remoteSchedules.run": ({ params, respond, context }) => {
    const resolved = requireSuperhumanRuntime(context);
    if ("error" in resolved) {
      respond(false, undefined, resolved.error);
      return;
    }
    const jobId = asString(params.jobId);
    if (!jobId) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "invalid automation.remoteSchedules.run params: jobId required",
        ),
      );
      return;
    }
    const result = resolved.runtime.remoteScheduleRuntime.runJob({ jobId });
    context.broadcast("automation.changed", {
      kind: "remote_schedule",
      action: result.status,
      jobId,
      sessionKey: result.sessionKey,
      reason: result.reason,
    });
    respond(true, result, undefined);
  },
};
