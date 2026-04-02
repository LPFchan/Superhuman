import { afterEach, describe, expect, it } from "vitest";
import { withTempDir } from "../test-helpers/temp-dir.js";
import { createSuperExecutionEnvironmentRegistry } from "./super-execution-surfaces.js";
import { startSuperOrchestrationRuntime } from "./super-orchestration-runtime.js";
import {
  startSuperRemoteSessionManager,
  type SuperRemoteSessionTransport,
  type SuperRemoteTransportEnvelope,
} from "./super-remote-session-manager.js";
import { createSuperhumanStateStore } from "./super-state-store.js";

type TransportControl = {
  emit: (event: SuperRemoteTransportEnvelope) => void;
  approvals: Array<unknown>;
  inputs: Array<{ message: string; interrupt?: boolean }>;
  interrupted: number;
  stopped: number;
};

function createEnvironmentRegistry() {
  return createSuperExecutionEnvironmentRegistry({
    shellCapabilityRegistry: {
      getSnapshot: ({ sessionKey }) => ({
        sessionKey,
        agentId: "main",
        mainSessionKey: "main",
        createdAt: Date.now(),
        mode: "semantic_rename",
        supportsSymbolReferences: true,
        supportsSemanticRename: true,
        supportsWorkspaceSearchOnly: true,
        semanticToolProviderIds: ["local"],
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

describe("super-remote-session-manager", () => {
  afterEach(() => {
    delete process.env.OPENCLAW_STATE_DIR;
  });

  it("persists remote lifecycle, approval bridging, and terminal audit state", async () => {
    await withTempDir({ prefix: "openclaw-super-remote-manager-" }, async (workspaceDir) => {
      const stateStore = createSuperhumanStateStore({ workspaceDir });
      const environmentRegistry = createEnvironmentRegistry();
      let emit: ((event: SuperRemoteTransportEnvelope) => void) | undefined;
      const control: TransportControl = {
        emit(event) {
          emit?.(event);
        },
        approvals: [],
        inputs: [],
        interrupted: 0,
        stopped: 0,
      };
      const manager = startSuperRemoteSessionManager({
        workspaceDir,
        stateStore,
        environmentRegistry,
      });
      manager.registerTransportFactory("remote_peer", (params) => {
        emit = params.emit;
        return createFakeTransport(control);
      });

      await manager.launchSession({
        workerId: "worker-1",
        sessionKey: "remote:session-1",
        controllerSessionKey: "agent:main:main",
        requesterSessionKey: "agent:main:main",
        capabilityMode: "semantic_rename",
        capabilityRequirements: ["semantic_rename", "artifact_replay"],
      });

      expect(manager.getSession("worker-1")).toMatchObject({
        state: "connected",
        environment: {
          kind: "remote",
          capabilityMode: "semantic_rename",
        },
      });
      expect(stateStore.getSessionSnapshot("remote:session-1")).toMatchObject({
        executionRole: "remote_peer",
      });

      control.emit({
        type: "approval_request",
        requestId: "approval-1",
        toolName: "mcp__mystery_tool",
        input: { path: "src/index.ts", change: "rename" },
        capabilityRequirements: ["semantic_rename"],
        provenance: { source: "remote" },
        artifact: { artifactId: "artifact-1" },
      });

      expect(manager.getSession("worker-1")?.pendingApprovals).toEqual([
        expect.objectContaining({
          requestId: "approval-1",
          requiresLocalToolStub: true,
        }),
      ]);

      await manager.resolveApproval({
        workerId: "worker-1",
        requestId: "approval-1",
        resolution: {
          decision: "approved",
          behavior: "allow_once",
        },
      });
      expect(control.approvals).toEqual([
        {
          decision: "approved",
          behavior: "allow_once",
        },
      ]);

      control.emit({
        type: "terminal",
        summary: "Remote task complete",
        result: "Everything finished.",
        verificationOutcome: "verified",
        provenance: { source: "remote" },
      });

      expect(manager.getSession("worker-1")).toMatchObject({
        state: "terminal",
      });
      expect(
        stateStore.getActions({ sessionKey: "remote:session-1" }).map((entry) => entry.actionType),
      ).toEqual(
        expect.arrayContaining([
          "super.remote.capability-negotiation",
          "super.remote.approval-requested",
          "super.remote.approval-resolved",
          "super.remote.terminal",
        ]),
      );

      manager.stop();
      stateStore.close();
    });
  });

  it("lets orchestration treat remote_peer like another worker backend", async () => {
    await withTempDir({ prefix: "openclaw-super-remote-orchestration-" }, async (workspaceDir) => {
      process.env.OPENCLAW_STATE_DIR = workspaceDir;
      const stateStore = createSuperhumanStateStore({ workspaceDir });
      const executionEnvironmentRegistry = createEnvironmentRegistry();
      let emit: ((event: SuperRemoteTransportEnvelope) => void) | undefined;
      const control: TransportControl = {
        emit(event) {
          emit?.(event);
        },
        approvals: [],
        inputs: [],
        interrupted: 0,
        stopped: 0,
      };
      const runtime = startSuperOrchestrationRuntime({
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
      runtime.remoteSessionManager.registerTransportFactory("remote_peer", (params) => {
        emit = params.emit;
        return createFakeTransport(control);
      });

      try {
        const worker = await runtime.launchWorker({
          runtime: "remote",
          controllerSessionKey: "agent:main:main",
          requesterSessionKey: "agent:main:main",
          task: "Remote semantic refactor",
          remoteSessionKey: "remote:worker-session",
          remoteCapabilityMode: "semantic_rename",
          remoteCapabilityRequirements: ["semantic_rename", "artifact_replay"],
        });

        await waitForAssertion(() => {
          expect(runtime.getWorker(worker.workerId)?.state).toBe("running");
        });

        expect(
          await runtime.continueWorker({
            workerId: worker.workerId,
            message: "Continue with the refactor.",
          }),
        ).toBe(true);
        expect(control.inputs).toEqual([
          {
            message: "Continue with the refactor.",
            interrupt: undefined,
          },
        ]);

        control.emit({
          type: "approval_request",
          requestId: "remote-plugin-1",
          toolName: "mcp__rename_symbol",
          input: { from: "OldName", to: "NewName" },
          capabilityRequirements: ["semantic_rename"],
        });
        await waitForAssertion(() => {
          expect(
            runtime.listApprovals({ workerId: worker.workerId, status: "requested" }),
          ).toHaveLength(1);
        });

        expect(
          await runtime.resolveApproval({
            approvalId: "plugin:remote-plugin-1",
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

        expect(await runtime.interruptWorker(worker.workerId)).toBe(true);
        expect(control.interrupted).toBe(1);

        control.emit({
          type: "terminal",
          summary: "Remote task finished",
          result: "Done",
        });
        await waitForAssertion(() => {
          expect(runtime.getWorker(worker.workerId)?.state).toBe("terminal");
        });

        const collected = runtime.collectWorker({ workerId: worker.workerId });
        expect(collected?.worker.backend).toBe("remote_peer");
        expect(collected?.terminalMessage?.payload).toMatchObject({
          result: "Done",
          remote: true,
        });
      } finally {
        runtime.stop();
        stateStore.close();
      }
    });
  });
});
