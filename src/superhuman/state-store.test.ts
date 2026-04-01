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
});
