import { describe, expect, it, vi } from "vitest";
import { automationHandlers } from "./automation.js";

function createContext() {
  const context = {
    broadcast: vi.fn(),
    superhumanRuntime: {
      stateStore: {
        listAutomationEvents: vi.fn(() => [{ eventId: "e1" }]),
        getAutomationLoopState: vi.fn(() => ({ state: "active" })),
        getArtifacts: vi.fn<() => Array<Record<string, unknown>>>(() => []),
      },
      sessionRegistry: {
        resolveMainSession: vi.fn(() => "main"),
      },
      automationRuntime: {
        proactiveLoop: {
          getState: vi.fn(() => ({ state: "paused" })),
          resume: vi.fn(),
          pause: vi.fn(),
          disable: vi.fn(),
          sleepUntil: vi.fn(),
        },
      },
      notificationCenter: {
        listNotifications: vi.fn(() => [{ notificationId: "n1" }]),
      },
      subscriptionManager: {
        listSubscriptions: vi.fn(() => [{ subscriptionId: "s1" }]),
        upsertSubscription: vi.fn((record) => ({ ...record, createdAt: 1, updatedAt: 1 })),
        ingestEvent: vi.fn(() => ({ queued: true, sessionKey: "main" })),
      },
      remoteScheduleRuntime: {
        listJobs: vi.fn(() => [{ jobId: "r1" }]),
        upsertJob: vi.fn(async (job) => ({ ...job, createdAt: 1, updatedAt: 1 })),
        runJob: vi.fn(() => ({
          status: "queued",
          sessionKey: "main",
          environmentId: "scheduled_remote:main",
          environmentKind: "scheduled_remote",
        })),
      },
    },
  };
  return context;
}

describe("automationHandlers", () => {
  it("lists notifications from the superhuman runtime", async () => {
    const respond = vi.fn();
    await automationHandlers["automation.notifications.list"]({
      params: { sessionKey: "main" },
      respond,
      context: createContext() as never,
      req: {} as never,
      client: null,
      isWebchatConnect: () => false,
    });
    expect(respond).toHaveBeenCalledWith(
      true,
      { notifications: [{ notificationId: "n1" }] },
      undefined,
    );
  });

  it("lists automation artifacts from the state store", async () => {
    const respond = vi.fn();
    const context = createContext();
    context.superhumanRuntime.stateStore.getArtifacts = vi.fn(() => [
      { artifactId: "a1", kind: "operator-delivery-file" },
    ]);
    await automationHandlers["automation.artifacts.list"]({
      params: { sessionKey: "main" },
      respond,
      context: context as never,
      req: {} as never,
      client: null,
      isWebchatConnect: () => false,
    });
    expect(respond).toHaveBeenCalledWith(
      true,
      { artifacts: [{ artifactId: "a1", kind: "operator-delivery-file" }] },
      undefined,
    );
  });

  it("lists automation events from the state store", async () => {
    const respond = vi.fn();
    await automationHandlers["automation.events.list"]({
      params: { sessionKey: "main" },
      respond,
      context: createContext() as never,
      req: {} as never,
      client: null,
      isWebchatConnect: () => false,
    });
    expect(respond).toHaveBeenCalledWith(true, { events: [{ eventId: "e1" }] }, undefined);
  });

  it("updates proactive loop state through automation.loop.set", async () => {
    const respond = vi.fn();
    const context = createContext();
    await automationHandlers["automation.loop.set"]({
      params: { state: "paused", reason: "operator pause" },
      respond,
      context: context as never,
      req: {} as never,
      client: null,
      isWebchatConnect: () => false,
    });
    expect(context.superhumanRuntime.automationRuntime.proactiveLoop.pause).toHaveBeenCalledWith(
      "operator pause",
    );
    expect(respond).toHaveBeenCalledWith(true, { loopState: { state: "paused" } }, undefined);
  });

  it("upserts remote schedules through the superhuman runtime", async () => {
    const respond = vi.fn();
    const context = createContext();
    await automationHandlers["automation.remoteSchedules.upsert"]({
      params: {
        jobId: "job-1",
        name: "Nightly audit",
        schedule: "0 9 * * *",
        scheduleTimezone: "Asia/Seoul",
        executionEnvironmentId: "scheduled_remote:main",
        prompt: "Run the nightly audit.",
        requiredCapabilities: ["semantic_rename"],
        capabilityAuthority: "scheduled_remote_only",
      },
      respond,
      context: context as never,
      req: {} as never,
      client: null,
      isWebchatConnect: () => false,
    });
    expect(respond).toHaveBeenCalledWith(
      true,
      {
        job: expect.objectContaining({
          jobId: "job-1",
          name: "Nightly audit",
          scheduleTimezone: "Asia/Seoul",
          executionEnvironmentId: "scheduled_remote:main",
          capabilityAuthority: "scheduled_remote_only",
          requiredCapabilities: ["semantic_rename"],
        }),
      },
      undefined,
    );
    expect(context.broadcast).toHaveBeenCalledWith(
      "automation.changed",
      expect.objectContaining({
        kind: "remote_schedule",
        action: "upserted",
        jobId: "job-1",
      }),
    );
  });

  it("ingests structured subscription events", async () => {
    const respond = vi.fn();
    const context = createContext();
    await automationHandlers["automation.subscriptions.ingest"]({
      params: {
        kind: "pr_review",
        title: "Changes requested",
        summary: "Please rerun checks.",
      },
      respond,
      context: context as never,
      req: {} as never,
      client: null,
      isWebchatConnect: () => false,
    });
    expect(respond).toHaveBeenCalledWith(true, { queued: true, sessionKey: "main" }, undefined);
    expect(context.broadcast).toHaveBeenCalledWith(
      "automation.changed",
      expect.objectContaining({
        kind: "subscription_event",
        action: "queued",
      }),
    );
  });
});
