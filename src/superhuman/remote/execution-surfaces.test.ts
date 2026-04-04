import { describe, expect, it } from "vitest";
import {
  createSuperExecutionEnvironmentRegistry,
  createSuperExecutionProviderRegistry,
  resolveSuperComputerUseRolloutEnabled,
  startSuperComputerUseRuntime,
} from "./execution-surfaces.js";

describe("super-execution-surfaces", () => {
  it("builds explicit environment snapshots by kind", () => {
    const providerRegistry = {
      getPreferredProvider: () => ({ id: "anthropic" }),
    };
    const registry = createSuperExecutionEnvironmentRegistry({
      shellCapabilityRegistry: {
        getSnapshot: ({ sessionKey }) => ({
          sessionKey,
          agentId: "main",
          mainSessionKey: "main",
          createdAt: 1,
          mode: "semantic_rename",
          supportsSymbolReferences: true,
          supportsSemanticRename: true,
          supportsWorkspaceSearchOnly: true,
          semanticToolProviderIds: ["lsp-demo"],
          workspaceSearchFallbackToolKinds: ["rg"],
        }),
      },
      resolveProviderId: ({ sessionKey }) =>
        sessionKey === "main" ? providerRegistry.getPreferredProvider().id : undefined,
    });

    expect(registry.getSnapshot({ sessionKey: "main", kind: "local" })).toMatchObject({
      kind: "local",
      backendId: "local",
      providerId: "anthropic",
      capabilityMode: "semantic_rename",
      capabilities: {
        supportsSemanticRename: true,
        supportsArtifactReplay: true,
      },
    });
    expect(registry.getSnapshot({ sessionKey: "main", kind: "scheduled_remote" })).toBeNull();
    expect(registry.getSnapshot({ sessionKey: "main", kind: "remote" })).toBeNull();
  });

  it("treats undeclared replay capabilities as unavailable until a remote snapshot declares them", () => {
    const registry = createSuperExecutionEnvironmentRegistry({
      shellCapabilityRegistry: {
        getSnapshot: ({ sessionKey }) => ({
          sessionKey,
          agentId: "main",
          mainSessionKey: "main",
          createdAt: 1,
          mode: "workspace_search_only",
          supportsSymbolReferences: false,
          supportsSemanticRename: false,
          supportsWorkspaceSearchOnly: true,
          semanticToolProviderIds: [],
          workspaceSearchFallbackToolKinds: ["rg"],
        }),
      },
    });

    registry.upsertSnapshot({
      environmentId: "remote:worker-1",
      workerId: "worker-1",
      sessionKey: "remote:session-1",
      label: "Remote peer",
      kind: "remote",
      backendId: "remote_peer",
      createdAt: 1,
      updatedAt: 1,
      capabilityMode: "workspace_search_only",
      capabilities: {
        supportsWorkspaceSearchFallback: true,
        supportsSymbolReferences: false,
        supportsSemanticRename: false,
        supportsVerificationReplay: false,
        supportsArtifactReplay: false,
        supportsProvenanceReplay: false,
        supportsComputerUse: false,
        workspaceSearchFallbackToolKinds: ["read"],
        semanticToolProviderIds: [],
        bundles: [],
      },
    });

    expect(registry.getSnapshot({ workerId: "worker-1" })).toMatchObject({
      kind: "remote",
      capabilities: {
        supportsVerificationReplay: false,
        supportsArtifactReplay: false,
        supportsProvenanceReplay: false,
      },
    });
    expect(registry.getSnapshot({ sessionKey: "remote:session-1", kind: "remote" })).toMatchObject({
      kind: "remote",
      sessionKey: "remote:session-1",
      capabilities: {
        supportsVerificationReplay: false,
        supportsArtifactReplay: false,
        supportsProvenanceReplay: false,
      },
    });
  });

  it("keeps scheduled_remote as an environment kind while canonicalizing its backend to remote_peer", () => {
    const registry = createSuperExecutionEnvironmentRegistry({
      shellCapabilityRegistry: {
        getSnapshot: ({ sessionKey }) => ({
          sessionKey,
          agentId: "main",
          mainSessionKey: "main",
          createdAt: 1,
          mode: "workspace_search_only",
          supportsSymbolReferences: false,
          supportsSemanticRename: false,
          supportsWorkspaceSearchOnly: true,
          semanticToolProviderIds: [],
          workspaceSearchFallbackToolKinds: ["rg"],
        }),
      },
    });

    registry.upsertSnapshot({
      environmentId: "scheduled_remote:main",
      sessionKey: "main",
      label: "Scheduled remote (main)",
      kind: "scheduled_remote",
      backendId: "remote_peer",
      createdAt: 1,
      updatedAt: 1,
      capabilityMode: "workspace_search_only",
      capabilities: {
        supportsWorkspaceSearchFallback: true,
        supportsSymbolReferences: false,
        supportsSemanticRename: false,
        supportsVerificationReplay: true,
        supportsArtifactReplay: true,
        supportsProvenanceReplay: true,
        supportsComputerUse: false,
        workspaceSearchFallbackToolKinds: ["rg"],
        semanticToolProviderIds: [],
        bundles: [],
      },
    });

    expect(registry.getSnapshot({ sessionKey: "main", kind: "scheduled_remote" })).toMatchObject({
      kind: "scheduled_remote",
      backendId: "remote_peer",
    });
  });

  it("keeps computer-use behind an explicit rollout gate", () => {
    expect(resolveSuperComputerUseRolloutEnabled({ env: {} })).toBe(false);
    expect(
      resolveSuperComputerUseRolloutEnabled({
        env: {
          OPENCLAW_SUPERHUMAN_COMPUTER_USE: "true",
        },
      }),
    ).toBe(true);
    expect(
      resolveSuperComputerUseRolloutEnabled({
        cfg: {
          tools: {
            computerUse: {
              enabled: false,
            },
          },
        } as never,
        env: {
          OPENCLAW_SUPERHUMAN_COMPUTER_USE: "true",
        },
      }),
    ).toBe(false);
  });

  it("builds provider adapters from configured and plugin-backed providers", async () => {
    const registry = createSuperExecutionProviderRegistry({
      cfg: {
        agents: {
          defaults: {
            model: {
              primary: "anthropic/claude-opus-4-5",
            },
          },
        },
        models: {
          providers: {
            anthropic: {},
          },
        },
      } as never,
      pluginRegistry: {
        providers: [
          {
            provider: {
              id: "anthropic",
              label: "Anthropic",
            },
          },
        ],
      } as never,
    });

    expect(registry.getPreferredProvider()).toMatchObject({
      id: "anthropic",
      configured: true,
      pluginBacked: true,
      providerFamily: "anthropic",
    });
    expect(registry.listProviders().map((provider) => provider.id)).toContain("anthropic");
    expect(registry.getAdapter("anthropic")?.resolveCapabilities().providerFamily).toBe(
      "anthropic",
    );
    await expect(
      registry.getAdapter("anthropic")?.prepareRuntimeAuth({
        config: {} as never,
        provider: "anthropic",
        providerConfig: {},
        auth: {
          mode: "api-key",
          apiKey: "test-key",
          source: "models.providers.anthropic",
        },
      } as never),
    ).resolves.toBeUndefined();
  });

  it("keeps computer-use interactive-only, dispatches through adapters, and cleans turn state", async () => {
    const actions: string[] = [];
    const runtime = startSuperComputerUseRuntime({
      enabled: true,
      sandboxRuntimeRegistry: {
        getSnapshot: () => {
          throw new Error("not needed");
        },
        evaluateTool: ({ toolName }) => ({
          sessionKey: "main",
          agentId: "agent",
          mainSessionKey: "main",
          toolName,
          sandboxed: true,
          allowed: toolName !== "blocked_tool",
          reason: toolName === "blocked_tool" ? "blocked_by_deny" : "allowed",
          blockedBy: toolName === "blocked_tool" ? "deny" : undefined,
          remediation: {
            explainCommand: "openclaw config explain",
            disableSandboxConfigKey: "agents.defaults.sandbox.mode",
            suggestMainSession: true,
          },
        }),
      },
      adapters: [
        {
          describe: () => ({
            id: "fake_adapter",
            label: "Fake adapter",
            supportsApprovals: true,
            supportsShellGating: true,
            supportsMultipleDisplays: true,
          }),
          startSession: ({ sessionKey }) => ({
            sessionId: `adapter:${sessionKey}`,
            displays: [{ id: "display-1", label: "Display 1", primary: true }],
            selectedDisplayId: "display-1",
          }),
          dispatchAction: (request) => {
            actions.push(`${request.action}:${request.displayId ?? "none"}`);
            if (request.action === "click") {
              return {
                status: "approval_required",
                permission: { granted: false, scope: "once", reason: "approval_required" },
              };
            }
            return { status: "completed", output: { ok: true } };
          },
          stopSession: () => undefined,
        },
      ],
    });

    expect(runtime.canUseInMode("interactive")).toBe(true);
    expect(runtime.canUseInMode("scheduled")).toBe(false);
    expect(runtime.listAdapters()).toEqual([
      expect.objectContaining({
        id: "fake_adapter",
      }),
    ]);

    await runtime.startSession({
      sessionKey: "main",
      mode: "interactive",
      adapterId: "fake_adapter",
    });
    expect(runtime.acquireSessionLock({ sessionKey: "main" })).toBe(true);

    const permission = await runtime.dispatchAction({
      requestId: "cu-1",
      sessionKey: "main",
      action: "click",
      mode: "interactive",
      toolName: "computer_click",
      payload: { x: 10, y: 20 },
    });
    expect(permission).toEqual({
      status: "approval_required",
      permission: {
        granted: false,
        scope: "once",
        reason: "approval_required",
      },
    });

    runtime.setSelectedDisplay({ sessionKey: "main", displayId: "display-1" });
    expect(runtime.getSessionSnapshot({ sessionKey: "main" })).toMatchObject({
      enabled: true,
      adapterId: "fake_adapter",
      adapterSessionId: "adapter:main",
      lockOwnerSessionKey: "main",
      selectedDisplayId: "display-1",
      actionCount: 1,
      lastAction: "click",
      lastResultStatus: "approval_required",
      pendingApproval: {
        requestId: "cu-1",
      },
    });

    expect(
      runtime.resolvePermission({
        requestId: "cu-1",
        resolution: { granted: true, scope: "once" },
      }),
    ).toBe(true);

    await expect(
      runtime.dispatchAction({
        requestId: "cu-2",
        sessionKey: "main",
        action: "type",
        mode: "interactive",
        toolName: "blocked_tool",
      }),
    ).resolves.toEqual({
      status: "blocked",
      reason: "blocked_by_deny",
      details: {
        toolName: "blocked_tool",
        blockedBy: "deny",
      },
    });

    runtime.cleanupSessionTurn({ sessionKey: "main" });
    expect(runtime.getSessionSnapshot({ sessionKey: "main" })).toMatchObject({
      lockOwnerSessionKey: undefined,
      selectedDisplayId: undefined,
      pendingApproval: undefined,
    });
    expect(actions).toEqual(["click:display-1"]);
  });
});
