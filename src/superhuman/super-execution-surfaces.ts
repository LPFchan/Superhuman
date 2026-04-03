import crypto from "node:crypto";
import { resolveDefaultModelForAgent } from "../agents/model-selection.js";
import {
  resolveProviderCapabilities,
  type ProviderCapabilities,
} from "../agents/provider-capabilities.js";
import { normalizeProviderId } from "../agents/provider-id.js";
import type { OpenClawConfig } from "../config/config.js";
import {
  normalizeProviderTransportWithPlugin,
  prepareProviderRuntimeAuth,
  resolveProviderDefaultThinkingLevel,
  resolveProviderStreamFn,
  resolveProviderXHighThinking,
} from "../plugins/provider-runtime.js";
import type { PluginRegistry as OpenClawPluginRegistry } from "../plugins/registry.js";
import type {
  ExecutionBackendRegistry,
  ExecutionEnvironmentRegistry,
  ExecutionProviderRegistry,
  RuntimeInvocationMode,
  SandboxRuntimeRegistry,
  ShellCapabilityRegistry,
  StateStore,
  SuperComputerUseActionRequest,
  SuperComputerUseActionResult,
  SuperComputerUseAdapter,
  SuperComputerUseAdapterDescriptor,
  SuperComputerUsePermissionRequest,
  SuperComputerUsePermissionResolution,
  SuperComputerUseRuntime,
  SuperComputerUseSessionSnapshot,
  SuperExecutionBackendDescriptor,
  SuperExecutionEnvironmentKind,
  SuperExecutionEnvironmentSnapshot,
  SuperExecutionProviderAdapter,
  SuperExecutionProviderDescriptor,
} from "./runtime/seams.js";
import {
  resolveCanonicalBackendIdForEnvironmentKind,
  toSuperExecutionEnvironmentCapabilities,
} from "./runtime/seams.js";

const COMPUTER_USE_ROLLOUT_ENV_KEYS = [
  "OPENCLAW_SUPERHUMAN_COMPUTER_USE",
  "OPENCLAW_EXPERIMENTAL_COMPUTER_USE",
] as const;

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

function cloneProviderDescriptor(
  descriptor: SuperExecutionProviderDescriptor,
): SuperExecutionProviderDescriptor {
  return { ...descriptor };
}

function cloneComputerUseAdapterDescriptor(
  descriptor: SuperComputerUseAdapterDescriptor,
): SuperComputerUseAdapterDescriptor {
  return { ...descriptor };
}

function cloneComputerUseSessionSnapshot(
  snapshot: SuperComputerUseSessionSnapshot,
): SuperComputerUseSessionSnapshot {
  return {
    ...snapshot,
    availableDisplays: snapshot.availableDisplays.map((display) => ({ ...display })),
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
  resolveProviderId?: (params: { sessionKey: string }) => string | undefined;
}): ExecutionEnvironmentRegistry {
  const remoteSnapshots = new Map<string, SuperExecutionEnvironmentSnapshot>();
  const workerSnapshotIndex = new Map<string, string>();

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
      backendId: resolveCanonicalBackendIdForEnvironmentKind(kind),
      providerId: params.resolveProviderId?.({ sessionKey }),
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
        const environmentId = workerSnapshotIndex.get(workerId.trim());
        const snapshot = environmentId ? remoteSnapshots.get(environmentId) : undefined;
        return snapshot ? cloneEnvironmentSnapshot(snapshot) : null;
      }
      if (sessionKey?.trim()) {
        const resolvedKind = kind ?? "local";
        if (resolvedKind === "local" || resolvedKind === "scheduled_remote") {
          if (resolvedKind === "local") {
            return buildLocalSnapshot(sessionKey.trim(), resolvedKind);
          }
          const scheduledRemote = remoteSnapshots.get(`scheduled_remote:${sessionKey.trim()}`);
          return scheduledRemote ? cloneEnvironmentSnapshot(scheduledRemote) : null;
        }
        // Remote authority must come from an explicit persisted declaration, not a synthesized
        // local fallback, or capability truth can silently drift after restart.
        const remote = [...remoteSnapshots.values()].find(
          (snapshot) => snapshot.sessionKey === sessionKey.trim() && snapshot.kind === resolvedKind,
        );
        return remote ? cloneEnvironmentSnapshot(remote) : null;
      }
      return null;
    },

    listSnapshots() {
      return [...remoteSnapshots.values()].map((snapshot) => cloneEnvironmentSnapshot(snapshot));
    },

    upsertSnapshot(snapshot) {
      const cloned = {
        ...cloneEnvironmentSnapshot(snapshot),
        updatedAt: snapshot.updatedAt || Date.now(),
      };
      remoteSnapshots.set(snapshot.environmentId, cloned);
      const workerId = snapshot.workerId?.trim();
      if (workerId) {
        workerSnapshotIndex.set(workerId, snapshot.environmentId);
      }
    },
  };
}

function parseRolloutBoolean(raw: unknown): boolean | undefined {
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw !== "string") {
    return undefined;
  }
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off", "disabled"].includes(normalized)) {
    return false;
  }
  return undefined;
}

export function resolveSuperComputerUseRolloutEnabled(params: {
  cfg?: OpenClawConfig;
  env?: NodeJS.ProcessEnv;
}): boolean {
  const toolsRecord =
    params.cfg?.tools && typeof params.cfg.tools === "object"
      ? (params.cfg.tools as Record<string, unknown>)
      : undefined;
  const computerUseRecord =
    toolsRecord?.computerUse && typeof toolsRecord.computerUse === "object"
      ? (toolsRecord.computerUse as Record<string, unknown>)
      : undefined;
  const configEnabled = parseRolloutBoolean(computerUseRecord?.enabled);
  if (typeof configEnabled === "boolean") {
    return configEnabled;
  }
  for (const key of COMPUTER_USE_ROLLOUT_ENV_KEYS) {
    const envEnabled = parseRolloutBoolean(params.env?.[key]);
    if (typeof envEnabled === "boolean") {
      return envEnabled;
    }
  }
  return false;
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

function inferVisionSupport(capabilities: ProviderCapabilities): boolean {
  return (
    capabilities.providerFamily === "openai" ||
    capabilities.geminiThoughtSignatureSanitization ||
    capabilities.dropThinkingBlockModelHints.some((hint) => hint.includes("vision"))
  );
}

function createSuperExecutionProviderAdapter(params: {
  providerId: string;
  label: string;
  configured: boolean;
  pluginBacked: boolean;
  options: {
    config?: OpenClawConfig;
    workspaceDir?: string;
    env?: NodeJS.ProcessEnv;
  };
}): SuperExecutionProviderAdapter {
  const providerId = normalizeProviderId(params.providerId);
  const resolveCapabilitiesSnapshot = (): ProviderCapabilities =>
    resolveProviderCapabilities(providerId, params.options);

  return {
    describe() {
      const capabilities = resolveCapabilitiesSnapshot();
      return {
        id: providerId,
        label: params.label.trim() || providerId,
        configured: params.configured,
        pluginBacked: params.pluginBacked,
        providerFamily: capabilities.providerFamily,
        supportsReasoning: true,
        supportsToolCalling: true,
        supportsVision: inferVisionSupport(capabilities),
      };
    },

    resolveCapabilities() {
      return resolveCapabilitiesSnapshot();
    },

    normalizeTransport(context) {
      return (
        normalizeProviderTransportWithPlugin({
          provider: providerId,
          ...params.options,
          context,
        }) ?? undefined
      );
    },

    resolveStreamFn(context) {
      return (
        resolveProviderStreamFn({
          provider: providerId,
          ...params.options,
          context,
        }) ?? undefined
      );
    },

    async prepareRuntimeAuth(context) {
      return (
        (await prepareProviderRuntimeAuth({
          provider: providerId,
          ...params.options,
          context,
        })) ?? undefined
      );
    },

    supportsXHighThinking(context) {
      return resolveProviderXHighThinking({
        provider: providerId,
        ...params.options,
        context,
      });
    },

    resolveDefaultThinkingLevel(context) {
      return (
        resolveProviderDefaultThinkingLevel({
          provider: providerId,
          ...params.options,
          context,
        }) ?? undefined
      );
    },
  };
}

export function createSuperExecutionProviderRegistry(params: {
  cfg?: OpenClawConfig;
  workspaceDir?: string;
  env?: NodeJS.ProcessEnv;
  pluginRegistry?: OpenClawPluginRegistry;
}): ExecutionProviderRegistry {
  const configuredIds = Object.keys(params.cfg?.models?.providers ?? {})
    .map((providerId) => normalizeProviderId(providerId))
    .filter(Boolean);
  const pluginProviders = (params.pluginRegistry?.providers ?? [])
    .map((entry) => ({
      id: normalizeProviderId(entry.provider.id),
      label: entry.provider.label.trim() || entry.provider.id.trim(),
    }))
    .filter((provider) => provider.id);

  const providerIds = new Set<string>([
    "default",
    ...configuredIds,
    ...pluginProviders.map((p) => p.id),
  ]);
  const configuredSet = new Set(configuredIds);
  const pluginLabelById = new Map(pluginProviders.map((provider) => [provider.id, provider.label]));
  const adapters = new Map<string, SuperExecutionProviderAdapter>();

  for (const providerId of providerIds) {
    adapters.set(
      providerId,
      createSuperExecutionProviderAdapter({
        providerId,
        label: pluginLabelById.get(providerId) ?? providerId,
        configured: configuredSet.has(providerId),
        pluginBacked: pluginLabelById.has(providerId),
        options: {
          config: params.cfg,
          workspaceDir: params.workspaceDir,
          env: params.env,
        },
      }),
    );
  }

  function resolvePreferredProviderId(agentId?: string): string {
    try {
      return normalizeProviderId(
        resolveDefaultModelForAgent({
          cfg: params.cfg ?? {},
          agentId,
        }).provider,
      );
    } catch {
      return "default";
    }
  }

  return {
    listProviders: () =>
      [...adapters.values()].map((adapter) => cloneProviderDescriptor(adapter.describe())),
    getProvider(providerId) {
      const adapter = adapters.get(normalizeProviderId(providerId));
      return adapter ? cloneProviderDescriptor(adapter.describe()) : null;
    },
    getAdapter(providerId) {
      return adapters.get(normalizeProviderId(providerId)) ?? null;
    },
    getPreferredProvider({ agentId } = {}) {
      const adapter =
        adapters.get(resolvePreferredProviderId(agentId)) ?? adapters.values().next().value ?? null;
      return adapter ? cloneProviderDescriptor(adapter.describe()) : null;
    },
  };
}

function createManualComputerUseAdapter(): SuperComputerUseAdapter {
  return {
    describe() {
      return {
        id: "local_manual",
        label: "Local manual control",
        supportsApprovals: true,
        supportsShellGating: true,
        supportsMultipleDisplays: false,
      };
    },

    startSession(params) {
      return {
        sessionId: `computer-use:${params.sessionKey}:${params.workerId ?? "local"}`,
        displays: [{ id: "primary", label: "Primary display", primary: true }],
        selectedDisplayId: params.displayId?.trim() || "primary",
      };
    },

    dispatchAction(request) {
      if (request.action === "snapshot" || request.action === "read_screen") {
        return {
          status: "completed",
          output: {
            acknowledged: true,
            action: request.action,
            displayId: request.displayId ?? "primary",
          },
        };
      }
      if (request.requiresApproval !== false) {
        return {
          status: "approval_required",
          permission: {
            granted: false,
            scope: "once",
            reason: "approval_required",
          },
          details: {
            action: request.action,
            displayId: request.displayId ?? "primary",
          },
        };
      }
      return {
        status: "completed",
        output: {
          acknowledged: true,
          action: request.action,
          displayId: request.displayId ?? "primary",
        },
      };
    },

    stopSession() {},
  };
}

export function startSuperComputerUseRuntime(params?: {
  enabled?: boolean;
  adapters?: SuperComputerUseAdapter[];
  stateStore?: StateStore;
  executionEnvironmentRegistry?: ExecutionEnvironmentRegistry;
  sandboxRuntimeRegistry?: SandboxRuntimeRegistry;
}): SuperComputerUseRuntime {
  const adapters = new Map<string, SuperComputerUseAdapter>();
  for (const adapter of params?.adapters?.length
    ? params.adapters
    : [createManualComputerUseAdapter()]) {
    adapters.set(adapter.describe().id, adapter);
  }

  const enabled = params?.enabled ?? adapters.size > 0;
  const sessions = new Map<string, SuperComputerUseSessionSnapshot>();
  const permissionIndex = new Map<string, string>();
  const nonInteractiveModes = new Set<RuntimeInvocationMode>(["background", "scheduled", "remote"]);

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
      availableDisplays: [],
      actionCount: 0,
      updatedAt: Date.now(),
    };
    sessions.set(key, created);
    return created;
  }

  function appendAudit(paramsForAudit: {
    sessionKey: string;
    workerId?: string;
    actionType: string;
    summary: string;
    status?: string;
    details?: Record<string, unknown>;
  }) {
    params?.stateStore?.appendAction({
      actionId: crypto.randomUUID(),
      sessionKey: paramsForAudit.sessionKey,
      actionType: paramsForAudit.actionType,
      actionKind: "computer_use",
      summary: paramsForAudit.summary,
      status: paramsForAudit.status,
      createdAt: Date.now(),
      completedAt: Date.now(),
      details: {
        ...(paramsForAudit.workerId ? { workerId: paramsForAudit.workerId } : {}),
        ...paramsForAudit.details,
      },
    });
  }

  const runtime: SuperComputerUseRuntime = {
    isEnabled() {
      return enabled;
    },

    canUseInMode(mode) {
      return enabled && !nonInteractiveModes.has(mode);
    },

    listAdapters() {
      return [...adapters.values()].map((adapter) =>
        cloneComputerUseAdapterDescriptor(adapter.describe()),
      );
    },

    getAdapter(adapterId) {
      const adapter = adapters.get(adapterId.trim());
      return adapter ? cloneComputerUseAdapterDescriptor(adapter.describe()) : null;
    },

    getSessionSnapshot({ sessionKey, workerId }) {
      return cloneComputerUseSessionSnapshot(getOrCreateSnapshot(sessionKey, workerId));
    },

    async startSession({ sessionKey, workerId, mode, adapterId, displayId }) {
      const snapshot = getOrCreateSnapshot(sessionKey, workerId);
      if (!enabled) {
        snapshot.enabled = false;
        snapshot.updatedAt = Date.now();
        return cloneComputerUseSessionSnapshot(snapshot);
      }
      if (!runtime.canUseInMode(mode)) {
        snapshot.enabled = false;
        snapshot.updatedAt = Date.now();
        appendAudit({
          sessionKey,
          workerId,
          actionType: "computer_use_session_start",
          summary: "Computer-use session start blocked by invocation mode.",
          status: "blocked",
          details: { mode },
        });
        return cloneComputerUseSessionSnapshot(snapshot);
      }

      const adapter =
        (adapterId?.trim() ? adapters.get(adapterId.trim()) : undefined) ??
        adapters.values().next().value;
      if (!adapter) {
        snapshot.enabled = false;
        snapshot.updatedAt = Date.now();
        return cloneComputerUseSessionSnapshot(snapshot);
      }

      const started = await adapter.startSession({ sessionKey, workerId, displayId });
      snapshot.enabled = true;
      snapshot.adapterId = adapter.describe().id;
      snapshot.adapterSessionId = started.sessionId;
      snapshot.availableDisplays = started.displays.map((display) => ({ ...display }));
      snapshot.selectedDisplayId =
        started.selectedDisplayId ??
        displayId?.trim() ??
        started.displays.find((display) => display.primary)?.id ??
        started.displays[0]?.id;
      snapshot.startedAt ??= Date.now();
      snapshot.updatedAt = Date.now();

      params?.executionEnvironmentRegistry?.upsertSnapshot({
        environmentId: `computer_use:${sessionKey.trim()}:${workerId?.trim() || "local"}`,
        sessionKey: sessionKey.trim(),
        workerId: workerId?.trim() || undefined,
        label: `Computer use (${sessionKey.trim()})`,
        kind: "computer_use",
        backendId: "computer_use",
        createdAt: snapshot.startedAt ?? Date.now(),
        updatedAt: snapshot.updatedAt,
        capabilityMode: "workspace_search_only",
        capabilities: toSuperExecutionEnvironmentCapabilities({
          capabilityMode: "workspace_search_only",
          supportsArtifactReplay: true,
          supportsProvenanceReplay: true,
          supportsVerificationReplay: true,
          supportsComputerUse: true,
          workspaceSearchFallbackToolKinds: [],
          semanticToolProviderIds: [],
        }),
      });

      appendAudit({
        sessionKey,
        workerId,
        actionType: "computer_use_session_start",
        summary: `Computer-use session started with ${adapter.describe().label}.`,
        status: "started",
        details: {
          adapterId: adapter.describe().id,
          adapterSessionId: snapshot.adapterSessionId,
          displayId: snapshot.selectedDisplayId,
        },
      });
      return cloneComputerUseSessionSnapshot(snapshot);
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

    async dispatchAction(
      request: SuperComputerUseActionRequest,
    ): Promise<SuperComputerUseActionResult> {
      const snapshot = getOrCreateSnapshot(request.sessionKey, request.workerId);
      if (!enabled) {
        return { status: "blocked", reason: "disabled" };
      }
      if (!runtime.canUseInMode(request.mode)) {
        appendAudit({
          sessionKey: request.sessionKey,
          workerId: request.workerId,
          actionType: "computer_use_dispatch",
          summary: `Computer-use action blocked in ${request.mode} mode.`,
          status: "blocked",
          details: { action: request.action, mode: request.mode },
        });
        return { status: "blocked", reason: "mode_not_allowed", details: { mode: request.mode } };
      }
      if (request.toolName) {
        const sandboxDecision = params?.sandboxRuntimeRegistry?.evaluateTool({
          sessionKey: request.sessionKey,
          toolName: request.toolName,
        });
        if (sandboxDecision && !sandboxDecision.allowed) {
          appendAudit({
            sessionKey: request.sessionKey,
            workerId: request.workerId,
            actionType: "computer_use_dispatch",
            summary: `Computer-use action blocked by sandbox policy for ${request.toolName}.`,
            status: "blocked",
            details: {
              action: request.action,
              toolName: request.toolName,
              reason: sandboxDecision.reason,
            },
          });
          return {
            status: "blocked",
            reason: sandboxDecision.reason,
            details: {
              toolName: request.toolName,
              blockedBy: sandboxDecision.blockedBy,
            },
          };
        }
      }

      const adapter =
        (snapshot.adapterId ? adapters.get(snapshot.adapterId) : undefined) ??
        adapters.values().next().value;
      if (!adapter) {
        return { status: "blocked", reason: "adapter_unavailable" };
      }
      if (!snapshot.adapterSessionId) {
        await runtime.startSession({
          sessionKey: request.sessionKey,
          workerId: request.workerId,
          mode: request.mode,
          adapterId: adapter.describe().id,
          displayId: request.displayId,
        });
      }

      const result = await adapter.dispatchAction({
        ...request,
        displayId: request.displayId ?? snapshot.selectedDisplayId,
      });
      snapshot.lastAction = request.action;
      snapshot.lastActionAt = Date.now();
      snapshot.actionCount += 1;
      snapshot.lastResultStatus = result.status;
      snapshot.updatedAt = Date.now();

      if (result.status === "approval_required") {
        runtime.requestPermission({
          requestId: request.requestId,
          sessionKey: request.sessionKey,
          workerId: request.workerId,
          action: request.action,
          details: {
            adapterId: adapter.describe().id,
            toolName: request.toolName,
            displayId: request.displayId ?? snapshot.selectedDisplayId,
            ...result.details,
          },
        });
      }

      appendAudit({
        sessionKey: request.sessionKey,
        workerId: request.workerId,
        actionType: "computer_use_dispatch",
        summary: `Computer-use action ${request.action} ${result.status}.`,
        status: result.status,
        details: {
          action: request.action,
          adapterId: adapter.describe().id,
          toolName: request.toolName,
          displayId: request.displayId ?? snapshot.selectedDisplayId,
          ...(result.status === "blocked" ? { reason: result.reason } : {}),
          ...result.details,
        },
      });

      return result;
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

    resolvePermission(paramsForResolution: {
      requestId: string;
      resolution: SuperComputerUsePermissionResolution;
    }) {
      const key = permissionIndex.get(paramsForResolution.requestId);
      if (!key) {
        return false;
      }
      const snapshot = sessions.get(key);
      if (
        !snapshot?.pendingApproval ||
        snapshot.pendingApproval.requestId !== paramsForResolution.requestId
      ) {
        return false;
      }
      snapshot.pendingApproval = undefined;
      snapshot.updatedAt = Date.now();
      permissionIndex.delete(paramsForResolution.requestId);
      appendAudit({
        sessionKey: snapshot.sessionKey,
        workerId: snapshot.workerId,
        actionType: "computer_use_permission_resolution",
        summary: "Computer-use approval resolved.",
        status: paramsForResolution.resolution.granted ? "approved" : "denied",
        details: {
          requestId: paramsForResolution.requestId,
          scope: paramsForResolution.resolution.scope,
          reason: paramsForResolution.resolution.reason,
        },
      });
      return true;
    },

    async stopSession({ sessionKey, workerId }) {
      const snapshot = getOrCreateSnapshot(sessionKey, workerId);
      const adapter = snapshot.adapterId ? adapters.get(snapshot.adapterId) : undefined;
      await adapter?.stopSession({
        sessionKey,
        workerId,
        adapterSessionId: snapshot.adapterSessionId,
      });
      snapshot.adapterSessionId = undefined;
      snapshot.availableDisplays = [];
      snapshot.selectedDisplayId = undefined;
      snapshot.pendingApproval = undefined;
      snapshot.updatedAt = Date.now();
      appendAudit({
        sessionKey,
        workerId,
        actionType: "computer_use_session_stop",
        summary: "Computer-use session stopped.",
        status: "stopped",
        details: { adapterId: snapshot.adapterId },
      });
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

  return runtime;
}
