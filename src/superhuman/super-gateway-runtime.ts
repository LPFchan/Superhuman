import { resolveSessionAgentId } from "../agents/agent-scope.js";
import { listChannelPlugins } from "../channels/plugins/index.js";
import type { CliDeps } from "../cli/deps.js";
import type { OpenClawConfig } from "../config/config.js";
import { resolveAgentMainSessionKey } from "../config/sessions/main-session.js";
import type { CronService } from "../cron/service.js";
import { runBootOnce, type BootRunResult } from "../gateway/boot.js";
import { resolveSessionKeyForRun } from "../gateway/server-session-key.js";
import type { PluginRegistry as OpenClawPluginRegistry } from "../plugins/registry.js";
import {
  startSuperAutomationRuntime,
  type SuperAutomationRuntime,
} from "./super-automation-runtime.js";
import { SuperContextEngineCompactionManager } from "./super-compaction-manager.js";
import {
  startSuperNotificationCenter,
  type SuperNotificationCenter,
} from "./super-notification-center.js";
import {
  startSuperOrchestrationRuntime,
  type OrchestrationRuntime,
} from "./super-orchestration-runtime.js";
import {
  startSuperRemoteScheduleRuntime,
  type SuperRemoteScheduleRuntime,
} from "./super-remote-schedule-runtime.js";
import {
  createSuperPluginCapabilityRegistry,
  type ChannelRegistry,
  type CompactionManager,
  type PluginRegistry,
  type SandboxRuntimeRegistry,
  type ShellCapabilityRegistry,
  type SessionRegistry,
  type StateStore,
  type WorkspaceBootstrap,
} from "./super-runtime-seams.js";
import { SuperSessionPersistenceAdapter } from "./super-session-persistence-adapter.js";
import { createSuperhumanStateStore } from "./super-state-store.js";
import {
  startSuperSubscriptionManager,
  type SuperSubscriptionManager,
} from "./super-subscription-manager.js";

export type SuperhumanGatewayRuntime = {
  stateStore: StateStore;
  automationRuntime: SuperAutomationRuntime;
  notificationCenter: SuperNotificationCenter;
  subscriptionManager: SuperSubscriptionManager;
  remoteScheduleRuntime: SuperRemoteScheduleRuntime;
  orchestrationRuntime: OrchestrationRuntime;
  sessionRegistry: SessionRegistry;
  channelRegistry: ChannelRegistry;
  pluginRegistry: PluginRegistry;
  shellCapabilityRegistry: ShellCapabilityRegistry;
  sandboxRuntimeRegistry: SandboxRuntimeRegistry;
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

function createShellCapabilityRegistry(stateStore: StateStore): ShellCapabilityRegistry {
  return {
    getSnapshot({ sessionKey }) {
      const snapshot = stateStore.getSessionSnapshot(sessionKey)?.capabilitySnapshot;
      if (!snapshot) {
        throw new Error(
          `Superhuman shell capability snapshot unavailable for session ${sessionKey}`,
        );
      }
      return snapshot;
    },
  };
}

function createSandboxRuntimeRegistry(stateStore: StateStore): SandboxRuntimeRegistry {
  return {
    getSnapshot({ sessionKey }) {
      const resolvedSessionKey = sessionKey?.trim() || "main";
      const snapshot = stateStore.getSessionSnapshot(resolvedSessionKey)?.sandboxRuntime;
      if (!snapshot) {
        throw new Error(
          `Superhuman sandbox runtime snapshot unavailable for session ${resolvedSessionKey}`,
        );
      }
      return snapshot;
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

export function startSuperhumanGatewayRuntime(params: {
  cfg: OpenClawConfig;
  deps: CliDeps;
  workspaceDir: string;
  pluginRegistry: OpenClawPluginRegistry;
  cron?: CronService;
  broadcastAutomationChange?: (payload: Record<string, unknown>) => void;
}): SuperhumanGatewayRuntime {
  const stateStore = createSuperhumanStateStore({ workspaceDir: params.workspaceDir });
  const sessionRegistry = createSessionRegistry(params.cfg);
  const shellCapabilityRegistry = createShellCapabilityRegistry(stateStore);
  const adapter = new SuperSessionPersistenceAdapter({
    cfg: params.cfg,
    workspaceDir: params.workspaceDir,
    stateStore,
    pluginRegistry: params.pluginRegistry,
  });
  const orchestrationRuntime = startSuperOrchestrationRuntime({
    cfg: params.cfg,
    workspaceDir: params.workspaceDir,
  });
  const automationRuntime = startSuperAutomationRuntime({
    stateStore,
    sessionRegistry,
  });
  const notificationCenter = startSuperNotificationCenter({
    workspaceDir: params.workspaceDir,
    stateStore,
    onChange: params.broadcastAutomationChange,
  });
  const subscriptionManager = startSuperSubscriptionManager({
    workspaceDir: params.workspaceDir,
    stateStore,
  });
  const remoteScheduleRuntime = startSuperRemoteScheduleRuntime({
    workspaceDir: params.workspaceDir,
    stateStore,
    sessionRegistry,
    shellCapabilityRegistry,
    notificationCenter,
    cron: params.cron,
  });
  adapter.start();
  return {
    stateStore,
    automationRuntime,
    notificationCenter,
    subscriptionManager,
    remoteScheduleRuntime,
    orchestrationRuntime,
    sessionRegistry,
    channelRegistry: createChannelRegistry(),
    pluginRegistry: createSuperPluginCapabilityRegistry(params.pluginRegistry),
    shellCapabilityRegistry,
    sandboxRuntimeRegistry: createSandboxRuntimeRegistry(stateStore),
    workspaceBootstrap: createWorkspaceBootstrap({
      cfg: params.cfg,
      deps: params.deps,
      workspaceDir: params.workspaceDir,
    }),
    compactionManager: new SuperContextEngineCompactionManager({
      cfg: params.cfg,
      workspaceDir: params.workspaceDir,
      stateStore,
    }),
    stop: () => {
      remoteScheduleRuntime.stop();
      subscriptionManager.stop();
      notificationCenter.stop();
      automationRuntime.stop();
      orchestrationRuntime.stop();
      adapter.stop();
      stateStore.close();
    },
  };
}
