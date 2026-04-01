import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InternalHookEvent } from "../../internal-hooks.js";

const runBootOnce = vi.fn();
const listAgentIds = vi.fn();
const resolveAgentWorkspaceDir = vi.fn();
const recordBootRun = vi.fn();
const logWarn = vi.fn();
const logDebug = vi.fn();
const MAIN_WORKSPACE_DIR = path.join(path.sep, "ws", "main");
const OPS_WORKSPACE_DIR = path.join(path.sep, "ws", "ops");

function createMockLogger() {
  return {
    warn: logWarn,
    debug: logDebug,
    child: vi.fn(() => createMockLogger()),
  };
}

vi.mock("../../../gateway/boot.js", () => ({ runBootOnce }));
vi.mock("../../../agents/agent-scope.js", () => ({
  listAgentIds,
  resolveAgentWorkspaceDir,
}));
vi.mock("../../../logging/subsystem.js", () => ({
  createSubsystemLogger: () => createMockLogger(),
}));
vi.mock("../../../superhuman/super-automation-runtime.js", () => ({
  getActiveSuperAutomationRuntime: () => ({
    recordBootRun,
  }),
}));

const { default: runBootChecklist } = await import("./handler.js");

function makeEvent(overrides?: Partial<InternalHookEvent>): InternalHookEvent {
  return {
    type: "gateway",
    action: "startup",
    sessionKey: "test",
    context: {},
    timestamp: new Date(),
    messages: [],
    ...overrides,
  };
}

describe("boot-md handler", () => {
  function setupTwoAgentBootConfig() {
    const cfg = { agents: { list: [{ id: "main" }, { id: "ops" }] } };
    listAgentIds.mockReturnValue(["main", "ops"]);
    resolveAgentWorkspaceDir.mockImplementation((_cfg: unknown, id: string) =>
      id === "main" ? MAIN_WORKSPACE_DIR : OPS_WORKSPACE_DIR,
    );
    return cfg;
  }

  function setupSingleMainAgentBootConfig(cfg: unknown) {
    listAgentIds.mockReturnValue(["main"]);
    resolveAgentWorkspaceDir.mockReturnValue(MAIN_WORKSPACE_DIR);
    return cfg;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips non-gateway events", async () => {
    await runBootChecklist(makeEvent({ type: "command", action: "new" }));
    expect(runBootOnce).not.toHaveBeenCalled();
  });

  it("skips non-startup actions", async () => {
    await runBootChecklist(makeEvent({ action: "shutdown" }));
    expect(runBootOnce).not.toHaveBeenCalled();
  });

  it("skips when cfg is missing from context", async () => {
    await runBootChecklist(makeEvent({ context: { workspaceDir: "/tmp" } }));
    expect(runBootOnce).not.toHaveBeenCalled();
  });

  it("runs boot for each agent", async () => {
    const cfg = setupTwoAgentBootConfig();
    runBootOnce.mockResolvedValue({ status: "ran" });

    await runBootChecklist(makeEvent({ context: { cfg } }));

    expect(listAgentIds).toHaveBeenCalledWith(cfg);
    expect(runBootOnce).toHaveBeenCalledTimes(2);
    expect(runBootOnce).toHaveBeenCalledWith(
      expect.objectContaining({ cfg, workspaceDir: MAIN_WORKSPACE_DIR, agentId: "main" }),
    );
    expect(runBootOnce).toHaveBeenCalledWith(
      expect.objectContaining({ cfg, workspaceDir: OPS_WORKSPACE_DIR, agentId: "ops" }),
    );
    expect(recordBootRun).toHaveBeenCalledTimes(2);
    expect(recordBootRun).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        agentId: "main",
        result: { status: "ran" },
      }),
    );
    expect(recordBootRun).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        agentId: "ops",
        result: { status: "ran" },
      }),
    );
  });

  it("runs boot for single default agent when no agents configured", async () => {
    const cfg = setupSingleMainAgentBootConfig({});
    runBootOnce.mockResolvedValue({ status: "skipped", reason: "missing" });

    await runBootChecklist(makeEvent({ context: { cfg } }));

    expect(runBootOnce).toHaveBeenCalledTimes(1);
    expect(runBootOnce).toHaveBeenCalledWith(
      expect.objectContaining({ cfg, workspaceDir: MAIN_WORKSPACE_DIR, agentId: "main" }),
    );
  });

  it("logs warning details when a per-agent boot run fails", async () => {
    const cfg = setupTwoAgentBootConfig();
    runBootOnce
      .mockResolvedValueOnce({ status: "ran" })
      .mockResolvedValueOnce({ status: "failed", reason: "agent failed" });

    await runBootChecklist(makeEvent({ context: { cfg } }));

    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(recordBootRun).toHaveBeenCalledTimes(2);
    expect(logWarn).toHaveBeenCalledWith("boot-md failed for agent startup run", {
      agentId: "ops",
      workspaceDir: OPS_WORKSPACE_DIR,
      reason: "agent failed",
    });
  });

  it("logs debug details when a per-agent boot run is skipped", async () => {
    const cfg = setupSingleMainAgentBootConfig({ agents: { list: [{ id: "main" }] } });
    runBootOnce.mockResolvedValue({ status: "skipped", reason: "missing" });

    await runBootChecklist(makeEvent({ context: { cfg } }));

    expect(recordBootRun).toHaveBeenCalledWith({
      agentId: "main",
      result: { status: "skipped", reason: "missing" },
    });
    expect(logDebug).toHaveBeenCalledWith("boot-md skipped for agent startup run", {
      agentId: "main",
      workspaceDir: MAIN_WORKSPACE_DIR,
      reason: "missing",
    });
  });
});
