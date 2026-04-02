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
    remoteSessionManager: {
      setEventHandler: vi.fn(),
      registerTransportFactory: vi.fn(),
      launchSession: vi.fn(),
      listSessions: vi.fn(() => []),
      getSession: vi.fn(() => null),
      listEvents: vi.fn(() => []),
      continueSession: vi.fn(),
      interruptSession: vi.fn(),
      stopSession: vi.fn(),
      resolveApproval: vi.fn(),
      stop: vi.fn(),
    },
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
  vi.unstubAllEnvs();
});

describe("startSuperhumanGatewayRuntime", () => {
  it("starts and stops the automation runtime with the gateway runtime", () => {
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "super-gateway-runtime-"));
    cleanupPaths.add(workspaceDir);

    const runtime = startSuperhumanGatewayRuntime({
      cfg: {
        agents: {
          defaults: {
            sandbox: { mode: "all", scope: "agent" },
          },
        },
        tools: {
          sandbox: {
            tools: {
              allow: ["read"],
              deny: ["browser"],
            },
          },
        },
      },
      deps: {} as never,
      workspaceDir,
      pluginRegistry: {
        plugins: [
          {
            id: "lsp-demo",
            name: "LSP Demo",
            description: "semantic tools",
            kind: ["tool"],
            channelIds: [],
            commands: [],
            services: [],
            toolNames: ["lsp_references_typescript", "symbol_rename"],
            bundleCapabilities: [],
          },
        ],
      } as never,
    });

    expect(runtime.automationRuntime).toBeDefined();
    expect(runtime.notificationCenter).toBeDefined();
    expect(runtime.subscriptionManager).toBeDefined();
    expect(runtime.remoteScheduleRuntime).toBeDefined();
    expect(getActiveSuperAutomationRuntime()).toBe(runtime.automationRuntime);
    expect(runtime.pluginRegistry.getShellContracts()).toEqual([
      expect.objectContaining({
        id: "lsp-demo",
        providesSymbolReferences: true,
        providesSemanticRename: true,
      }),
    ]);
    expect(runtime.executionEnvironmentRegistry.getSnapshot({ sessionKey: "main" })).toMatchObject({
      kind: "local",
      backendId: "local",
    });
    expect(runtime.executionProviderRegistry.getPreferredProvider()).toMatchObject({
      id: "default",
    });
    expect(runtime.executionBackendRegistry.getBackend("remote_peer")).toMatchObject({
      supportsRemoteSessions: true,
    });
    expect(runtime.computerUseRuntime.isEnabled()).toBe(false);
    expect(runtime.computerUseRuntime.canUseInMode("interactive")).toBe(false);
    expect(runtime.computerUseRuntime.canUseInMode("scheduled")).toBe(false);
    expect(
      runtime.sandboxRuntimeRegistry.evaluateTool({
        sessionKey: "main",
        toolName: "browser",
      }),
    ).toMatchObject({
      allowed: false,
      reason: "blocked_by_deny",
      blockedBy: "deny",
    });

    runtime.stop();

    expect(getActiveSuperAutomationRuntime()).toBeNull();
  });

  it("enables computer-use only when the rollout gate is set", () => {
    vi.stubEnv("OPENCLAW_SUPERHUMAN_COMPUTER_USE", "true");
    const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "super-gateway-runtime-cu-"));
    cleanupPaths.add(workspaceDir);

    const runtime = startSuperhumanGatewayRuntime({
      cfg: {
        agents: {
          defaults: {
            sandbox: { mode: "all", scope: "agent" },
          },
        },
      } as never,
      deps: {} as never,
      workspaceDir,
      pluginRegistry: {
        plugins: [],
      } as never,
    });

    expect(runtime.computerUseRuntime.isEnabled()).toBe(true);
    expect(runtime.computerUseRuntime.canUseInMode("interactive")).toBe(true);

    runtime.stop();
  });
});
