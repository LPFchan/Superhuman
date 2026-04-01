import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextEngine } from "../context-engine/types.js";
import { SuperContextEngineCompactionManager } from "./super-compaction-manager.js";

const hoisted = vi.hoisted(() => ({
  ensureContextEnginesInitializedMock: vi.fn(),
  resolveContextEngineMock: vi.fn(),
  loadSessionEntryMock: vi.fn(),
  loadGatewaySessionRowMock: vi.fn(),
  resolveSessionTranscriptCandidatesMock: vi.fn(),
}));

vi.mock("../context-engine/init.js", () => ({
  ensureContextEnginesInitialized: () => hoisted.ensureContextEnginesInitializedMock(),
}));

vi.mock("../context-engine/registry.js", () => ({
  resolveContextEngine: (...args: unknown[]) => hoisted.resolveContextEngineMock(...args),
}));

vi.mock("../gateway/session-utils.js", () => ({
  loadSessionEntry: (...args: unknown[]) => hoisted.loadSessionEntryMock(...args),
  loadGatewaySessionRow: (...args: unknown[]) => hoisted.loadGatewaySessionRowMock(...args),
}));

vi.mock("../gateway/session-utils.fs.js", () => ({
  resolveSessionTranscriptCandidates: (...args: unknown[]) =>
    hoisted.resolveSessionTranscriptCandidatesMock(...args),
}));

describe("SuperContextEngineCompactionManager", () => {
  const cleanupPaths = new Set<string>();
  const stateStore = {
    getContextPressureSnapshot: vi.fn(),
    recordContextPressureSnapshot: vi.fn(),
  } as unknown as {
    getContextPressureSnapshot: ReturnType<typeof vi.fn>;
    recordContextPressureSnapshot: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    for (const target of cleanupPaths) {
      fs.rmSync(target, { recursive: true, force: true });
    }
    cleanupPaths.clear();
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "superhuman-compaction-manager-"));
    cleanupPaths.add(workspaceDir);
    const transcriptPath = path.join(workspaceDir, "session-1.jsonl");
    fs.writeFileSync(transcriptPath, "", "utf8");

    stateStore.getContextPressureSnapshot.mockReset().mockReturnValue({
      sessionKey: "agent:main:main",
      estimatedInputTokens: 95,
      configuredContextLimit: 200,
      reservedOutputTokens: 32,
      effectiveContextLimit: 168,
      autocompactThreshold: 90,
      blockingThreshold: 120,
      remainingBudget: 73,
      overflowRisk: true,
    });
    stateStore.recordContextPressureSnapshot.mockReset();
    hoisted.ensureContextEnginesInitializedMock.mockReset();
    hoisted.resolveContextEngineMock.mockReset();
    hoisted.loadSessionEntryMock.mockReset().mockReturnValue({
      storePath: "/tmp/sessions.json",
      canonicalKey: "agent:main:main",
      entry: {
        sessionId: "session-1",
        sessionFile: "session-1.jsonl",
      },
    });
    hoisted.loadGatewaySessionRowMock.mockReset().mockReturnValue({
      modelProvider: "openai",
      model: "gpt-5.4",
    });
    hoisted.resolveSessionTranscriptCandidatesMock.mockReset().mockReturnValue([transcriptPath]);
  });

  it("uses the autocompact threshold for shouldCompact", () => {
    const manager = new SuperContextEngineCompactionManager({
      cfg: {},
      workspaceDir: "/tmp/workspace",
      stateStore: stateStore as never,
    });

    expect(manager.shouldCompact("agent:main:main")).toBe(true);
  });

  it("compacts through the active context engine and records the refreshed snapshot", async () => {
    const dispose = vi.fn(async () => undefined);
    const compact = vi.fn(async () => ({
      ok: true,
      compacted: true,
      result: {
        tokensBefore: 95,
        tokensAfter: 40,
      },
    }));
    hoisted.resolveContextEngineMock.mockResolvedValue({
      compact,
      dispose,
    } satisfies Partial<ContextEngine>);

    const manager = new SuperContextEngineCompactionManager({
      cfg: {},
      workspaceDir: "/tmp/workspace",
      stateStore: stateStore as never,
    });

    const result = await manager.compact("agent:main:main");

    expect(result).toMatchObject({ status: "compacted" });
    expect(hoisted.ensureContextEnginesInitializedMock).toHaveBeenCalledOnce();
    expect(compact).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        sessionKey: "agent:main:main",
        sessionFile: expect.stringMatching(/session-1\.jsonl$/),
        tokenBudget: 200,
        currentTokenCount: 95,
        force: false,
        compactionTarget: "threshold",
      }),
    );
    expect(stateStore.recordContextPressureSnapshot).not.toHaveBeenCalled();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("forces budget-mode compaction for overflow recovery", async () => {
    const compact = vi.fn(async () => ({
      ok: true,
      compacted: false,
      reason: "no-op",
      result: {
        tokensBefore: 140,
      },
    }));
    hoisted.resolveContextEngineMock.mockResolvedValue({
      compact,
    } satisfies Partial<ContextEngine>);
    stateStore.getContextPressureSnapshot.mockReturnValue({
      sessionKey: "agent:main:main",
      estimatedInputTokens: 140,
      configuredContextLimit: 200,
      reservedOutputTokens: 32,
      effectiveContextLimit: 168,
      autocompactThreshold: 90,
      blockingThreshold: 120,
      remainingBudget: 28,
      overflowRisk: true,
    });

    const manager = new SuperContextEngineCompactionManager({
      cfg: {},
      workspaceDir: "/tmp/workspace",
      stateStore: stateStore as never,
    });

    const result = await manager.recoverFromOverflow("agent:main:main");

    expect(result).toMatchObject({ status: "skipped", reason: "no-op" });
    expect(compact).toHaveBeenCalledWith(
      expect.objectContaining({
        force: true,
        compactionTarget: "budget",
      }),
    );
  });

  it("returns unavailable when the session transcript cannot be resolved", async () => {
    hoisted.resolveSessionTranscriptCandidatesMock.mockReturnValue([]);

    const manager = new SuperContextEngineCompactionManager({
      cfg: {},
      workspaceDir: "/tmp/workspace",
      stateStore: stateStore as never,
    });

    await expect(manager.compact("agent:main:main")).resolves.toEqual({
      status: "unavailable",
      reason: "transcript-not-found",
    });
    expect(hoisted.resolveContextEngineMock).not.toHaveBeenCalled();
  });
});
