import { describe, expect, it } from "vitest";
import {
  createSuperExecutionEnvironmentRegistry,
  startSuperComputerUseRuntime,
} from "./super-execution-surfaces.js";

describe("super-execution-surfaces", () => {
  it("builds explicit environment snapshots by kind", () => {
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
    });

    expect(registry.getSnapshot({ sessionKey: "main", kind: "local" })).toMatchObject({
      kind: "local",
      backendId: "local",
      capabilityMode: "semantic_rename",
      capabilities: {
        supportsSemanticRename: true,
        supportsArtifactReplay: true,
      },
    });
    expect(registry.getSnapshot({ sessionKey: "main", kind: "scheduled_remote" })).toMatchObject({
      kind: "scheduled_remote",
      backendId: "scheduled_remote",
    });
  });

  it("keeps computer-use interactive-only and cleans turn state", () => {
    const runtime = startSuperComputerUseRuntime({ enabled: true });

    expect(runtime.canUseInMode("interactive")).toBe(true);
    expect(runtime.canUseInMode("scheduled")).toBe(false);
    expect(runtime.acquireSessionLock({ sessionKey: "main" })).toBe(true);

    const permission = runtime.requestPermission({
      requestId: "cu-1",
      sessionKey: "main",
      action: "click",
      details: { x: 10, y: 20 },
    });
    expect(permission).toEqual({
      granted: false,
      scope: "once",
      reason: "approval_required",
    });

    runtime.setSelectedDisplay({ sessionKey: "main", displayId: "display-1" });
    expect(runtime.getSessionSnapshot({ sessionKey: "main" })).toMatchObject({
      enabled: true,
      lockOwnerSessionKey: "main",
      selectedDisplayId: "display-1",
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

    runtime.cleanupSessionTurn({ sessionKey: "main" });
    expect(runtime.getSessionSnapshot({ sessionKey: "main" })).toMatchObject({
      lockOwnerSessionKey: undefined,
      selectedDisplayId: undefined,
      pendingApproval: undefined,
    });
  });
});
