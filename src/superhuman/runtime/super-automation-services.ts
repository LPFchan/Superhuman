import type { CronService } from "../../cron/service.js";
import {
  startSuperAutomationRuntime,
  type SuperAutomationRuntime,
} from "../super-automation-runtime.js";
import {
  startSuperNotificationCenter,
  type SuperNotificationCenter,
} from "../super-notification-center.js";
import {
  startSuperRemoteScheduleRuntime,
  type SuperRemoteScheduleRuntime,
} from "../super-remote-schedule-runtime.js";
import type {
  SessionRegistry,
  ShellCapabilityRegistry,
  StateStore,
} from "../super-runtime-seams.js";
import {
  startSuperSubscriptionManager,
  type SuperSubscriptionManager,
} from "../super-subscription-manager.js";

export type SuperAutomationServices = {
  automationRuntime: SuperAutomationRuntime;
  notificationCenter: SuperNotificationCenter;
  subscriptionManager: SuperSubscriptionManager;
  remoteScheduleRuntime: SuperRemoteScheduleRuntime;
  stop: () => void;
};

export function startSuperAutomationServices(params: {
  workspaceDir: string;
  stateStore: StateStore;
  sessionRegistry: SessionRegistry;
  shellCapabilityRegistry: ShellCapabilityRegistry;
  cron?: CronService;
  broadcastAutomationChange?: (payload: Record<string, unknown>) => void;
}): SuperAutomationServices {
  const automationRuntime = startSuperAutomationRuntime({
    stateStore: params.stateStore,
    sessionRegistry: params.sessionRegistry,
  });
  const notificationCenter = startSuperNotificationCenter({
    workspaceDir: params.workspaceDir,
    stateStore: params.stateStore,
    onChange: params.broadcastAutomationChange,
  });
  const subscriptionManager = startSuperSubscriptionManager({
    workspaceDir: params.workspaceDir,
    stateStore: params.stateStore,
  });
  const remoteScheduleRuntime = startSuperRemoteScheduleRuntime({
    workspaceDir: params.workspaceDir,
    stateStore: params.stateStore,
    sessionRegistry: params.sessionRegistry,
    shellCapabilityRegistry: params.shellCapabilityRegistry,
    notificationCenter,
    cron: params.cron,
  });

  return {
    automationRuntime,
    notificationCenter,
    subscriptionManager,
    remoteScheduleRuntime,
    stop: () => {
      remoteScheduleRuntime.stop();
      subscriptionManager.stop();
      notificationCenter.stop();
      automationRuntime.stop();
    },
  };
}
