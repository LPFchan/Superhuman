import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { updateSessionStore } from "../config/sessions/store.js";
import { emitAgentEvent } from "../infra/agent-events.js";
import { emitSessionTranscriptUpdate } from "../sessions/transcript-events.js";
import { SuperSessionPersistenceAdapter } from "./super-session-persistence-adapter.js";
import { createSuperhumanStateStore } from "./super-state-store.js";

const cleanupPaths = new Set<string>();

afterEach(() => {
  for (const target of cleanupPaths) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  cleanupPaths.clear();
});

describe("SuperSessionPersistenceAdapter", () => {
  it("projects lifecycle and transcript updates into the state store", () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "superhuman-adapter-"));
    cleanupPaths.add(workspaceDir);
    const stateStore = createSuperhumanStateStore({ workspaceDir });
    const adapter = new SuperSessionPersistenceAdapter({
      cfg: {
        agents: {
          defaults: {
            workspace: workspaceDir,
          },
        },
      },
      workspaceDir,
      stateStore,
    });

    adapter.start();

    emitAgentEvent({
      runId: "run-1",
      sessionKey: "main",
      stream: "lifecycle",
      data: {
        phase: "start",
        startedAt: 100,
      },
    });
    emitSessionTranscriptUpdate({
      sessionFile: path.join(workspaceDir, "sessions", "main.jsonl"),
      sessionKey: "main",
      messageId: "assistant-1",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "hello from adapter" }],
        timestamp: 110,
      },
    });
    emitAgentEvent({
      runId: "run-1",
      sessionKey: "main",
      stream: "lifecycle",
      data: {
        phase: "end",
        endedAt: 120,
      },
    });

    const session = stateStore.getSessionSnapshot("main");
    const window = stateStore.getConversationWindow({ sessionKey: "main" });
    const pressureSnapshots = stateStore.listContextPressureSnapshots({ sessionKey: "main" });

    expect(session?.status).toBe("done");
    expect(session?.startedAt).toBe(100);
    expect(session?.endedAt).toBe(120);
    expect(session?.messageCount).toBe(1);
    expect(window.messages).toHaveLength(1);
    expect(window.messages[0]?.contentText).toBe("hello from adapter");
    expect(pressureSnapshots).toHaveLength(1);
    expect(pressureSnapshots[0]).toMatchObject({
      runId: "run-1",
      createdAt: 120,
    });
    expect(pressureSnapshots[0]?.configuredContextLimit).toBeGreaterThan(0);
    expect(pressureSnapshots[0]?.reservedOutputTokens).toBeGreaterThan(0);
    expect(stateStore.getArtifacts({ sessionKey: "main" })).toEqual([
      expect.objectContaining({
        sessionKey: "main",
        kind: "transcript-file",
      }),
    ]);

    adapter.stop();
    stateStore.close();
  });

  it("captures sessions created through session store mutations and stays idempotent across restarts", async () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "superhuman-adapter-store-"));
    cleanupPaths.add(workspaceDir);
    const sessionsDir = path.join(workspaceDir, ".openclaw-sessions");
    const storePath = path.join(sessionsDir, "sessions.json");
    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
        },
      },
    };
    const stateStore = createSuperhumanStateStore({ workspaceDir });
    const adapter = new SuperSessionPersistenceAdapter({
      cfg,
      workspaceDir,
      stateStore,
    });

    adapter.start();
    await updateSessionStore(storePath, (store) => {
      store.main = {
        sessionId: "run-store-1",
        updatedAt: 1,
        status: "running",
        label: "Main Session",
      };
    });

    const initialSnapshot = stateStore.getSessionSnapshot("main");
    expect(initialSnapshot?.sessionId).toBe("run-store-1");
    expect(initialSnapshot?.label).toBe("Main Session");

    emitSessionTranscriptUpdate({
      sessionFile: path.join(workspaceDir, "sessions", "main.jsonl"),
      sessionKey: "main",
      messageId: "assistant-restart",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "restart safe" }],
        timestamp: 210,
      },
    });
    adapter.stop();

    const restarted = new SuperSessionPersistenceAdapter({
      cfg,
      workspaceDir,
      stateStore,
    });
    restarted.start();
    emitSessionTranscriptUpdate({
      sessionFile: path.join(workspaceDir, "sessions", "main.jsonl"),
      sessionKey: "main",
      messageId: "assistant-restart",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "restart safe" }],
        timestamp: 210,
      },
    });

    const window = stateStore.getConversationWindow({ sessionKey: "main" });
    expect(window.messages).toHaveLength(1);
    expect(window.messages[0]?.contentText).toBe("restart safe");

    restarted.stop();
    stateStore.close();
  });
});
