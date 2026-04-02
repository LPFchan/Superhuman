import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  SuperRemoteSessionTransport,
  SuperRemoteTransportEnvelope,
} from "./super-remote-session-manager.js";

const enqueueSystemEvent = vi.fn();
const requestHeartbeatNow = vi.fn();
const publish = vi.fn();

vi.mock("../infra/system-events.js", () => ({
  enqueueSystemEvent: (...args: unknown[]) => enqueueSystemEvent(...args),
}));

vi.mock("../infra/heartbeat-wake.js", () => ({
  requestHeartbeatNow: (...args: unknown[]) => requestHeartbeatNow(...args),
}));

const { resetTaskRegistryForTests } = await import("../tasks/task-registry.js");
const { withTempDir } = await import("../test-helpers/temp-dir.js");
const { createSuperExecutionEnvironmentRegistry } = await import("./super-execution-surfaces.js");
const { startSuperOrchestrationRuntime } = await import("./super-orchestration-runtime.js");
const { startSuperRemoteScheduleRuntime } = await import("./super-remote-schedule-runtime.js");
const { startSuperRemoteSessionManager } = await import("./super-remote-session-manager.js");
const { createSuperhumanStateStore } = await import("./super-state-store.js");

const ORIGINAL_STATE_DIR = process.env.OPENCLAW_STATE_DIR;

type TransportControl = {
  emit: (event: SuperRemoteTransportEnvelope) => void;
  approvals: Array<unknown>;
  inputs: Array<{ message: string; interrupt?: boolean }>;
  interrupted: number;
  stopped: number;
};

function createEnvironmentRegistry(
  mode: "workspace_search_only" | "symbol_references" | "semantic_rename" = "semantic_rename",
) {
  return createSuperExecutionEnvironmentRegistry({
    shellCapabilityRegistry: {
      getSnapshot: ({ sessionKey }) => ({
        sessionKey,
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

function createFakeTransport(control: TransportControl): SuperRemoteSessionTransport {
  return {
    async connect() {
      control.emit({ type: "connected" });
    },
    async sendInput(params) {
      control.inputs.push(params);
      return true;
    },
    async interrupt() {
      control.interrupted += 1;
      return true;
    },
    async stop() {
      control.stopped += 1;
      return true;
    },
    async resolveApproval(_requestId, resolution) {
      control.approvals.push(resolution);
      return true;
    },
    async close() {},
  };
}

async function waitForAssertion(assertion: () => void, timeoutMs = 2_000, stepMs = 10) {
  const startedAt = Date.now();
  for (;;) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() - startedAt >= timeoutMs) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, stepMs));
    }
  }
}

describe("superhuman seam integration", () => {
  afterEach(() => {
    enqueueSystemEvent.mockReset();
    requestHeartbeatNow.mockReset();
    publish.mockReset();
    resetTaskRegistryForTests();
    if (ORIGINAL_STATE_DIR === undefined) {
      delete process.env.OPENCLAW_STATE_DIR;
    } else {
      process.env.OPENCLAW_STATE_DIR = ORIGINAL_STATE_DIR;
    }
  });

  it("keeps remote truth declaration-backed across restart, scheduling, and orchestration", async () => {
    await withTempDir({ prefix: "openclaw-super-seam-integration-" }, async (workspaceDir) => {
      process.env.OPENCLAW_STATE_DIR = workspaceDir;

      const seedStore = createSuperhumanStateStore({ workspaceDir });
      const seedRegistry = createEnvironmentRegistry();
      expect(seedRegistry.getSnapshot({ sessionKey: "remote:seed", kind: "remote" })).toBeNull();
      expect(seedRegistry.getSnapshot({ sessionKey: "main", kind: "scheduled_remote" })).toBeNull();

      let seedEmit: ((event: SuperRemoteTransportEnvelope) => void) | undefined;
      const seedManager = startSuperRemoteSessionManager({
        workspaceDir,
        stateStore: seedStore,
        environmentRegistry: seedRegistry,
      });
      seedManager.registerTransportFactory("remote_peer", (params) => {
        seedEmit = params.emit;
        return createFakeTransport({
          emit(event) {
            seedEmit?.(event);
          },
          approvals: [],
          inputs: [],
          interrupted: 0,
          stopped: 0,
        });
      });

      await seedManager.launchSession({
        workerId: "worker-seed",
        sessionKey: "remote:seed",
        controllerSessionKey: "agent:main:main",
        requesterSessionKey: "agent:main:main",
        capabilityMode: "semantic_rename",
        capabilityRequirements: ["semantic_rename"],
        supportsVerificationReplay: true,
        supportsArtifactReplay: true,
        supportsProvenanceReplay: true,
      });
      seedManager.stop();
      seedStore.close();

      const stateStore = createSuperhumanStateStore({ workspaceDir });
      const executionEnvironmentRegistry = createEnvironmentRegistry();

      expect(
        executionEnvironmentRegistry.getSnapshot({ sessionKey: "remote:seed", kind: "remote" }),
      ).toBeNull();
      expect(
        executionEnvironmentRegistry.getSnapshot({ sessionKey: "main", kind: "scheduled_remote" }),
      ).toBeNull();

      const orchestrationRuntime = startSuperOrchestrationRuntime({
        cfg: {
          agents: {
            defaults: {
              subagents: {
                maxChildrenPerAgent: 1,
              },
            },
          },
        } as never,
        workspaceDir,
        stateStore,
        executionEnvironmentRegistry,
      });

      const notificationCenter = {
        publish,
        publishArtifact: vi.fn(),
        listNotifications: vi.fn(() => []),
        stop: vi.fn(),
      };
      const remoteScheduleRuntime = startSuperRemoteScheduleRuntime({
        workspaceDir,
        stateStore,
        sessionRegistry: {
          resolveMainSession: () => "main",
          resolveSession: () => ({ sessionKey: "main", agentId: "main", mainSessionKey: "main" }),
          isMainSession: () => true,
        },
        executionEnvironmentRegistry,
        notificationCenter,
      });

      try {
        expect(executionEnvironmentRegistry.getSnapshot({ workerId: "worker-seed" })).toMatchObject(
          {
            backendId: "remote_peer",
            kind: "remote",
            sessionKey: "remote:seed",
            capabilityMode: "semantic_rename",
          },
        );
        expect(
          executionEnvironmentRegistry.getSnapshot({ sessionKey: "remote:seed", kind: "remote" }),
        ).toMatchObject({
          backendId: "remote_peer",
          kind: "remote",
        });
        expect(
          executionEnvironmentRegistry.getSnapshot({
            sessionKey: "main",
            kind: "scheduled_remote",
          }),
        ).toBeNull();
        expect(
          executionEnvironmentRegistry.getSnapshot({
            sessionKey: "remote:missing",
            kind: "remote",
          }),
        ).toBeNull();

        await remoteScheduleRuntime.upsertJob({
          jobId: "scheduled-remote-explicit",
          name: "Explicit scheduled remote",
          schedule: "0 9 * * *",
          scheduleTimezone: "UTC",
          prompt: "Run only with a declared scheduled remote environment.",
          connectorIds: [],
          pluginIds: [],
          requiredCapabilities: ["semantic_rename"],
          capabilityAuthority: "scheduled_remote_only",
          status: "active",
          sessionKey: "main",
        });

        expect(remoteScheduleRuntime.runJob({ jobId: "scheduled-remote-explicit" })).toEqual({
          status: "blocked",
          sessionKey: "main",
          code: "missing_execution_environment",
          reason: "missing declared scheduled remote environment",
        });
        expect(enqueueSystemEvent).not.toHaveBeenCalled();

        executionEnvironmentRegistry.upsertSnapshot({
          environmentId: "scheduled_remote:main",
          sessionKey: "main",
          label: "Scheduled remote (main)",
          kind: "scheduled_remote",
          backendId: "remote_peer",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          capabilityMode: "semantic_rename",
          capabilities: {
            supportsWorkspaceSearchFallback: true,
            supportsSymbolReferences: true,
            supportsSemanticRename: true,
            supportsVerificationReplay: true,
            supportsArtifactReplay: true,
            supportsProvenanceReplay: true,
            supportsComputerUse: false,
            workspaceSearchFallbackToolKinds: ["rg"],
            semanticToolProviderIds: ["remote_peer"],
            bundles: [],
          },
        });

        expect(
          executionEnvironmentRegistry.getSnapshot({
            sessionKey: "main",
            kind: "scheduled_remote",
          }),
        ).toMatchObject({
          environmentId: "scheduled_remote:main",
          backendId: "remote_peer",
          kind: "scheduled_remote",
        });

        expect(remoteScheduleRuntime.runJob({ jobId: "scheduled-remote-explicit" })).toEqual({
          status: "queued",
          sessionKey: "main",
          environmentId: "scheduled_remote:main",
          environmentKind: "scheduled_remote",
          capabilityMode: "semantic_rename",
        });
        expect(enqueueSystemEvent).toHaveBeenCalledOnce();
        expect(requestHeartbeatNow).toHaveBeenCalledWith({
          reason: "super-remote-schedule",
          sessionKey: "main",
        });

        let liveEmit: ((event: SuperRemoteTransportEnvelope) => void) | undefined;
        const control: TransportControl = {
          emit(event) {
            liveEmit?.(event);
          },
          approvals: [],
          inputs: [],
          interrupted: 0,
          stopped: 0,
        };
        orchestrationRuntime.remoteSessionManager.registerTransportFactory(
          "remote_peer",
          (params) => {
            liveEmit = params.emit;
            return createFakeTransport(control);
          },
        );

        const worker = await orchestrationRuntime.launchWorker({
          runtime: "remote",
          controllerSessionKey: "agent:main:main",
          requesterSessionKey: "agent:main:main",
          task: "Integrated seam test remote task",
          remoteSessionKey: "remote:live",
          remoteCapabilityMode: "semantic_rename",
          remoteCapabilityRequirements: ["semantic_rename", "artifact_replay"],
          remoteSupportsArtifactReplay: true,
        });

        await waitForAssertion(() => {
          expect(orchestrationRuntime.getWorker(worker.workerId)?.state).toBe("running");
        });
        expect(
          executionEnvironmentRegistry.getSnapshot({ workerId: worker.workerId }),
        ).toMatchObject({
          backendId: "remote_peer",
          kind: "remote",
          sessionKey: "remote:live",
        });

        control.emit({
          type: "approval_request",
          requestId: "approval-1",
          toolName: "mcp__rename_symbol",
          input: { from: "OldName", to: "NewName" },
          capabilityRequirements: ["semantic_rename"],
        });
        await waitForAssertion(() => {
          expect(
            orchestrationRuntime.listApprovals({ workerId: worker.workerId, status: "requested" }),
          ).toHaveLength(1);
        });

        expect(
          await orchestrationRuntime.resolveApproval({
            approvalId: "plugin:approval-1",
            decision: "allow-always",
            resolvedBySessionKey: "agent:main:main",
            paramsOverride: { to: "NewName" },
          }),
        ).toBe(true);
        expect(control.approvals).toEqual([
          {
            decision: "approved",
            behavior: "allow_always",
            message: undefined,
            updatedInput: { to: "NewName" },
          },
        ]);

        control.emit({
          type: "terminal",
          summary: "Integrated remote task finished",
          result: "Done",
          verificationOutcome: "verified",
        });
        await waitForAssertion(() => {
          expect(orchestrationRuntime.getWorker(worker.workerId)?.state).toBe("terminal");
        });

        const collected = orchestrationRuntime.collectWorker({ workerId: worker.workerId });
        expect(collected?.worker.backend).toBe("remote_peer");
        expect(collected?.worker.environmentKind).toBe("remote");
        expect(collected?.terminalMessage?.payload).toMatchObject({
          result: "Done",
          workerBackend: "remote_peer",
          environmentKind: "remote",
          remote: true,
        });
        expect(
          stateStore.getActions({ sessionKey: "remote:live" }).map((entry) => entry.actionType),
        ).toEqual(
          expect.arrayContaining([
            "super.remote.capability-negotiation",
            "super.remote.approval-requested",
            "super.remote.approval-resolved",
            "super.remote.terminal",
          ]),
        );
      } finally {
        remoteScheduleRuntime.stop();
        orchestrationRuntime.stop();
        stateStore.close();
      }
    });
  });
});
