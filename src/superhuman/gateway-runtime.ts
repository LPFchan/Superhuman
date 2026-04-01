import { resolveSessionAgentId } from "../agents/agent-scope.js";
import { listChannelPlugins } from "../channels/plugins/index.js";
import type { CliDeps } from "../cli/deps.js";
import type { OpenClawConfig } from "../config/config.js";
import { resolveAgentMainSessionKey } from "../config/sessions/main-session.js";
import { runBootOnce, type BootRunResult } from "../gateway/boot.js";
import { resolveSessionKeyForRun } from "../gateway/server-session-key.js";
import type { PluginRegistry as OpenClawPluginRegistry } from "../plugins/registry.js";
import {
  createPluginCapabilityRegistry,
  NoopCompactionManager,
  type ChannelRegistry,
  type CompactionManager,
  type PluginRegistry,
  type SessionRegistry,
  type StateStore,
  type WorkspaceBootstrap,
} from "./runtime-seams.js";
import { SessionPersistenceAdapter } from "./session-persistence-adapter.js";
import { createSuperhumanStateStore } from "./state-store.js";

export type SuperhumanGatewayRuntime = {
  stateStore: StateStore;
  sessionRegistry: SessionRegistry;
  channelRegistry: ChannelRegistry;
  pluginRegistry: PluginRegistry;
  workspaceBootstrap: WorkspaceBootstrap;
  compactionManager: CompactionManager;
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

export function startSuperhumanGatewayRuntime(params: {
  cfg: OpenClawConfig;
  deps: CliDeps;
  workspaceDir: string;
  pluginRegistry: OpenClawPluginRegistry;
}): SuperhumanGatewayRuntime {
  const stateStore = createSuperhumanStateStore({ workspaceDir: params.workspaceDir });
  const adapter = new SessionPersistenceAdapter({
    cfg: params.cfg,
    workspaceDir: params.workspaceDir,
    stateStore,
  });
  adapter.start();
  return {
    stateStore,
    sessionRegistry: createSessionRegistry(params.cfg),
    channelRegistry: createChannelRegistry(),
    pluginRegistry: createPluginCapabilityRegistry(params.pluginRegistry),
    workspaceBootstrap: createWorkspaceBootstrap({
      cfg: params.cfg,
      deps: params.deps,
      workspaceDir: params.workspaceDir,
    }),
    compactionManager: new NoopCompactionManager((sessionKey) =>
      stateStore.getContextPressureSnapshot({ sessionKey }),
    ),
    stop: () => {
      adapter.stop();
      stateStore.close();
    },
  };
}
