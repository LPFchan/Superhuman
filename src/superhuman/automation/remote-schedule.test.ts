import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const enqueueSystemEvent = vi.fn();
const requestHeartbeatNow = vi.fn();
const publish = vi.fn();

vi.mock("../../infra/system-events.js", () => ({
  enqueueSystemEvent: (...args: unknown[]) => enqueueSystemEvent(...args),
}));

vi.mock("../../infra/heartbeat-wake.js", () => ({
  requestHeartbeatNow: (...args: unknown[]) => requestHeartbeatNow(...args),
}));

const { createSuperhumanStateStore } = await import("../state/store.js");
const { createSuperExecutionEnvironmentRegistry } = await import("../remote/execution-surfaces.js");
const { startSuperRemoteScheduleRuntime } = await import("./remote-schedule.js");

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
    options?: {
      declareScheduledRemote?: boolean;
      declareLocal?: boolean;
      explicitEnvironmentId?: string;
      explicitEnvironmentKind?: "scheduled_remote" | "remote" | "local";
    },
  ) {
    const registry = createSuperExecutionEnvironmentRegistry({
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
    if (options?.declareLocal !== false) {
      registry.upsertSnapshot({
        environmentId: "local:main",
        sessionKey: "main",
        label: "Local (main)",
        kind: "local",
        backendId: "local",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        capabilityMode: mode,
        capabilities: {
          supportsWorkspaceSearchFallback: true,
          supportsSymbolReferences: mode !== "workspace_search_only",
          supportsSemanticRename: mode === "semantic_rename",
          supportsVerificationReplay: true,
          supportsArtifactReplay: true,
          supportsProvenanceReplay: true,
          supportsComputerUse: false,
          workspaceSearchFallbackToolKinds: ["rg"],
          semanticToolProviderIds: mode === "workspace_search_only" ? [] : ["local"],
          bundles: [],
        },
      });
    }
    if (options?.declareScheduledRemote !== false) {
      registry.upsertSnapshot({
        environmentId: options?.explicitEnvironmentId ?? "scheduled_remote:main",
        sessionKey: "main",
        label: "Scheduled remote (main)",
        kind: options?.explicitEnvironmentKind ?? "scheduled_remote",
        backendId: options?.explicitEnvironmentKind === "local" ? "local" : "remote_peer",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        capabilityMode: mode,
        capabilities: {
          supportsWorkspaceSearchFallback: true,
          supportsSymbolReferences: mode !== "workspace_search_only",
          supportsSemanticRename: mode === "semantic_rename",
          supportsVerificationReplay: true,
          supportsArtifactReplay: true,
          supportsProvenanceReplay: true,
          supportsComputerUse: false,
          workspaceSearchFallbackToolKinds: ["rg"],
          semanticToolProviderIds: mode === "workspace_search_only" ? [] : ["remote_peer"],
          bundles: [],
        },
      });
    }
    return registry;
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
      scheduleTimezone: "Asia/Seoul",
      prompt: "Audit and fix import boundaries.",
      connectorIds: ["github"],
      pluginIds: ["codemod"],
      requiredCapabilities: ["semantic_rename"],
      capabilityAuthority: "scheduled_remote_only",
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
      environmentId: "scheduled_remote:main",
      environmentKind: "scheduled_remote",
      capabilityMode: "semantic_rename",
    });
    expect(cron.add).toHaveBeenCalledOnce();
    expect(cron.add).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: expect.objectContaining({
          tz: "Asia/Seoul",
        }),
      }),
    );
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
      scheduleTimezone: "UTC",
      prompt: "Rename symbols across the repo.",
      connectorIds: [],
      pluginIds: [],
      requiredCapabilities: ["semantic_rename"],
      capabilityAuthority: "scheduled_remote_only",
      status: "active",
      sessionKey: "main",
    });

    expect(runtime.runJob({ jobId: "remote-2" })).toEqual({
      status: "blocked",
      sessionKey: "main",
      code: "missing_capabilities",
      reason: "missing capabilities: semantic_rename",
      environmentId: "scheduled_remote:main",
      environmentKind: "scheduled_remote",
      capabilityMode: "workspace_search_only",
      missingCapabilities: ["semantic_rename"],
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

  it("blocks a remote scheduled run when no scheduled remote environment is declared", async () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "super-remote-schedule-missing-"));
    cleanupPaths.add(workspaceDir);
    const stateStore = createSuperhumanStateStore({ workspaceDir });
    const cron = {
      add: vi.fn(async () => ({ id: "cron-4", state: { nextRunAtMs: 999 } })),
      update: vi.fn(),
      getJob: vi.fn(() => ({ id: "cron-4", state: { nextRunAtMs: 999 } })),
    };
    const runtime = startSuperRemoteScheduleRuntime({
      workspaceDir,
      stateStore,
      sessionRegistry: {
        resolveMainSession: () => "main",
        resolveSession: () => ({ sessionKey: "main", agentId: "main", mainSessionKey: "main" }),
        isMainSession: () => true,
      },
      executionEnvironmentRegistry: createEnvironmentRegistry("semantic_rename", {
        declareScheduledRemote: false,
      }),
      notificationCenter: {
        publish,
        publishArtifact: vi.fn(),
        listNotifications: vi.fn(() => []),
        stop: vi.fn(),
      },
      cron: cron as never,
    });

    await runtime.upsertJob({
      jobId: "remote-4",
      name: "Declared remote only",
      schedule: "0 9 * * *",
      scheduleTimezone: "UTC",
      prompt: "Run only where a scheduled remote environment is declared.",
      connectorIds: [],
      pluginIds: [],
      requiredCapabilities: ["semantic_rename"],
      capabilityAuthority: "scheduled_remote_only",
      status: "active",
      sessionKey: "main",
    });

    expect(runtime.runJob({ jobId: "remote-4" })).toEqual({
      status: "blocked",
      sessionKey: "main",
      code: "missing_execution_environment",
      reason: "missing declared scheduled remote environment",
    });
    expect(stateStore.listAutomationEvents({ sessionKey: "main" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          automationKind: "remote_scheduled_job",
          resultStatus: "blocked",
          details: expect.objectContaining({
            blockedCode: "missing_execution_environment",
            missingEnvironmentKind: "scheduled_remote",
          }),
        }),
      ]),
    );
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "remote_run_failed",
        metadata: expect.objectContaining({
          blockedCode: "missing_execution_environment",
          missingEnvironmentKind: "scheduled_remote",
        }),
      }),
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
      scheduleTimezone: "Asia/Tokyo",
      prompt: "Inventory stale issues.",
      connectorIds: ["github"],
      pluginIds: [],
      requiredCapabilities: [],
      capabilityAuthority: "scheduled_remote_only",
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
        scheduleTimezone: "Asia/Tokyo",
      }),
    ]);

    stateStore.close();
  });

  it("blocks when an explicit execution environment id resolves to a local surface", async () => {
    const workspaceDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "super-remote-schedule-invalid-env-"),
    );
    cleanupPaths.add(workspaceDir);
    const stateStore = createSuperhumanStateStore({ workspaceDir });
    const runtime = startSuperRemoteScheduleRuntime({
      workspaceDir,
      stateStore,
      sessionRegistry: {
        resolveMainSession: () => "main",
        resolveSession: () => ({ sessionKey: "main", agentId: "main", mainSessionKey: "main" }),
        isMainSession: () => true,
      },
      executionEnvironmentRegistry: createEnvironmentRegistry("symbol_references", {
        explicitEnvironmentId: "env-local",
        explicitEnvironmentKind: "local",
      }),
      notificationCenter: {
        publish,
        publishArtifact: vi.fn(),
        listNotifications: vi.fn(() => []),
        stop: vi.fn(),
      },
    });

    await runtime.upsertJob({
      jobId: "remote-invalid-env",
      name: "Pinned remote env",
      schedule: "0 10 * * *",
      scheduleTimezone: "UTC",
      executionEnvironmentId: "env-local",
      prompt: "Run against a pinned remote env.",
      connectorIds: [],
      pluginIds: [],
      requiredCapabilities: [],
      capabilityAuthority: "scheduled_remote_only",
      status: "active",
      sessionKey: "main",
    });

    expect(runtime.runJob({ jobId: "remote-invalid-env" })).toEqual({
      status: "blocked",
      sessionKey: "main",
      code: "invalid_execution_environment",
      reason: "environment env-local is local, not a remote execution surface",
      environmentId: "env-local",
      environmentKind: "local",
      capabilityMode: "symbol_references",
    });

    stateStore.close();
  });

  it("can queue through explicit local fallback authority when no scheduled remote surface exists", async () => {
    const workspaceDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "super-remote-schedule-local-fallback-"),
    );
    cleanupPaths.add(workspaceDir);
    const stateStore = createSuperhumanStateStore({ workspaceDir });
    const runtime = startSuperRemoteScheduleRuntime({
      workspaceDir,
      stateStore,
      sessionRegistry: {
        resolveMainSession: () => "main",
        resolveSession: () => ({ sessionKey: "main", agentId: "main", mainSessionKey: "main" }),
        isMainSession: () => true,
      },
      executionEnvironmentRegistry: createEnvironmentRegistry("symbol_references", {
        declareScheduledRemote: false,
        declareLocal: true,
      }),
      notificationCenter: {
        publish,
        publishArtifact: vi.fn(),
        listNotifications: vi.fn(() => []),
        stop: vi.fn(),
      },
    });

    await runtime.upsertJob({
      jobId: "remote-local-fallback",
      name: "Fallback inventory",
      schedule: "0 11 * * *",
      scheduleTimezone: "UTC",
      prompt: "Inventory work when remote is absent.",
      connectorIds: [],
      pluginIds: [],
      requiredCapabilities: ["symbol_references"],
      capabilityAuthority: "allow_local_fallback",
      status: "active",
      sessionKey: "main",
    });

    expect(runtime.runJob({ jobId: "remote-local-fallback" })).toEqual({
      status: "queued",
      sessionKey: "main",
      environmentId: "local:main",
      environmentKind: "local",
      capabilityMode: "symbol_references",
    });
    expect(enqueueSystemEvent).toHaveBeenCalledWith(
      expect.stringContaining("used_local_fallback: true"),
      expect.any(Object),
    );
    expect(stateStore.listAutomationEvents({ sessionKey: "main" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          automationKind: "remote_scheduled_job",
          resultStatus: "queued",
          details: expect.objectContaining({
            usedLocalFallback: true,
            executionEnvironmentId: "local:main",
            executionEnvironmentKind: "local",
          }),
        }),
      ]),
    );

    stateStore.close();
  });
});
