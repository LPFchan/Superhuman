import type {
  ExecutionBackendRegistry,
  ExecutionEnvironmentRegistry,
  ExecutionProviderRegistry,
  RuntimeInvocationMode,
  ShellCapabilityRegistry,
  SuperComputerUsePermissionRequest,
  SuperComputerUsePermissionResolution,
  SuperComputerUseRuntime,
  SuperComputerUseSessionSnapshot,
  SuperExecutionBackendDescriptor,
  SuperExecutionEnvironmentKind,
  SuperExecutionEnvironmentSnapshot,
  SuperExecutionProviderDescriptor,
} from "./super-runtime-seams.js";
import { toSuperExecutionEnvironmentCapabilities } from "./super-runtime-seams.js";

function cloneEnvironmentSnapshot(
  snapshot: SuperExecutionEnvironmentSnapshot,
): SuperExecutionEnvironmentSnapshot {
  return {
    ...snapshot,
    capabilities: {
      ...snapshot.capabilities,
      workspaceSearchFallbackToolKinds: [...snapshot.capabilities.workspaceSearchFallbackToolKinds],
      semanticToolProviderIds: [...snapshot.capabilities.semanticToolProviderIds],
      bundles: snapshot.capabilities.bundles.map((bundle) => ({ ...bundle })),
    },
  };
}

function cloneComputerUseSessionSnapshot(
  snapshot: SuperComputerUseSessionSnapshot,
): SuperComputerUseSessionSnapshot {
  return {
    ...snapshot,
    pendingApproval: snapshot.pendingApproval
      ? {
          ...snapshot.pendingApproval,
          details: snapshot.pendingApproval.details ? { ...snapshot.pendingApproval.details } : {},
        }
      : undefined,
  };
}

export function createSuperExecutionEnvironmentRegistry(params: {
  shellCapabilityRegistry: ShellCapabilityRegistry;
}): ExecutionEnvironmentRegistry {
  const remoteSnapshots = new Map<string, SuperExecutionEnvironmentSnapshot>();

  const buildLocalSnapshot = (
    sessionKey: string,
    kind: SuperExecutionEnvironmentKind = "local",
  ): SuperExecutionEnvironmentSnapshot => {
    const shellSnapshot = params.shellCapabilityRegistry.getSnapshot({ sessionKey });
    return {
      environmentId: `${kind}:${sessionKey}`,
      sessionKey,
      label:
        kind === "scheduled_remote"
          ? `Scheduled remote (${sessionKey})`
          : kind === "remote"
            ? `Remote (${sessionKey})`
            : kind === "computer_use"
              ? `Computer use (${sessionKey})`
              : `Local (${sessionKey})`,
      kind,
      backendId: kind === "local" ? "local" : kind,
      createdAt: shellSnapshot.createdAt,
      updatedAt: Date.now(),
      capabilityMode: shellSnapshot.mode,
      capabilities: toSuperExecutionEnvironmentCapabilities({
        capabilityMode: shellSnapshot.mode,
        supportsArtifactReplay: true,
        supportsProvenanceReplay: true,
        supportsVerificationReplay: true,
        supportsComputerUse: kind === "computer_use",
        workspaceSearchFallbackToolKinds: shellSnapshot.workspaceSearchFallbackToolKinds,
        semanticToolProviderIds: shellSnapshot.semanticToolProviderIds,
      }),
    };
  };

  return {
    getSnapshot({ sessionKey, workerId, kind }) {
      if (workerId?.trim()) {
        return remoteSnapshots.get(workerId.trim())
          ? cloneEnvironmentSnapshot(remoteSnapshots.get(workerId.trim())!)
          : null;
      }
      if (sessionKey?.trim()) {
        const resolvedKind = kind ?? "local";
        if (resolvedKind === "local" || resolvedKind === "scheduled_remote") {
          return buildLocalSnapshot(sessionKey.trim(), resolvedKind);
        }
        const remoteKey = `${resolvedKind}:${sessionKey.trim()}`;
        const remote = remoteSnapshots.get(remoteKey);
        return remote
          ? cloneEnvironmentSnapshot(remote)
          : buildLocalSnapshot(sessionKey.trim(), resolvedKind);
      }
      return null;
    },

    listSnapshots() {
      return [...remoteSnapshots.values()].map((snapshot) => cloneEnvironmentSnapshot(snapshot));
    },

    upsertSnapshot(snapshot) {
      remoteSnapshots.set(snapshot.workerId?.trim() || snapshot.environmentId, {
        ...cloneEnvironmentSnapshot(snapshot),
        updatedAt: snapshot.updatedAt || Date.now(),
      });
    },
  };
}

export function createSuperExecutionBackendRegistry(): ExecutionBackendRegistry {
  const backends: SuperExecutionBackendDescriptor[] = [
    {
      id: "local",
      label: "Local runtime",
      environmentKinds: ["local"],
      supportsRemoteSessions: false,
      supportsReconnect: false,
      supportsComputerUse: false,
    },
    {
      id: "acp",
      label: "Out-of-process ACP",
      environmentKinds: ["local"],
      supportsRemoteSessions: false,
      supportsReconnect: false,
      supportsComputerUse: false,
    },
    {
      id: "remote_peer",
      label: "Remote peer",
      environmentKinds: ["remote", "scheduled_remote"],
      supportsRemoteSessions: true,
      supportsReconnect: true,
      supportsComputerUse: false,
    },
    {
      id: "computer_use",
      label: "Computer use",
      environmentKinds: ["computer_use"],
      supportsRemoteSessions: false,
      supportsReconnect: false,
      supportsComputerUse: true,
    },
  ];

  return {
    listBackends: () =>
      backends.map((backend) => ({ ...backend, environmentKinds: [...backend.environmentKinds] })),
    getBackend: (backendId) => {
      const backend = backends.find((entry) => entry.id === backendId.trim());
      return backend ? { ...backend, environmentKinds: [...backend.environmentKinds] } : null;
    },
  };
}

export function createSuperExecutionProviderRegistry(): ExecutionProviderRegistry {
  const providers: SuperExecutionProviderDescriptor[] = [
    {
      id: "default",
      label: "Default provider",
      supportsReasoning: true,
      supportsToolCalling: true,
      supportsVision: false,
    },
  ];
  return {
    listProviders: () => providers.map((provider) => ({ ...provider })),
    getProvider: (providerId) => {
      const provider = providers.find((entry) => entry.id === providerId.trim());
      return provider ? { ...provider } : null;
    },
  };
}

export function startSuperComputerUseRuntime(params?: {
  enabled?: boolean;
}): SuperComputerUseRuntime {
  const enabled = params?.enabled === true;
  const sessions = new Map<string, SuperComputerUseSessionSnapshot>();
  const permissionIndex = new Map<string, string>();

  function resolveKey(sessionKey: string, workerId?: string): string {
    return workerId?.trim() ? `${sessionKey.trim()}::${workerId.trim()}` : sessionKey.trim();
  }

  function getOrCreateSnapshot(
    sessionKey: string,
    workerId?: string,
  ): SuperComputerUseSessionSnapshot {
    const key = resolveKey(sessionKey, workerId);
    const existing = sessions.get(key);
    if (existing) {
      return existing;
    }
    const created: SuperComputerUseSessionSnapshot = {
      sessionKey: sessionKey.trim(),
      workerId: workerId?.trim() || undefined,
      interactive: true,
      enabled,
      updatedAt: Date.now(),
    };
    sessions.set(key, created);
    return created;
  }

  const nonInteractiveModes = new Set<RuntimeInvocationMode>(["background", "scheduled", "remote"]);

  return {
    isEnabled() {
      return enabled;
    },

    canUseInMode(mode) {
      return enabled && !nonInteractiveModes.has(mode);
    },

    getSessionSnapshot({ sessionKey, workerId }) {
      return cloneComputerUseSessionSnapshot(getOrCreateSnapshot(sessionKey, workerId));
    },

    acquireSessionLock({ sessionKey, workerId }) {
      const snapshot = getOrCreateSnapshot(sessionKey, workerId);
      if (snapshot.lockOwnerSessionKey && snapshot.lockOwnerSessionKey !== sessionKey.trim()) {
        return false;
      }
      snapshot.lockOwnerSessionKey = sessionKey.trim();
      snapshot.updatedAt = Date.now();
      return true;
    },

    releaseSessionLock({ sessionKey, workerId }) {
      const snapshot = getOrCreateSnapshot(sessionKey, workerId);
      if (snapshot.lockOwnerSessionKey !== sessionKey.trim()) {
        return;
      }
      snapshot.lockOwnerSessionKey = undefined;
      snapshot.updatedAt = Date.now();
    },

    setSelectedDisplay({ sessionKey, displayId }) {
      const snapshot = getOrCreateSnapshot(sessionKey);
      snapshot.selectedDisplayId = displayId?.trim() || undefined;
      snapshot.updatedAt = Date.now();
    },

    requestPermission(request: SuperComputerUsePermissionRequest) {
      if (!enabled) {
        return null;
      }
      const snapshot = getOrCreateSnapshot(request.sessionKey, request.workerId);
      snapshot.pendingApproval = {
        ...request,
        details: request.details ? { ...request.details } : undefined,
      };
      snapshot.updatedAt = Date.now();
      permissionIndex.set(request.requestId, resolveKey(request.sessionKey, request.workerId));
      return {
        granted: false,
        scope: "once",
        reason: "approval_required",
      };
    },

    resolvePermission(params: {
      requestId: string;
      resolution: SuperComputerUsePermissionResolution;
    }) {
      const key = permissionIndex.get(params.requestId);
      if (!key) {
        return false;
      }
      const snapshot = sessions.get(key);
      if (!snapshot?.pendingApproval || snapshot.pendingApproval.requestId !== params.requestId) {
        return false;
      }
      snapshot.pendingApproval = undefined;
      snapshot.updatedAt = Date.now();
      permissionIndex.delete(params.requestId);
      return true;
    },

    cleanupSessionTurn({ sessionKey, workerId }) {
      const snapshot = getOrCreateSnapshot(sessionKey, workerId);
      snapshot.pendingApproval = undefined;
      snapshot.selectedDisplayId = undefined;
      if (snapshot.lockOwnerSessionKey === sessionKey.trim()) {
        snapshot.lockOwnerSessionKey = undefined;
      }
      snapshot.updatedAt = Date.now();
    },
  };
}
