import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const enqueueSystemEvent = vi.fn();
const requestHeartbeatNow = vi.fn();
const publish = vi.fn();

vi.mock("../infra/system-events.js", () => ({
  enqueueSystemEvent: (...args: unknown[]) => enqueueSystemEvent(...args),
}));

vi.mock("../infra/heartbeat-wake.js", () => ({
  requestHeartbeatNow: (...args: unknown[]) => requestHeartbeatNow(...args),
}));

const { createSuperhumanStateStore } = await import("./super-state-store.js");
const { createSuperExecutionEnvironmentRegistry } = await import("./super-execution-surfaces.js");
const { startSuperRemoteScheduleRuntime } = await import("./super-remote-schedule-runtime.js");

const cleanupPaths = new Set<string>();

afterEach(() => {
  for (const target of cleanupPaths) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  cleanupPaths.clear();
  enqueueSystemEvent.mockReset();
  requestHeartbeatNow.mockReset();
  publish.mockReset();
});

describe("SuperRemoteScheduleRuntime", () => {
  function createEnvironmentRegistry(
    mode: "workspace_search_only" | "symbol_references" | "semantic_rename",
  ) {
    return createSuperExecutionEnvironmentRegistry({
      shellCapabilityRegistry: {
        getSnapshot: () => ({
          sessionKey: "main",
          agentId: "main",
          mainSessionKey: "main",
          createdAt: Date.now(),
          mode,
          supportsSymbolReferences: mode !== "workspace_search_only",
          supportsSemanticRename: mode === "semantic_rename",
          supportsWorkspaceSearchOnly: true,
          semanticToolProviderIds: mode === "workspace_search_only" ? [] : ["local"],
          workspaceSearchFallbackToolKinds: ["rg"],
        }),
      },
    });
  }

  it("queues a remote scheduled run when required capabilities are available", async () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "super-remote-schedule-"));
    cleanupPaths.add(workspaceDir);
    const stateStore = createSuperhumanStateStore({ workspaceDir });
    const cron = {
      add: vi.fn(async () => ({ id: "cron-1", state: { nextRunAtMs: 123 } })),
      update: vi.fn(),
      getJob: vi.fn(() => ({ id: "cron-1", state: { nextRunAtMs: 123 } })),
    };
    const runtime = startSuperRemoteScheduleRuntime({
      workspaceDir,
      stateStore,
      sessionRegistry: {
        resolveMainSession: () => "main",
        resolveSession: () => ({ sessionKey: "main", agentId: "main", mainSessionKey: "main" }),
        isMainSession: () => true,
      },
      executionEnvironmentRegistry: createEnvironmentRegistry("semantic_rename"),
      notificationCenter: {
        publish,
        publishArtifact: vi.fn(),
        listNotifications: vi.fn(() => []),
        stop: vi.fn(),
      },
      cron: cron as never,
    });

    const saved = await runtime.upsertJob({
      jobId: "remote-1",
      name: "Refactor import graph",
      schedule: "0 9 * * *",
      prompt: "Audit and fix import boundaries.",
      connectorIds: ["github"],
      pluginIds: ["codemod"],
      requiredCapabilities: ["semantic_rename"],
      status: "active",
      sessionKey: "main",
    });
    expect(saved).toEqual(
      expect.objectContaining({
        cronJobId: "cron-1",
        nextRunAtMs: 123,
      }),
    );

    expect(runtime.runJob({ jobId: "remote-1" })).toEqual({
      status: "queued",
      sessionKey: "main",
    });
    expect(cron.add).toHaveBeenCalledOnce();
    expect(enqueueSystemEvent).toHaveBeenCalledOnce();
    expect(requestHeartbeatNow).toHaveBeenCalledWith({
      reason: "super-remote-schedule",
      sessionKey: "main",
    });
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "scheduled_run_fired",
      }),
    );
    expect(stateStore.listAutomationEvents({ sessionKey: "main" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          automationKind: "remote_scheduled_job",
          resultStatus: "queued",
          evidencePosture: "trusted_state",
          evidenceSources: ["scheduler_state", "runtime_state"],
          verificationPosture: "unknown",
          capabilityPosture: "satisfied",
          capabilityMode: "semantic_rename",
        }),
      ]),
    );

    stateStore.close();
  });

  it("blocks a remote scheduled run when semantic capabilities are missing", async () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "super-remote-schedule-blocked-"));
    cleanupPaths.add(workspaceDir);
    const stateStore = createSuperhumanStateStore({ workspaceDir });
    const cron = {
      add: vi.fn(async () => ({ id: "cron-2", state: { nextRunAtMs: 456 } })),
      update: vi.fn(),
      getJob: vi.fn(() => ({ id: "cron-2", state: { nextRunAtMs: 456 } })),
    };
    const runtime = startSuperRemoteScheduleRuntime({
      workspaceDir,
      stateStore,
      sessionRegistry: {
        resolveMainSession: () => "main",
        resolveSession: () => ({ sessionKey: "main", agentId: "main", mainSessionKey: "main" }),
        isMainSession: () => true,
      },
      executionEnvironmentRegistry: createEnvironmentRegistry("workspace_search_only"),
      notificationCenter: {
        publish,
        publishArtifact: vi.fn(),
        listNotifications: vi.fn(() => []),
        stop: vi.fn(),
      },
      cron: cron as never,
    });

    await runtime.upsertJob({
      jobId: "remote-2",
      name: "Semantic rename",
      schedule: "0 9 * * *",
      prompt: "Rename symbols across the repo.",
      connectorIds: [],
      pluginIds: [],
      requiredCapabilities: ["semantic_rename"],
      status: "active",
      sessionKey: "main",
    });

    expect(runtime.runJob({ jobId: "remote-2" })).toEqual({
      status: "blocked",
      sessionKey: "main",
      reason: "missing capabilities: semantic_rename",
    });
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "remote_run_failed",
      }),
    );
    expect(enqueueSystemEvent).not.toHaveBeenCalled();
    expect(stateStore.listAutomationEvents({ sessionKey: "main" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          automationKind: "remote_scheduled_job",
          resultStatus: "blocked",
          evidencePosture: "trusted_state",
          evidenceSources: ["scheduler_state", "runtime_state"],
          verificationPosture: "unknown",
          capabilityPosture: "blocked",
          capabilityMode: "workspace_search_only",
        }),
      ]),
    );

    stateStore.close();
  });

  it("resynchronizes persisted remote schedules onto cron and exposes next run state", async () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "super-remote-schedule-resync-"));
    cleanupPaths.add(workspaceDir);
    const stateStore = createSuperhumanStateStore({ workspaceDir });
    const cron = {
      add: vi.fn(async () => ({ id: "cron-3", state: { nextRunAtMs: 789 } })),
      update: vi.fn(async () => ({ id: "cron-3", state: { nextRunAtMs: 789 } })),
      getJob: vi.fn(() => ({ id: "cron-3", state: { nextRunAtMs: 789 } })),
    };

    const first = startSuperRemoteScheduleRuntime({
      workspaceDir,
      stateStore,
      sessionRegistry: {
        resolveMainSession: () => "main",
        resolveSession: () => ({ sessionKey: "main", agentId: "main", mainSessionKey: "main" }),
        isMainSession: () => true,
      },
      executionEnvironmentRegistry: createEnvironmentRegistry("workspace_search_only"),
      cron: cron as never,
    });

    await first.upsertJob({
      jobId: "remote-3",
      name: "Remote inventory",
      schedule: "0 */6 * * *",
      prompt: "Inventory stale issues.",
      connectorIds: ["github"],
      pluginIds: [],
      requiredCapabilities: [],
      status: "active",
      sessionKey: "main",
    });
    first.stop();

    const resumed = startSuperRemoteScheduleRuntime({
      workspaceDir,
      stateStore,
      sessionRegistry: {
        resolveMainSession: () => "main",
        resolveSession: () => ({ sessionKey: "main", agentId: "main", mainSessionKey: "main" }),
        isMainSession: () => true,
      },
      executionEnvironmentRegistry: createEnvironmentRegistry("workspace_search_only"),
      cron: cron as never,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(resumed.listJobs()).toEqual([
      expect.objectContaining({
        jobId: "remote-3",
        cronJobId: "cron-3",
        nextRunAtMs: 789,
      }),
    ]);

    stateStore.close();
  });
});
