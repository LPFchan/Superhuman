import type { OpenClawConfig } from "../../config/config.js";
import {
  startSuperOrchestrationRuntime,
  type OrchestrationRuntime,
} from "../super-orchestration-runtime.js";
import type { SuperRemoteSessionManager } from "../super-remote-session-manager.js";
import type { ExecutionEnvironmentRegistry, StateStore } from "./seams.js";

export type SuperOrchestrationServices = {
  orchestrationRuntime: OrchestrationRuntime;
  remoteSessionManager: SuperRemoteSessionManager;
  stop: () => void;
};

export function startSuperOrchestrationServices(params: {
  cfg: OpenClawConfig;
  workspaceDir: string;
  stateStore: StateStore;
  executionEnvironmentRegistry: ExecutionEnvironmentRegistry;
}): SuperOrchestrationServices {
  const orchestrationRuntime = startSuperOrchestrationRuntime({
    cfg: params.cfg,
    workspaceDir: params.workspaceDir,
    stateStore: params.stateStore,
    executionEnvironmentRegistry: params.executionEnvironmentRegistry,
  });
  return {
    orchestrationRuntime,
    remoteSessionManager: orchestrationRuntime.remoteSessionManager,
    stop: () => {
      orchestrationRuntime.stop();
    },
  };
}
