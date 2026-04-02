import type { OpenClawConfig } from "../../config/config.js";
import {
  startSuperOrchestrationRuntime,
  type OrchestrationRuntime,
} from "../super-orchestration-runtime.js";

export type SuperOrchestrationServices = {
  orchestrationRuntime: OrchestrationRuntime;
  stop: () => void;
};

export function startSuperOrchestrationServices(params: {
  cfg: OpenClawConfig;
  workspaceDir: string;
}): SuperOrchestrationServices {
  const orchestrationRuntime = startSuperOrchestrationRuntime({
    cfg: params.cfg,
    workspaceDir: params.workspaceDir,
  });
  return {
    orchestrationRuntime,
    stop: () => {
      orchestrationRuntime.stop();
    },
  };
}
