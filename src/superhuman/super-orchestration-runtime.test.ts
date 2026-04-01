import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTaskRecord,
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

        const firstTask = findTaskByRunId("run-1");
        expect(firstTask?.orchestration?.stableWorkerId).toBe(worker1.workerId);
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
      } finally {
        runtime.stop();
      }
    });
  });
});
