import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSuperhumanStateStore, resolveSuperhumanStateDbPath } from "./state-store.js";

const cleanupPaths = new Set<string>();

afterEach(() => {
  for (const target of cleanupPaths) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  cleanupPaths.clear();
});

describe("createSuperhumanStateStore", () => {
  it("stores idempotent messages and exposes conversation snapshots", () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "superhuman-state-"));
    cleanupPaths.add(workspaceDir);
    const store = createSuperhumanStateStore({ workspaceDir });

    store.upsertSession({
      sessionKey: "main",
      agentId: "main",
      workspaceDir,
      status: "running",
    });
    store.appendMessage({
      messageId: "main:m1",
      sessionKey: "main",
      role: "user",
      contentText: "hello from user",
      createdAt: 10,
      transcriptMessageId: "m1",
      sequence: 1,
    });
    store.appendMessage({
      messageId: "main:m1",
      sessionKey: "main",
      role: "user",
      contentText: "hello from user",
      createdAt: 10,
      transcriptMessageId: "m1",
      sequence: 1,
    });
    store.appendMessage({
      messageId: "main:m2",
      sessionKey: "main",
      role: "assistant",
      contentText: "assistant reply",
      createdAt: 20,
      transcriptMessageId: "m2",
      sequence: 2,
    });

    const snapshot = store.getSessionSnapshot("main");
    const window = store.getConversationWindow({ sessionKey: "main" });
    const pressure = store.getContextPressureSnapshot({
      sessionKey: "main",
      effectiveContextLimit: 100,
    });

    expect(snapshot?.messageCount).toBe(2);
    expect(snapshot?.lastUserTurnId).toBe("main:m1");
    expect(snapshot?.lastAssistantTurnId).toBe("main:m2");
    expect(window.messages.map((message) => message.messageId)).toEqual(["main:m1", "main:m2"]);
    expect(window.approximateTokenCount).toBeGreaterThan(0);
    expect(pressure.estimatedInputTokens).toBeGreaterThan(0);
    expect(pressure.remainingBudget).toBeLessThan(100);
    expect(fs.existsSync(resolveSuperhumanStateDbPath(workspaceDir))).toBe(true);
    expect(store.getArtifacts()).toEqual([]);

    store.close();
  });

  it("stores runtime invocations, stage events, budgets, and abort nodes", () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "superhuman-runtime-state-"));
    cleanupPaths.add(workspaceDir);
    const store = createSuperhumanStateStore({ workspaceDir });

    store.upsertRuntimeInvocation({
      runId: "run-1",
      sessionId: "session-1",
      sessionKey: "main",
      workspaceDir,
      mode: "interactive",
      status: "running",
      currentStage: "model_call",
      startedAt: 10,
      updatedAt: 15,
      rootBudgetId: "budget:root",
      rootAbortNodeId: "abort:root",
    });
    store.appendRuntimeStageEvent({
      eventId: "evt-1",
      runId: "run-1",
      sessionKey: "main",
      stage: "model_call",
      boundary: "enter",
      detail: "attempt 1",
      createdAt: 11,
    });
    store.upsertIterationBudget({
      budgetId: "budget:root",
      runId: "run-1",
      label: "root",
      maxIterations: 4,
      usedIterations: 1,
      refundedIterations: 0,
      createdAt: 10,
      updatedAt: 11,
    });
    store.upsertAbortNode({
      abortNodeId: "abort:root",
      runId: "run-1",
      kind: "runtime",
      label: "root",
      status: "active",
      createdAt: 10,
      updatedAt: 11,
    });

    expect(store.getRuntimeInvocation("run-1")).toMatchObject({
      sessionKey: "main",
      currentStage: "model_call",
      rootBudgetId: "budget:root",
    });
    expect(store.getRuntimeStageEvents("run-1")).toEqual([
      expect.objectContaining({
        stage: "model_call",
        boundary: "enter",
        detail: "attempt 1",
      }),
    ]);
    expect(store.getIterationBudgets("run-1")).toEqual([
      expect.objectContaining({
        budgetId: "budget:root",
        usedIterations: 1,
      }),
    ]);
    expect(store.getAbortNodes("run-1")).toEqual([
      expect.objectContaining({
        abortNodeId: "abort:root",
        status: "active",
      }),
    ]);

    store.close();
  });
});
