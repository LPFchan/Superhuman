import { resolveSessionAgentId } from "../../agents/agent-scope.js";
import { listChannelPlugins } from "../../channels/plugins/index.js";
import type { CliDeps } from "../../cli/deps.js";
import type { OpenClawConfig } from "../../config/config.js";
import { resolveAgentMainSessionKey } from "../../config/sessions/main-session.js";
import { runBootOnce, type BootRunResult } from "../../gateway/boot.js";
import { resolveSessionKeyForRun } from "../../gateway/server-session-key.js";
import type { PluginRegistry as OpenClawPluginRegistry } from "../../plugins/registry.js";
import {
  createSuperExecutionBackendRegistry,
  createSuperExecutionEnvironmentRegistry,
  createSuperExecutionProviderRegistry,
  resolveSuperComputerUseRolloutEnabled,
  startSuperComputerUseRuntime,
} from "../super-execution-surfaces.js";
import { SuperSessionPersistenceAdapter } from "../super-session-persistence-adapter.js";
import { createSuperhumanStateStore } from "../super-state-store.js";
import {
  createSuperPluginCapabilityRegistry,
  type ChannelRegistry,
  type ExecutionBackendRegistry,
  type ExecutionEnvironmentRegistry,
  type ExecutionProviderRegistry,
  type PluginRegistry,
  type SandboxRuntimeRegistry,
  type ShellCapabilityRegistry,
  type SessionRegistry,
  type StateStore,
  type SuperComputerUseRuntime,
  type WorkspaceBootstrap,
} from "./seams.js";
import {
  evaluateSuperSandboxToolDecision,
  resolveSuperPluginShellContracts,
  resolveSuperSandboxRuntimeSnapshot,
  resolveSuperShellCapabilitySnapshot,
} from "./shell-contracts.js";

export type SuperShellRuntimeServices = {
  stateStore: StateStore;
  sessionRegistry: SessionRegistry;
  channelRegistry: ChannelRegistry;
  pluginRegistry: PluginRegistry;
  shellCapabilityRegistry: ShellCapabilityRegistry;
  executionEnvironmentRegistry: ExecutionEnvironmentRegistry;
  executionBackendRegistry: ExecutionBackendRegistry;
  executionProviderRegistry: ExecutionProviderRegistry;
  sandboxRuntimeRegistry: SandboxRuntimeRegistry;
  computerUseRuntime: SuperComputerUseRuntime;
  workspaceBootstrap: WorkspaceBootstrap;
  stop: () => void;
};

function createSessionRegistry(cfg: OpenClawConfig): SessionRegistry {
  return {
    resolveMainSession(agentId?: string): string {
      return resolveAgentMainSessionKey({
        cfg,
        agentId: agentId ?? resolveSessionAgentId({ config: cfg }),
      });
    },

    resolveSession(params: { sessionKey?: string; runId?: string }): {
      sessionKey?: string;
      agentId: string;
      mainSessionKey: string;
    } {
      const sessionKey =
        params.sessionKey ?? (params.runId ? resolveSessionKeyForRun(params.runId) : undefined);
      const agentId = resolveSessionAgentId({ sessionKey, config: cfg });
      return {
        sessionKey,
        agentId,
        mainSessionKey: resolveAgentMainSessionKey({ cfg, agentId }),
      };
    },

    isMainSession(sessionKey: string): boolean {
      const agentId = resolveSessionAgentId({ sessionKey, config: cfg });
      return sessionKey === resolveAgentMainSessionKey({ cfg, agentId });
    },
  };
}

function createChannelRegistry(): ChannelRegistry {
  return {
    listLoadedChannels: () => listChannelPlugins().map((plugin) => plugin.id),
    hasChannel: (channelId) => listChannelPlugins().some((plugin) => plugin.id === channelId),
  };
}

function createShellCapabilityRegistry(params: {
  cfg: OpenClawConfig;
  stateStore: StateStore;
  pluginRegistry: OpenClawPluginRegistry;
}): ShellCapabilityRegistry {
  return {
    getSnapshot({ sessionKey }) {
      return (
        params.stateStore.getSessionSnapshot(sessionKey)?.capabilitySnapshot ??
        resolveSuperShellCapabilitySnapshot({
          cfg: params.cfg,
          sessionKey,
          pluginRegistry: params.pluginRegistry,
        })
      );
    },
  };
}

function createSandboxRuntimeRegistry(params: {
  cfg: OpenClawConfig;
  stateStore: StateStore;
}): SandboxRuntimeRegistry {
  return {
    getSnapshot({ sessionKey }) {
      const resolvedSessionKey = sessionKey?.trim() || "main";
      return (
        params.stateStore.getSessionSnapshot(resolvedSessionKey)?.sandboxRuntime ??
        resolveSuperSandboxRuntimeSnapshot({
          cfg: params.cfg,
          sessionKey: resolvedSessionKey,
        })
      );
    },
    evaluateTool({ sessionKey, toolName }) {
      return evaluateSuperSandboxToolDecision({
        cfg: params.cfg,
        sessionKey,
        toolName,
      });
    },
  };
}

function createWorkspaceBootstrap(params: {
  cfg: OpenClawConfig;
  deps: CliDeps;
  workspaceDir: string;
}): WorkspaceBootstrap {
  return {
    async runBootChecks(agentId?: string): Promise<BootRunResult> {
      return await runBootOnce({
        cfg: params.cfg,
        deps: params.deps,
        workspaceDir: params.workspaceDir,
        agentId,
      });
    },
  };
}

export function startSuperShellRuntime(params: {
  cfg: OpenClawConfig;
  deps: CliDeps;
  workspaceDir: string;
  pluginRegistry: OpenClawPluginRegistry;
}): SuperShellRuntimeServices {
  const stateStore = createSuperhumanStateStore({ workspaceDir: params.workspaceDir });
  const sessionRegistry = createSessionRegistry(params.cfg);
  const shellCapabilityRegistry = createShellCapabilityRegistry({
    cfg: params.cfg,
    stateStore,
    pluginRegistry: params.pluginRegistry,
  });
  const adapter = new SuperSessionPersistenceAdapter({
    cfg: params.cfg,
    workspaceDir: params.workspaceDir,
    stateStore,
    pluginRegistry: params.pluginRegistry,
  });
  adapter.start();
  const executionProviderRegistry = createSuperExecutionProviderRegistry({
    cfg: params.cfg,
    workspaceDir: params.workspaceDir,
    pluginRegistry: params.pluginRegistry,
  });
  const executionEnvironmentRegistry = createSuperExecutionEnvironmentRegistry({
    shellCapabilityRegistry,
    resolveProviderId: ({ sessionKey }) => {
      const { agentId } = sessionRegistry.resolveSession({ sessionKey });
      return executionProviderRegistry.getPreferredProvider({ agentId })?.id;
    },
  });
  const sandboxRuntimeRegistry = createSandboxRuntimeRegistry({
    cfg: params.cfg,
    stateStore,
  });
  const computerUseRuntime = startSuperComputerUseRuntime({
    enabled: resolveSuperComputerUseRolloutEnabled({
      cfg: params.cfg,
      env: process.env,
    }),
    stateStore,
    executionEnvironmentRegistry,
    sandboxRuntimeRegistry,
  });

  return {
    stateStore,
    sessionRegistry,
    channelRegistry: createChannelRegistry(),
    pluginRegistry: {
      ...createSuperPluginCapabilityRegistry(params.pluginRegistry),
      getShellContracts: () => resolveSuperPluginShellContracts(params.pluginRegistry),
    },
    shellCapabilityRegistry,
    executionEnvironmentRegistry,
    executionBackendRegistry: createSuperExecutionBackendRegistry(),
    executionProviderRegistry,
    sandboxRuntimeRegistry,
    computerUseRuntime,
    workspaceBootstrap: createWorkspaceBootstrap({
      cfg: params.cfg,
      deps: params.deps,
      workspaceDir: params.workspaceDir,
    }),
    stop: () => {
      adapter.stop();
      stateStore.close();
    },
  };
}
