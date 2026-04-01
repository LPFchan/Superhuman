import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getActiveSuperAutomationRuntime } from "./super-automation-runtime.js";
import { startSuperhumanGatewayRuntime } from "./super-gateway-runtime.js";

const cleanupPaths = new Set<string>();

vi.mock("../channels/plugins/index.js", () => ({
  listChannelPlugins: () => [],
}));

vi.mock("./super-orchestration-runtime.js", () => ({
  startSuperOrchestrationRuntime: () => ({
    stop: vi.fn(),
  }),
  getActiveSuperOrchestrationRuntime: () => null,
}));

vi.mock("../gateway/boot.js", () => ({
  runBootOnce: vi.fn(),
}));

afterEach(() => {
  for (const target of cleanupPaths) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  cleanupPaths.clear();
});

describe("startSuperhumanGatewayRuntime", () => {
  it("starts and stops the automation runtime with the gateway runtime", () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "super-gateway-runtime-"));
    cleanupPaths.add(workspaceDir);

    const runtime = startSuperhumanGatewayRuntime({
      cfg: {},
      deps: {} as never,
      workspaceDir,
      pluginRegistry: {} as never,
    });

    expect(runtime.automationRuntime).toBeDefined();
    expect(runtime.notificationCenter).toBeDefined();
    expect(runtime.subscriptionManager).toBeDefined();
    expect(runtime.remoteScheduleRuntime).toBeDefined();
    expect(getActiveSuperAutomationRuntime()).toBe(runtime.automationRuntime);

    runtime.stop();

    expect(getActiveSuperAutomationRuntime()).toBeNull();
  });
});
