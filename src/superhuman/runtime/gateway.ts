import type { CliDeps } from "../../cli/deps.js";
import type { OpenClawConfig } from "../../config/config.js";
import type { CronService } from "../../cron/service.js";
import type { PluginRegistry as OpenClawPluginRegistry } from "../../plugins/registry.js";
import type { SuperAutomationRuntime } from "../super-automation-runtime.js";
import type { SuperNotificationCenter } from "../super-notification-center.js";
import type { OrchestrationRuntime } from "../super-orchestration-runtime.js";
import type { SuperRemoteScheduleRuntime } from "../super-remote-schedule-runtime.js";
import type { SuperRemoteSessionManager } from "../super-remote-session-manager.js";
import type { SuperSubscriptionManager } from "../super-subscription-manager.js";
import { startSuperAutomationServices } from "./automation-services.js";
import { startSuperContextServices } from "./context-services.js";
import { startSuperOrchestrationServices } from "./orchestration-services.js";
import type {
  ChannelRegistry,
  CompactionManager,
  ExecutionBackendRegistry,
  ExecutionEnvironmentRegistry,
  ExecutionProviderRegistry,
  PluginRegistry,
  SandboxRuntimeRegistry,
  ShellCapabilityRegistry,
  SessionRegistry,
  StateStore,
  SuperComputerUseRuntime,
  WorkspaceBootstrap,
} from "./seams.js";
import { startSuperShellRuntime } from "./shell.js";

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
  executionEnvironmentRegistry: ExecutionEnvironmentRegistry;
  executionBackendRegistry: ExecutionBackendRegistry;
  executionProviderRegistry: ExecutionProviderRegistry;
  sandboxRuntimeRegistry: SandboxRuntimeRegistry;
  computerUseRuntime: SuperComputerUseRuntime;
  remoteSessionManager: SuperRemoteSessionManager;
  workspaceBootstrap: WorkspaceBootstrap;
  compactionManager: CompactionManager;
  stop: () => void;
};

// Shared composition root only. Wire phase-owned services together here, but
// keep feature behavior in runtime/* so new phases do not re-centralize startup logic.
export function startSuperhumanGatewayRuntime(params: {
  cfg: OpenClawConfig;
  deps: CliDeps;
  workspaceDir: string;
  pluginRegistry: OpenClawPluginRegistry;
  cron?: CronService;
  broadcastAutomationChange?: (payload: Record<string, unknown>) => void;
}): SuperhumanGatewayRuntime {
  const shellRuntime = startSuperShellRuntime({
    cfg: params.cfg,
    deps: params.deps,
    workspaceDir: params.workspaceDir,
    pluginRegistry: params.pluginRegistry,
  });
  const contextServices = startSuperContextServices({
    cfg: params.cfg,
    workspaceDir: params.workspaceDir,
    stateStore: shellRuntime.stateStore,
  });
  const orchestrationServices = startSuperOrchestrationServices({
    cfg: params.cfg,
    workspaceDir: params.workspaceDir,
    stateStore: shellRuntime.stateStore,
    executionEnvironmentRegistry: shellRuntime.executionEnvironmentRegistry,
  });
  const automationServices = startSuperAutomationServices({
    workspaceDir: params.workspaceDir,
    stateStore: shellRuntime.stateStore,
    sessionRegistry: shellRuntime.sessionRegistry,
    executionEnvironmentRegistry: shellRuntime.executionEnvironmentRegistry,
    cron: params.cron,
    broadcastAutomationChange: params.broadcastAutomationChange,
  });

  return {
    stateStore: shellRuntime.stateStore,
    automationRuntime: automationServices.automationRuntime,
    notificationCenter: automationServices.notificationCenter,
    subscriptionManager: automationServices.subscriptionManager,
    remoteScheduleRuntime: automationServices.remoteScheduleRuntime,
    orchestrationRuntime: orchestrationServices.orchestrationRuntime,
    sessionRegistry: shellRuntime.sessionRegistry,
    channelRegistry: shellRuntime.channelRegistry,
    pluginRegistry: shellRuntime.pluginRegistry,
    shellCapabilityRegistry: shellRuntime.shellCapabilityRegistry,
    executionEnvironmentRegistry: shellRuntime.executionEnvironmentRegistry,
    executionBackendRegistry: shellRuntime.executionBackendRegistry,
    executionProviderRegistry: shellRuntime.executionProviderRegistry,
    sandboxRuntimeRegistry: shellRuntime.sandboxRuntimeRegistry,
    computerUseRuntime: shellRuntime.computerUseRuntime,
    remoteSessionManager: orchestrationServices.remoteSessionManager,
    workspaceBootstrap: shellRuntime.workspaceBootstrap,
    compactionManager: contextServices.compactionManager,
    stop: () => {
      automationServices.stop();
      orchestrationServices.stop();
      contextServices.stop();
      shellRuntime.stop();
    },
  };
}
