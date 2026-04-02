import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTaskRecord,
  getTaskById,
  findTaskByRunId,
  markTaskTerminalById,
  resetTaskRegistryForTests,
} from "../tasks/task-registry.js";
import { withTempDir } from "../test-helpers/temp-dir.js";
import { startSuperOrchestrationRuntime } from "./super-orchestration-runtime.js";

const ORIGINAL_STATE_DIR = process.env.OPENCLAW_STATE_DIR;

const hoisted = vi.hoisted(() => ({
  subagentSpawnMock: vi.fn(),
  acpSpawnMock: vi.fn(),
  callGatewayMock: vi.fn(async (_params?: unknown) => ({})),
}));

vi.mock(import("../agents/subagent-spawn.js"), async (importOriginal) => {
  const actual = await importOriginal<typeof import("../agents/subagent-spawn.js")>();
  return {
    ...actual,
    spawnSubagentDirect: (...args: unknown[]) => hoisted.subagentSpawnMock(args[0], args[1]),
  };
});

vi.mock("../agents/acp-spawn.js", () => ({
  spawnAcpDirect: (...args: unknown[]) => hoisted.acpSpawnMock(args[0], args[1]),
}));

vi.mock("../gateway/call.js", () => ({
  callGateway: (...args: unknown[]) => hoisted.callGatewayMock(args[0]),
}));

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

describe("orchestration-runtime", () => {
  afterEach(() => {
    hoisted.subagentSpawnMock.mockReset();
    hoisted.acpSpawnMock.mockReset();
    hoisted.callGatewayMock.mockClear();
    if (ORIGINAL_STATE_DIR === undefined) {
      delete process.env.OPENCLAW_STATE_DIR;
    } else {
      process.env.OPENCLAW_STATE_DIR = ORIGINAL_STATE_DIR;
    }
    resetTaskRegistryForTests();
  });

  it("queues excess workers and starts the next one after terminal completion", async () => {
    await withTempDir({ prefix: "openclaw-orchestration-runtime-" }, async (root) => {
      process.env.OPENCLAW_STATE_DIR = root;
      let spawnCount = 0;
      hoisted.subagentSpawnMock.mockImplementation(
        async (
          params: { task: string },
          ctx: {
            agentSessionKey?: string;
          },
        ) => {
          spawnCount += 1;
          const runId = `run-${spawnCount}`;
          const childSessionKey = `agent:main:subagent:child-${spawnCount}`;
          createTaskRecord({
            runtime: "subagent",
            ownerKey: ctx.agentSessionKey ?? "agent:main:main",
            requesterSessionKey: ctx.agentSessionKey,
            scopeKind: "session",
            childSessionKey,
            runId,
            task: params.task,
            status: "running",
            startedAt: Date.now(),
          });
          return {
            status: "accepted",
            childSessionKey,
            runId,
            mode: "run",
          };
        },
      );

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
        workspaceDir: root,
      });

      try {
        const worker1 = await runtime.launchWorker({
          runtime: "subagent",
          controllerSessionKey: "agent:main:main",
          requesterSessionKey: "agent:main:main",
          task: "First delegated task",
        });
        const worker2 = await runtime.launchWorker({
          runtime: "subagent",
          controllerSessionKey: "agent:main:main",
          requesterSessionKey: "agent:main:main",
          task: "Second delegated task",
        });

        await waitForAssertion(() => {
          expect(runtime.getWorker(worker1.workerId)?.state).toBe("running");
          expect(runtime.getWorker(worker2.workerId)?.state).toBe("queued");
        });

        const queuedMessage = runtime
          .listMailboxMessages("agent:main:main")
          .find(
            (message) => message.workerId === worker2.workerId && message.kind === "worker_queued",
          );
        expect(queuedMessage?.text).toContain("<status>queued</status>");

        const firstTask = findTaskByRunId("run-1");
        expect(firstTask?.orchestration?.stableWorkerId).toBe(worker1.workerId);
        expect(firstTask?.orchestration).toMatchObject({
          queueDelayMs: expect.any(Number),
          spawnCount: 1,
          budgetUsed: 0,
          concurrencySlot: 1,
        });
        expect(findTaskByRunId("run-2")).toBeUndefined();

        markTaskTerminalById({
          taskId: firstTask?.taskId ?? "",
          status: "succeeded",
          endedAt: Date.now(),
          terminalSummary: "Finished successfully.",
        });

        await waitForAssertion(() => {
          expect(runtime.getWorker(worker1.workerId)?.state).toBe("terminal");
          expect(runtime.getWorker(worker2.workerId)?.state).toBe("running");
        });

        const mailbox = runtime.listMailboxMessages("agent:main:main");
        expect(mailbox.some((message) => message.kind === "worker_terminal")).toBe(true);
        expect(mailbox.some((message) => message.text.includes("<task-notification>"))).toBe(true);
      } finally {
        runtime.stop();
      }
    });
  });

  it("refuses workers once both concurrency and queue caps are full with a durable refusal record", async () => {
    await withTempDir({ prefix: "openclaw-orchestration-runtime-" }, async (root) => {
      process.env.OPENCLAW_STATE_DIR = root;
      let spawnCount = 0;
      hoisted.subagentSpawnMock.mockImplementation(
        async (
          params: { task: string },
          ctx: {
            agentSessionKey?: string;
          },
        ) => {
          spawnCount += 1;
          const runId = `run-${spawnCount}`;
          const childSessionKey = `agent:main:subagent:child-${spawnCount}`;
          createTaskRecord({
            runtime: "subagent",
            ownerKey: ctx.agentSessionKey ?? "agent:main:main",
            requesterSessionKey: ctx.agentSessionKey,
            scopeKind: "session",
            childSessionKey,
            runId,
            task: params.task,
            status: "running",
            startedAt: Date.now(),
          });
          return {
            status: "accepted",
            childSessionKey,
            runId,
            mode: "run",
          };
        },
      );

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
        workspaceDir: root,
      });

      try {
        const worker1 = await runtime.launchWorker({
          runtime: "subagent",
          controllerSessionKey: "agent:main:main",
          requesterSessionKey: "agent:main:main",
          task: "First delegated task",
        });
        const worker2 = await runtime.launchWorker({
          runtime: "subagent",
          controllerSessionKey: "agent:main:main",
          requesterSessionKey: "agent:main:main",
          task: "Second delegated task",
        });
        const worker3 = await runtime.launchWorker({
          runtime: "subagent",
          controllerSessionKey: "agent:main:main",
          requesterSessionKey: "agent:main:main",
          task: "Third delegated task",
        });

        await waitForAssertion(() => {
          expect(runtime.getWorker(worker1.workerId)?.state).toBe("running");
          expect(runtime.getWorker(worker2.workerId)?.state).toBe("queued");
          expect(["refused", "terminal"]).toContain(runtime.getWorker(worker3.workerId)?.state);
        });

        const refusedWorker = runtime.getWorker(worker3.workerId);
        expect(refusedWorker?.refusalReason).toBe("queue_cap_reached");
        const refusedTask = getTaskById(refusedWorker?.taskId ?? "");
        expect(refusedTask?.status).toBe("failed");
        expect(refusedTask?.orchestration).toMatchObject({
          queueState: "refused",
          refusalReason: "queue_cap_reached",
          stableWorkerId: worker3.workerId,
        });

        const mailbox = runtime.listMailboxMessages("agent:main:main");
        const refusalMessage = mailbox.find(
          (message) =>
            message.workerId === worker3.workerId &&
            message.payload &&
            "refusalReason" in message.payload,
        );
        expect(refusalMessage?.text).toContain("<status>refused</status>");
        expect(refusalMessage?.payload).toMatchObject({
          refusalReason: "queue_cap_reached",
          maxConcurrentWorkersPerLead: 1,
          maxQueuedWorkersPerLead: 1,
        });
      } finally {
        runtime.stop();
      }
    });
  });

  it("distinguishes continue, interrupt, stop, and collect worker controls", async () => {
    await withTempDir({ prefix: "openclaw-orchestration-runtime-" }, async (root) => {
      process.env.OPENCLAW_STATE_DIR = root;
      let spawnCount = 0;
      hoisted.subagentSpawnMock.mockImplementation(
        async (
          params: { task: string },
          ctx: {
            agentSessionKey?: string;
          },
        ) => {
          spawnCount += 1;
          const runId = `run-${spawnCount}`;
          const childSessionKey = `agent:main:subagent:child-${spawnCount}`;
          createTaskRecord({
            runtime: "subagent",
            ownerKey: ctx.agentSessionKey ?? "agent:main:main",
            requesterSessionKey: ctx.agentSessionKey,
            scopeKind: "session",
            childSessionKey,
            runId,
            task: params.task,
            status: "running",
            startedAt: Date.now(),
          });
          return {
            status: "accepted",
            childSessionKey,
            runId,
            mode: "run",
          };
        },
      );

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
        workspaceDir: root,
      });

      try {
        const worker1 = await runtime.launchWorker({
          runtime: "subagent",
          controllerSessionKey: "agent:main:main",
          requesterSessionKey: "agent:main:main",
          task: "First delegated task",
        });
        const worker2 = await runtime.launchWorker({
          runtime: "subagent",
          controllerSessionKey: "agent:main:main",
          requesterSessionKey: "agent:main:main",
          task: "Second delegated task",
        });

        await waitForAssertion(() => {
          expect(runtime.getWorker(worker1.workerId)?.state).toBe("running");
          expect(runtime.getWorker(worker2.workerId)?.state).toBe("queued");
        });

        hoisted.callGatewayMock.mockClear();

        expect(
          await runtime.continueWorker({
            workerId: worker1.workerId,
            message: "Keep going and summarize your progress.",
          }),
        ).toBe(true);
        expect(
          hoisted.callGatewayMock.mock.calls.some(
            ([call]) =>
              call &&
              typeof call === "object" &&
              "method" in call &&
              call.method === "sessions.send",
          ),
        ).toBe(true);

        expect(await runtime.interruptWorker(worker1.workerId)).toBe(true);
        expect(
          hoisted.callGatewayMock.mock.calls.some(
            ([call]) =>
              call &&
              typeof call === "object" &&
              "method" in call &&
              call.method === "sessions.abort",
          ),
        ).toBe(true);

        hoisted.callGatewayMock.mockClear();
        expect(await runtime.stopWorker(worker2.workerId)).toBe(true);
        expect(hoisted.callGatewayMock).not.toHaveBeenCalled();

        await waitForAssertion(() => {
          expect(runtime.getWorker(worker2.workerId)?.state).toBe("terminal");
          expect(getTaskById(runtime.getWorker(worker2.workerId)?.taskId ?? "")?.status).toBe(
            "cancelled",
          );
        });

        const collected = runtime.collectWorker({ workerId: worker2.workerId });
        expect(collected?.worker.lastControlAction).toBe("collect");
        expect(collected?.worker.lastCollectedAt).toEqual(expect.any(Number));
        expect(collected?.terminalMessage?.text).toContain("<status>killed</status>");

        const mailbox = runtime.listMailboxMessages("agent:main:main");
        const controlActions = mailbox
          .filter((message) => message.kind === "worker_control")
          .map((message) => message.payload?.action);
        expect(controlActions).toEqual(
          expect.arrayContaining(["continue", "interrupt", "stop", "collect"]),
        );
      } finally {
        runtime.stop();
      }
    });
  });

  it("routes approval decisions through orchestration and keeps mailbox audit records", async () => {
    await withTempDir({ prefix: "openclaw-orchestration-runtime-" }, async (root) => {
      process.env.OPENCLAW_STATE_DIR = root;
      hoisted.subagentSpawnMock.mockImplementation(
        async (
          params: { task: string },
          ctx: {
            agentSessionKey?: string;
          },
        ) => {
          createTaskRecord({
            runtime: "subagent",
            ownerKey: ctx.agentSessionKey ?? "agent:main:main",
            requesterSessionKey: ctx.agentSessionKey,
            scopeKind: "session",
            childSessionKey: "agent:main:subagent:child-1",
            runId: "run-1",
            task: params.task,
            status: "running",
            startedAt: Date.now(),
          });
          return {
            status: "accepted",
            childSessionKey: "agent:main:subagent:child-1",
            runId: "run-1",
            mode: "run",
          };
        },
      );

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
        workspaceDir: root,
      });

      try {
        const worker = await runtime.launchWorker({
          runtime: "subagent",
          controllerSessionKey: "agent:main:main",
          requesterSessionKey: "agent:main:main",
          task: "Approval-driven delegated task",
        });

        await waitForAssertion(() => {
          expect(runtime.getWorker(worker.workerId)?.state).toBe("running");
        });

        await runtime.recordApprovalRequested({
          kind: "exec",
          requestId: "req-1",
          sessionKey: "agent:main:subagent:child-1",
          payload: {
            command: "ls",
          },
        });

        expect(
          runtime.listApprovals({ workerId: worker.workerId, status: "requested" }),
        ).toHaveLength(1);

        hoisted.callGatewayMock.mockClear();
        expect(
          await runtime.resolveApproval({
            approvalId: "exec:req-1",
            decision: "allow-once",
            resolvedBySessionKey: "agent:main:main",
            note: "Approved from coordinator runtime",
          }),
        ).toBe(true);

        expect(hoisted.callGatewayMock).toHaveBeenCalledWith(
          expect.objectContaining({
            method: "exec.approval.resolve",
            params: {
              id: "req-1",
              decision: "allow-once",
            },
          }),
        );

        const decisionAudit = runtime
          .listMailboxMessages("agent:main:main")
          .find((message) => message.kind === "approval_decision");
        expect(decisionAudit?.payload).toMatchObject({
          approvalId: "exec:req-1",
          decision: "allow-once",
          status: "approved",
          note: "Approved from coordinator runtime",
        });

        await runtime.recordApprovalResolved({
          kind: "exec",
          requestId: "req-1",
          sessionKey: "agent:main:subagent:child-1",
          status: "approved",
          payload: {
            decision: "allow-once",
          },
        });

        const approval = runtime.listApprovals({
          workerId: worker.workerId,
          status: "approved",
        })[0];
        expect(approval?.history.map((entry) => entry.status)).toEqual(["requested", "approved"]);
      } finally {
        runtime.stop();
      }
    });
  });

  it("routes plugin approval overrides through orchestration", async () => {
    await withTempDir({ prefix: "openclaw-orchestration-runtime-" }, async (root) => {
      process.env.OPENCLAW_STATE_DIR = root;
      hoisted.subagentSpawnMock.mockImplementation(
        async (
          params: { task: string },
          ctx: {
            agentSessionKey?: string;
          },
        ) => {
          createTaskRecord({
            runtime: "subagent",
            ownerKey: ctx.agentSessionKey ?? "agent:main:main",
            requesterSessionKey: ctx.agentSessionKey,
            scopeKind: "session",
            childSessionKey: "agent:main:subagent:child-plugin",
            runId: "run-plugin-1",
            task: params.task,
            status: "running",
            startedAt: Date.now(),
          });
          return {
            status: "accepted",
            childSessionKey: "agent:main:subagent:child-plugin",
            runId: "run-plugin-1",
            mode: "run",
          };
        },
      );

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
        workspaceDir: root,
      });

      try {
        const worker = await runtime.launchWorker({
          runtime: "subagent",
          controllerSessionKey: "agent:main:main",
          requesterSessionKey: "agent:main:main",
          task: "Plugin approval delegated task",
        });

        await waitForAssertion(() => {
          expect(runtime.getWorker(worker.workerId)?.state).toBe("running");
        });

        await runtime.recordApprovalRequested({
          kind: "plugin",
          requestId: "plugin:req-1",
          sessionKey: "agent:main:subagent:child-plugin",
          payload: {
            title: "Write file",
            proposedParams: { path: "/etc/passwd", contents: "hello" },
            allowedParamOverrideKeys: ["path"],
          },
        });

        hoisted.callGatewayMock.mockClear();
        expect(
          await runtime.resolveApproval({
            approvalId: "plugin:plugin:req-1",
            decision: "allow-once",
            resolvedBySessionKey: "agent:main:main",
            paramsOverride: { path: "/tmp/safe" },
            feedback: "Use the sandbox path instead.",
          }),
        ).toBe(true);

        expect(hoisted.callGatewayMock).toHaveBeenCalledWith(
          expect.objectContaining({
            method: "plugin.approval.resolve",
            params: {
              id: "plugin:req-1",
              decision: "allow-once",
              paramsOverride: { path: "/tmp/safe" },
              feedback: "Use the sandbox path instead.",
            },
          }),
        );

        const decisionAudit = runtime
          .listMailboxMessages("agent:main:main")
          .find((message) => message.kind === "approval_decision");
        expect(decisionAudit?.payload).toMatchObject({
          approvalId: "plugin:plugin:req-1",
          decision: "allow-once",
          paramsOverride: { path: "/tmp/safe" },
          feedback: "Use the sandbox path instead.",
        });
      } finally {
        runtime.stop();
      }
    });
  });

  it("routes exec approval adjustments through orchestration", async () => {
    await withTempDir({ prefix: "openclaw-orchestration-runtime-" }, async (root) => {
      process.env.OPENCLAW_STATE_DIR = root;
      hoisted.subagentSpawnMock.mockImplementation(
        async (
          params: { task: string },
          ctx: {
            agentSessionKey?: string;
          },
        ) => {
          createTaskRecord({
            runtime: "subagent",
            ownerKey: ctx.agentSessionKey ?? "agent:main:main",
            requesterSessionKey: ctx.agentSessionKey,
            scopeKind: "session",
            childSessionKey: "agent:main:subagent:child-exec",
            runId: "run-exec-1",
            task: params.task,
            status: "running",
            startedAt: Date.now(),
          });
          return {
            status: "accepted",
            childSessionKey: "agent:main:subagent:child-exec",
            runId: "run-exec-1",
            mode: "run",
          };
        },
      );

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
        workspaceDir: root,
      });

      try {
        const worker = await runtime.launchWorker({
          runtime: "subagent",
          controllerSessionKey: "agent:main:main",
          requesterSessionKey: "agent:main:main",
          task: "Exec approval delegated task",
        });

        await waitForAssertion(() => {
          expect(runtime.getWorker(worker.workerId)?.state).toBe("running");
        });

        await runtime.recordApprovalRequested({
          kind: "exec",
          requestId: "req-exec-2",
          sessionKey: "agent:main:subagent:child-exec",
          payload: {
            command: "rm -rf /tmp/demo",
            cwd: "/tmp",
            allowedResolutionKeys: ["command", "cwd"],
          },
        });

        hoisted.callGatewayMock.mockClear();
        expect(
          await runtime.resolveApproval({
            approvalId: "exec:req-exec-2",
            decision: "allow-once",
            resolvedBySessionKey: "agent:main:main",
            command: "pwd",
            cwd: "/safe",
            feedback: "Use the safer command and cwd.",
          }),
        ).toBe(true);

        expect(hoisted.callGatewayMock).toHaveBeenCalledWith(
          expect.objectContaining({
            method: "exec.approval.resolve",
            params: {
              id: "req-exec-2",
              decision: "allow-once",
              command: "pwd",
              cwd: "/safe",
              feedback: "Use the safer command and cwd.",
            },
          }),
        );
      } finally {
        runtime.stop();
      }
    });
  });
});
