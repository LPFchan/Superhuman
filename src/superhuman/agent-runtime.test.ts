import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SuperhumanAgentRuntimeTurn } from "./agent-runtime.js";
import { createSuperhumanStateStore } from "./state-store.js";

const cleanupPaths = new Set<string>();

afterEach(() => {
  for (const target of cleanupPaths) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  cleanupPaths.clear();
});

describe("SuperhumanAgentRuntimeTurn", () => {
  it("records stages, budgets, and abort nodes in the state store", () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "superhuman-runtime-turn-"));
    cleanupPaths.add(workspaceDir);
    const stateStore = createSuperhumanStateStore({ workspaceDir });
    const turn = new SuperhumanAgentRuntimeTurn({
      workspaceDir,
      runId: "run-1",
      sessionId: "session-1",
      sessionKey: "main",
      mode: "interactive",
      maxIterations: 3,
      stateStore,
    });

    const childBudgetId = turn.createChildBudget({ label: "attempt-1", maxIterations: 1 });
    const childAbortNodeId = turn.createAbortNode({ kind: "attempt", label: "attempt-1" });
    turn.enterStage("prompt_assembly", "boot");
    turn.consumeIteration("attempt 1");
    turn.enterStage("model_call", "attempt 1");
    turn.handleAgentEvent({
      runId: "run-1",
      seq: 1,
      ts: 10,
      sessionKey: "main",
      stream: "tool",
      data: {
        phase: "start",
        name: "bash",
        args: { command: "git reset --hard HEAD" },
      },
    });
    turn.handleAgentEvent({
      runId: "run-1",
      seq: 2,
      ts: 11,
      sessionKey: "main",
      stream: "tool",
      data: {
        phase: "end",
        name: "bash",
      },
    });
    turn.updateChildBudget(childBudgetId, { usedIterations: 1 });
    turn.markAbortNodeCompleted(childAbortNodeId);
    turn.finish("completed");

    expect(stateStore.getRuntimeInvocation("run-1")?.status).toBe("completed");
    expect(stateStore.getIterationBudgets("run-1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "root", usedIterations: 1 }),
        expect.objectContaining({ label: "attempt-1", usedIterations: 1 }),
      ]),
    );
    expect(stateStore.getAbortNodes("run-1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "root", status: "completed" }),
        expect.objectContaining({ label: "attempt-1", status: "completed" }),
      ]),
    );
    expect(stateStore.getRuntimeStageEvents("run-1")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stage: "prompt_assembly", boundary: "enter" }),
        expect.objectContaining({ stage: "tool_execution", boundary: "mark" }),
      ]),
    );

    stateStore.close();
  });

  it("tracks child abort scopes derived from a parent signal", () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "superhuman-runtime-abort-"));
    cleanupPaths.add(workspaceDir);
    const stateStore = createSuperhumanStateStore({ workspaceDir });
    const turn = new SuperhumanAgentRuntimeTurn({
      workspaceDir,
      runId: "run-abort",
      sessionId: "session-abort",
      sessionKey: "main",
      mode: "background",
      maxIterations: 1,
      stateStore,
    });

    const parentAbort = new AbortController();
    const childScope = turn.createAbortScope({
      kind: "attempt",
      label: "attempt-1",
      parentSignal: parentAbort.signal,
    });

    parentAbort.abort("cancelled");
    childScope.dispose();
    turn.finish("aborted", "cancelled");

    expect(stateStore.getAbortNodes("run-abort")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "attempt-1", status: "aborted", reason: "cancelled" }),
      ]),
    );

    stateStore.close();
  });
});
