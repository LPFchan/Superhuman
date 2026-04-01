import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SessionManager } from "@mariozechner/pi-coding-agent";
import { afterEach, describe, expect, it } from "vitest";
import { ManagedContextEngine } from "./managed-context-engine.js";

const cleanupPaths = new Set<string>();

afterEach(() => {
  for (const target of cleanupPaths) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  cleanupPaths.clear();
});

describe("ManagedContextEngine", () => {
  it("projects committed collapse summaries at read time", async () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "managed-context-engine-"));
    cleanupPaths.add(workspaceDir);
    const sessionFile = path.join(workspaceDir, "session.jsonl");
    const sessionManager = SessionManager.open(sessionFile);

    for (let index = 0; index < 20; index += 1) {
      if (index % 2 === 0) {
        sessionManager.appendMessage({
          role: "user",
          content: [{ type: "text", text: `message ${index}` }],
          timestamp: index + 1,
        });
      } else {
        sessionManager.appendMessage({
          role: "assistant",
          content: [{ type: "text", text: `message ${index}` }],
          timestamp: index + 1,
          api: "openai-responses",
          provider: "openclaw",
          model: "test-model",
          stopReason: "stop",
          usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              total: 0,
            },
          },
        });
      }
    }

    const engine = new ManagedContextEngine();
    const branchMessages = sessionManager
      .getBranch()
      .filter((entry) => entry.type === "message")
      .map((entry) => entry.message);

    await engine.afterTurn({
      sessionId: "session-1",
      sessionKey: "main",
      sessionFile,
      messages: branchMessages,
      prePromptMessageCount: branchMessages.length,
      runtimeContext: { workspaceDir },
    });

    const compacted = await engine.compact({
      sessionId: "session-1",
      sessionKey: "main",
      sessionFile,
      tokenBudget: 64,
      force: true,
      runtimeContext: { workspaceDir },
    });
    expect(compacted.ok).toBe(true);
    expect(compacted.compacted).toBe(true);
    expect(compacted.result?.details).toMatchObject({
      recoveryMode: "collapse",
      visibleContextState: "mixed",
      droppedSpans: expect.any(Array),
    });

    const assembled = await engine.assemble({
      sessionId: "session-1",
      sessionKey: "main",
      messages: branchMessages,
      runtimeContext: { workspaceDir, sessionFile },
    });

    expect(assembled.messages.length).toBeLessThan(branchMessages.length);
    expect(JSON.stringify(assembled.messages[0])).toContain("Collapsed conversation summary");
    expect(assembled.systemPromptAddition).toContain("Visible context source state:");
  });
});
