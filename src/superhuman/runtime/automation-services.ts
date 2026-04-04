import type { CronService } from "../../cron/service.js";
import {
  startSuperNotificationCenter,
  type SuperNotificationCenter,
} from "../automation/notification-center.js";
import {
  startSuperRemoteScheduleRuntime,
  type SuperRemoteScheduleRuntime,
} from "../automation/remote-schedule.js";
import { startSuperAutomationRuntime, type SuperAutomationRuntime } from "../automation/runtime.js";
import {
  startSuperSubscriptionManager,
  type SuperSubscriptionManager,
} from "../automation/subscription-manager.js";
import type { ExecutionEnvironmentRegistry, SessionRegistry, StateStore } from "./seams.js";

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
  executionEnvironmentRegistry: ExecutionEnvironmentRegistry;
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
    executionEnvironmentRegistry: params.executionEnvironmentRegistry,
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
